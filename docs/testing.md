# Testing

## Current State

MindMirror does not have automated tests yet. This document provides a manual testing guide and a recommended strategy for adding automated tests.

---

## Manual Testing Guide

### Landing Page Checklist

| Item | What to Verify |
|------|---------------|
| Page load | Page loads without errors, warm off-white background visible |
| Hero animation | Heading, subheading, and CTA fade in with staggered delays |
| SVG curves | Animated curves render behind the hero section |
| CTA button | "Begin your reflection" button has hover animation (spinning border) |
| Feature cards | Three cards render in a row on desktop, stack on mobile |
| Reflection counter | Counter animates from 0 to current count (fetches `/api/stats`) |
| Footer | Builder attribution link is present and clickable |
| Grain texture | Subtle noise overlay visible (barely perceptible at 3.2% opacity) |
| Mobile layout | Cards stack vertically, text is readable, CTA is tappable |

### Conversation Flow Checklist

| Item | What to Verify |
|------|---------------|
| Intro screen | Optional name input and "Let's start" button appear |
| Name input | Accepts up to 50 characters, Enter key starts conversation |
| First question | Predefined question streams in token-by-token |
| Progress bar | Thin bar at top shows 1/7 progress, advances with each question |
| Question streaming | Tokens appear one at a time with typewriter effect |
| Float animation | Question text gently floats when streaming is complete |
| Textarea focus | Textarea auto-focuses after question finishes streaming |
| Empty submit | Shake animation plays, hint text appears |
| Answer submit | Enter key submits, Shift+Enter adds newline |
| Warm-up message | "Warming up..." appears if stream takes >5 seconds |
| Next question | After submission, next question streams in with updated progress |
| Question 7 | After 7th answer, transitions to GENERATING phase |
| Navigation guard | Browser warns if user tries to close tab mid-conversation |

### Generating Phase Checklist

| Item | What to Verify |
|------|---------------|
| Rotating messages | Three messages cycle every 3 seconds |
| Breathe animation | Text pulses with breathing animation |
| Transition | Smoothly transitions to report when synthesis completes |
| Error state | If synthesis fails, error message with retry/start-over buttons appears |

### Report Checklist

| Item | What to Verify |
|------|---------------|
| Thinking style | Large serif heading with underline decoration |
| Summary | 2-3 sentence paragraph below the heading |
| Patterns | 2-4 cards with emoji icons, titles, and descriptions |
| Strengths | Teal-accented bullet points |
| Blind spots | Amber-accented bullet points |
| Reflection | Italicized question in warm beige box |
| Scroll reveals | Sections fade in as user scrolls |
| Share button | Copies "Name is a Thinking Style" to clipboard, shows toast |
| Reflect again | Resets flow to intro screen |
| Page title | Browser tab shows "Your Insights" |

### Error & Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty answer submission | Shake animation + hint text, no submission |
| API unreachable | Error message with retry option |
| Model rate limit (429) | Rate limit message, redirect to intro |
| Synthesis timeout | Falls back to generic insight report |
| All models fail (questions) | Static fallback question appears |
| All models fail (synthesis) | Hardcoded generic report renders |
| Close tab mid-conversation | Browser shows "Leave site?" confirmation |
| Rapid submissions | Streaming completes before next question is accepted |
| Very long answer | Textarea grows, answer accepted (max 2000 chars enforced server-side) |

---

## API Endpoint Testing

### Health Check

```bash
curl http://localhost:8000/api/health
# Expected: {"status":"ok","service":"mindmirror"}
```

### Stats

```bash
curl http://localhost:8000/api/stats
# Expected: {"reflections_completed":0}
```

### Next Question (Empty History)

```bash
curl -X POST http://localhost:8000/api/next-question \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [],
    "user_name": "Test",
    "question_number": 1
  }'
```

Expected: Streamed question text (first question may be the predefined anchor or AI-generated).

### Next Question (With History)

```bash
curl -X POST http://localhost:8000/api/next-question \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {
        "question": "Tell me about a recent decision you struggled with.",
        "answer": "I was choosing between two job offers, one safer and one riskier but more exciting."
      }
    ],
    "user_name": "Test",
    "question_number": 2
  }'
```

Expected: An adaptive follow-up question related to the user's answer about job decisions.

### Synthesis

```bash
curl -X POST http://localhost:8000/api/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {"question": "Q1", "answer": "A1"},
      {"question": "Q2", "answer": "A2"},
      {"question": "Q3", "answer": "A3"}
    ],
    "user_name": "Test"
  }'
```

Expected: JSON object with `summary`, `thinking_style`, `patterns`, `strengths`, `blind_spots`, `reflection`.

### Rate Limit Testing

Send more than 50 requests to `/api/next-question` from the same IP in one day:

```bash
for i in $(seq 1 51); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:8000/api/next-question \
    -H "Content-Type: application/json" \
    -d '{"conversation_history":[],"user_name":"Test","question_number":1}'
done
```

Expected: First 50 return 200, 51st returns 429.

**Note:** Rate limits are in-memory and reset when the server restarts.

---

## Recommended Testing Strategy

### Frontend Tests (Vitest + React Testing Library)

**Framework:** [Vitest](https://vitest.dev/) (Vite-native, fast) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

**Priority test cases:**

| Component | Test |
|-----------|------|
| Landing page | Renders hero, CTA, feature cards |
| Reflection intro | Name input accepts text, Enter starts flow |
| Conversation phase | Displays streamed question, accepts answer |
| Empty submission | Shows shake class, displays hint text |
| Report view | Renders all sections from mock SynthesisResponse |
| Share button | Calls navigator.clipboard.writeText |
| ScrollReveal | Elements become visible on intersection |
| API helpers | streamNextQuestion handles 429 errors |
| API helpers | fetchSynthesis times out at 55s |

**Setup:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Backend Tests (pytest + httpx)

**Framework:** [pytest](https://pytest.org/) + [httpx](https://www.python-httpx.org/) (async HTTP client for testing FastAPI)

**Priority test cases:**

| Endpoint | Test |
|----------|------|
| `GET /api/health` | Returns 200 with correct JSON |
| `GET /api/stats` | Returns 200 with `reflections_completed` |
| `POST /api/next-question` | Returns streaming response with valid text |
| `POST /api/next-question` | Rejects invalid `question_number` (out of range) |
| `POST /api/next-question` | Returns 429 after exceeding rate limit |
| `POST /api/synthesize` | Returns valid SynthesisResponse JSON |
| `POST /api/synthesize` | Returns 429 after exceeding rate limit |
| Models validation | QAItem rejects answer > 2000 chars |
| Models validation | NextQuestionRequest rejects > 10 history items |
| Fallback chain | Returns static question when all models fail |
| JSON parsing | `_parse_json_response` handles markdown fences |
| JSON parsing | `_parse_json_response` extracts JSON from mixed text |

**Setup:**
```bash
pip install pytest httpx pytest-asyncio
```

### E2E Tests (Playwright)

**Framework:** [Playwright](https://playwright.dev/)

**Priority test flows:**

| Flow | Steps |
|------|-------|
| Happy path | Landing → Begin → Name → Answer 7 questions → View report |
| Share flow | Complete reflection → Click share → Verify clipboard |
| Reflect again | Complete reflection → Click "Reflect again" → Verify reset |
| Error recovery | Simulate API failure → Verify error message → Retry |
| Mobile flow | Same as happy path at 375px viewport width |

**Setup:**
```bash
npm install -D @playwright/test
npx playwright install
```

### Proposed Test File Structure

```
├── __tests__/                    # Frontend tests
│   ├── components/
│   │   ├── landing.test.tsx
│   │   ├── reflection.test.tsx
│   │   └── report-view.test.tsx
│   └── lib/
│       └── api.test.ts
├── tests/                        # Backend tests (Python)
│   ├── test_endpoints.py
│   ├── test_models.py
│   ├── test_chains.py
│   └── test_json_parsing.py
└── e2e/                          # End-to-end tests
    ├── happy-path.spec.ts
    ├── error-handling.spec.ts
    └── mobile.spec.ts
```
