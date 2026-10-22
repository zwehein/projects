# Dorm Match (Roomie)

A roommate-finding mobile app created for an application development course. Roomie helps students browse accommodation listings, manage their own listings, and connect with potential roommates.

## Highlights

- Expo mobile app built with React Native and TypeScript.
- Flask API with account authentication, room listings, reviews, and user profile endpoints.
- MySQL database with a Docker Compose development setup.
- Optional API configuration for running the app against a local backend.

## Technology

React Native · Expo · TypeScript · Flask · MySQL · Docker

## Run the backend

From the project root, start the database and follow the API setup guide:

```bash
docker compose up -d
```

See [`backend/README.md`](backend/README.md) for schema setup, environment configuration, and instructions for starting the Flask API. The API defaults to `http://localhost:5001`.

## Run the mobile app

Install Node.js, then from `frontend/` install dependencies and start Expo:

```bash
npm install
npm start
```

To connect a device or emulator to the backend, set `EXPO_PUBLIC_API_URL` to a reachable API base URL (for example, `http://192.168.x.x:5001`). See [`backend/.env.example`](backend/.env.example) for backend configuration. When no API URL is configured, the app can use its mock data.

## Repository layout

- `frontend/` — Expo mobile application.
- `backend/` — Flask API, database schema, and Docker configuration.
- `docker-compose.yml` — local MySQL service.
