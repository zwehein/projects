from datetime import date, datetime
from typing import Any


def poster_from_room_row(room: dict) -> dict:
    return {
        "display_name": room.get("poster_name") or "",
        "line": room.get("line") or "",
        "phone": room.get("phone") or "",
        "avatar": room.get("poster_avatar") or "",
    }


def _iso_date(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    s = str(value)
    return s[:10] if len(s) >= 10 else s


def serialize_room(
    room: dict,
    photos: list[str],
    amenities: list[str],
    poster: dict | None,
    rating: float,
    reviews_count: int,
) -> dict:
    p = poster or {}
    name = p.get("display_name") or p.get("name") or ""
    return {
        "id": room["id"],
        "title": room["title"],
        "type": room["type"],
        "price": float(room["price"]) if room.get("price") is not None else 0.0,
        "location": room.get("location") or "",
        "distance": room.get("distance") or "",
        "available": _iso_date(room.get("available")),
        "photos": photos,
        "amenities": amenities,
        "poster": {
            "name": name,
            "line": p.get("line") or "",
            "phone": p.get("phone") or "",
            "avatar": p.get("avatar") or "",
        },
        "rating": round(float(rating), 2) if rating is not None else 0.0,
        "reviews": int(reviews_count),
        "description": room.get("description") or "",
    }


def serialize_review(row: dict) -> dict:
    out = {
        "id": row["id"],
        "roomId": row.get("room_id"),
        "author": row.get("author") or "",
        "avatar": row.get("avatar") or "",
        "rating": float(row["rating"]) if row.get("rating") is not None else 0.0,
        "date": _iso_date(row.get("review_date") or row.get("created_at")),
        "comment": row.get("comment") or "",
    }
    rt = row.get("review_type")
    if rt:
        out["type"] = rt
    return out
