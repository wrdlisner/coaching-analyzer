"""Googleログイン(設計書② §3〜§4)

流れ:
  フロント「Googleで続ける」→ GET /start → Google → GET /callback
  → ユーザーを判定し、使い捨てチケットを発行してフロントへリダイレクト
  → フロントがチケットを POST して JWT を受け取る(JWT は URL に載せない)
"""

import base64
import hashlib
import logging
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import auth as auth_utils
import models
import schemas
from database import get_db
from user_service import create_user, find_user_by_email, normalize_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth/google", tags=["auth-google"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
PROVIDER = "google"

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Railway のプロキシ配下では request.url_for() が http を返すことがあるため明示する
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
)

_raw_frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
FRONTEND_URL = _raw_frontend_url.split(",")[0].strip().rstrip("/")

STATE_COOKIE = "oauth_google"
STATE_COOKIE_PATH = "/api/auth/google"
STATE_TTL_SECONDS = 600
STATE_PURPOSE = "google_oauth_state"
LINK_INTENT_PURPOSE = "google_link_intent"
LINK_INTENT_TTL_SECONDS = 300

TICKET_TTL = {
    "login": timedelta(minutes=2),
    "signup": timedelta(minutes=30),
    "link_confirm": timedelta(minutes=30),
}
LINK_CONFIRM_MAX_FAILURES = 5
REFERRAL_CODE_RE = re.compile(r"^[A-Z0-9]{8}$")

TICKET_EXPIRED_MESSAGE = "時間が経ったため手続きが無効になりました。もう一度「Google で続ける」からお試しください。"


# ---------------------------------------------------------------------------
# 共通ヘルパー
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_configured() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _redirect_to_frontend(path: str, clear_state_cookie: bool = True) -> RedirectResponse:
    response = RedirectResponse(f"{FRONTEND_URL}{path}", status_code=status.HTTP_302_FOUND)
    if clear_state_cookie:
        response.delete_cookie(STATE_COOKIE, path=STATE_COOKIE_PATH)
    return response


def _error_redirect(code: str) -> RedirectResponse:
    return _redirect_to_frontend(f"/login?error={code}")


def _settings_redirect(result: str) -> RedirectResponse:
    """アカウント設定(ダッシュボードのプロフィールタブ)へ連携の結果を返す"""
    return _redirect_to_frontend(f"/dashboard?tab=settings&google={result}")


def _issue_ticket(
    db: Session,
    purpose: str,
    user_id=None,
    payload: Optional[dict] = None,
) -> str:
    raw = secrets.token_urlsafe(32)
    db.add(models.AuthTicket(
        token_hash=_hash(raw),
        purpose=purpose,
        user_id=user_id,
        payload=payload,
        expires_at=_now() + TICKET_TTL[purpose],
    ))
    return raw


def _get_ticket(db: Session, raw: str, purpose: str) -> models.AuthTicket:
    """有効なチケットを返す(使用済みにはしない)。無効なら400"""
    ticket = db.query(models.AuthTicket).filter(
        models.AuthTicket.token_hash == _hash(raw or ""),
        models.AuthTicket.purpose == purpose,
        models.AuthTicket.used_at == None,  # noqa: E711
        models.AuthTicket.expires_at > _now(),
    ).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)
    return ticket


def _link_identity(db: Session, user: models.User, sub: str, email: str) -> models.UserIdentity:
    identity = models.UserIdentity(
        user_id=user.id,
        provider=PROVIDER,
        provider_subject=sub,
        email=email,
        last_login_at=_now(),
    )
    db.add(identity)
    if user.email_verified_at is None and normalize_email(user.email) == email:
        user.email_verified_at = _now()
    return identity


def _fetch_google_identity(code: str, code_verifier: str) -> dict:
    """認可コードをトークンに交換し、IDトークンを検証して中身を返す。

    署名・aud・iss・exp の検証は google-auth が行う。テストではこの関数を差し替える。
    """
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    res = requests.post(GOOGLE_TOKEN_URL, data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,
    }, timeout=10)
    if res.status_code != 200:
        raise RuntimeError(f"token endpoint returned {res.status_code}: {res.text[:200]}")
    raw_id_token = res.json().get("id_token")
    if not raw_id_token:
        raise RuntimeError("token endpoint response has no id_token")
    return id_token.verify_oauth2_token(raw_id_token, google_requests.Request(), GOOGLE_CLIENT_ID)


# ---------------------------------------------------------------------------
# 認可リクエスト / コールバック
# ---------------------------------------------------------------------------

@router.post("/link-intent", response_model=schemas.GoogleLinkIntentResponse)
def link_intent(current_user: models.User = Depends(auth_utils.get_current_user)):
    """ログイン中ユーザーの連携開始用(§5.1)。

    JWT は localStorage にありリダイレクトでは送れないため、5分有効の署名付き intent を渡し、
    フロントは /start?intent=... へ遷移する。
    """
    intent = jwt.encode({
        "purpose": LINK_INTENT_PURPOSE,
        "sub": str(current_user.id),
        "exp": _now() + timedelta(seconds=LINK_INTENT_TTL_SECONDS),
    }, auth_utils.SECRET_KEY, algorithm=auth_utils.ALGORITHM)
    return schemas.GoogleLinkIntentResponse(intent=intent)


@router.delete("/link", response_model=schemas.SuccessResponse)
def unlink(
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Google連携の解除。パスワード未設定なら、ログイン手段がなくなるため拒否する"""
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ログインする手段がなくなるため解除できません。先にパスワードを設定してください。",
        )
    deleted = db.query(models.UserIdentity).filter(
        models.UserIdentity.user_id == current_user.id,
        models.UserIdentity.provider == PROVIDER,
    ).delete(synchronize_session=False)
    db.commit()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Googleアカウントは連携されていません")
    return {"success": True}


@router.get("/start")
def start(ref: Optional[str] = None, intent: Optional[str] = None):
    if not _is_configured():
        logger.error("Googleログイン: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が未設定です")
        return _settings_redirect("unavailable") if intent else _error_redirect("google_unavailable")

    link_uid = None
    if intent:
        try:
            claims = jwt.decode(intent, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        except JWTError:
            return _settings_redirect("expired")
        if claims.get("purpose") != LINK_INTENT_PURPOSE or not claims.get("sub"):
            return _settings_redirect("expired")
        link_uid = claims["sub"]

    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).rstrip(b"=").decode()

    ref = ref.strip().upper() if ref else None
    cookie_value = jwt.encode({
        "purpose": STATE_PURPOSE,
        "state": state,
        "nonce": nonce,
        "cv": code_verifier,
        "ref": ref if ref and REFERRAL_CODE_RE.match(ref) else None,
        "link_uid": link_uid,
        "exp": _now() + timedelta(seconds=STATE_TTL_SECONDS),
    }, auth_utils.SECRET_KEY, algorithm=auth_utils.ALGORITHM)

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    response = RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}", status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        STATE_COOKIE,
        cookie_value,
        max_age=STATE_TTL_SECONDS,
        path=STATE_COOKIE_PATH,
        httponly=True,
        secure=GOOGLE_REDIRECT_URI.startswith("https://"),
        samesite="lax",
    )
    return response


@router.get("/callback")
def callback(
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if error:
        return _error_redirect("google_cancelled" if error == "access_denied" else "google_failed")

    # 1. state の照合(CSRF対策)
    try:
        saved = jwt.decode(
            request.cookies.get(STATE_COOKIE) or "",
            auth_utils.SECRET_KEY,
            algorithms=[auth_utils.ALGORITHM],
        )
    except JWTError:
        return _error_redirect("google_state")
    if saved.get("purpose") != STATE_PURPOSE or not state or not secrets.compare_digest(saved.get("state", ""), state):
        return _error_redirect("google_state")
    if not code:
        return _error_redirect("google_failed")

    # 2. トークン交換とIDトークン検証
    try:
        info = _fetch_google_identity(code, saved["cv"])
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Googleログイン: IDトークンの取得・検証に失敗: {e}")
        return _error_redirect("google_failed")

    if not secrets.compare_digest(str(info.get("nonce", "")), saved.get("nonce", "")):
        return _error_redirect("google_state")
    if not info.get("email_verified") or not info.get("email") or not info.get("sub"):
        return _error_redirect("google_email_unverified")

    sub = str(info["sub"])
    email = normalize_email(info["email"])
    name = (info.get("name") or "").strip()

    identity = db.query(models.UserIdentity).filter(
        models.UserIdentity.provider == PROVIDER,
        models.UserIdentity.provider_subject == sub,
    ).first()

    # 連携モード(アカウント設定から開始, §4.1)。Googleのメールと登録メールが違っていてもよい
    if saved.get("link_uid"):
        return _complete_link_from_settings(db, saved["link_uid"], identity, sub, email)

    # 3. ユーザーの判定(§4)

    # 3-1. 連携済み → ログイン
    if identity:
        identity.last_login_at = _now()
        identity.email = email
        ticket = _issue_ticket(db, "login", user_id=identity.user_id)
        db.commit()
        return _redirect_to_frontend(f"/auth/google/callback#ticket={ticket}")

    user = find_user_by_email(db, email)

    # 3-2. 同じメールの既存ユーザー
    if user:
        already_linked_other = db.query(models.UserIdentity).filter(
            models.UserIdentity.user_id == user.id,
            models.UserIdentity.provider == PROVIDER,
        ).first()
        if already_linked_other:
            # 別のGoogleアカウントが既に連携されている
            return _error_redirect("google_other_account")

        if user.email_verified_at is not None or not user.password_hash:
            # メール所有が確認済み(またはパスワード未設定)→ 自動で連携
            _link_identity(db, user, sub, email)
            ticket = _issue_ticket(db, "login", user_id=user.id)
            db.commit()
            return _redirect_to_frontend(f"/auth/google/callback#ticket={ticket}")

        # メール未確認のパスワードアカウント → パスワード確認を挟む(案A、乗っ取り対策)
        ticket = _issue_ticket(db, "link_confirm", user_id=user.id, payload={
            "sub": sub, "email": email, "failures": 0,
        })
        db.commit()
        return _redirect_to_frontend(f"/login/link-google#ticket={ticket}")

    # 3-3. 新規 → 追加入力画面へ
    ticket = _issue_ticket(db, "signup", payload={
        "sub": sub, "email": email, "name": name, "ref": saved.get("ref"),
    })
    db.commit()
    return _redirect_to_frontend(f"/register/google#ticket={ticket}")


def _complete_link_from_settings(
    db: Session,
    link_uid: str,
    identity: Optional[models.UserIdentity],
    sub: str,
    email: str,
) -> RedirectResponse:
    try:
        user = db.query(models.User).filter(models.User.id == uuid.UUID(str(link_uid))).first()
    except ValueError:
        user = None
    if not user:
        return _error_redirect("google_failed")

    if identity:
        if identity.user_id == user.id:
            return _settings_redirect("linked")  # 連携済み(二重に押した場合など)
        return _settings_redirect("already_linked")  # 別ユーザーに連携済みのGoogleアカウント

    if db.query(models.UserIdentity).filter(
        models.UserIdentity.user_id == user.id,
        models.UserIdentity.provider == PROVIDER,
    ).first():
        return _settings_redirect("other_account")  # 別のGoogleアカウントを連携済み

    _link_identity(db, user, sub, email)
    db.commit()
    return _settings_redirect("linked")


# ---------------------------------------------------------------------------
# フロントから呼ぶ API
# ---------------------------------------------------------------------------

@router.post("/exchange", response_model=schemas.TokenResponse)
def exchange(body: schemas.GoogleTicketRequest, db: Session = Depends(get_db)):
    ticket = _get_ticket(db, body.ticket, "login")
    ticket.used_at = _now()
    user = db.query(models.User).filter(models.User.id == ticket.user_id).first()
    if not user:
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)
    db.commit()
    return schemas.TokenResponse(access_token=auth_utils.create_access_token({"sub": str(user.id)}))


@router.post("/ticket-info", response_model=schemas.GoogleTicketInfoResponse)
def ticket_info(body: schemas.GoogleTicketInfoRequest, db: Session = Depends(get_db)):
    """追加入力画面・連携確認画面の表示用(チケットは使用済みにしない)"""
    if body.purpose not in ("signup", "link_confirm"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)
    ticket = _get_ticket(db, body.ticket, body.purpose)
    payload = ticket.payload or {}
    return schemas.GoogleTicketInfoResponse(
        email=payload.get("email", ""),
        name=payload.get("name") if body.purpose == "signup" else None,
        referral_code=payload.get("ref") if body.purpose == "signup" else None,
    )


@router.post("/complete-signup", response_model=schemas.TokenResponse)
def complete_signup(body: schemas.GoogleCompleteSignupRequest, db: Session = Depends(get_db)):
    if not body.agreed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="すべての同意事項にチェックしてください")
    name = body.name.strip()
    if not name or len(name) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="氏名を入力してください")

    ticket = _get_ticket(db, body.ticket, "signup")
    payload = ticket.payload or {}
    sub, email = payload.get("sub"), payload.get("email")
    if not sub or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)

    # チケット発行から30分の間に、別経路で登録・連携されていないか再確認する
    if db.query(models.UserIdentity).filter(
        models.UserIdentity.provider == PROVIDER,
        models.UserIdentity.provider_subject == sub,
    ).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このGoogleアカウントは登録済みです。ログイン画面から「Google で続ける」を押してください。",
        )
    if find_user_by_email(db, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスはすでに登録されています。ログイン画面から「Google で続ける」を押してください。",
        )

    referral_code = (body.referral_code or payload.get("ref") or "").strip().upper() or None
    user = create_user(
        db,
        name=name,
        email=email,
        password_hash=None,
        icf_level=body.icf_level,
        referral_code=referral_code,
        signup_method="google",
        email_verified_at=_now(),
    )
    _link_identity(db, user, sub, email)
    ticket.used_at = _now()
    db.commit()
    return schemas.TokenResponse(access_token=auth_utils.create_access_token({"sub": str(user.id)}))


@router.post("/confirm-link", response_model=schemas.TokenResponse)
def confirm_link(body: schemas.GoogleConfirmLinkRequest, db: Session = Depends(get_db)):
    ticket = _get_ticket(db, body.ticket, "link_confirm")
    payload = dict(ticket.payload or {})
    user = db.query(models.User).filter(models.User.id == ticket.user_id).first()
    if not user or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)

    if not user.password_hash or not auth_utils.verify_password(body.password, user.password_hash):
        # フロントの apiRequest は 401 でログイン画面へ飛ばすため、400 で返す
        payload["failures"] = int(payload.get("failures", 0)) + 1
        ticket.payload = payload
        if payload["failures"] >= LINK_CONFIRM_MAX_FAILURES:
            ticket.used_at = _now()
            db.commit()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="パスワードが正しくありません")

    if db.query(models.UserIdentity).filter(
        models.UserIdentity.provider == PROVIDER,
        models.UserIdentity.provider_subject == payload["sub"],
    ).first() or db.query(models.UserIdentity).filter(
        models.UserIdentity.user_id == user.id,
        models.UserIdentity.provider == PROVIDER,
    ).first():
        ticket.used_at = _now()
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=TICKET_EXPIRED_MESSAGE)

    _link_identity(db, user, payload["sub"], payload.get("email", ""))
    # パスワードを知っている本人が、Googleで確認済みのメールの持ち主でもあると確認できた
    if user.email_verified_at is None:
        user.email_verified_at = _now()
    ticket.used_at = _now()
    db.commit()
    return schemas.TokenResponse(access_token=auth_utils.create_access_token({"sub": str(user.id)}))


def delete_stale_auth_tickets(db: Session) -> int:
    """期限切れ・使用済みのチケットを削除する(毎日のジョブから呼ぶ)"""
    count = db.query(models.AuthTicket).filter(
        (models.AuthTicket.used_at != None) | (models.AuthTicket.expires_at < _now())  # noqa: E711
    ).delete(synchronize_session=False)
    db.commit()
    return count
