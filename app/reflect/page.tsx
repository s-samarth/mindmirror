"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { streamNextQuestion, fetchSynthesis, QAItem, SynthesisResponse } from "../lib/api";
import ReportView from "./ReportView";

const MAX_QUESTIONS = 7;
const Q1 = "Tell me about a recent decision you struggled with.";
const GENERATING_MESSAGES = [
  "Reflecting on your responses...",
  "Finding patterns in your thinking...",
  "Crafting your insights...",
];

type Phase = "INTRO" | "CONVERSATION" | "GENERATING" | "REPORT";

interface AppError {
  message: string;
  type: "stream" | "synthesis" | "rate_limit";
}

export default function ReflectPage() {
  const [phase, setPhase] = useState<Phase>("INTRO");
  const [userName, setUserName] = useState("");
  const [history, setHistory] = useState<QAItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisResponse | null>(null);
  const [generatingMsgIndex, setGeneratingMsgIndex] = useState(0);
  const [shakeTextarea, setShakeTextarea] = useState(false);
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const [showWarmUp, setShowWarmUp] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const warmUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus textarea when streaming ends
  useEffect(() => {
    if (!isStreaming && phase === "CONVERSATION" && !error) {
      textareaRef.current?.focus();
    }
  }, [isStreaming, phase, error]);

  // Scroll to top when REPORT phase begins
  useEffect(() => {
    if (phase === "REPORT") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [phase]);

  // Dynamic page title
  useEffect(() => {
    document.title =
      phase === "REPORT" ? "MindMirror — Your Insights" : "MindMirror — Reflecting...";
    return () => { document.title = "MindMirror"; };
  }, [phase]);

  // Warn before navigating away during active session
  useEffect(() => {
    if (phase !== "CONVERSATION" && phase !== "GENERATING") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // Rotating messages during GENERATING
  useEffect(() => {
    if (phase !== "GENERATING") return;
    const interval = setInterval(() => {
      setGeneratingMsgIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [phase]);

  function startWarmUpTimer() {
    warmUpTimerRef.current = setTimeout(() => setShowWarmUp(true), 5000);
  }
  function clearWarmUpTimer() {
    if (warmUpTimerRef.current) clearTimeout(warmUpTimerRef.current);
    warmUpTimerRef.current = null;
    setShowWarmUp(false);
  }

  function simulateQ1() {
    setCurrentQuestion("");
    setIsStreaming(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setCurrentQuestion(Q1.slice(0, i));
      if (i >= Q1.length) {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 30);
  }

  function startConversation() {
    setHistory([]);
    setAnswerDraft("");
    setQuestionNumber(1);
    setRetryCount(0);
    setError(null);
    setSynthesis(null);
    setPhase("CONVERSATION");
    simulateQ1();
  }

  function resetToIntro() {
    setPhase("INTRO");
    setHistory([]);
    setCurrentQuestion("");
    setIsStreaming(false);
    setAnswerDraft("");
    setQuestionNumber(1);
    setRetryCount(0);
    setError(null);
    setSynthesis(null);
  }

  const startSynthesis = useCallback(async (finalHistory: QAItem[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    let attempts = 0;

    async function attempt() {
      try {
        const result = await fetchSynthesis(finalHistory, userName);
        setSynthesis(result);
        setPhase("REPORT");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("Rate limit") || msg.includes("reflections for today")) {
          setError({ message: msg, type: "rate_limit" });
          return;
        }
        attempts++;
        if (attempts >= 3) {
          resetToIntro();
          return;
        }
        const isTimeout = err instanceof DOMException && err.name === "AbortError";
        if (isTimeout) {
          setError({ message: "Taking a bit longer than usual. Trying once more...", type: "synthesis" });
        } else {
          setError({ message: "I need a moment. Let me try again.", type: "synthesis" });
        }
      }
    }

    await attempt();
  }, [userName]);

  const handleStreamError = useCallback((err: unknown, hist: QAItem[], qNum: number, currentRetry: number) => {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("Rate limit") || msg.includes("reflections for today")) {
      setError({ message: msg, type: "rate_limit" });
      return;
    }
    if (currentRetry >= 3) {
      resetToIntro();
      return;
    }
    setError({ message: "Lost my train of thought. Let me try again.", type: "stream" });
  }, []);

  async function retryStream(hist: QAItem[], qNum: number) {
    const nextRetry = retryCount + 1;
    setRetryCount(nextRetry);
    setError(null);
    setCurrentQuestion("");
    setIsStreaming(true);
    startWarmUpTimer();
    try {
      let firstToken = true;
      await streamNextQuestion(hist, userName, qNum, (token) => {
        if (firstToken) { clearWarmUpTimer(); firstToken = false; }
        setCurrentQuestion((prev) => prev + token);
      });
      setIsStreaming(false);
    } catch (err) {
      clearWarmUpTimer();
      handleStreamError(err, hist, qNum, nextRetry);
    }
  }

  async function retrySynthesis(hist: QAItem[]) {
    setError(null);
    await startSynthesis(hist);
  }

  async function handleSubmit() {
    if (!answerDraft.trim()) {
      setShakeTextarea(true);
      setShowEmptyHint(true);
      setTimeout(() => setShakeTextarea(false), 400);
      return;
    }
    setShowEmptyHint(false);

    const completedPair: QAItem = { question: currentQuestion, answer: answerDraft.trim() };
    const newHistory = [...history, completedPair];
    const nextQNum = questionNumber + 1;

    setHistory(newHistory);
    setAnswerDraft("");
    setCurrentQuestion("");
    setIsStreaming(true);
    setError(null);

    if (nextQNum > MAX_QUESTIONS) {
      setPhase("GENERATING");
      startSynthesis(newHistory);
      return;
    }

    setQuestionNumber(nextQNum);
    setRetryCount(0);
    startWarmUpTimer();

    try {
      let firstToken = true;
      await streamNextQuestion(newHistory, userName, nextQNum, (token) => {
        if (firstToken) { clearWarmUpTimer(); firstToken = false; }
        setCurrentQuestion((prev) => prev + token);
      });
      setIsStreaming(false);
    } catch (err) {
      clearWarmUpTimer();
      handleStreamError(err, newHistory, nextQNum, 0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const pillButtonStyle: React.CSSProperties = {
    border: "1.5px solid rgba(0,0,0,0.75)",
    borderRadius: "9999px",
    padding: "12px 32px",
    fontSize: "0.9rem",
    fontWeight: 500,
    background: "transparent",
    color: "var(--foreground)",
    cursor: "pointer",
    transition: "transform 0.3s ease-out, box-shadow 0.3s ease-out",
  };

  return (
    <main
      style={{ background: "var(--background)", color: "var(--foreground)" }}
      className="min-h-screen"
    >
      {/* Progress bar — only visible during conversation */}
      {phase === "CONVERSATION" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: "rgba(0,0,0,0.08)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              height: "100%",
              background: "rgba(0,0,0,0.4)",
              width: `${(questionNumber / MAX_QUESTIONS) * 100}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      )}

      {/* INTRO */}
      {phase === "INTRO" && (
        <section
          key="intro"
          className="animate-fade-in min-h-screen flex flex-col items-center justify-center px-6 text-center"
        >
          <h2 className="font-serif text-3xl sm:text-4xl mb-4">
            Before we begin...
          </h2>
          <p className="text-base leading-relaxed max-w-sm mb-8" style={{ opacity: 0.6 }}>
            I&apos;ll ask you {MAX_QUESTIONS} questions to understand how you think.
          </p>
          <input
            type="text"
            placeholder="Your name (optional)"
            maxLength={50}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") startConversation(); }}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid rgba(0,0,0,0.2)",
              outline: "none",
              textAlign: "center",
              fontSize: "1rem",
              padding: "8px 4px",
              width: "220px",
              color: "var(--foreground)",
              marginBottom: "2rem",
            }}
          />
          <button
            style={pillButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
            onClick={startConversation}
          >
            Let&apos;s start →
          </button>
        </section>
      )}

      {/* CONVERSATION */}
      {phase === "CONVERSATION" && (
        <section
          key="conversation"
          className="animate-fade-in min-h-screen flex flex-col items-center justify-center px-6 text-center"
        >
          {/* Question counter */}
          <p className="text-xs mb-8" style={{ opacity: 0.35, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {questionNumber} of {MAX_QUESTIONS}
          </p>

          {/* Question / loading dots / error */}
          {error ? (
            <div className="animate-fade-in max-w-2xl">
              <p className="font-serif text-xl mb-6" style={{ opacity: 0.7 }}>
                {error.type === "stream" && currentQuestion !== ""
                  ? "Let me finish that thought..."
                  : error.message}
              </p>
              {error.type === "rate_limit" ? (
                <button
                  style={{ ...pillButtonStyle, border: "none", textDecoration: "underline", textUnderlineOffset: "3px", padding: "8px 0" }}
                  onClick={resetToIntro}
                >
                  Start over
                </button>
              ) : (
                <div className="flex gap-4 justify-center">
                  <button
                    style={pillButtonStyle}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    }}
                    onClick={() => retryStream(history, questionNumber)}
                  >
                    Try again
                  </button>
                  <button
                    style={{ ...pillButtonStyle, border: "none", textDecoration: "underline", textUnderlineOffset: "3px", padding: "12px 0" }}
                    onClick={resetToIntro}
                  >
                    Start over
                  </button>
                </div>
              )}
            </div>
          ) : isStreaming && currentQuestion === "" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              {showWarmUp && (
                <p style={{ fontSize: "0.78rem", opacity: 0.38, letterSpacing: "0.06em" }}>
                  Warming up...
                </p>
              )}
              <div className="dot-pulse flex gap-2 justify-center">
                <span style={{ fontSize: "2rem" }}>.</span>
                <span style={{ fontSize: "2rem" }}>.</span>
                <span style={{ fontSize: "2rem" }}>.</span>
              </div>
            </div>
          ) : (
            <p
              key={questionNumber}
              className={`font-serif text-2xl sm:text-3xl max-w-2xl leading-snug animate-fade-in${!isStreaming ? " question-float" : ""}`}
            >
              {currentQuestion}
            </p>
          )}

          {/* Answer area */}
          {!isStreaming && !error && (
            <div className="animate-fade-in w-full max-w-2xl mt-10">
              <div className={shakeTextarea ? "animate-shake" : ""}>
              <textarea
                ref={textareaRef}
                placeholder="Take your time..."
                rows={3}
                value={answerDraft}
                onChange={(e) => { setAnswerDraft(e.target.value); setShowEmptyHint(false); }}
                onKeyDown={handleKeyDown}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  fontSize: "1rem",
                  lineHeight: "1.6",
                  color: "var(--foreground)",
                  outline: "none",
                  resize: "none",
                  fontFamily: "var(--font-sans)",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.35)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.15)"; }}
              />
              {showEmptyHint && (
                <p style={{ fontSize: "0.82rem", opacity: 0.5, marginTop: "0.5rem", textAlign: "center" }}>
                  Share what comes to mind — there are no wrong answers
                </p>
              )}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  style={pillButtonStyle}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                  onClick={handleSubmit}
                >
                  Continue →
                </button>
              </div>
              <p className="text-xs mt-3 text-right" style={{ opacity: 0.3 }}>
                Enter to continue · Shift+Enter for new line
              </p>
            </div>
          )}
        </section>
      )}

      {/* GENERATING */}
      {phase === "GENERATING" && (
        <section
          key="generating"
          className="animate-fade-in min-h-screen flex flex-col items-center justify-center px-6 text-center"
        >
          {error ? (
            <div className="animate-fade-in max-w-lg">
              <p className="font-serif text-xl mb-6" style={{ opacity: 0.7 }}>
                {error.message}
              </p>
              {error.type === "rate_limit" ? (
                <button
                  style={{ ...pillButtonStyle, border: "none", textDecoration: "underline", textUnderlineOffset: "3px", padding: "8px 0" }}
                  onClick={resetToIntro}
                >
                  Start over
                </button>
              ) : (
                <div className="flex gap-4 justify-center">
                  <button
                    style={pillButtonStyle}
                    onClick={() => retrySynthesis(history)}
                  >
                    Try again
                  </button>
                  <button
                    style={{ ...pillButtonStyle, border: "none", textDecoration: "underline", textUnderlineOffset: "3px", padding: "12px 0" }}
                    onClick={resetToIntro}
                  >
                    Start over
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="animate-breathe font-serif text-2xl sm:text-3xl max-w-lg">
              {GENERATING_MESSAGES[generatingMsgIndex]}
            </p>
          )}
        </section>
      )}

      {/* REPORT */}
      {phase === "REPORT" && synthesis && (
        <ReportView
          synthesis={synthesis}
          onReflectAgain={resetToIntro}
        />
      )}
    </main>
  );
}
