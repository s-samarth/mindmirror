# MindMirror 🧠

An AI-powered conversation that adapts to your answers and reveals your thinking patterns.

**[Try it live →](your-vercel-url)**

## Architecture

Vercel monorepo — frontend and backend deployed together:

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 |
| Backend | FastAPI (Python) wrapped with Mangum → Vercel serverless |
| AI | LangChain + OpenRouter free models |
| Streaming | Follow-up questions stream token-by-token to avoid Vercel timeout |
| Synthesis | Single JSON response, 55 s timeout, 3-model fallback chain |

**Models used (all free tier via OpenRouter):**
- Primary: MiniMax M2.5
- Fallback: Nvidia Nemotron 120B
- Last resort: static question bank

## Local development

**Prerequisites:** Node 18+, Python 3.11+, an [OpenRouter](https://openrouter.ai) API key

```bash
# 1. Clone and install frontend deps
npm install

# 2. Set up Python env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. Set env var
cp .env.example .env.local
# edit .env.local with your OPENROUTER_API_KEY

# 4. Run both servers
uvicorn api.index:app --reload --port 8000   # Python backend
npm run dev                                   # Next.js frontend
```

## Deploy to Vercel

1. Push repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add `OPENROUTER_API_KEY` in Project Settings → Environment Variables
4. Enable **Fluid Compute** in Project Settings → Functions (gives 60 s effective timeout for synthesis)
5. Deploy

## Project structure

```
├── api/
│   ├── index.py      # FastAPI app + Mangum handler
│   ├── chains.py     # LangChain streaming + synthesis logic
│   ├── models.py     # Pydantic request/response schemas
│   └── config.py     # Model names, token limits, fallback questions
├── app/
│   ├── page.tsx      # Landing page
│   ├── reflect/
│   │   ├── page.tsx  # Conversation + report orchestration
│   │   └── ReportView.tsx
│   └── lib/api.ts    # Frontend fetch helpers (streaming + synthesis)
├── vercel.json       # Routing: /api/* → Python, /* → Next.js
└── requirements.txt  # Python dependencies
```
