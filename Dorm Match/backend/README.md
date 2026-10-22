# Roomie API (Flask + MySQL)

## Prerequisites

- Docker (MySQL 8 on host port **13307**)
- Python 3.11+ recommended

## 1. Start database

From the **repository root**:

```bash
docker compose up -d
```

Wait until healthy (`docker compose ps`). Apply schema:

```bash
docker compose exec -i db mysql -uroot -proot_dev roomie < backend/schema.sql
```

## 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` if your credentials differ. Variables accept either `MYSQL_*` or `DB_*` / `JWT_SECRET` or `JWT_SECRET_KEY`.

## 3. Run API

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Base URL: `http://localhost:5001` by default (`python run.py`). macOS often uses port **5000** for AirPlay Receiver — use **5001** or set `FLASK_PORT`. All JSON APIs are under **`/api`**.

- `GET /api/rooms`, `GET /api/rooms/:id`, `POST /api/rooms`, `PATCH` / `DELETE` (owner), `POST .../publish`, `.../unpublish`, `GET .../reviews`
- `GET` / `POST /api/reviews`
- `GET /api/stats`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET` / `PATCH /api/me`, `GET /api/me/listings`, `GET /api/me/reviews`, `GET /api/me/contacts`
- `POST /api/rooms/:id/contact-events`
- `POST /api/uploads` (multipart field `file`) — files served at `GET /static/uploads/:filename`

Send `Authorization: Bearer <token>` for protected routes.

## Expo / mobile

Set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:5001` (or dev machine IP) so the device can reach the host; use the same base for `/api/...` and `/static/uploads/...`.
