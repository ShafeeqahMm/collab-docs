# collab-docs

A collaborative document editor, built in phases: auth + CRUD first, then real-time multi-user sync layered on top. This is the full-stack centerpiece of my portfolio, alongside a dedicated backend project ([job-queue-api](../job-queue-api)) and frontend project.

## Why phased

Most "real-time collaborative editor" tutorials start with the hard part (sync) and never finish the boring-but-necessary part (auth, permissions, persistence). I did it the other way: get a solid, secure, working single-user app first, then add real-time sync as a layer on top of something that already works — so if the sync layer has a bug, I can always fall back to "does the plain save-and-reload version still work?" as a debugging baseline.

## Phase 1 (current): Auth + CRUD

- Email/password auth via NextAuth (credentials provider, bcrypt-hashed passwords)
- Create, list, view, and edit documents
- Per-document access control: an owner, plus optional collaborators with `EDITOR` or `VIEWER` roles enforced on every API route (`src/lib/documentAccess.ts`)
- Debounced autosave (no manual "Save" button — edits persist ~800ms after you stop typing)

### Why credentials auth instead of Google/GitHub OAuth

OAuth providers require registering an app with each provider before anything runs, which is friction for anyone (including a future me, or an interviewer) trying to clone and run this locally. Credentials auth needs zero external setup. Swapping in an OAuth provider later is a small, well-documented change to `src/lib/auth.ts` — not a redesign.

## Phase 2 (next): Real-time sync

The `content` textarea currently only saves on a debounce — two people editing the same doc in different tabs will silently overwrite each other. Phase 2 adds a WebSocket server so:
- Multiple people see each other's changes live
- Cursor/presence indicators show who else is viewing
- Conflict resolution uses [Yjs](https://github.com/yjs/yjs) (a CRDT library) rather than naive last-write-wins

## Phase 3 (later): AI feature

A "summarize this document" button hitting an LLM API — small and functional, not the point of the app.

## Setup

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install deps
npm install

# 3. Configure environment
cp .env.example .env
# generate a real secret and put it in NEXTAUTH_SECRET:
openssl rand -base64 32

# 4. Run migrations
npm run prisma:migrate

# 5. Start the dev server
npm run dev
```

Visit http://localhost:3000, create an account, and start writing.

## Data model

- `User` — email/password auth
- `Document` — title, content, owned by one user
- `DocumentCollaborator` — join table granting other users `EDITOR` or `VIEWER` access to a document

## Stack

Next.js 14 (App Router), TypeScript, NextAuth, Prisma, PostgreSQL, Tailwind CSS. Deployed target: Vercel (app) + Neon or Railway (Postgres).

## What I'd do differently / known gaps (Phase 1)

- No email verification or password reset flow — fine for a portfolio demo, not production-ready as-is
- No rate limiting on the register/login endpoints
- Autosave has no conflict detection yet — that's exactly what Phase 2 fixes
