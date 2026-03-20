import asyncio
import logging
from collections import defaultdict
from datetime import date
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from mangum import Mangum
from api.models import NextQuestionRequest, SynthesisRequest
from api.chains import stream_next_question, generate_synthesis, SYNTHESIS_FALLBACK

logger = logging.getLogger(__name__)

app = FastAPI()

# ---------------------------------------------------------------------------
# Reflection counter
# TODO: Replace with Vercel KV for persistence across deploys and instances.
#       In-memory state resets on every cold start / new function instance.
# ---------------------------------------------------------------------------

_reflections_completed: int = 0

# ---------------------------------------------------------------------------
# Rate limiting
# TODO: Replace with Vercel KV or Upstash Redis for production persistence.
#       In-memory state resets on every cold start / new function instance,
#       so this only prevents abuse within a single serverless invocation lifetime.
# ---------------------------------------------------------------------------

# { (ip, date, endpoint): count }
_rate_limit_store: dict[tuple, int] = defaultdict(int)

RATE_LIMITS = {
    "next-question": 50,
    "synthesize": 15,
}


def _get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(endpoint: str, limit: int):
    def dependency(request: Request):
        ip = _get_client_ip(request)
        key = (ip, date.today(), endpoint)
        _rate_limit_store[key] += 1
        if _rate_limit_store[key] > limit:
            raise HTTPException(
                status_code=429,
                detail={"error": "You've used all your reflections for today. Come back tomorrow!", "retry_after": "tomorrow"},
            )
    return dependency


limit_next_question = _rate_limit("next-question", RATE_LIMITS["next-question"])
limit_synthesize = _rate_limit("synthesize", RATE_LIMITS["synthesize"])


# ---------------------------------------------------------------------------
# Exception handler — never leak stack traces
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s", request.url.path)
    return JSONResponse(status_code=500, content={"error": "An unexpected error occurred. Please try again."})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "mindmirror"}


@app.get("/api/stats")
async def stats():
    return {"reflections_completed": _reflections_completed}


@app.post("/api/next-question")
async def next_question(request: NextQuestionRequest, _=Depends(limit_next_question)):
    async def generate():
        try:
            async for token in stream_next_question(
                request.conversation_history,
                request.user_name,
                request.question_number,
            ):
                if token:
                    yield token
        except Exception as e:
            logger.warning("Streaming error in next-question: %s", e)

    return StreamingResponse(generate(), media_type="text/plain")


@app.post("/api/synthesize")
async def synthesize(request: SynthesisRequest, _=Depends(limit_synthesize)):
    global _reflections_completed
    history = [item.model_dump() for item in request.conversation_history]

    try:
        # 55s timeout — 5s buffer under Vercel Fluid Compute's 60s limit
        result = await asyncio.wait_for(
            generate_synthesis(history, request.user_name),
            timeout=55,
        )
        _reflections_completed += 1
        return result
    except asyncio.TimeoutError:
        logger.warning("Synthesis timed out; returning fallback")
        return SYNTHESIS_FALLBACK
    except Exception as e:
        logger.warning("Synthesis route failed: %s", e)
        return SYNTHESIS_FALLBACK


handler = Mangum(app, lifespan="off")
