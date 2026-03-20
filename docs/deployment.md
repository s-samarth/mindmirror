# Deployment

MindMirror deploys as a Vercel monorepo — frontend and backend in a single project, single domain, zero CORS configuration.

---

## How It Works

The `vercel.json` file routes requests to two separate runtimes:

```json
{
  "builds": [
    { "src": "api/index.py", "use": "@vercel/python" },
    { "src": "package.json", "use": "@vercel/next" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/(.*)", "dest": "package.json" }
  ]
}
```

- `/api/*` requests are handled by the FastAPI Python backend via `@vercel/python`
- All other requests are handled by Next.js via `@vercel/next`
- Both are deployed as serverless functions on the same domain

---

## Step-by-Step Vercel Deployment

### 1. Push to GitHub

Ensure your repository is pushed to GitHub (public or private).

### 2. Import in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New Project**
3. Import your GitHub repository
4. Vercel auto-detects the Next.js framework

### 3. Set Environment Variables

In **Project Settings > Environment Variables**, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Production, Preview, Development |

This variable is **server-side only** — it is never exposed to the browser or included in the frontend bundle.

### 4. Enable Fluid Compute

This step is **required** for the synthesis endpoint to work reliably.

1. Go to **Project Settings > Functions**
2. Enable **Fluid Compute**
3. This extends the effective serverless timeout from 10s to **60s**

Without Fluid Compute, the synthesis call (which takes 8-20s) will frequently timeout.

### 5. Deploy

Click **Deploy** or push to your main branch. Vercel will:
1. Build the Next.js frontend (`npm run build`)
2. Package the Python backend (`api/index.py`) as a serverless function
3. Deploy both to the same domain

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | API key for OpenRouter LLM access. Server-side only. |

---

## Fluid Compute

Vercel's default serverless function timeout is 10 seconds (Hobby plan). MindMirror's synthesis endpoint needs 8-20 seconds for LLM processing, with a 55-second timeout configured as a safety buffer.

**Fluid Compute** extends the effective timeout to 60 seconds by allowing functions to use compute time more efficiently. The synthesis endpoint sets a 55-second internal timeout (5-second buffer under the 60-second ceiling).

**Without Fluid Compute:** Synthesis will frequently timeout, falling back to the hardcoded generic insight instead of a personalized report.

---

## Build Configuration

Vercel handles the build configuration automatically based on `vercel.json`:

| Runtime | Source | Builder |
|---------|--------|---------|
| Next.js frontend | `package.json` | `@vercel/next` |
| Python backend | `api/index.py` | `@vercel/python` |

The Python runtime reads `requirements.txt` from the project root and installs dependencies automatically.

### Mangum Wrapper

The FastAPI app is wrapped with [Mangum](https://mangum.io/) to translate between Vercel's serverless event format and ASGI:

```python
from mangum import Mangum
handler = Mangum(app, lifespan="off")
```

`lifespan="off"` is required because serverless functions don't support FastAPI's startup/shutdown lifecycle hooks.

---

## Production Considerations

### Rate Limiting

Rate limiting is currently **in-memory only**. This means:
- Limits reset on every cold start (new serverless instance)
- Different instances don't share rate limit state
- Effective for basic abuse prevention within a single instance lifetime
- **TODO:** Migrate to [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or [Upstash Redis](https://upstash.com/) for persistent, cross-instance rate limiting

Current limits per IP per day:
| Endpoint | Limit |
|----------|-------|
| `/api/next-question` | 50 requests |
| `/api/synthesize` | 15 requests |

### Reflection Counter

The `reflections_completed` counter displayed on the landing page is also in-memory and resets on cold starts. For a persistent counter, use Vercel KV.

### Free Model Rate Limits

OpenRouter free-tier models have their own rate limits:
- ~20 requests per minute
- ~200 requests per day

These are separate from MindMirror's application-level rate limits. If OpenRouter rate limits are hit, the fallback chain activates (next model in the chain, then static fallback).

### No Database

MindMirror stores no user data. Conversations exist only in React state (browser memory) and are discarded when the user closes the tab. This is a deliberate **privacy-by-design** choice.

---

## Cost

MindMirror operates at **$0 marginal cost**:

| Component | Cost |
|-----------|------|
| LLM inference | $0 (OpenRouter free-tier models) |
| Hosting | $0 (Vercel Hobby plan) |
| Database | $0 (no database) |
| CDN / Assets | $0 (included in Vercel) |
| Domain | Optional ($10-15/year if custom domain desired) |
