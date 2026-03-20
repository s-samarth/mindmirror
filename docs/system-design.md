# System Design

## Architecture Overview

MindMirror is a Vercel monorepo with a Next.js frontend and a FastAPI Python backend, both deployed as serverless functions on the same domain.

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel Edge                          │
│                                                             │
│   /api/*  ──►  @vercel/python  ──►  FastAPI + Mangum       │
│                                       │                     │
│                                       ▼                     │
│                                   OpenRouter API            │
│                                   (Free LLMs)               │
│                                                             │
│   /*      ──►  @vercel/next    ──►  Next.js 15 (SSR/SSG)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│   Browser   │◄──────►│  Vercel CDN  │◄──────►│  Serverless │
│  (React 19) │  HTTPS │   + Edge     │        │  Functions  │
└─────────────┘        └──────────────┘        └─────────────┘
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Next.js (App Router) | 15 |
| UI library | React | 19 |
| Styling | Tailwind CSS | 4 |
| Language (frontend) | TypeScript | 5 |
| Backend framework | FastAPI | Latest |
| Serverless adapter | Mangum | Latest |
| AI orchestration | LangChain | Latest |
| LLM provider | OpenRouter (free tier) | — |
| Deployment | Vercel | Hobby plan |
| Database | None | — |

---

## Request Flow

### Question Streaming Flow

```
User types answer
       │
       ▼
Browser (React) ──POST /api/next-question──► Vercel Serverless
       │                                          │
       │                                          ▼
       │                                    FastAPI endpoint
       │                                          │
       │                                          ▼
       │                                    Rate limit check
       │                                    (in-memory, per IP)
       │                                          │
       │                                          ▼
       │                                    LangChain stream
       │                                          │
       │                              ┌───────────┼───────────┐
       │                              ▼           ▼           ▼
       │                          MiniMax     Nemotron    Static
       │                          M2.5       120B        Fallback
       │                          (primary)  (fallback)  (last resort)
       │                              │
       │                              ▼
       │◄──────── text/plain stream ──┘
       │         (token by token)
       ▼
ReadableStream.getReader()
       │
       ▼
TextDecoder processes chunks
       │
       ▼
onToken callback updates UI
(question appears character by character)
```

**Key detail:** The response is `text/plain`, not JSON. Tokens are sent as raw text chunks via the streaming response. The frontend reads them with `ReadableStream` and `TextDecoder`.

### Synthesis Flow

```
User answers final question
       │
       ▼
Browser (React) ──POST /api/synthesize──► Vercel Serverless
       │                                        │
       │              55s AbortController        ▼
       │              (client-side timeout)  FastAPI endpoint
       │                                        │
       │                                        ▼
       │                                   Rate limit check
       │                                        │
       │                                        ▼
       │                                   asyncio.wait_for(
       │                                     generate_synthesis(),
       │                                     timeout=55
       │                                   )
       │                                        │
       │                              ┌─────────┼─────────┐
       │                              ▼                   ▼
       │                          Nemotron            Static
       │                          120B                Fallback
       │                          (primary)           (last resort)
       │                              │
       │                              ▼
       │                         Parse JSON response
       │                              │
       │                         ┌────┴────┐
       │                         │ Valid?   │
       │                         ├── Yes ──► Pydantic validation
       │                         │              │
       │                         │              ▼
       │                         │          Return JSON
       │                         │
       │                         └── No ───► Retry with correction
       │                                     prompt (once)
       │                                         │
       │                                    ┌────┴────┐
       │                                    │ Valid?   │
       │                                    ├── Yes ──► Return
       │                                    └── No ───► Next model
       │                                                or fallback
       │
       │◄──────── application/json ─────────┘
       ▼
Parse SynthesisResponse
       │
       ▼
Render report (ReportView.tsx)
```

---

## AI System Design

### Chain 1: Adaptive Questioning Engine

**Purpose:** Generate contextually relevant follow-up questions that probe deeper into the user's thinking.

**Models (in order):**
1. `minimax/minimax-m2.5:free` — Primary. Strong conversational reasoning.
2. `nvidia/nemotron-3-super-120b:free` — Fallback. MoE architecture.
3. `openrouter/free` — Last resort. OpenRouter auto-routes to any available free model.
4. Static fallback questions — Curated set of 7 questions covering all dimensions.

**Generation parameters:**
- `max_tokens`: 150
- `temperature`: 0.7

**System prompt strategy:**

The system prompt instructs the LLM to act as a psychologist exploring five dimensions:

| Dimension | What It Probes |
|-----------|---------------|
| Decision-making style | Intuitive vs analytical |
| Social orientation | Introvert vs extrovert |
| Stress response | Fight, flight, freeze, fawn |
| Core values | Meaning drivers and priorities |
| Growth mindset | Fixed vs growth orientation |

The prompt behavior changes at question 5+: the model shifts from exploring new dimensions to **making cross-answer connections** ("You mentioned X earlier and now Y — do you see a pattern?").

**Output constraint:** "Output only the question itself. No preamble, no 'Great answer!', no commentary. Just the question."

### Chain 2: Synthesis Engine

**Purpose:** Analyze the complete conversation and produce a structured insight report as JSON.

**Models (in order):**
1. `nvidia/nemotron-3-super-120b:free` — Primary for synthesis (skips MiniMax).
2. `openrouter/free` — Fallback.
3. Hardcoded `SYNTHESIS_FALLBACK` — Generic insight report guaranteed to parse.

**Generation parameters:**
- `max_tokens`: 1500
- `temperature`: 0.6 (lower than questions for more consistent structure)

**System prompt strategy:**

The prompt instructs the LLM to:
- Act as an expert psychologist and personality analyst
- Output **only valid JSON** (no markdown fences, no preamble)
- Generate a 2-4 word evocative thinking style label (e.g., "Analytical Dreamer", "Grounded Pragmatist")
- Reference specific things the user said in pattern descriptions
- Avoid generic outputs — "You tend to overthink" is rejected in favor of observations grounded in actual responses

**Thinking style examples** from the prompt: "Analytical Dreamer", "Grounded Pragmatist", "Empathic Strategist"

### JSON Reliability Pipeline

Free LLMs sometimes output invalid JSON (preamble text, markdown fences, trailing commentary). The pipeline handles this:

```
LLM response text
       │
       ▼
Strip markdown fences (```json ... ```)
       │
       ▼
Extract content between first { and last }
       │
       ▼
json.loads() parse attempt
       │
  ┌────┴────┐
  │ Valid?   │
  ├── Yes ──► Pydantic SynthesisResponse validation ──► Return
  │
  └── No ───► Send correction message to LLM:
              "Your previous response was not valid JSON.
               Please respond with ONLY valid JSON, no other text."
                    │
                    ▼
              Parse retry response
                    │
               ┌────┴────┐
               │ Valid?   │
               ├── Yes ──► Return
               └── No ───► Try next model in fallback chain
```

---

## Serverless Considerations

### Mangum Wrapper

FastAPI uses ASGI, but Vercel serverless functions expect a different handler format. [Mangum](https://mangum.io/) bridges this gap:

```python
from mangum import Mangum
app = FastAPI()
handler = Mangum(app, lifespan="off")
```

`lifespan="off"` is required because serverless functions don't support FastAPI's startup/shutdown lifecycle hooks (there's no persistent process to attach them to).

### Streaming via Vercel

Vercel's `@vercel/python` runtime supports streaming responses. The `/api/next-question` endpoint returns a `StreamingResponse` that sends tokens as they arrive from the LLM, keeping the connection alive.

This avoids Vercel's serverless timeout: instead of waiting for the full response (which could take 10-30s), the first token arrives in 1-3s and the connection stays open.

### Fluid Compute

Vercel's default function timeout is 10 seconds (Hobby plan). The synthesis endpoint needs 8-20s for LLM processing.

**Fluid Compute** extends the effective timeout to 60 seconds. MindMirror sets an internal 55-second timeout (5-second buffer) via `asyncio.wait_for()`.

### Cold Start Implications

Each cold start (new serverless instance) resets:
- **Rate limit counters** — All IP-based daily limits restart at 0
- **Reflection counter** — The `reflections_completed` stat resets to 0

For production persistence, these should migrate to Vercel KV or Upstash Redis.

---

## State Management

### Frontend State

All state lives in React hooks within the `/reflect` page component:

| State | Type | Purpose |
|-------|------|---------|
| `phase` | `"INTRO" \| "CONVERSATION" \| "GENERATING" \| "REPORT"` | Current UI phase |
| `history` | `QAItem[]` | Complete conversation history |
| `currentQuestion` | `string` | Currently displayed question |
| `answerDraft` | `string` | User's in-progress answer |
| `questionNumber` | `number` | Current question index (1-7) |
| `isStreaming` | `boolean` | Whether question is actively streaming |
| `error` | `AppError \| null` | Current error state |
| `synthesis` | `SynthesisResponse \| null` | Generated report data |

No external state library (Redux, Zustand, Jotai). React hooks are sufficient for this single-page flow.

### Backend State

The backend is **stateless by design**:
- No database
- No session storage
- No user accounts
- Conversations are not persisted server-side

Two in-memory values exist but are non-critical:
- `_rate_limit_store` — Resets on cold start
- `_reflections_completed` — Resets on cold start

### Privacy by Design

No user data is stored anywhere. Conversations exist only in browser memory (React state) and are discarded when the tab closes. The backend processes conversation history for each request but does not persist it.

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Streaming for questions** | Avoids serverless timeout by sending tokens as they arrive. Creates natural typewriter UX. |
| **Non-streaming for synthesis** | Frontend needs complete JSON to render the report. Streaming structured data is complex and error-prone. |
| **Three-model fallback chain** | Free-tier models have rate limits (~20 req/min). Fallback ensures the UX never breaks. |
| **No database** | Privacy by design. Eliminates infrastructure complexity. No GDPR concerns. |
| **In-memory rate limiting** | Simple and fast. Acceptable at portfolio scale. Noted as TODO for production. |
| **Vercel monorepo** | Single deploy, single domain, zero CORS. Simplest possible deployment story. |
| **Mangum with lifespan="off"** | Required for serverless — no persistent process for lifecycle hooks. |
| **55s synthesis timeout** | 5-second buffer under Fluid Compute's 60s ceiling. Prevents Vercel from killing the function. |
| **JSON retry with correction prompt** | Free LLMs occasionally output invalid JSON. One retry with explicit instruction fixes most cases. |
| **Static fallback questions** | 7 curated questions cover all 5 dimensions. Ensures the conversation always progresses. |

---

## Information Architecture

MindMirror has exactly **2 routes** and **5 UI states**. There is no navigation bar, no settings page, no dashboard.

| Route | UI States | Purpose |
|-------|-----------|---------|
| `/` | Landing page | Marketing, first impression, CTA |
| `/reflect` | Intro → Conversation → Generating → Report | The entire product experience |

Every additional page is a potential exit point. The product is the experience, and the experience is one unbroken flow.
