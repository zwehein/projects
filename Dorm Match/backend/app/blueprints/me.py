from flask import Blueprint, jsonify, request

from app.auth_helpers import get_current_user_id
from app.db import get_db
from app.serializers import poster_from_room_row, serialize_review, serialize_room

bp = Blueprint("me", __name__)


def _pick(data: dict, *keys):
    for k in keys:
        if k in data and data[k] is not None:
            return data[k]
    return None


def _require_auth():
    uid = get_current_user_id()
    if not uid:
        return None
    return uid


def _load_photos(cur, room_id: int) -> list[str]:
    cur.execute(
        """
        SELECT photo_url FROM room_photos
        WHERE room_id = %s
        ORDER BY sort_order ASC, id ASC
        """,
        (room_id,),
    )
    return [r["photo_url"] for r in cur.fetchall()]


def _load_amenities(cur, room_id: int) -> list[str]:
    cur.execute(
        """
        SELECT amenity_name FROM room_amenities
        WHERE room_id = %s
        ORDER BY amenity_name ASC
        """,
        (room_id,),
    )
    return [r["amenity_name"] for r in cur.fetchall()]


def _rating_stats(cur, room_id: int) -> tuple[float, int]:
    cur.execute(
        """
        SELECT AVG(rating) AS avg_rating, COUNT(*) AS c
        FROM reviews
        WHERE room_id = %s
        """,
        (room_id,),
    )
    row = cur.fetchone()
    avg = row["avg_rating"]
    cnt = int(row["c"] or 0)
    return (float(avg) if avg is not None else 0.0, cnt)


def _room_to_json(conn, room_row: dict) -> dict:
    rid = room_row["id"]
    with conn.cursor() as cur:
        photos = _load_photos(cur, rid)
        amenities = _load_amenities(cur, rid)
        rating, reviews_count = _rating_stats(cur, rid)
    poster = poster_from_room_row(room_row)
    return serialize_room(room_row, photos, amenities, poster, rating, reviews_count)


@bp.route("/me", methods=["GET"])
def me_get():
    uid = _require_auth()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, display_name, avatar, line, phone,
                       verification_status, member_since
                FROM users WHERE id = %s
                """,
                (uid,),
            )
            user = cur.fetchone()

    if not user:
        return jsonify({"error": "user not found"}), 404

    ms = user.get("member_since")
    return jsonify(
        {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "avatar": user.get("avatar") or "",
            "line": user.get("line") or "",
            "phone": user.get("phone") or "",
            "verification_status": user.get("verification_status") or "none",
            "member_since": ms.isoformat() if hasattr(ms, "isoformat") else str(ms or ""),
        }
    )


@bp.route("/me", methods=["PATCH"])
def me_patch():
    uid = _require_auth()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    data = request.get_json(silent=True) or {}
    display_name = _pick(data, "display_name", "displayName")
    avatar = _pick(data, "avatar")
    line = _pick(data, "line")
    phone = _pick(data, "phone")

    verification_status = _pick(data, "verification_status", "verificationStatus")
    updates = {}
    if display_name is not None:
        updates["display_name"] = display_name
    if avatar is not None:
        updates["avatar"] = avatar
    if line is not None:
        updates["line"] = line
    if phone is not None:
        updates["phone"] = phone
    if verification_status is not None:
        if verification_status not in ("none", "pending", "verified"):
            return jsonify({"error": "invalid verification_status"}), 422
        updates["verification_status"] = verification_status

    if not updates:
        return jsonify({"error": "no valid fields to update"}), 400

    sets = ", ".join(f"{k} = %s" for k in updates)
    vals = list(updates.values())
    vals.append(uid)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE users SET {sets} WHERE id = %s", vals)
            cur.execute(
                """
                SELECT id, email, display_name, avatar, line, phone,
                       verification_status, member_since
                FROM users WHERE id = %s
                """,
                (uid,),
            )
            user = cur.fetchone()

    ms = user.get("member_since")
    return jsonify(
        {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "avatar": user.get("avatar") or "",
            "line": user.get("line") or "",
            "phone": user.get("phone") or "",
            "verification_status": user.get("verification_status") or "none",
            "member_since": ms.isoformat() if hasattr(ms, "isoformat") else str(ms or ""),
        }
    )


@bp.route("/me/listings", methods=["GET"])
def me_listings():
    uid = _require_auth()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM rooms
                WHERE owner_id = %s
                ORDER BY created_at DESC, id DESC
                """,
                (uid,),
            )
            rows = cur.fetchall()

        out = [_room_to_json(conn, dict(r)) for r in rows]

    return jsonify(out)


@bp.route("/me/reviews", methods=["GET"])
def me_reviews():
    uid = _require_auth()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    limit = min(max(int(request.args.get("limit") or 50), 1), 100)
    offset = max(int(request.args.get("offset") or 0), 0)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM reviews
                WHERE user_id = %s
                ORDER BY review_date DESC, id DESC
                LIMIT %s OFFSET %s
                """,
                (uid, limit, offset),
            )
            rows = cur.fetchall()

    return jsonify([serialize_review(dict(r)) for r in rows])
