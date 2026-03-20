# MindMirror

## What
AI-powered personality and thinking pattern analysis. Users have a 5-7 question adaptive conversation, then get a personalized insight report.

## Architecture
Vercel monorepo:
- Frontend: Next.js 15 (App Router) + Tailwind CSS
- Backend: FastAPI (Python) via Vercel serverless functions (@vercel/python + Mangum)
- AI: LangChain + OpenRouter free models (MiniMax M2.5, Nemotron 120B)
- Streaming: Follow-up questions stream token-by-token to avoid timeouts
- Synthesis: Single JSON response, 55s timeout with model fallback chain

## Design principles
- Calm, meditative, minimal — Headspace meets premium journaling
- Warm off-white palette (#FAFAF8), serif headings, sans-serif body
- One thing on screen at a time
- Smooth transitions, no jarring page changes
- Mobile-first responsive

## Frontend conventions
- TypeScript throughout
- Server components where possible, client only when needed
- Components in app/components/
- API helpers in app/lib/api.ts (streaming + non-streaming)
- CSS variables for theme in globals.css

## Backend conventions
- Python 3.11+, FastAPI, wrapped with Mangum for Vercel
- All Python code in api/ directory
- Pydantic models in api/models.py
- LangChain chains in api/chains.py
- Rate limiting via FastAPI dependencies

## Important
- OPENROUTER_API_KEY is server-side only (set in Vercel env vars)
- Follow-up questions STREAM to avoid Vercel timeout
- Synthesis has 55s timeout + model fallback chain
- Enable Fluid Compute on Vercel for 60s effective timeout
- Free model rate limits: ~20 req/min, ~200 req/day