export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface QAItem {
  question: string;
  answer: string;
}

export interface InsightPattern {
  title: string;
  description: string;
  icon: string;
}

export interface SynthesisResponse {
  summary: string;
  thinking_style: string;
  patterns: InsightPattern[];
  strengths: string[];
  blind_spots: string[];
  reflection: string;
}

/**
 * Stream the next question from the AI token by token.
 * Calls POST /api/next-question with SSE/streaming response.
 */
export async function streamNextQuestion(
  history: QAItem[],
  userName: string,
  questionNumber: number,
  onToken: (token: string) => void
): Promise<void> {
  const res = await fetch("/api/next-question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_history: history,
      user_name: userName,
      question_number: questionNumber,
    }),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Rate limit reached. Please wait a moment and try again.");
  }

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}

/**
 * Fetch the full synthesis report after the conversation completes.
 * Calls POST /api/synthesize with 55s timeout.
 */
export async function fetchSynthesis(
  history: QAItem[],
  userName: string
): Promise<SynthesisResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await fetch("/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_history: history, user_name: userName }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? "Rate limit reached. Please wait a moment and try again.");
    }

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    return (await res.json()) as SynthesisResponse;
  } finally {
    clearTimeout(timer);
  }
}
