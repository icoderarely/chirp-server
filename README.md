# Chirp Server

Backend for Chirp, a chat application. This is an npm workspaces monorepo of TypeScript microservices that share MongoDB, Redis, and RabbitMQ.

## Architecture

```
Client
  │
  ▼
┌─────────────┐     REST      ┌──────────────┐     publish      ┌──────────────┐
│   Gateway   │ ─────────────▶│ User service │ ── send-otp ───▶ │ Mail service │
│  (planned)  │               │   :3001      │                  │    :3002     │
└─────────────┘               └──────────────┘                  └──────────────┘
                                     │                                 │
                               MongoDB / Redis                    Gmail SMTP
```

| Workspace | Package | Role |
| --- | --- | --- |
| `services/user` | `@server/user` | Auth, registration, profiles |
| `services/mail` | `@server/mail` | Consumes `send-otp` and emails OTPs |
| `services/chat` | `@server/chat` | Planned — not implemented yet |
| `services/gateway` | `@server/gateway` | Planned — not implemented yet |
| `packages/shared` | `@server/shared` | Logger, `TryCatch`, RabbitMQ helpers |

Registration is two-step: the user service stores pending signup data and an OTP in Redis, publishes to the `send-otp` queue, then creates the MongoDB user only after OTP verification.

## Prerequisites

- Node.js 22+
- npm 10+
- Docker (for MongoDB and Redis)
- RabbitMQ running locally (`amqp://admin:admin123@localhost:5672` by default). It is **not** included in `docker-compose.yml` yet.

## Setup

```bash
cd server
npm install
docker compose up -d
```

Create a `.env` in each service that needs one. Do not commit these files.

**`services/user/.env`**

```env
SERVICE_NAME=user
PORT=3001

MONGODB_URI=mongodb://admin:password@localhost:27017/chirp?authSource=admin
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
```

**`services/mail/.env`**

```env
PORT=3002

EMAIL_USER=your-gmail@example.com
EMAIL_PASSWORD=your-gmail-app-password

RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

Mail uses Gmail via Nodemailer. `EMAIL_PASSWORD` must be a [Gmail App Password](https://support.google.com/accounts/answer/185833), not the account password.

**`packages/shared/.env`**

```env
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

Docker Compose credentials for MongoDB are `admin` / `password`. Redis has no password in local compose.

## Scripts

From `server/`:

| Command | Description |
| --- | --- |
| `npm run dev` | Start user, chat, mail, and gateway together |
| `npm run dev:user` | User service only (`tsx watch`) |
| `npm run dev:mail` | Mail service only |
| `npm run dev:chat` | Chat service only |
| `npm run dev:gateway` | Gateway only |
| `npm run build` | Compile every workspace that has a build script |
| `npm run start` | Run compiled `dist/` output |

A single service:

```bash
npm run dev -w @server/user
```

## User API

Base URL: `http://localhost:3001/users`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/register` | No | Start signup; sends OTP |
| `POST` | `/verify-otp` | No | Confirm OTP and create the user |
| `POST` | `/login` | No | Return a JWT |
| `GET` | `/my-profile` | Bearer | Current user |
| `PUT` | `/update-user` | Bearer | Update `name` and/or `username` |
| `GET` | `/:username` | Bearer | Look up a user |

Protected routes expect:

```http
Authorization: Bearer <token>
```

### Register

```http
POST /users/register
Content-Type: application/json

{
  "name": "Ada Lovelace",
  "username": "ada",
  "email": "ada@example.com",
  "password": "secret1"
}
```

Pending registration and the OTP expire after 5 minutes. OTP guesses are limited to 5 attempts.

### Verify OTP

```http
POST /users/verify-otp
Content-Type: application/json

{
  "username": "ada",
  "otp": "123456"
}
```

Returns the user (without password) and a JWT.

### Login

```http
POST /users/login
Content-Type: application/json

{
  "username": "ada",
  "password": "secret1"
}
```

Login is rate-limited to 3 attempts per username per 60 seconds (Redis).

## Infrastructure

`docker-compose.yml` starts:

| Service | Image | Port | Volume |
| --- | --- | --- | --- |
| MongoDB | `mongo:8` | `27017` | `mongo_data` |
| Redis | `redis:8` | `6379` | `redis_data` |

Network: `chirp-network`.

## Shared package

`@server/shared` is imported by every service and currently exports:

- `logger` — Pino (pretty-printed outside production)
- `TryCatch` — Express async error wrapper
- `connectToRabbitMQ` / `getChannel` / `publishToQueue`

Path aliases (`@/*` → `src/*`) are defined in `tsconfig.base.json` and rewritten on build with `tsc-alias`.
