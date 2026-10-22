import bcrypt
import jwt
from flask import Request, request

from app.config import Config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    import datetime as dt

    payload = {
        "sub": str(user_id),
        "exp": dt.datetime.utcnow()
        + dt.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": dt.datetime.utcnow(),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)


def _extract_bearer_token(req: Request) -> str | None:
    auth = req.headers.get("Authorization") or ""
    parts = auth.split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


def get_current_user_id() -> int | None:
    token = _extract_bearer_token(request)
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            Config.JWT_SECRET,
            algorithms=[Config.JWT_ALGORITHM],
        )
        uid = payload.get("sub")
        return int(uid) if uid is not None else None
    except jwt.PyJWTError:
        return None
