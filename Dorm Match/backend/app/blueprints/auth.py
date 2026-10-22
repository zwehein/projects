import pymysql
from flask import Blueprint, jsonify, request

from app.auth_helpers import create_token, hash_password, verify_password
from app.db import get_db

bp = Blueprint("auth", __name__)


def _user_public(row: dict) -> dict:
    return {
        "id": row["id"],
        "email": row["email"],
        "display_name": row["display_name"],
        "avatar": row.get("avatar") or "",
        "line": row.get("line") or "",
        "phone": row.get("phone") or "",
    }


@bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = (data.get("display_name") or "").strip()

    if not email or not password or not display_name:
        return jsonify({"error": "email, password, and display_name are required"}), 422

    pw_hash = hash_password(password)

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, display_name, avatar, line, phone, member_since)
                    VALUES (%s, %s, %s, %s, %s, %s, CURDATE())
                    """,
                    (email, pw_hash, display_name, "", "", ""),
                )
                uid = cur.lastrowid
                cur.execute(
                    "SELECT id, email, display_name, avatar, line, phone FROM users WHERE id = %s",
                    (uid,),
                )
                user = cur.fetchone()
    except pymysql.err.IntegrityError:
        return jsonify({"error": "email already registered"}), 422

    token = create_token(user["id"])
    return jsonify({"token": token, "user": _user_public(user)}), 201


@bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 422

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, password_hash, display_name, avatar, line, phone
                FROM users WHERE email = %s
                """,
                (email,),
            )
            user = cur.fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_token(user["id"])
    user.pop("password_hash", None)
    return jsonify({"token": token, "user": _user_public(user)})


@bp.route("/auth/logout", methods=["POST"])
def logout():
    return "", 204
