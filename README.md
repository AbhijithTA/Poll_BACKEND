# Polling System – Backend (NestJS)

Concise backend for a polling system built with NestJS + Mongoose. It implements secure authentication, role-based access, private/public polls, voting, validation, and robust error handling.

## Tech Stack
- NestJS (REST API)
- MongoDB + Mongoose
- Passport-JWT (Auth)
- class-validator/class-transformer (DTO validation)
- @nestjs/config (env)
- Nodemon + ts-node (dev)

## Core Features
- Authentication
  - Register, login, logout
  - Password hashing (bcrypt with environment-based salt rounds)
  - JWT issuance and verification via `JwtModule`/`JwtStrategy`
- Role-Based Access
  - Roles: `admin`, `user`
  - `RolesGuard` + `@Roles()` decorator to protect admin-only routes
- Polling
  - Admin-only poll creation, edit (only active), delete, list (own polls)
  - Public/private visibility
  - Private polls: allow-list of user IDs
  - Duration set at creation (1–120 minutes). Expired polls are read-only
  - Users can vote once per poll; duplicate voting prevented via compound index
  - Dynamic results: vote counts computed from `Vote` collection for accuracy
- Validation & Security
  - Global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform)
  - DTO validation for title, options, duration, allowed users (ObjectId)
  - Input sanitization of poll title/options
  - Consistent error responses; explicit 400/401/403/404
  - Environment validation on boot (fail-fast if missing)

## Project Layout (backend)
- `src/app.module.ts` – module wiring (Config, Mongoose, Auth, Polls)
- `src/main.ts` – app bootstrap, global pipes, CORS, health, graceful shutdown
- `src/auth/*` – auth controller/service/strategy/module
- `src/polls/*` – polls controller/service/module
- `src/dto/poll.dto.ts` – DTOs with class-validator
- `src/schemas/*` – Mongoose schemas (User, Poll, Vote) + indexes
- `src/guards/roles.guards.ts` – role guard
- `src/decorators/roles.decorator.ts` – roles decorator

## Environment
Create `.env` in `polling-backend/`:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/polling-system
JWT_SECRET=change-this-to-a-long-random-string
BCRYPT_ROUNDS=12
ALLOWED_ORIGINS=http://localhost:5173
```

Notes
- `JWT_SECRET` is required for signing/verifying tokens
- `BCRYPT_ROUNDS` controls hashing workload (defaults to 12)
- `ALLOWED_ORIGINS` enables CORS from your frontend

## Scripts
```
# Dev (nodemon via ts-node)
npm run dev

# Build & Prod
npm run build
npm run start:prod

```

## 🚀 LIVE DEMO

**LINK:** [https://poll-frontend-self.vercel.app](https://poll-frontend-self.vercel.app)

> Note: Backend is hosted on Render free tier. The server may spin down on inactivity and can take a short while to wake up on the first request.

### 🔐 TESTING CREDENTIALS

**ADMIN ACCOUNT**
- **Email:** admin@gmail.com
- **Password:** test123

**USER ACCOUNTS**
- **User 1:** test@gmail.com / test123
- **User 2:** test2@gmail.com / test123


## Running Locally
1) Install deps
```
npm install
```
2) Configure `.env` (see above)
3) Start MongoDB
4) Run
```
npm run dev
```

## High-Level API (selected)
- Auth
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout` (token removal client-side)
  - `GET /auth/search-users?q=...` (admin) – search by name/email
- Polls (JWT required)
  - `GET /polls` – public + allowed private for current user
  - `GET /polls/admin` (admin) – polls created by admin
  - `POST /polls` (admin) – create poll
  - `PUT /polls/:id` (admin) – edit poll (only if active)
  - `DELETE /polls/:id` (admin)
  - `GET /polls/:id` – view by access rules
  - `POST /polls/:id/vote` – vote once (active only)
  - `GET /polls/:id/results` – results (respect access rules)
  - `GET /polls/user/votes` – my votes

## Validation & Edge Cases
- Title: 3–500 chars; Options: 2–10; Each option 1–200 chars
- Duration: 1–120 minutes (2 hours max)
- Private polls: `allowedUsers` must be valid user IDs; existence verified
- Duplicate votes prevented by unique index `(user, poll)`
- Admin can view private polls but cannot vote
- Expired polls: voting blocked, results visible

## Security Considerations
- JWT signing via `JwtModule` and verification via `JwtStrategy`
- Password hashing with bcrypt (`BCRYPT_ROUNDS` configurable)
- Tokens require `JWT_SECRET`; app fails fast if missing
- CORS restricted by `ALLOWED_ORIGINS`
- Graceful shutdown + health endpoint

## Notes on AI Assistance 
Some part of this project I utilized AI tools (ChatGPT/DeepSeek) to accelerate development through boilerplate code generation, debugging assistance, and architectural guidance. These tools helped quickly set up Nest.js/React foundations and resolve technical challenges like MongoDB index issues, while maintaining full code understanding and customization. The AI served as a development accelerator while all implementation decisions remained developer-driven.
---


