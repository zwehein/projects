import os
from pathlib import Path

from dotenv import load_dotenv

from app import create_app

_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

app = create_app()

if __name__ == "__main__":
    # Default 5001: macOS often binds AirPlay Receiver to :5000 (ControlCenter), not Flask.
    app.run(host="0.0.0.0", port=int(os.environ.get("FLASK_PORT", "5001")), debug=True)
