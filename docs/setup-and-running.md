# Setup & Running

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Recommended: use `nvm` to manage versions |
| Python | 3.11+ | Required for FastAPI backend |
| npm | Bundled with Node | Used for frontend dependency management |
| OpenRouter API key | — | Free to create at [openrouter.ai](https://openrouter.ai) |

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mindmirror.git
cd mindmirror
```

### 2. Install Frontend Dependencies

```bash
npm install
```

This installs Next.js 15, React 19, Tailwind CSS v4, and TypeScript.

### 3. Set Up Python Environment

```bash
python -m venv .venv
source .venv/bin/activate    # macOS/Linux
# .venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

Python dependencies: FastAPI, Mangum, LangChain (OpenRouter + Core), python-dotenv, Pydantic.

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 5. Get an OpenRouter API Key

1. Go to [openrouter.ai](https://openrouter.ai) and create an account
2. Navigate to **Keys** in the dashboard
3. Create a new API key
4. Copy it into your `.env.local` file

MindMirror uses only free-tier models, so no payment method is required.

---

## Running Locally

You need to run both the Python backend and the Next.js frontend simultaneously.

### Start the Backend

```bash
source .venv/bin/activate    # Activate venv if not already active
uvicorn api.index:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Verify with:

```bash
curl http://localhost:8000/api/health
# Expected: {"status":"ok","service":"mindmirror"}
```

### Start the Frontend

In a separate terminal:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Using the App

Open `http://localhost:3000` in your browser. The frontend calls the backend API at `/api/*` endpoints. In local development, you may need to adjust the API base URL if the frontend and backend run on different ports.

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Next.js development server with hot reload |
| Build | `npm run build` | Create production build |
| Start | `npm start` | Run production build locally |
| Lint | `npm run lint` | Run ESLint checks |

---

## Troubleshooting

### Port Already in Use

If port 3000 or 8000 is occupied:

```bash
# Next.js on a different port
npm run dev -- -p 3001

# Uvicorn on a different port
uvicorn api.index:app --reload --port 8001
```

### Missing Environment Variables

If you see errors about `OPENROUTER_API_KEY`:
- Ensure `.env.local` exists in the project root
- Ensure the key is set (not empty or placeholder)
- Restart the backend after changing environment variables

### Python Version Issues

MindMirror requires Python 3.11+. Check your version:

```bash
python --version
```

If you have multiple Python versions, use `python3.11` or `python3.12` explicitly when creating the venv.

### Cold Start Delays

The first API request after starting the backend may take a few seconds as:
- The Python runtime initializes
- The first LLM call connects to OpenRouter

Subsequent requests will be faster.

### Model Rate Limits

Free OpenRouter models have rate limits (~20 req/min, ~200 req/day). If you hit rate limits during development:
- Wait a few minutes between rapid testing
- The app will show a rate limit message to the user
- The backend returns HTTP 429 when limits are exceeded

### Import Errors

If you see `ModuleNotFoundError`:
- Ensure your virtual environment is activated (`source .venv/bin/activate`)
- Re-run `pip install -r requirements.txt`
