from flask import Blueprint, jsonify, request

from app.auth_helpers import get_current_user_id
from app.db import get_db
from app.serializers import serialize_review

bp = Blueprint("reviews", __name__)


def _pick(data: dict, *keys):
    for k in keys:
        if k in data and data[k] is not None:
            return data[k]
    return None


@bp.route("/reviews", methods=["GET"])
def list_reviews():
    room_id = request.args.get("room_id")
    rtype = request.args.get("type")
    limit = min(max(int(request.args.get("limit") or 50), 1), 100)
    offset = max(int(request.args.get("offset") or 0), 0)

    where = ["1=1"]
    params: list = []

    if room_id is not None and room_id != "":
        try:
            rid_val = int(room_id)
        except (TypeError, ValueError):
            return jsonify({"error": "invalid room_id"}), 422
        where.append("room_id = %s")
        params.append(rid_val)

    if rtype is not None and rtype != "":
        where.append("review_type = %s")
        params.append(rtype)

    where_sql = " AND ".join(where)
    sql = f"""
        SELECT * FROM reviews
        WHERE {where_sql}
        ORDER BY review_date DESC, id DESC
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return jsonify([serialize_review(dict(r)) for r in rows])


@bp.route("/reviews", methods=["POST"])
def create_review():
    data = request.get_json(silent=True) or {}
    uid = get_current_user_id()

    rating = _pick(data, "rating")
    comment = _pick(data, "comment") or ""
    room_id = _pick(data, "room_id", "roomId")
    review_type = _pick(data, "review_type", "type")

    if rating is None:
        return jsonify({"error": "rating is required"}), 422

    try:
        rating_val = float(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "invalid rating"}), 422

    if rating_val < 0 or rating_val > 5:
        return jsonify({"error": "rating must be between 0 and 5"}), 422

    room_id_val = None
    if room_id is not None and room_id != "":
        try:
            room_id_val = int(room_id)
        except (TypeError, ValueError):
            return jsonify({"error": "invalid room_id"}), 422

    if uid:
        user_id_val = uid
    else:
        user_id_val = None
        author_stub = (_pick(data, "author") or "").strip()
        avatar_stub = (_pick(data, "avatar") or "").strip()
        if not author_stub:
            return jsonify({"error": "author is required for anonymous reviews"}), 422

    with get_db() as conn:
        with conn.cursor() as cur:
            if uid:
                cur.execute(
                    """
                    SELECT display_name, avatar FROM users WHERE id = %s
                    """,
                    (uid,),
                )
                u = cur.fetchone()
                if not u:
                    return jsonify({"error": "invalid user"}), 401
                author = u["display_name"]
                avatar = u.get("avatar") or ""
            else:
                author = author_stub
                avatar = avatar_stub

            if room_id_val is not None:
                cur.execute("SELECT id FROM rooms WHERE id = %s", (room_id_val,))
                if not cur.fetchone():
                    return jsonify({"error": "room not found"}), 404

            cur.execute(
                """
                INSERT INTO reviews (
                  room_id, user_id, author, avatar, rating, comment, review_type, review_date
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURDATE())
                """,
                (
                    room_id_val,
                    user_id_val,
                    author,
                    avatar,
                    rating_val,
                    comment,
                    review_type,
                ),
            )
            rid = cur.lastrowid
            cur.execute("SELECT * FROM reviews WHERE id = %s", (rid,))
            row = cur.fetchone()

    return jsonify(serialize_review(dict(row))), 201
