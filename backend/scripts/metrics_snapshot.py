"""
coachmark 週次メトリクス・スナップショット（読み取り専用）

使い方:
  cd backend
  DATABASE_URL=postgresql://... python scripts/metrics_snapshot.py            # 標準出力にMarkdown
  DATABASE_URL=... STRIPE_SECRET_KEY=sk_live_... python scripts/metrics_snapshot.py --out ../metrics.md

  --out を付けると、metrics.md の先頭(## 最新スナップショット の直下)に今回分を挿入する。
  STRIPE_SECRET_KEY があれば売上は Stripe の実績(成功した決済の合計)、
  なければ credits テーブルのパック数から推定(クーポン割引は反映されない → 「推定」と明記される)。

書き込みは一切しない。読み取り専用ロールで接続すること(README参照)。
"""

import argparse
import os
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, text

PACK_PRICE = {1: 500, 3: 1200, 10: 3500}  # credits -> yen (routers/payments.py PACK_CONFIG と同期)


def q(conn, sql, **params):
    return conn.execute(text(sql), params).mappings().all()


def one(conn, sql, **params):
    row = conn.execute(text(sql), params).first()
    return row[0] if row else None


def stripe_revenue_by_month(months):
    """Stripeの成功決済(JPY)を月別合計。キーが無ければ None。"""
    key = os.environ.get("STRIPE_SECRET_KEY")
    if not key:
        return None
    try:
        import stripe
    except ImportError:
        return None
    stripe.api_key = key
    since = int((datetime.now(timezone.utc) - timedelta(days=31 * months)).timestamp())
    totals = {}
    for pi in stripe.PaymentIntent.list(created={"gte": since}, limit=100).auto_paging_iter():
        if pi.status != "succeeded" or pi.currency != "jpy":
            continue
        ym = datetime.fromtimestamp(pi.created, tz=timezone.utc).strftime("%Y-%m")
        totals[ym] = totals.get(ym, 0) + pi.amount_received
    return totals


def build(conn):
    now = datetime.now(timezone.utc)
    w0 = now - timedelta(days=7)
    w1 = now - timedelta(days=14)
    this_month = now.strftime("%Y-%m")
    last_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    two_ago = (now.replace(day=1) - timedelta(days=1)).replace(day=1) - timedelta(days=1)
    two_ago = two_ago.strftime("%Y-%m")

    # --- 登録 ---
    users_total = one(conn, "SELECT count(*) FROM users")
    users_w0 = one(conn, "SELECT count(*) FROM users WHERE created_at >= :t", t=w0)
    users_w1 = one(conn, "SELECT count(*) FROM users WHERE created_at >= :a AND created_at < :b", a=w1, b=w0)
    by_method = q(conn, "SELECT signup_method, count(*) AS n FROM users GROUP BY 1 ORDER BY 2 DESC")
    referred = one(conn, "SELECT count(*) FROM users WHERE referred_by IS NOT NULL")

    # --- 有効化(1回でも分析した人) ---
    activated = one(conn, "SELECT count(DISTINCT user_id) FROM sessions")
    sessions_total = one(conn, "SELECT count(*) FROM sessions")
    sessions_w0 = one(conn, "SELECT count(*) FROM sessions WHERE created_at >= :t", t=w0)
    sessions_w1 = one(conn, "SELECT count(*) FROM sessions WHERE created_at >= :a AND created_at < :b", a=w1, b=w0)
    active_users_w0 = one(conn, "SELECT count(DISTINCT user_id) FROM sessions WHERE created_at >= :t", t=w0)

    # --- 有料 ---
    paying_total = one(conn, "SELECT count(DISTINCT user_id) FROM credits WHERE reason='purchase'")
    purchases_w0 = one(conn, "SELECT count(*) FROM credits WHERE reason='purchase' AND created_at >= :t", t=w0)
    new_paying_w0 = one(conn, """
        SELECT count(*) FROM (
          SELECT user_id, min(created_at) AS first_buy FROM credits WHERE reason='purchase' GROUP BY user_id
        ) f WHERE first_buy >= :t""", t=w0)
    repeat_buyers = one(conn, """
        SELECT count(*) FROM (
          SELECT user_id FROM credits WHERE reason='purchase' GROUP BY user_id HAVING count(*) >= 2
        ) r""")
    pack_mix = q(conn, "SELECT amount AS credits, count(*) AS n FROM credits WHERE reason='purchase' GROUP BY 1 ORDER BY 1")
    est_by_month = q(conn, """
        SELECT to_char(created_at, 'YYYY-MM') AS ym, amount, count(*) AS n
        FROM credits WHERE reason='purchase' AND created_at >= :t GROUP BY 1, 2""",
        t=now - timedelta(days=100))
    est = {}
    for r in est_by_month:
        est[r["ym"]] = est.get(r["ym"], 0) + PACK_PRICE.get(r["amount"], 0) * r["n"]
    actual = stripe_revenue_by_month(3)

    # --- 継続(分析ベース): 先月分析した人のうち今月も分析した割合 ---
    ret = one(conn, """
        WITH m AS (
          SELECT DISTINCT user_id, to_char(created_at, 'YYYY-MM') AS ym FROM sessions
        )
        SELECT CASE WHEN count(a.user_id) = 0 THEN NULL
               ELSE round(100.0 * count(b.user_id) / count(a.user_id), 1) END
        FROM m a LEFT JOIN m b ON a.user_id = b.user_id AND b.ym = :cur
        WHERE a.ym = :prev""", cur=this_month, prev=last_month)
    ret_prev = one(conn, """
        WITH m AS (
          SELECT DISTINCT user_id, to_char(created_at, 'YYYY-MM') AS ym FROM sessions
        )
        SELECT CASE WHEN count(a.user_id) = 0 THEN NULL
               ELSE round(100.0 * count(b.user_id) / count(a.user_id), 1) END
        FROM m a LEFT JOIN m b ON a.user_id = b.user_id AND b.ym = :cur
        WHERE a.ym = :prev""", cur=last_month, prev=two_ago)

    # --- 購入候補: 分析経験ありでクレジット0 ---
    zero_credit_experienced = one(conn, """
        SELECT count(*) FROM users u
        WHERE u.credits = 0 AND EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)""")
    never_analyzed = one(conn, """
        SELECT count(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id)""")

    # --- フィードバック ---
    fb = conn.execute(text("""
        SELECT count(*), round(avg(satisfaction),2), round(avg(accuracy),2)
        FROM feedbacks WHERE created_at >= :t"""), {"t": now - timedelta(days=30)}).first()

    def delta(a, b):
        return f"{a} (先週 {b})"

    def yen(n):
        return f"¥{n:,}"

    lines = []
    lines.append(f"### {now.strftime('%Y-%m-%d')} 週次スナップショット")
    lines.append("")
    lines.append("| 指標 | 値 |")
    lines.append("|---|---|")
    lines.append(f"| 登録ユーザー累計 | {users_total} |")
    lines.append(f"| 新規登録(7日) | {delta(users_w0, users_w1)} |")
    lines.append(f"| 登録方法 | " + ", ".join(f"{r['signup_method']}={r['n']}" for r in by_method) + " |")
    lines.append(f"| 紹介経由の登録 | {referred} |")
    lines.append(f"| 分析経験あり(有効化) | {activated} / {users_total} |")
    lines.append(f"| 未分析のまま | {never_analyzed} |")
    lines.append(f"| 分析数 累計 / 7日 | {sessions_total} / {delta(sessions_w0, sessions_w1)} |")
    lines.append(f"| 7日間アクティブ(分析した人) | {active_users_w0} |")
    lines.append(f"| 有料ユーザー累計(購入経験) | {paying_total} |")
    lines.append(f"| 購入件数(7日) / 初購入(7日) | {purchases_w0} / {new_paying_w0} |")
    lines.append(f"| リピート購入者(2回以上) | {repeat_buyers} |")
    lines.append(f"| パック内訳(累計) | " + ", ".join(f"{r['credits']}回={r['n']}件" for r in pack_mix) + " |")
    if actual is not None:
        lines.append(f"| 売上 {this_month}(Stripe実績) | {yen(actual.get(this_month, 0))} |")
        lines.append(f"| 売上 {last_month}(Stripe実績) | {yen(actual.get(last_month, 0))} |")
    else:
        lines.append(f"| 売上 {this_month}(推定・クーポン未反映) | {yen(est.get(this_month, 0))} |")
        lines.append(f"| 売上 {last_month}(推定・クーポン未反映) | {yen(est.get(last_month, 0))} |")
    lines.append(f"| 分析継続率 {last_month}→{this_month} | {ret if ret is not None else '—'}% (前月 {ret_prev if ret_prev is not None else '—'}%) |")
    lines.append(f"| 購入候補(分析経験あり・残クレジット0) | {zero_credit_experienced} |")
    lines.append(f"| フィードバック(30日) 件数/満足/精度 | {fb[0]} / {fb[1]} / {fb[2]} |")
    lines.append("")
    lines.append("目標: 半年後 月売上20万円(2027-04) / 1年後 50万円(2027-10)。")
    lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", help="metrics.md のパス。指定すると先頭に挿入する")
    args = ap.parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL が未設定です")
    engine = create_engine(url)
    with engine.connect() as conn:
        md = build(conn)

    if not args.out:
        print(md)
        return

    marker = "## 最新スナップショット"
    if os.path.exists(args.out):
        body = open(args.out, encoding="utf-8").read()
    else:
        body = "# coachmark metrics\n\n" + marker + "\n\n"
    if marker not in body:
        body = body.rstrip() + "\n\n" + marker + "\n\n"
    head, tail = body.split(marker, 1)
    new = head + marker + "\n\n" + md + "\n" + tail.lstrip("\n")
    open(args.out, "w", encoding="utf-8").write(new)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
