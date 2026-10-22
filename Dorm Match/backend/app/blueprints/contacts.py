from flask import Blueprint, jsonify, request

from app.auth_helpers import get_current_user_id
from app.db import get_db

bp = Blueprint("contacts", __name__)


@bp.route("/rooms/<int:room_id>/contact-events", methods=["POST"])
def create_contact_event(room_id: int):
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    data = request.get_json(silent=True) or {}
    channel = (data.get("channel") or "").strip().lower()
    if channel not in ("call", "line"):
        return jsonify({"error": "channel must be call or line"}), 422

    row = None
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM rooms WHERE id = %s", (room_id,))
            if not cur.fetchone():
                return jsonify({"error": "room not found"}), 404

            cur.execute(
                """
                INSERT INTO contact_events (room_id, user_id, channel)
                VALUES (%s, %s, %s)
                """,
                (room_id, uid, channel),
            )
            eid = cur.lastrowid
            cur.execute(
                """
                SELECT ce.id, ce.room_id, ce.user_id, ce.channel, ce.created_at,
                       r.title AS room_title, r.location AS room_location
                FROM contact_events ce
                JOIN rooms r ON r.id = ce.room_id
                WHERE ce.id = %s
                """,
                (eid,),
            )
            row = cur.fetchone()

    return jsonify(
        {
            "id": row["id"],
            "roomId": row["room_id"],
            "channel": row["channel"],
            "createdAt": row["created_at"].isoformat()
            if row.get("created_at")
            else None,
            "roomTitle": row.get("room_title"),
            "roomLocation": row.get("room_location"),
        }
    ), 201


@bp.route("/me/contacts", methods=["GET"])
def me_contacts():
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "authentication required"}), 401

    limit = min(max(int(request.args.get("limit") or 50), 1), 100)
    offset = max(int(request.args.get("offset") or 0), 0)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ce.id, ce.room_id, ce.user_id, ce.channel, ce.created_at,
                       r.title AS room_title, r.location AS room_location
                FROM contact_events ce
                JOIN rooms r ON r.id = ce.room_id
                WHERE ce.user_id = %s
                ORDER BY ce.created_at DESC
                LIMIT 500
                """,
                (uid,),
            )
            rows = cur.fetchall()

    seen = set()
    deduped = []
    for r in rows:
        rid = r["room_id"]
        if rid in seen:
            continue
        seen.add(rid)
        deduped.append(r)

    sliced = deduped[offset : offset + limit]
    out = [
        {
            "id": r["id"],
            "roomId": r["room_id"],
            "channel": r["channel"],
            "createdAt": r["created_at"].isoformat()
            if r.get("created_at")
            else None,
            "roomTitle": r.get("room_title"),
            "roomLocation": r.get("room_location"),
        }
        for r in sliced
    ]

    return jsonify(out)
