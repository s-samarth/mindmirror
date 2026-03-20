# API Reference

MindMirror's backend is a FastAPI application serving four endpoints under the `/api` prefix. All endpoints are serverless functions deployed via Vercel.

---

## Base URL

- **Local:** `http://localhost:8000`
- **Production:** `https://your-domain.vercel.app`

---

## Endpoints

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "mindmirror"
}
```

**Status codes:**
| Code | Meaning |
|------|---------|
| 200 | Service is healthy |

---

### GET `/api/stats`

Returns the count of completed reflections.

**Response:**
```json
{
  "reflections_completed": 42
}
```

**Note:** This counter is in-memory and resets on serverless cold starts. It is not persistent across deployments or instances.

**Status codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |

---

### POST `/api/next-question`

Generates the next adaptive question based on conversation history. **Response is streamed** as plain text, token by token.

**Request body:**
```json
{
  "conversation_history": [
    {
      "question": "Tell me about a recent decision you struggled with.",
      "answer": "I was deciding whether to leave my job..."
    }
  ],
  "user_name": "Samarth",
  "question_number": 2
}
```

**Request field constraints:**

| Field | Type | Constraints |
|-------|------|-------------|
| `conversation_history` | `QAItem[]` | Max 10 items |
| `conversation_history[].question` | `string` | Max 500 characters |
| `conversation_history[].answer` | `string` | Max 2000 characters |
| `user_name` | `string \| null` | Max 50 characters, optional |
| `question_number` | `integer` | Range 1-10 |

**Response:**
- Content-Type: `text/plain`
- Body: Streamed text (tokens arrive incrementally)
- No JSON wrapping — the response body is the raw question text

**Rate limit:** 50 requests per day per IP

**Status codes:**
| Code | Meaning |
|------|---------|
| 200 | Streaming response (question text) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Error response (429):**
```json
{
  "error": "You've used all your reflections for today. Come back tomorrow!"
}
```

**Fallback behavior:** If all AI models fail, the endpoint streams a static fallback question from a curated set of 7 questions.

---

### POST `/api/synthesize`

Generates a full insight report from the complete conversation history. Returns a single JSON response (not streamed).

**Request body:**
```json
{
  "conversation_history": [
    {
      "question": "Tell me about a recent decision you struggled with.",
      "answer": "I was deciding whether to leave my job..."
    },
    {
      "question": "What was the moment you knew your decision was right?",
      "answer": "When I felt relieved rather than anxious..."
    }
  ],
  "user_name": "Samarth"
}
```

**Request field constraints:**

| Field | Type | Constraints |
|-------|------|-------------|
| `conversation_history` | `QAItem[]` | Max 10 items |
| `user_name` | `string \| null` | Optional |

**Response body:**
```json
{
  "summary": "Your responses reveal a thoughtful mind that balances analytical rigor with emotional intuition...",
  "thinking_style": "Analytical Deliberator",
  "patterns": [
    {
      "title": "Analysis as permission",
      "description": "You mentioned making a spreadsheet but then going with your gut — you use analysis as permission for intuition.",
      "icon": "🔍"
    }
  ],
  "strengths": [
    "You reflect deeply on your experiences and decisions",
    "You balance logic with emotional awareness",
    "You're willing to sit with uncertainty before acting"
  ],
  "blind_spots": [
    "You may sometimes overthink decisions that would benefit from quicker action",
    "Your desire for certainty can delay necessary leaps of faith"
  ],
  "reflection": "What would change if you trusted your first instinct more often?"
}
```

**Response field descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `summary` | `string` | 2-3 sentence personalized overview |
| `thinking_style` | `string` | 2-4 word evocative label (e.g., "Empathic Strategist") |
| `patterns` | `InsightPattern[]` | 2-4 observed patterns with emoji icons |
| `patterns[].title` | `string` | 3-6 word pattern name |
| `patterns[].description` | `string` | 1-2 sentences referencing the user's actual responses |
| `patterns[].icon` | `string` | Single emoji |
| `strengths` | `string[]` | 3 specific strengths |
| `blind_spots` | `string[]` | 2 specific blind spots |
| `reflection` | `string` | One evocative closing question |

**Rate limit:** 15 requests per day per IP

**Timeout:** 55 seconds (with 5-second buffer under Vercel's 60-second Fluid Compute limit)

**Status codes:**
| Code | Meaning |
|------|---------|
| 200 | Full JSON report |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Fallback behavior:** If all AI models fail or timeout, returns a hardcoded generic insight report so the user always sees a result.

---

## Data Models

### QAItem

A single question-answer pair from the conversation.

```python
class QAItem(BaseModel):
    question: str   # Max 500 characters
    answer: str     # Max 2000 characters
```

### InsightPattern

A single observed pattern in the user's thinking.

```python
class InsightPattern(BaseModel):
    title: str        # Pattern name (3-6 words)
    description: str  # Observation (1-2 sentences)
    icon: str         # Single emoji
```

### SynthesisResponse

The complete insight report.

```python
class SynthesisResponse(BaseModel):
    summary: str                    # Personalized overview
    thinking_style: str             # Evocative 2-4 word label
    patterns: list[InsightPattern]  # 2-4 patterns
    strengths: list[str]            # 3 strengths
    blind_spots: list[str]          # 2 blind spots
    reflection: str                 # Closing question
```

---

## Rate Limiting

Rate limiting is applied per IP address, per day, per endpoint.

| Endpoint | Daily Limit |
|----------|-------------|
| `/api/next-question` | 50 requests |
| `/api/synthesize` | 15 requests |

**Implementation:** In-memory dictionary keyed by `(client_ip, date, endpoint)`. Resets on serverless cold starts.

**Client IP extraction:** Uses `X-Forwarded-For` header (first IP in chain) when behind a proxy, falls back to `request.client.host`.

**Rate limit response (HTTP 429):**
```json
{
  "error": "You've used all your reflections for today. Come back tomorrow!"
}
```

---

## Error Handling

### Global Exception Handler

All unhandled exceptions return a generic error message. Stack traces are **never** leaked to the client.

```json
{
  "error": "An unexpected error occurred. Please try again."
}
```

Exceptions are logged server-side via Python's `logging` module.

### Model Failures

The backend uses fallback chains to handle model failures gracefully:

**Next-question fallback chain:**
1. MiniMax M2.5 (primary)
2. Nvidia Nemotron 120B (fallback)
3. OpenRouter free auto-router (last resort)
4. Static question from curated fallback set

**Synthesis fallback chain:**
1. Nvidia Nemotron 120B
2. OpenRouter free auto-router
3. Hardcoded generic insight report

The user **never** sees a raw error from model failures.

---

## Frontend Integration

The frontend consumes these endpoints via two helper functions in `app/lib/api.ts`:

### `streamNextQuestion(history, userName, questionNumber, onToken)`

Calls `POST /api/next-question` and processes the streaming response:
- Uses `ReadableStream.getReader()` + `TextDecoder` for token-by-token consumption
- Fires `onToken(token)` callback for each received chunk
- Handles 429 errors with a user-friendly message

### `fetchSynthesis(history, userName)`

Calls `POST /api/synthesize` with a 55-second client-side timeout:
- Uses `AbortController` with `setTimeout(55_000)`
- Parses the JSON response into a `SynthesisResponse` object
- Handles 429 errors with a user-friendly message

---

## Testing with curl

### Health check
```bash
curl http://localhost:8000/api/health
```

### Stats
```bash
curl http://localhost:8000/api/stats
```

### Next question (first question)
```bash
curl -X POST http://localhost:8000/api/next-question \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [],
    "user_name": "Test",
    "question_number": 1
  }'
```

### Next question (with history)
```bash
curl -X POST http://localhost:8000/api/next-question \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {
        "question": "Tell me about a recent decision you struggled with.",
        "answer": "I was deciding whether to change careers from engineering to design."
      }
    ],
    "user_name": "Test",
    "question_number": 2
  }'
```

### Synthesize
```bash
curl -X POST http://localhost:8000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {
        "question": "Tell me about a recent decision you struggled with.",
        "answer": "I was deciding whether to change careers."
      },
      {
        "question": "What made the decision difficult?",
        "answer": "I felt torn between security and passion."
      }
    ],
    "user_name": "Test"
  }'
```
