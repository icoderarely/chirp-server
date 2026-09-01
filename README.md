# Chirp Server

Backend for Chirp, a real-time 1:1 chat application. This is an npm workspaces monorepo of TypeScript microservices that share MongoDB, Redis, and RabbitMQ.

HTTP from the browser goes to the **API gateway** on port `3000`. Do not call user (`:3001`) or chat HTTP (`:3003`) from the browser.

**WebSockets are the exception:** the [client](../client/README.md) connects Socket.IO **directly** to the chat service on port `3003`. The gateway does not proxy sockets.

```mermaid
flowchart LR
  Browser["Browser :5173"]
  GW["Gateway :3000"]
  User["User :3001"]
  Chat["Chat :3003"]
  Mail["Mail :3002"]
  Mongo[(MongoDB)]
  Redis[(Redis)]
  MQ[[RabbitMQ]]

  Browser -->|"HTTP /api/*"| GW
  Browser -->|"Socket.IO"| Chat
  GW --> User
  GW --> Chat
  User --> Mongo
  User --> Redis
  User -->|"send-otp"| MQ
  MQ --> Mail
  Chat --> Mongo
```

Mail is RabbitMQ-only (OTP emails). It is not proxied through the gateway.

| Workspace          | Package           | Role                                                          |
| ------------------ | ----------------- | ------------------------------------------------------------- |
| `services/gateway` | `@server/gateway` | JWT / cookie at the edge, rate limit, proxy to services       |
| `services/user`    | `@server/user`    | Auth, registration, profiles                                  |
| `services/mail`    | `@server/mail`    | Consumes `send-otp` and emails OTPs                           |
| `services/chat`    | `@server/chat`    | Chats, messages, image uploads, Socket.IO                     |
| `packages/shared`  | `@server/shared`  | Logger, `TryCatch`, JWT, cookies, error handler, RabbitMQ     |

Registration is two-step: the user service stores pending signup data and an OTP in Redis, publishes to the `send-otp` queue, then creates the MongoDB user only after OTP verification.

## Auth

Login and verify-otp issue a JWT (`{ userId }`) and set an httpOnly cookie named `chirp_token` (`SameSite=Lax`, `Secure` in production, 1 hour max-age). The JWT lifetime is `JWT_EXPIRES_IN` (default `1d` in the env examples). Logout clears the cookie.

1. The client sends the cookie (and may also send `Authorization: Bearer <jwt>`).
2. The gateway reads the Bearer token if present, otherwise `chirp_token`, and verifies it (`JWT_SECRET`, claim `userId`) on every proxied route except login, register, verify-otp, and logout.
3. The proxy forwards `x-internal-secret` (gateway `INTERNAL_SECRET`) and `x-user-id` to downstream services.
4. **Chat HTTP** trusts those headers only (`trustGateway`). A direct HTTP call to `:3003` with only a Bearer token is rejected.
5. **Chat Socket.IO** verifies the JWT itself (cookie or `handshake.auth.token`) with the same `JWT_SECRET`. It does not go through the gateway.
6. **User** trusts the gateway headers for `my-profile`, `update-user`, `/:username`, and `/id/:userId`. If the request did not come through the gateway (chat’s username lookup), it falls back to verifying the Bearer JWT.

`INTERNAL_SECRET` on gateway, user, and chat must be the same value. `JWT_SECRET` on gateway, user, and chat must match so the gateway and the socket layer can verify tokens issued at login.

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

Copy each workspace `.env.example` to `.env` and fill in the placeholders (`INTERNAL_SECRET` and `JWT_SECRET` must match across the services that share them — see [Auth](#auth)):

```bash
cp services/gateway/.env.example services/gateway/.env
cp services/user/.env.example services/user/.env
cp services/chat/.env.example services/chat/.env
cp services/mail/.env.example services/mail/.env
cp packages/shared/.env.example packages/shared/.env
```

Do not commit the `.env` files. Mail uses Gmail via Nodemailer; `EMAIL_PASSWORD` must be a [Gmail App Password](https://support.google.com/accounts/answer/185833). Docker Compose MongoDB credentials are `admin` / `password`. Redis has no password in local compose.

Gateway and chat also need `CLIENT_ORIGIN` (default `http://localhost:5173`) so CORS and Socket.IO accept the Next.js client.

## Scripts

From `server/`:

| Command               | Description                                     |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Start user, chat, mail, and gateway together    |
| `npm run dev:user`    | User service only (`tsx watch`)                 |
| `npm run dev:mail`    | Mail service only                               |
| `npm run dev:chat`    | Chat service only                               |
| `npm run dev:gateway` | Gateway only                                    |
| `npm run build`       | Compile every workspace that has a build script |
| `npm run start`       | Run compiled `dist/` output                     |

A single service:

```bash
npm run dev -w @server/user
```

## Gateway

Base URL: `http://localhost:3000`

| Method | Path              | Auth   | Downstream                            |
| ------ | ----------------- | ------ | ------------------------------------- |
| `GET`  | `/health`         | No     | Gateway itself                        |
| `*`    | `/api/users/*`    | JWT\*  | User `http://localhost:3001/users`    |
| `*`    | `/api/chats/*`    | JWT    | Chat `http://localhost:3003/chat`     |
| `*`    | `/api/messages/*` | JWT    | Chat `http://localhost:3003/messages` |

\* `/api/users/login`, `/api/users/register`, `/api/users/verify-otp`, and `/api/users/logout` skip JWT auth.

If a downstream service is down, the gateway returns `502` with `{ "message": "<name> service unavailable" }`.

## User API

Client base URL: `http://localhost:3000/api/users`

| Method | Path           | Auth     | Description                     |
| ------ | -------------- | -------- | ------------------------------- |
| `POST` | `/register`    | No       | Start signup; sends OTP         |
| `POST` | `/verify-otp`  | No       | Confirm OTP and create the user |
| `POST` | `/login`       | No       | Set cookie and return a JWT     |
| `POST` | `/logout`      | No       | Clear the `chirp_token` cookie  |
| `GET`  | `/my-profile`  | Cookie / Bearer | Current user             |
| `PUT`  | `/update-user` | Cookie / Bearer | Update `name` and/or `username` |
| `GET`  | `/id/:userId`  | Cookie / Bearer | Look up a user by id     |
| `GET`  | `/:username`   | Cookie / Bearer | Look up a user by username |

Protected client routes expect the session cookie, or:

```http
Authorization: Bearer <token>
```

### Register

```http
POST /api/users/register
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
POST /api/users/verify-otp
Content-Type: application/json

{
  "username": "ada",
  "otp": "123456"
}
```

Returns the user (without password) and a JWT, and sets `chirp_token`.

### Login

```http
POST /api/users/login
Content-Type: application/json

{
  "username": "ada",
  "password": "secret1"
}
```

Login is rate-limited to 3 attempts per username per 60 seconds (Redis). Success sets `chirp_token` and returns `{ message, token }`.

### Logout

```http
POST /api/users/logout
```

Clears the cookie. No body.

## Chat API

Client base URL: `http://localhost:3000/api/chats`

All routes require a valid session (cookie or Bearer).

| Method | Path         | Description                                              |
| ------ | ------------ | -------------------------------------------------------- |
| `POST` | `/:username` | Create a chat with that user, or return the existing one |
| `GET`  | `/`          | List the caller's chats, newest first                    |
| `GET`  | `/:chatId`   | Fetch one chat the caller belongs to                     |

`GET /api/chats` includes `lastMessage`, `otherMemberId`, and `unseenCount` (messages from the other member with `seen: false`).

```http
POST /api/chats/ada
```

Creating a chat looks up `ada` on the user service (`GET /users/ada`) using `x-internal-secret` / `x-user-id`. That hop is service-to-service and does not go through the gateway. If the chat is new, the other member is notified on their socket (`chat:new`).

## Messages API

Client base URL: `http://localhost:3000/api/messages`

All routes require a valid session. The caller must be a member of the chat.

| Method | Path            | Description                                      |
| ------ | --------------- | ------------------------------------------------ |
| `POST` | `/`             | Send a text and/or image message                 |
| `GET`  | `/:chatId`      | Page messages (newest page first, then reversed) |
| `PUT`  | `/:chatId/seen` | Mark the other member's unseen messages as seen  |

### Send message

`multipart/form-data`. Field `image` is optional (jpg, jpeg, png, gif, webp; max 5MB). Images upload to Cloudinary. `replyTo` is an optional message `_id` in the same chat.

```http
POST /api/messages
Content-Type: multipart/form-data

chatId=<chatId>
text=hello
image=<file>
replyTo=<messageId>
```

At least one of `text` or `image` is required. Sending updates `lastMessage` on the chat and emits `message:new` and `chat:updated` to both members. If the other member is online, `delivered` is set immediately and `message:delivered` is emitted.

### List messages

```http
GET /api/messages/:chatId?cursor=<messageId>&limit=20
```

`cursor` is the last message `_id` from the previous page. Response: `{ messages, nextCursor, hasMore }`. Each message may include populated `replyTo` (`_id`, `text`, `image`, `sender`, `messageType`).

### Mark seen

```http
PUT /api/messages/:chatId/seen
```

Sets `seen` / `seenAt` (and `delivered`) on messages in that chat that you did not send, then emits `message:seen` to both members.

## Socket.IO (chat service)

URL: `http://localhost:3003` (not the gateway).

CORS origin is `CLIENT_ORIGIN`. Auth is the `chirp_token` cookie or `socket.handshake.auth.token`. Each socket joins `user:<userId>`.

The server tracks how many sockets a user has open. The first connection marks them online and marks undelivered inbound messages as delivered. The last disconnect marks them offline.

| Event | When |
| ----- | ---- |
| `presence:list` | Sent to the connecting socket: all currently online user ids |
| `presence:update` | `{ userId, online }` broadcast when someone goes online or offline |
| `message:new` | After `POST /api/messages` — full message payload, including `replyTo` |
| `message:delivered` | `{ chatId, deliveredTo }` when the peer is online (send or reconnect) |
| `message:seen` | `{ chatId, seenBy }` after `PUT /api/messages/:chatId/seen` |
| `chat:updated` | `{ chatId, lastMessage, updatedAt }` after a new message |
| `chat:new` | `{ chatId, memberIds }` to the other user when a chat is created |

The client never emits chat payloads over the socket. Mutations stay on HTTP; the socket is push-only.

## Infrastructure

`docker-compose.yml` starts:

| Service | Image     | Port    | Volume       |
| ------- | --------- | ------- | ------------ |
| MongoDB | `mongo:8` | `27017` | `mongo_data` |
| Redis   | `redis:8` | `6379`  | `redis_data` |

Network: `chirp-network`.

## Shared package

`@server/shared` is imported by every service and currently exports:

- `logger` — Pino (pretty-printed outside production)
- `TryCatch` — Express async error wrapper
- `errorHandler` — Express error middleware (used by the gateway)
- `generateToken` / `verifyToken` — JWT helpers (read `JWT_SECRET` at call time)
- `AUTH_COOKIE_NAME` / `setAuthCookie` / `clearAuthCookie` — `chirp_token` helpers
- `connectToRabbitMQ` / `getChannel` / `publishToQueue`

Path aliases (`@/*` → `src/*`) are defined in `tsconfig.base.json` and rewritten on build with `tsc-alias`.
