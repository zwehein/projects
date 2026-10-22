import os
import uuid

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from app.config import Config

bp = Blueprint("uploads", __name__)


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTENSIONS


@bp.route("/uploads", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "file is required"}), 400

    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "file is required"}), 400

    raw_name = secure_filename(f.filename)
    if not raw_name or not _allowed(raw_name):
        return jsonify({"error": "unsupported file type"}), 422

    ext = os.path.splitext(raw_name)[1].lower() or ".bin"
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(Config.UPLOAD_FOLDER, stored)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    f.save(dest)

    base = Config.BASE_URL.rstrip("/")
    url = f"{base}/static/uploads/{stored}"
    return jsonify({"url": url}), 201
