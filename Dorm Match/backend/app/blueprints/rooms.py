from datetime import date

from flask import Blueprint, jsonify, request

from app.auth_helpers import get_current_user_id
from app.db import get_db
from app.serializers import poster_from_room_row, serialize_review, serialize_room

bp = Blueprint("rooms", __name__)


def _pick(data: dict, *keys):
    for k in keys:
        if k in data and data[k] is not None:
            return data[k]
    return None


def _pagination():
    if request.args.get("page") is not None:
        page = max(int(request.args.get("page") or 1), 1)
        page_size = min(max(int(request.args.get("page_size") or 20), 1), 100)
        offset = (page - 1) * page_size
        limit = page_size
        return limit, offset
    limit = min(max(int(request.args.get("limit") or 20), 1), 100)
    offset = max(int(request.args.get("offset") or 0), 0)
    return limit, offset


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


def _initials(name: str) -> str:
    name = (name or "").strip()
    if not name:
        return "??"
    parts = name.split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()[:2]
    return name[:2].upper()


def _room_to_json(conn, room_row: dict) -> dict:
    rid = room_row["id"]
    with conn.cursor() as cur:
        photos = _load_photos(cur, rid)
        amenities = _load_amenities(cur, rid)
        rating, reviews_count = _rating_stats(cur, rid)
    poster = poster_from_room_row(room_row)
    return serialize_room(room_row, photos, amenities, poster, rating, reviews_count)


def _get_room_row(conn, room_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM rooms WHERE id = %s", (room_id,))
        return cur.fetchone()


def _ensure_owner(conn, room_id: int, user_id: int) -> dict | None:
    row = _get_room_row(conn, room_id)
    if not row:
        return None
    if row.get("owner_id") != user_id:
        return False
    return row


@bp.route("/rooms", methods=["GET"])
def list_rooms():
    type_filter = request.args.get("type")
    max_price = request.args.get("max_price")
    q = request.args.get("q")
    sort = (request.args.get("sort") or "newest").strip()
    min_rating = request.args.get("min_rating")
    limit, offset = _pagination()

    where = ["r.status = 'active'"]
    params: list = []

    if type_filter:
        where.append("r.type = %s")
        params.append(type_filter)

    if max_price is not None and max_price != "":
        where.append("r.price <= %s")
        params.append(float(max_price))

    if q:
        where.append("(r.title LIKE %s OR r.location LIKE %s)")
        like = f"%{q}%"
        params.extend([like, like])

    if min_rating is not None and min_rating != "":
        where.append("COALESCE(rv.avg_rating, 0) >= %s")
        params.append(float(min_rating))

    where_sql = " AND ".join(where)

    order_sql = {
        "rating": "COALESCE(rv.avg_rating, 0) DESC, r.id DESC",
        "price_asc": "r.price ASC, r.id ASC",
        "price_desc": "r.price DESC, r.id DESC",
        "newest": "r.available ASC, r.id ASC",
    }.get(sort, "r.created_at DESC, r.id DESC")

    sql = f"""
        SELECT r.*,
               COALESCE(rv.avg_rating, 0) AS agg_rating,
               COALESCE(rv.review_count, 0) AS agg_reviews
        FROM rooms r
        LEFT JOIN (
            SELECT room_id,
                   AVG(rating) AS avg_rating,
                   COUNT(*) AS review_count
            FROM reviews
            WHERE room_id IS NOT NULL
            GROUP BY room_id
        ) rv ON rv.room_id = r.id
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

        out = [_room_to_json(conn, dict(r)) for r in rows]

    return jsonify(out)


@bp.route("/rooms/<int:room_id>", methods=["GET"])
def get_room(room_id: int):
    uid = get_current_user_id()
    with get_db() as conn:
        row = _get_room_row(conn, room_id)
        if not row:
            return jsonify({"error": "room not found"}), 404
        if row["status"] != "active":
            if not uid or row.get("owner_id") != uid:
                return jsonify({"error": "room not found"}), 404
        payload = _room_to_json(conn, row)
    return jsonify(payload)


@bp.route("/rooms", methods=["POST"])
def create_room():
    data = request.get_json(silent=True) or {}
    uid = get_current_user_id()

    title = _pick(data, "title")
    rtype = _pick(data, "type", "roomType")
    price = _pick(data, "price")
    location = _pick(data, "location")
    distance = _pick(data, "distance")
    available = _pick(data, "available")
    description = _pick(data, "description")
    photos = _pick(data, "photos") or []
    amenities = _pick(data, "amenities") or []

    poster_obj = data.get("poster") if isinstance(data.get("poster"), dict) else {}
    contact_name = (
        (_pick(data, "contact_name", "contactName") or poster_obj.get("name") or "")
        .strip()
    )
    line_val = str(
        _pick(data, "line") if _pick(data, "line") is not None else poster_obj.get("line") or ""
    ).strip()
    phone_val = str(
        _pick(data, "phone") if _pick(data, "phone") is not None else poster_obj.get("phone") or ""
    ).strip()
    avatar_raw = _pick(data, "poster_avatar") or poster_obj.get("avatar")

    if not title or not rtype or price is None or not location:
        return jsonify({"error": "title, type, price, and location are required"}), 422

    if not contact_name:
        return jsonify({"error": "contact name is required"}), 422
    if not line_val and not phone_val:
        return jsonify({"error": "at least one of line or phone is required"}), 422

    try:
        price_val = float(price)
    except (TypeError, ValueError):
        return jsonify({"error": "invalid price"}), 422

    if not isinstance(photos, list) or not isinstance(amenities, list):
        return jsonify({"error": "photos and amenities must be arrays"}), 422

    poster_avatar = (str(avatar_raw).strip() if avatar_raw else "") or _initials(contact_name)
    owner_id = uid
    avail_str = available or date.today().isoformat()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO rooms (
                  owner_id, title, type, price, location, distance,
                  available, description, status,
                  poster_name, line, phone, poster_avatar
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'active', %s, %s, %s, %s)
                """,
                (
                    owner_id,
                    title,
                    rtype,
                    price_val,
                    location,
                    distance or "",
                    avail_str,
                    description or "",
                    contact_name,
                    line_val,
                    phone_val,
                    poster_avatar,
                ),
            )
            rid = cur.lastrowid

            for i, url in enumerate(photos):
                cur.execute(
                    """
                    INSERT INTO room_photos (room_id, photo_url, sort_order)
                    VALUES (%s, %s, %s)
                    """,
                    (rid, url, i),
                )

            for name in amenities:
                cur.execute(
                    """
                    INSERT INTO room_amenities (room_id, amenity_name)
                    VALUES (%s, %s)
                    """,
                    (rid, str(name)),
                )

        row = _get_room_row(conn, rid)
        payload = _room_to_json(conn, row)

    return jsonify(payload), 201


@bp.route("/rooms/<int:room_id>", methods=["PATCH"])
def patch_room(room_id: int):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    data = request.get_json(silent=True) or {}
    if not isinstance(data, dict) or not data:
        return jsonify({"error": "no fields to update"}), 400

    poster_obj = data.get("poster") if isinstance(data.get("poster"), dict) else {}
    poster_name = _pick(data, "poster_name", "contact_name", "contactName")
    if poster_name is None:
        poster_name = poster_obj.get("name")
    line_u = _pick(data, "line")
    if line_u is None:
        line_u = poster_obj.get("line")
    phone_u = _pick(data, "phone")
    if phone_u is None:
        phone_u = poster_obj.get("phone")
    poster_avatar = _pick(data, "poster_avatar")
    if poster_avatar is None:
        poster_avatar = poster_obj.get("avatar")

    field_map = [
        ("title", _pick(data, "title")),
        ("type", _pick(data, "type", "roomType")),
        ("price", _pick(data, "price")),
        ("location", _pick(data, "location")),
        ("distance", _pick(data, "distance")),
        ("available", _pick(data, "available")),
        ("description", _pick(data, "description")),
        ("poster_name", poster_name),
        ("line", line_u),
        ("phone", phone_u),
        ("poster_avatar", poster_avatar),
    ]

    updates = {k: v for k, v in field_map if v is not None}

    photos = _pick(data, "photos")
    amenities = _pick(data, "amenities")

    with get_db() as conn:
        check = _ensure_owner(conn, room_id, uid)
        if check is None:
            return jsonify({"error": "room not found"}), 404
        if check is False:
            return jsonify({"error": "forbidden"}), 403

        with conn.cursor() as cur:
            if updates:
                if "price" in updates:
                    try:
                        updates["price"] = float(updates["price"])
                    except (TypeError, ValueError):
                        return jsonify({"error": "invalid price"}), 422
                sets = ", ".join(f"{k} = %s" for k in updates)
                vals = list(updates.values())
                vals.append(room_id)
                cur.execute(f"UPDATE rooms SET {sets} WHERE id = %s", vals)

            if photos is not None:
                if not isinstance(photos, list):
                    return jsonify({"error": "photos must be an array"}), 422
                cur.execute("DELETE FROM room_photos WHERE room_id = %s", (room_id,))
                for i, url in enumerate(photos):
                    cur.execute(
                        """
                        INSERT INTO room_photos (room_id, photo_url, sort_order)
                        VALUES (%s, %s, %s)
                        """,
                        (room_id, url, i),
                    )

            if amenities is not None:
                if not isinstance(amenities, list):
                    return jsonify({"error": "amenities must be an array"}), 422
                cur.execute(
                    "DELETE FROM room_amenities WHERE room_id = %s",
                    (room_id,),
                )
                for name in amenities:
                    cur.execute(
                        """
                        INSERT INTO room_amenities (room_id, amenity_name)
                        VALUES (%s, %s)
                        """,
                        (room_id, str(name)),
                    )

        row = _get_room_row(conn, room_id)
        payload = _room_to_json(conn, row)

    return jsonify(payload)


@bp.route("/rooms/<int:room_id>", methods=["DELETE"])
def delete_room(room_id: int):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    with get_db() as conn:
        check = _ensure_owner(conn, room_id, uid)
        if check is None:
            return jsonify({"error": "room not found"}), 404
        if check is False:
            return jsonify({"error": "forbidden"}), 403
        with conn.cursor() as cur:
            cur.execute("DELETE FROM room_photos WHERE room_id = %s", (room_id,))
            cur.execute("DELETE FROM room_amenities WHERE room_id = %s", (room_id,))
            cur.execute("DELETE FROM contact_events WHERE room_id = %s", (room_id,))
            cur.execute("DELETE FROM reviews WHERE room_id = %s", (room_id,))
            cur.execute("DELETE FROM rooms WHERE id = %s", (room_id,))

    return "", 204


def _set_room_status(room_id: int, status: str):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    with get_db() as conn:
        check = _ensure_owner(conn, room_id, uid)
        if check is None:
            return jsonify({"error": "room not found"}), 404
        if check is False:
            return jsonify({"error": "forbidden"}), 403
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE rooms SET status = %s WHERE id = %s",
                (status, room_id),
            )
        row = _get_room_row(conn, room_id)
        payload = _room_to_json(conn, row)
    return jsonify(payload)


@bp.route("/rooms/<int:room_id>/publish", methods=["POST"])
def publish_room(room_id: int):
    return _set_room_status(room_id, "active")


@bp.route("/rooms/<int:room_id>/unpublish", methods=["POST"])
def unpublish_room(room_id: int):
    return _set_room_status(room_id, "draft")


@bp.route("/rooms/<int:room_id>/reviews", methods=["GET"])
def room_reviews(room_id: int):
    limit = min(max(int(request.args.get("limit") or 50), 1), 100)
    offset = max(int(request.args.get("offset") or 0), 0)

    with get_db() as conn:
        row = _get_room_row(conn, room_id)
        if not row:
            return jsonify({"error": "room not found"}), 404
        uid = get_current_user_id()
        if row["status"] != "active":
            if not uid or row.get("owner_id") != uid:
                return jsonify({"error": "room not found"}), 404

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM reviews
                WHERE room_id = %s
                ORDER BY review_date DESC, id DESC
                LIMIT %s OFFSET %s
                """,
                (room_id, limit, offset),
            )
            revs = cur.fetchall()

    return jsonify([serialize_review(dict(r)) for r in revs])
