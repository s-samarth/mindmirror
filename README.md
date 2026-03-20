# MindMirror

**A 5-minute AI conversation that adapts to your answers and reveals how you think — not just who you are.**

MindMirror conducts an adaptive conversation using AI-generated questions that respond to what you actually say, then produces a personalized insight report about your thinking patterns, decision-making style, strengths, and blind spots. Unlike fixed personality tests, every conversation is unique.

---

## Key Features

- **Adaptive conversation** — Questions 2-7 are generated in real-time by AI based on your previous responses, not a fixed questionnaire
- **Token-by-token streaming** — Questions appear with a natural typewriter effect as the AI composes them
- **Personalized insight report** — A thinking style label, observed patterns, strengths, blind spots, and a closing reflection grounded in your actual responses
- **Zero friction** — No sign-up, no account, no email capture. Landing page to full report in under 5 minutes
- **Privacy by design** — No data is stored. Conversations exist only in browser memory and disappear when you close the tab
- **$0 operating cost** — Built entirely on free-tier LLMs, Vercel Hobby plan, and no database

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | FastAPI (Python 3.11+) via Vercel serverless |
| Serverless adapter | Mangum |
| AI orchestration | LangChain + OpenRouter |
| LLMs | MiniMax M2.5 (questions), Nemotron 120B (synthesis) |
| Deployment | Vercel monorepo (single domain, zero CORS) |

---

## Quick Start

**Prerequisites:** Node 18+, Python 3.11+, [OpenRouter API key](https://openrouter.ai) (free)

```bash
# Clone and install
git clone https://github.com/your-username/mindmirror.git
cd mindmirror
npm install

# Python backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Environment
cp .env.example .env.local
# Edit .env.local → add your OPENROUTER_API_KEY

# Run (two terminals)
uvicorn api.index:app --reload --port 8000   # Backend
npm run dev                                   # Frontend → localhost:3000
```

See [Setup & Running](docs/setup-and-running.md) for detailed instructions and troubleshooting.

---

## Project Structure

```
mindmirror/
├── api/                            # Python FastAPI backend
│   ├── index.py                    #   FastAPI app, routes, rate limiting, Mangum handler
│   ├── chains.py                   #   LangChain streaming + synthesis logic
│   ├── models.py                   #   Pydantic request/response schemas
│   └── config.py                   #   Model names, token limits, fallback questions
│
├── app/                            # Next.js 15 frontend (App Router)
│   ├── layout.tsx                  #   Root layout, fonts (Playfair Display + Inter), metadata
│   ├── page.tsx                    #   Landing page — hero, features, CTA, reflection counter
│   ├── globals.css                 #   Design tokens, animations, grain texture, CTA effects
│   ├── lib/
│   │   └── api.ts                  #   Frontend API helpers (streaming + synthesis fetch)
│   └── reflect/
│       ├── page.tsx                #   Conversation orchestrator — intro, questions, generating
│       └── ReportView.tsx          #   Insight report — patterns, strengths, blind spots, share
│
├── docs/                           # Documentation
│   ├── product-overview.md         #   Product vision, personas, user journeys, metrics
│   ├── design.md                   #   Design system, colors, typography, animations, UX
│   ├── setup-and-running.md        #   Local development setup and troubleshooting
│   ├── deployment.md               #   Vercel deployment, Fluid Compute, production notes
│   ├── api.md                      #   API endpoint reference with request/response schemas
│   ├── system-design.md            #   Architecture, AI chains, fallback logic, state management
│   └── testing.md                  #   Manual testing guide, recommended test strategy
│
├── vercel.json                     # Routing: /api/* → Python, /* → Next.js
├── package.json                    # Node dependencies and scripts
├── requirements.txt                # Python dependencies
├── tsconfig.json                   # TypeScript configuration
├── next.config.ts                  # Next.js configuration
├── postcss.config.mjs              # PostCSS + Tailwind v4 plugin
├── .env.example                    # Environment variable template
└── CLAUDE.md                       # Project conventions for AI-assisted development
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Product Overview](docs/product-overview.md) | Vision, problem statement, user personas, user journeys, success metrics, risks, and go-to-market strategy |
| [Design System](docs/design.md) | Design philosophy, color palette, typography, animation catalog, layout patterns, UX decisions, and accessibility |
| [Setup & Running](docs/setup-and-running.md) | Prerequisites, step-by-step setup, running locally, available scripts, and troubleshooting |
| [Deployment](docs/deployment.md) | Vercel monorepo deployment, Fluid Compute, environment variables, production considerations, and cost |
| [API Reference](docs/api.md) | All endpoints, request/response schemas, rate limiting, error handling, and curl examples |
| [System Design](docs/system-design.md) | Architecture overview, request flow diagrams, AI chain design, model fallback chains, serverless considerations, and state management |
| [Testing](docs/testing.md) | Manual testing checklists, API testing with curl, and recommended automated testing strategy |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Vercel Edge                     │
│                                                   │
│  /api/*  →  @vercel/python  →  FastAPI + Mangum  │
│                                     │             │
│                                     ▼             │
│                                OpenRouter API     │
│                                (Free LLMs)        │
│                                                   │
│  /*      →  @vercel/next    →  Next.js 15        │
└──────────────────────────────────────────────────┘
```

**Two routes, five UI states, one unbroken flow:**

```
Landing (/)  →  Intro  →  Conversation  →  Generating  →  Report
                         (/reflect — all four states)
```

---

## AI Models

All models are free tier via [OpenRouter](https://openrouter.ai):

| Purpose | Primary Model | Fallback | Last Resort |
|---------|--------------|----------|-------------|
| Question generation | MiniMax M2.5 | Nemotron 120B | Static fallback questions |
| Synthesis report | Nemotron 120B | OpenRouter free | Hardcoded generic report |

The user **never** sees a raw error. Every failure falls through to the next model or a static fallback.

**Question generation:** Streams tokens to the frontend. 5 psychological dimensions explored. Questions 5-7 shift to cross-answer pattern recognition.

**Synthesis:** Single JSON response with Pydantic validation. JSON retry logic handles malformed LLM output. 55-second timeout under Vercel Fluid Compute's 60-second ceiling.

---

## API Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| GET | `/api/health` | Health check | None |
| GET | `/api/stats` | Reflection count | None |
| POST | `/api/next-question` | Stream next adaptive question | 50/day/IP |
| POST | `/api/synthesize` | Generate insight report (JSON) | 15/day/IP |

See [API Reference](docs/api.md) for full schemas, curl examples, and error handling details.

---

## Design

Calm, meditative, minimal — Headspace meets premium journaling.

- **Palette:** Warm off-white (`#FAFAF8`) with near-black text (`#1a1a1a`)
- **Typography:** Playfair Display (serif headings) + Inter (sans body)
- **Animations:** Fade-in, breathing pulse, typewriter streaming, scroll reveals
- **Effects:** Subtle grain texture overlay, animated CTA border, card hover elevation

See [Design System](docs/design.md) for the full animation catalog, spacing scale, and UX decision rationale.

---

## Deploy to Vercel

1. Push repo to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add `OPENROUTER_API_KEY` in Project Settings → Environment Variables
4. Enable **Fluid Compute** in Project Settings → Functions
5. Deploy

See [Deployment](docs/deployment.md) for production considerations and troubleshooting.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run `npm run lint` to check for issues
5. Commit with conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
6. Open a pull request

---

## License

This project is open source. See the repository for license details.

---

## Author

Built by [Samarth Saraswat](https://s-samarth.lovable.app)
