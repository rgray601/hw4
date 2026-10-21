"""Password storage for Campus Customs accounts.

Signup and login must share these settings. The stored value is
pbkdf2_sha256$salt$hash. The salt is the middle piece used as text,
not decoded. The hash is the hex digest. Nothing here can recover
the original password.
"""

import hashlib
import hmac
import secrets

SCHEME = "pbkdf2_sha256"
ITERATIONS = 120_000

_dummy_hash: str | None = None


def hash_password(password: str, salt: str | None = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        ITERATIONS,
    ).hex()
    return f"{SCHEME}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    parts = stored.split("$")
    if len(parts) != 3 or parts[0] != SCHEME or not parts[1] or not parts[2]:
        return False
    _, salt, digest = parts
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        ITERATIONS,
    ).hex()
    if len(candidate) != len(digest):
        return False
    return hmac.compare_digest(candidate, digest.lower())


def password_matches(password: str, stored: str | None) -> bool:
    """Check a login. A missing account still runs a hash so it is not a fast reject."""
    if not stored:
        verify_password(password, dummy_hash())
        return False
    return verify_password(password, stored)


def dummy_hash() -> str:
    global _dummy_hash
    if _dummy_hash is None:
        _dummy_hash = hash_password("not-a-real-password")
    return _dummy_hash
