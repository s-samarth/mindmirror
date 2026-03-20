"use client";

import { useEffect, useRef, useState } from "react";
import { SynthesisResponse } from "../lib/api";

interface Props {
  synthesis: SynthesisResponse;
  onReflectAgain: () => void;
}

// Scroll-triggered reveal wrapper — no library needed
function ScrollReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function ReportView({ synthesis, onReflectAgain }: Props) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const article = /^[aeiou]/i.test(synthesis.thinking_style) ? "an" : "a";
    const text = `I just discovered I'm ${article} ${synthesis.thinking_style} 🧠 Discover how you think → ${origin}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const pillStyle: React.CSSProperties = {
    border: "1.5px solid rgba(0,0,0,0.75)",
    borderRadius: "9999px",
    padding: "13px 32px",
    fontSize: "0.9rem",
    fontWeight: 500,
    background: "transparent",
    color: "var(--foreground)",
    cursor: "pointer",
    transition: "transform 0.3s ease-out, box-shadow 0.3s ease-out",
  };

  return (
    <div style={{ background: "linear-gradient(to bottom, var(--background) 0%, #FDF3E3 100%)" }}>
      {/* ─── Section 1: Hero ─────────────────────────────────────── */}
      <section
        className="animate-fade-in"
        style={{
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4rem 1.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.38,
            marginBottom: "1.75rem",
            display: "block",
          }}
        >
          Your reflection
        </span>

        <h1
          className="font-serif"
          style={{
            fontSize: "clamp(2.6rem, 7vw, 5.25rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
            marginBottom: "1.75rem",
            maxWidth: "20ch",
            textDecoration: "underline",
            textUnderlineOffset: "10px",
            textDecorationColor: "rgba(0,0,0,0.13)",
            textDecorationThickness: "1.5px",
          }}
        >
          {synthesis.thinking_style}
        </h1>

        <p
          style={{
            maxWidth: "34rem",
            lineHeight: 1.78,
            opacity: 0.72,
            fontSize: "1.05rem",
            marginBottom: "2.75rem",
          }}
        >
          {synthesis.summary}
        </p>

        {/* Decorative rule */}
        <div
          style={{
            width: "2.5rem",
            height: "1px",
            background: "rgba(0,0,0,0.16)",
            margin: "0 auto 2rem",
          }}
        />

        <span
          style={{
            fontSize: "0.75rem",
            opacity: 0.25,
            letterSpacing: "0.05em",
          }}
        >
          Scroll to explore ↓
        </span>
      </section>

      {/* ─── Section 2: Thinking Patterns ────────────────────────── */}
      <section
        style={{
          padding: "5rem 1.5rem 6rem",
          maxWidth: "46rem",
          margin: "0 auto",
        }}
      >
        <ScrollReveal>
          <h2
            className="font-serif"
            style={{
              fontSize: "clamp(1.6rem, 4vw, 2.1rem)",
              textAlign: "center",
              marginBottom: "2.75rem",
            }}
          >
            Patterns I noticed
          </h2>
        </ScrollReveal>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {synthesis.patterns.map((pattern, i) => (
            <ScrollReveal key={i} delay={i * 75}>
              <div
                className="pattern-card"
                style={{
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: "16px",
                  padding: "1.375rem 1.5rem",
                  display: "flex",
                  gap: "1.25rem",
                  alignItems: "flex-start",
                  background: "rgba(255,255,255,0.45)",
                }}
              >
                <span
                  style={{
                    fontSize: "1.6rem",
                    lineHeight: 1,
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                >
                  {pattern.icon}
                </span>
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "0.93rem",
                      marginBottom: "0.3rem",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {pattern.title}
                  </p>
                  <p
                    style={{
                      fontSize: "0.88rem",
                      lineHeight: 1.65,
                      opacity: 0.72,
                    }}
                  >
                    {pattern.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── Section 3: Strengths & Blind Spots ──────────────────── */}
      <section
        style={{
          padding: "5rem 1.5rem 6rem",
          maxWidth: "52rem",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "3.5rem",
          }}
        >
          {/* Strengths */}
          <ScrollReveal>
            <h2
              className="font-serif"
              style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}
            >
              Your strengths
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              {synthesis.strengths.map((s, i) => (
                <li
                  key={i}
                  style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "rgba(13, 148, 136, 0.72)",
                      flexShrink: 0,
                      marginTop: "0.48rem",
                    }}
                  />
                  <span style={{ fontSize: "0.92rem", lineHeight: 1.62, opacity: 0.78 }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          {/* Blind Spots */}
          <ScrollReveal delay={140}>
            <h2
              className="font-serif"
              style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}
            >
              Your blind spots
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              {synthesis.blind_spots.map((b, i) => (
                <li
                  key={i}
                  style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "rgba(217, 119, 6, 0.72)",
                      flexShrink: 0,
                      marginTop: "0.48rem",
                    }}
                  />
                  <span style={{ fontSize: "0.92rem", lineHeight: 1.62, opacity: 0.78 }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Section 4: Closing Reflection ───────────────────────── */}
      <section style={{ padding: "2rem 1.5rem 6rem" }}>
        <ScrollReveal>
          <div
            style={{
              maxWidth: "38rem",
              margin: "0 auto",
              background: "rgba(251, 243, 219, 0.52)",
              borderRadius: "20px",
              padding: "clamp(2rem, 5vw, 3rem) clamp(1.5rem, 5vw, 2.75rem)",
              textAlign: "center",
              border: "1px solid rgba(217, 119, 6, 0.1)",
            }}
          >
            <span
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.38,
                display: "block",
                marginBottom: "1.5rem",
              }}
            >
              A question to sit with
            </span>
            <p
              className="font-serif"
              style={{
                fontSize: "clamp(1.2rem, 3vw, 1.55rem)",
                fontStyle: "italic",
                lineHeight: 1.65,
                opacity: 0.82,
              }}
            >
              &ldquo;{synthesis.reflection}&rdquo;
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── Section 5: Actions ───────────────────────────────────── */}
      <section
        style={{
          padding: "2rem 1.5rem 0",
          textAlign: "center",
        }}
      >
        <ScrollReveal>
          <div
            style={{
              display: "flex",
              gap: "0.875rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {/* Share — filled dark */}
            <button
              style={{
                ...pillStyle,
                background: "rgba(0,0,0,0.87)",
                color: "#FAFAF8",
                border: "1.5px solid transparent",
                minWidth: "200px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 6px 24px rgba(0,0,0,0.22)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
              onClick={handleShare}
            >
              {copied ? "Copied ✓" : "Share your thinking style"}
            </button>

            {/* Reflect again — outline */}
            <button
              style={pillStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 16px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
              onClick={onReflectAgain}
            >
              Reflect again
            </button>
          </div>
        </ScrollReveal>

        <footer
          style={{
            marginTop: "3.5rem",
            paddingBottom: "2.5rem",
            fontSize: "0.82rem",
            opacity: 0.32,
          }}
        >
          Built by{" "}
          <a
            href="https://s-samarth.lovable.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            Samarth Saraswat · AI Product Manager
          </a>
        </footer>
      </section>

      {/* Toast */}
      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.84)",
            color: "#FAFAF8",
            padding: "0.7rem 1.4rem",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            pointerEvents: "none",
            animation: "fadeInUp 0.3s ease forwards",
            whiteSpace: "nowrap",
            zIndex: 100,
          }}
        >
          Copied to clipboard ✓
        </div>
      )}
    </div>
  );
}
