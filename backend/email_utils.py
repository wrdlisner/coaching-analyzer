"""メール送信ユーティリティ（Resend API）

Railway の環境変数に以下を設定してください：

  RESEND_API_KEY  - Resend の API キー（re_xxxxxxxx）
  FROM_EMAIL      - 送信元アドレス（デフォルト: onboarding@resend.dev）
"""

import json
import logging
import os
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)


def _resend_configured() -> bool:
    return bool(os.getenv("RESEND_API_KEY"))


def send_email(to: str, subject: str, html_body: str) -> bool:
    """Resend API でメールを送信する。成功時 True、スキップ/失敗時 False。"""
    if not _resend_configured():
        logger.info(f"RESEND_API_KEY未設定のためメール送信をスキップ: to={to}")
        return False

    api_key = os.getenv("RESEND_API_KEY", "")
    from_addr = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

    payload = json.dumps({
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": html_body,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"メール送信成功: to={to}, status={resp.status}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error(f"メール送信失敗 (HTTP {e.code}): to={to}, body={body}")
        return False
    except Exception as e:
        logger.error(f"メール送信失敗: to={to}, error={e}")
        return False


def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    subject = "【CoachingAnalyzer】パスワードリセットのご案内"
    html_body = f"""
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background:#f8f7f2; padding:32px 16px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="text-align:center; margin-bottom:24px;">
      <div style="font-size:40px;">🔑</div>
      <h1 style="font-size:20px; font-weight:700; color:#1a1916; margin:12px 0 4px;">パスワードリセット</h1>
      <p style="font-size:14px; color:#706f68; margin:0;">CoachingAnalyzer</p>
    </div>

    <p style="font-size:14px; color:#3a3935; line-height:1.8; margin:0 0 20px;">
      パスワードリセットのリクエストを受け付けました。<br>
      下のボタンから新しいパスワードを設定してください。
    </p>

    <div style="text-align:center; margin:0 0 24px;">
      <a href="{reset_url}"
         style="display:inline-block; background:#5B4FD6; color:#fff; font-size:14px; font-weight:600; padding:14px 32px; border-radius:8px; text-decoration:none;">
        パスワードを再設定する
      </a>
    </div>

    <div style="background:#fef9ec; border:1px solid #f5e5a0; border-radius:8px; padding:14px 18px; margin:0 0 24px;">
      <p style="font-size:12px; color:#8a7a20; margin:0; line-height:1.7;">
        ⚠️ このリンクは<strong>1時間</strong>で有効期限が切れます。<br>
        心当たりのない場合はこのメールを無視してください。アカウントへの変更はされません。
      </p>
    </div>

    <hr style="border:none; border-top:1px solid #e8e6df; margin:0 0 16px;">
    <p style="font-size:11px; color:#9c9b94; text-align:center; margin:0;">
      CoachingAnalyzer — ICFコーチングセッション分析ツール
    </p>
  </div>
</body>
</html>
"""
    return send_email(to_email, subject, html_body)


def send_mentor_approved_email(to_email: str, display_name: str) -> bool:
    subject = "【CoachingAnalyzer】メンターコーチとして承認されました"
    html_body = f"""
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background:#f8f7f2; padding:32px 16px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="text-align:center; margin-bottom:24px;">
      <div style="font-size:40px;">🎉</div>
      <h1 style="font-size:20px; font-weight:700; color:#1a1916; margin:12px 0 4px;">おめでとうございます！</h1>
      <p style="font-size:14px; color:#706f68; margin:0;">メンターコーチとして承認されました</p>
    </div>

    <p style="font-size:14px; color:#3a3935; line-height:1.8; margin:0 0 20px;">
      {display_name} さん、<br>
      CoachingAnalyzer のメンターコーチ審査が完了し、<strong>承認されました</strong>。
      プロフィールがメンター一覧に公開されます。
    </p>

    <div style="background:#f0faf6; border:1px solid #b8e8d6; border-radius:8px; padding:16px 20px; margin:0 0 24px;">
      <p style="font-size:13px; color:#1D9E75; font-weight:600; margin:0 0 8px;">次のステップ</p>
      <ul style="font-size:13px; color:#3a3935; line-height:1.8; margin:0; padding-left:18px;">
        <li>ダッシュボードにログインしてプロフィールを確認する</li>
        <li>プロフィール編集でコンテンツを最新の状態に保つ</li>
        <li>MCQガイドでさらなるスキルアップを目指す</li>
      </ul>
    </div>

    <div style="text-align:center;">
      <a href="https://coaching-analyzer.com/dashboard"
         style="display:inline-block; background:#5B4FD6; color:#fff; font-size:14px; font-weight:600; padding:12px 28px; border-radius:8px; text-decoration:none;">
        ダッシュボードへ →
      </a>
    </div>

    <hr style="border:none; border-top:1px solid #e8e6df; margin:28px 0 16px;">
    <p style="font-size:11px; color:#9c9b94; text-align:center; margin:0;">
      CoachingAnalyzer — ICFコーチングセッション分析ツール
    </p>
  </div>
</body>
</html>
"""
    return send_email(to_email, subject, html_body)


def send_mentor_rejected_email(to_email: str, display_name: str) -> bool:
    subject = "【CoachingAnalyzer】メンター登録審査の結果について"
    html_body = f"""
<!DOCTYPE html>
<html lang="ja">
<body style="font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; background:#f8f7f2; padding:32px 16px;">
  <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <h1 style="font-size:18px; font-weight:700; color:#1a1916; margin:0 0 16px;">メンター登録審査の結果</h1>
    <p style="font-size:14px; color:#3a3935; line-height:1.8; margin:0 0 16px;">
      {display_name} さん、<br>
      この度はメンターコーチへの登録申請をいただきありがとうございました。<br>
      誠に恐れ入りますが、今回は審査の結果、<strong>ご登録をお断り</strong>させていただくこととなりました。
    </p>
    <p style="font-size:13px; color:#706f68; line-height:1.8; margin:0 0 24px;">
      条件を満たした場合は改めてご申請いただくことが可能です。
      ご不明な点がございましたらお気軽にお問い合わせください。
    </p>
    <hr style="border:none; border-top:1px solid #e8e6df; margin:0 0 16px;">
    <p style="font-size:11px; color:#9c9b94; text-align:center; margin:0;">
      CoachingAnalyzer — ICFコーチングセッション分析ツール
    </p>
  </div>
</body>
</html>
"""
    return send_email(to_email, subject, html_body)
