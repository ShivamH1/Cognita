# Cognita — Project Reference

> Hand this file to any model to resume development without starting from scratch.
> Last updated: 2026-06-11. Status: **COMPLETE & production-verified end-to-end.**

---

## What is Cognita?

Cognita is a LangChain + RAG learning and assessment platform for teachers and students. It was built by refactoring the original `VedaAI` demo project located at `D:\Product-SAAS\AI assesment creator`. It is a **Turborepo monorepo** using **Bun** as the package manager.

**Core features:**
- RAG tutor: chat-with-PDF, grounded answers with inline citations, streaming
- Assessment generation: teacher configures sections/question types → LLM writes a full exam paper (optionally RAG-grounded from an uploaded document)
- AI grading: MCQ/true-false graded deterministically; short/long answers graded by the LLM with feedback
- Flashcards & summaries: generated from uploaded documents via the study chain
- Analytics dashboards: teacher-side class statistics, student-side personal progress
- Role-based access: STUDENT | TEACHER

---

## Repository Layout

```
D:\Product-SAAS\AI assesment creator\
├── apps/
│   ├── api/                    Express API (port 8000)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   Postgres schema (shared with web)
│   │   │   └── seed.ts         Demo data (teacher + 2 students + photosynthesis assessment)
│   │   └── src/
│   │       ├── index.ts        Entry point — mounts all routers, starts workers
│   │       ├── lib/
│   │       │   ├── env.ts      Zod-validated env (all config lives here)
│   │       │   ├── db.ts       Prisma client singleton
│   │       │   └── redis.ts    ioredis singleton
│   │       ├── llm/
│   │       │   ├── providers.ts  buildProviderModel() — ChatOpenAI per provider
│   │       │   └── gateway.ts    getChatModel(), invokeText(), streamText(), generateStructured()
│   │       ├── rag/
│   │       │   ├── embeddings.ts  LocalEmbeddings (fastembed, all-MiniLM-L6-v2, 384-dim)
│   │       │   ├── vectorstore.ts QdrantVectorStore wrapper + ensureCollection()
│   │       │   ├── ingest.ts      PDF/text → chunk → embed → Qdrant
│   │       │   └── retrieval.ts   similaritySearch + buildTutorMessages()
│   │       ├── chains/
│   │       │   ├── assessment.chain.ts  generateAssessment()
│   │       │   ├── grading.chain.ts     gradeSubmission()
│   │       │   ├── tutor.chain.ts       answerTutor() / streamTutorAnswer()
│   │       │   ├── study.chain.ts       summaries + flashcards
│   │       │   └── roadmap.chain.ts     generateRoadmap() (Tavily research + structured gen)
│   │       │   └── milestone-tutor.chain.ts  streamMilestoneAnswer() (stateless SSE chat)
│   │       ├── routes/
│   │       │   ├── assignments.ts   /api/assignments
│   │       │   ├── assessments.ts   /api/assessments
│   │       │   ├── documents.ts     /api/documents  (upload + ingest trigger)
│   │       │   ├── tutor.ts         /api/tutor
│   │       │   ├── submissions.ts   /api/submissions
│   │       │   ├── study.ts         /api/study
│   │       │   ├── analytics.ts     /api/analytics
│   │       │   └── roadmaps.ts      /api/roadmaps  (CRUD + enroll + milestone chat)
│   │       ├── queues/              BullMQ queue definitions
│   │       │   └── roadmap.queue.ts  roadmap-generation queue
│   │       ├── workers/             BullMQ workers (generation, ingestion, grading, roadmap)
│   │       │   └── roadmap.worker.ts  roadmap generation worker
│   │       ├── middleware/
│   │       │   └── auth.ts          requireAuth / requireRole / optionalAuth (jose JWT)
│   │       ├── services/
│   │       │   ├── pdf.service.ts   PDF text extraction
│   │       │   └── websocket.service.ts  WebSocket (real-time job progress)
│   │       ├── types/index.ts       Shared TypeScript types
│   │       └── scripts/
│   │           └── mint-test-token.ts  CLI tool to generate test Bearer tokens
│   └── web/                    Next.js 15 frontend (port 3000)
│       └── src/
│           ├── auth.ts              NextAuth v5 config (Credentials + PrismaAdapter)
│           ├── middleware.ts        Route protection
│           ├── lib/
│           │   ├── api.ts           Typed fetch wrappers for the Express API
│           │   ├── use-api.ts       React hooks over api.ts
│           │   └── prisma.ts        Prisma client singleton (web-side, for auth)
│           ├── store/               Zustand stores
│           │   └── roadmap.store.ts   roadmap generation + progress stores
│           ├── types/               next-auth.d.ts (augments session with role + apiToken)
│           └── app/
│               ├── (app)/           Authenticated layout (role dashboards, library, tutor,
│               │                    study, create, assessments/take/result, analytics, roadmaps)
│               ├── login/           Login page
│               └── register/        Registration page
├── docker-compose.yml          Postgres 16 + Qdrant latest + Redis 7
├── package.json                Turborepo root (Bun overrides for ioredis + bullmq)
└── cognita.md                  ← this file
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node 22 + Bun | Monorepo managed by Turborepo + Bun |
| API | Express + TypeScript | `apps/api`, port 8000 |
| Frontend | Next.js 15 (App Router) | `apps/web`, port 3000 |
| Auth | Auth.js / NextAuth v5 + `@auth/prisma-adapter` | Credentials provider, JWT sessions |
| Auth bridge | `jose` HS256 JWT | Next mints `session.apiToken`; Express verifies it |
| Database | Postgres 16 + Prisma | `apps/api/prisma/schema.prisma` |
| Vector store | Qdrant | Single collection `cognita_documents`, partitioned by `metadata.documentId` |
| Queue / cache | BullMQ + Redis 7 | Generation, ingestion, grading queues |
| LLM | LangChain `ChatOpenAI` | OpenAI-compatible; free-tier providers (see below) |
| Embeddings | `fastembed` (ONNX) | `all-MiniLM-L6-v2`, 384-dim, fully local, no API cost |
| Search | `@langchain/tavily` (TavilySearch) | Free-tier web search for roadmap resource discovery (1000 free searches/month) |
| UI | Tailwind v4 + GSAP + Locomotive scroll | Animated landing + role dashboards |

---

## LLM Gateway

**File:** `apps/api/src/llm/gateway.ts` + `apps/api/src/llm/providers.ts`

The gateway builds one `ChatOpenAI` client per **configured** provider (those with a non-empty API key) and chains them with `.withFallbacks()` for automatic failover on 429 / errors.

**Default provider order:** `openrouter → mistral → groq` (controlled by `LLM_PROVIDER_ORDER` env var)

**Default models:**
- OpenRouter: `meta-llama/llama-3.3-70b-instruct:free`
- Mistral: `mistral-small-latest`
- Groq: `llama-3.3-70b-versatile`

**Key gateway functions:**
- `getChatModel(opts?)` — returns the chained model (with fallbacks)
- `invokeText(messages, opts?)` — single call, returns string
- `streamText(messages, opts?)` — async generator yielding string tokens
- `generateStructured(schema, systemPrompt, userPrompt, opts?)` — returns Zod-validated JSON; includes a one-shot self-repair pass if the first response fails to parse

**No paid Claude/Anthropic API calls** — Claude is only used to drive development in Claude Code. LLM inference in production uses free-tier OpenRouter/Mistral/Groq keys.

---

## RAG Pipeline

**Files:** `apps/api/src/rag/`

### Embeddings (`embeddings.ts`)
- Uses `fastembed` (`FlagEmbedding`, `EmbeddingModel.AllMiniLML6V2`)
- **Do NOT switch to `@xenova/transformers`** — it pins `sharp@0.32.6` which has no Node 22 prebuilt and fails to compile on Windows (no MSVC)
- Model files cached at `apps/api/local_cache/fast-all-MiniLM-L6-v2/` (~90 MB, downloaded on first boot)
- `EMBEDDING_MODEL` env var is now unused (fastembed picks the model by enum)

### Vector Store (`vectorstore.ts`)
- Qdrant collection: `cognita_documents`
- All document chunks in one collection, partitioned by `metadata.documentId`
- `documentFilter(documentId)` → Qdrant `must` filter used in all queries and deletes
- `ensureCollection()` creates the collection + payload index on first use (idempotent)

### Ingest (`ingest.ts`)
- PDF → `pdfService.extractText()` → `RecursiveCharacterTextSplitter` (chunkSize 1000, overlap 150) → `LCDocument` objects with `{ userId, documentId, chunkIndex, filename }` metadata → Qdrant

### Retrieval (`retrieval.ts`)
- `retrieve(documentId, query, k=5)` → top-k similarity search → `{ sources, contextBlock }`
- `buildTutorMessages()` formats the system prompt + last 6 history turns + context block for the LLM
- Tutor system prompt: "Answer ONLY from context excerpts, cite [1][2], be pedagogical"

---

## Auth Bridge

**Problem:** Auth.js runs in Next.js; the Express API needs to know who the user is.

**Solution:**
1. `apps/web/src/auth.ts` — `session()` callback mints an HS256 JWT (`mintApiToken`) signed with `process.env.AUTH_SECRET`, stored as `session.apiToken`
2. Every API request from the frontend includes `Authorization: Bearer <apiToken>`
3. `apps/api/src/middleware/auth.ts` — `requireAuth()` verifies the token with `jose.jwtVerify` using the **same** `AUTH_SECRET`, populates `req.user = { id, email, role }`

JWT payload: `{ sub: userId, email, role, iat, exp (7d) }`

---

## Database Schema (Postgres + Prisma)

Key models (see `apps/api/prisma/schema.prisma` for full detail):

| Model | Purpose |
|---|---|
| `User` | Auth + roles (STUDENT / TEACHER). Includes `passwordHash`. |
| `Account`, `Session`, `VerificationToken` | Auth.js adapter tables |
| `Document` | Uploaded file metadata + Qdrant ingestion status |
| `Assignment` | Teacher-configured exam spec (sections as JSON) |
| `Assessment` | LLM-generated exam paper (sections+answers as JSON) |
| `Submission` | Student answers, score, grading status |
| `Grade` | Per-question grade, feedback, correctness |
| `ChatSession` / `ChatMessage` | Tutor chat history with citations |
| `StudyArtifact` | Summaries / flashcard sets |

---

## Environment Variables (`apps/api/.env`)

```env
# Postgres / Redis / Qdrant
DATABASE_URL=postgresql://cognita:cognita@localhost:5432/cognita?schema=public
REDIS_URL=redis://localhost:6379
QDRANT_URL=http://localhost:6333

# LLM providers (set whichever keys you have)
LLM_PROVIDER_ORDER=openrouter,mistral,groq
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
MISTRAL_API_KEY=...
GROQ_API_KEY=...

# Search (Tavily — optional, for roadmap resource discovery)
TAVILY_API_KEY=tvly-...

# Auth bridge — must match apps/web/.env.local AUTH_SECRET
AUTH_SECRET=dev-cognita-shared-secret

FRONTEND_URL=http://localhost:3000
PORT=8000
```

`apps/web/.env.local` needs:
```env
AUTH_SECRET=dev-cognita-shared-secret   # same as API
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
DATABASE_URL=postgresql://cognita:cognita@localhost:5432/cognita?schema=public
```

---

## Running the Project

```powershell
# 1. Start infrastructure (Docker Desktop must be running)
docker compose up -d

# 2. Apply migrations + seed demo data
cd apps/api
bunx prisma migrate dev
bun run seed        # teacher@cognita.test / alice@cognita.test / bob@cognita.test (all: password123)

# 3. Start both apps (from repo root)
bun run dev         # web :3000, api :8000

# First boot: fastembed downloads ~90 MB ONNX model to apps/api/local_cache/
```

**Health check:** `GET http://localhost:8000/health` — returns `{ status: "ok", providers: ["openrouter", ...] }`

---

## Seed / Test Credentials

| Role | Email | Password |
|---|---|---|
| Teacher | `teacher@cognita.test` | `password123` |
| Student | `alice@cognita.test` | `password123` |
| Student | `bob@cognita.test` | `password123` |

**Minting a test Bearer token for curl:**
```bash
cd apps/api
bun run src/scripts/mint-test-token.ts
```

---

## Known Gotchas / Hard-Won Decisions

1. **`fastembed` not `@xenova/transformers`** — `@xenova/transformers` pins `sharp@0.32.6`, no Node 22 prebuilt, fails on Windows with no MSVC. Use `fastembed` exclusively.

2. **Bun overrides for ioredis/bullmq** — root `package.json` pins `ioredis@5.10.1` + `bullmq@5.78.0` to prevent a dual-copy that causes TypeScript type errors. If you see weird ioredis type errors, run `rm bun.lock node_modules && bun install` (or PowerShell equivalent: `Remove-Item -Recurse -Force bun.lock, node_modules; bun install`).

3. **`EMBEDDING_MODEL` env var is unused** — it appears in `env.ts` as a leftover; fastembed selects the model via enum, not the env var.

4. **Auth.js + Express dual-Prisma** — both `apps/web` and `apps/api` have their own Prisma client but point to the same `DATABASE_URL`. The schema lives in `apps/api/prisma/`; migrations are run from there.

5. **Free model JSON reliability** — free-tier models sometimes wrap JSON in markdown fences or add prose. `generateStructured()` in `gateway.ts` strips fences and includes a one-shot self-repair pass to handle this without crashing.

6. **WebSocket** — `wsService` in `apps/api/src/services/websocket.service.ts` attaches to the same HTTP server and emits job progress events to the frontend during generation/ingestion.

7. **Streaming tutor** — `streamTutorAnswer()` resolves sources synchronously (pre-retrieval) then returns a token generator. The frontend should consume `sources` first, then stream tokens.

8. **Roadmaps feature** — Two-stage pipeline: Tavily web search (optional, free-tier) finds real educational resources, then `generateStructured()` produces a structured roadmap JSON. Uses `@langchain/tavily` (not `@langchain/community` which is deprecated). The `roadmap.chain.ts` follows the same pattern as `assessment.chain.ts`: Zod schema + prompt + normalizer + mock fallback.

9. **Roadmap WebSocket** — The `wsService` accepts both `?assignmentId=` and `?roadmapId=` query params. Room key is the entity ID. The `broadcast()` method is generic and works for both.

---

## Roadmaps Feature

Teacher-created, student-followed learning roadmaps. A TEACHER enters a topic, optionally provides resource URLs or uploads PDFs. A two-stage pipeline searches Tavily for free educational resources (MIT/Stanford lectures, YouTube, free textbooks), then generates a structured learning path: **Phases → Milestones → Resources + Tasks**. Students are enrolled, track their progress (task checkoffs, resource watched/read toggles, per-milestone notes), and can chat with an AI tutor scoped to each milestone.

### Flow
1. Teacher creates roadmap (`POST /api/roadmaps`) → BullMQ job queued
2. Worker calls `generateRoadmap()`: Tavily research → `generateStructured()` → save to DB
3. Frontend WebSocket receives progress events (`roadmap_started`, `roadmap_phase_complete`, `roadmap_complete`)
4. Student enrolls (`POST /api/roadmaps/:id/enroll`) → can check off tasks/resources, add notes
5. Student can chat with AI tutor per milestone (`POST /api/roadmaps/:id/milestones/:milestoneId/chat`)

### DB Models
- **Roadmap** — Teacher-created roadmap with phases (JSON), status (JobStatus)
- **RoadmapEnrollment** — Student enrollment with completedTasks, completedResources, notes

### New env var
- `TAVILY_API_KEY` — Optional. Enables web search for real resource discovery. Get free key at [tavily.com](https://app.tavily.com) (1000 free searches/month).

### File paths
| File | Purpose |
|------|---------|
| `apps/api/src/chains/roadmap.chain.ts` | Two-stage pipeline (Tavily + generateStructured) |
| `apps/api/src/chains/milestone-tutor.chain.ts` | Stateless SSE milestone chat |
| `apps/api/src/queues/roadmap.queue.ts` | BullMQ queue definition |
| `apps/api/src/workers/roadmap.worker.ts` | BullMQ worker |
| `apps/api/src/routes/roadmaps.ts` | Express router |
| `apps/web/src/store/roadmap.store.ts` | Zustand stores (generation + progress) |
| `apps/web/src/app/(app)/roadmaps/page.tsx` | List page |
| `apps/web/src/app/(app)/roadmaps/create/page.tsx` | Create form |
| `apps/web/src/app/(app)/roadmaps/[id]/page.tsx` | Generation progress |
| `apps/web/src/app/(app)/roadmaps/[id]/view/page.tsx` | Interactive viewer |

---

## Frontend Pages

All authenticated pages live under `apps/web/src/app/(app)/`:

| Route | Description |
|---|---|
| `/dashboard` | Role-aware home (teacher class overview / student progress) |
| `/create` | Teacher: configure + generate an assessment |
| `/library` | Document upload + management |
| `/tutor/[documentId]` | Chat-with-PDF tutor |
| `/study` | Flashcards + summaries from documents |
| `/assessments` | List + take assessments |
| `/assessments/[id]` | Assessment detail view |
| `/assessments/[id]/take` | Student answer submission |
| `/assessment/[id]` | Teacher-side assessment view |
| `/assessment/[id]/result` | Teacher grading results |
| `/results/[id]` | Student results view |
| `/progress` | Student analytics |
| `/analytics` | Teacher class analytics |
| `/roadmaps` | List roadmaps (teacher: own, student: enrolled) |
| `/roadmaps/create` | Teacher: create a new roadmap |
| `/roadmaps/[id]` | Roadmap generation progress (WS) |
| `/roadmaps/[id]/view` | Interactive roadmap viewer + milestone chat |
| `/login` | Auth.js credentials login |
| `/register` | New user registration |

---

## API Endpoints Summary

| Router | Base | Notes |
|---|---|---|
| assignments | `/api/assignments` | CRUD for assignment specs |
| assessments | `/api/assessments` | CRUD + trigger generation |
| documents | `/api/documents` | Upload + ingest (multipart); delete removes Qdrant vectors |
| tutor | `/api/tutor` | Chat turns + streaming SSE |
| submissions | `/api/submissions` | Student submit; triggers grading queue |
| study | `/api/study` | Generate summaries / flashcards |
| analytics | `/api/analytics` | Teacher class stats + student progress |
| roadmaps | `/api/roadmaps` | CRUD + enroll + progress + milestone chat |
| — | `/health` | Provider status check |
