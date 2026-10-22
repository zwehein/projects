import os


class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-flask-secret")

    MYSQL_HOST = os.environ.get("MYSQL_HOST") or os.environ.get("DB_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.environ.get("MYSQL_PORT") or os.environ.get("DB_PORT", "13307"))
    MYSQL_USER = os.environ.get("MYSQL_USER") or os.environ.get("DB_USER", "roomie")
    MYSQL_PASSWORD = os.environ.get("MYSQL_PASSWORD") or os.environ.get("DB_PASSWORD", "")
    MYSQL_DATABASE = os.environ.get("MYSQL_DATABASE") or os.environ.get("DB_NAME", "roomie")

    JWT_SECRET = (
        os.environ.get("JWT_SECRET")
        or os.environ.get("JWT_SECRET_KEY")
        or "dev-secret-change-me"
    )
    JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "168"))

    BASE_URL = os.environ.get("BASE_URL", "http://localhost:5001")

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    if not os.path.isabs(UPLOAD_FOLDER):
        UPLOAD_FOLDER = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), UPLOAD_FOLDER
        )
