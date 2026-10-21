"""Signed login tokens. The browser keeps the token, never the password."""

import hashlib
import hmac
import secrets
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SECRET_PATH = ROOT / "backend" / ".session_secret"
TOKEN_DAYS = 14


def _secret() -> bytes:
    if not SECRET_PATH.is_file():
        SECRET_PATH.write_bytes(secrets.token_bytes(32))
    return SECRET_PATH.read_bytes()


def issue_token(user_id: int) -> str:
    expires = int(time.time()) + TOKEN_DAYS * 24 * 60 * 60
    payload = f"{user_id}.{expires}"
    signature = hmac.new(_secret(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def read_user_id(token: str) -> int | None:
    parts = token.split(".")
    if len(parts) != 3:
        return None
    user_raw, expires_raw, signature = parts
    payload = f"{user_raw}.{expires_raw}"
    expected = hmac.new(_secret(), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if len(expected) != len(signature) or not hmac.compare_digest(expected, signature):
        return None
    try:
        user_id = int(user_raw)
        expires = int(expires_raw)
    except ValueError:
        return None
    if user_id <= 0 or expires < time.time():
        return None
    return user_id
