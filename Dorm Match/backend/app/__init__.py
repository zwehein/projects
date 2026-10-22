import os

from flask import Flask, abort, jsonify, send_from_directory
from flask_cors import CORS

from app.blueprints.auth import bp as auth_bp
from app.blueprints.contacts import bp as contacts_bp
from app.blueprints.me import bp as me_bp
from app.blueprints.reviews import bp as reviews_bp
from app.blueprints.rooms import bp as rooms_bp
from app.blueprints.stats import bp as stats_bp
from app.blueprints.uploads import bp as uploads_bp
from app.config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config["SECRET_KEY"] = Config.SECRET_KEY

    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

    @app.after_request
    def add_cors(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    @app.errorhandler(Exception)
    def handle_exception(e):
        code = getattr(e, "code", 500)
        msg = getattr(e, "description", None) or str(e) or "Internal server error"
        return jsonify({"error": msg}), code

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(rooms_bp, url_prefix="/api")
    app.register_blueprint(reviews_bp, url_prefix="/api")
    app.register_blueprint(stats_bp, url_prefix="/api")
    app.register_blueprint(me_bp, url_prefix="/api")
    app.register_blueprint(uploads_bp, url_prefix="/api")
    app.register_blueprint(contacts_bp, url_prefix="/api")

    @app.route("/static/uploads/<filename>")
    def serve_upload(filename):
        if filename.startswith(".") or "/" in filename or "\\" in filename:
            abort(404)
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    return app
