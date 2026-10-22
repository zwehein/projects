from flask import Blueprint, jsonify

from app.db import get_db

bp = Blueprint("stats", __name__)


@bp.route("/stats", methods=["GET"])
def stats():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                  (SELECT COUNT(*) FROM rooms WHERE status = 'active') AS listings_count,
                  (SELECT COUNT(*) FROM users) AS users_count,
                  (SELECT AVG(rating) FROM reviews WHERE room_id IS NOT NULL) AS avg_rating
                """
            )
            row = cur.fetchone()

    avg = row.get("avg_rating")
    return jsonify(
        {
            "listingsCount": int(row["listings_count"] or 0),
            "usersCount": int(row["users_count"] or 0),
            "avgRating": round(float(avg), 2) if avg is not None else 0.0,
        }
    )
