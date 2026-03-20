"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{ border: "1px solid rgba(0,0,0,0.08)" }}
      className="rounded-2xl p-8"
    >
      <h3 className="font-semibold text-base mb-2" style={{ color: "var(--foreground)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.7 }}>
        {body}
      </p>
    </div>
  );
}

function useCountUp(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

export default function Home() {
  const router = useRouter();
  const [reflectionCount, setReflectionCount] = useState(0);
  const animatedCount = useCountUp(reflectionCount);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.reflections_completed > 0) {
          setReflectionCount(data.reflections_completed);
        }
      })
      .catch(() => {/* silently hide on failure */});
  }, []);
  return (
    <main style={{ background: "var(--background)", color: "var(--foreground)" }} className="min-h-screen">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        {/* Decorative abstract curves */}
        <svg
          width="88"
          height="52"
          viewBox="0 0 88 52"
          fill="none"
          aria-hidden="true"
          className="animate-fade-in"
          style={{ animationDelay: "0ms", marginBottom: "2rem", opacity: 0.14 }}
        >
          <path d="M4 42 C18 8, 34 46, 44 26 C54 6, 70 42, 84 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M14 48 C26 22, 40 38, 60 22" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 5"/>
        </svg>

        <span
          className="animate-fade-in text-xs tracking-widest uppercase mb-6"
          style={{ animationDelay: "60ms", opacity: 0.45, letterSpacing: "0.15em" }}
        >
          A 5-minute reflection
        </span>

        <h1
          className="animate-fade-in font-serif text-5xl sm:text-6xl lg:text-7xl mb-6 leading-tight"
          style={{ animationDelay: "120ms" }}
        >
          Discover how you think.
        </h1>

        <p
          className="animate-fade-in text-lg leading-relaxed max-w-lg mb-10"
          style={{ animationDelay: "240ms", opacity: 0.6 }}
        >
          Answer a few thoughtful questions. MindMirror reflects your unique thinking patterns back to you — your strengths, blind spots, and the way you move through the world.
        </p>

        <button
          className="animate-fade-in cta-button"
          style={{
            animationDelay: "360ms",
            borderRadius: "9999px",
            padding: "14px 36px",
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "var(--foreground)",
            transition: "transform 0.3s ease-out, box-shadow 0.3s ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
          onClick={() => router.push("/reflect")}
        >
          Begin your reflection
        </button>

        {reflectionCount > 0 && (
          <p
            className="animate-fade-in"
            style={{
              marginTop: "1.25rem",
              fontSize: "0.78rem",
              opacity: 0.38,
              letterSpacing: "0.04em",
              animationDelay: "480ms",
            }}
          >
            Join {animatedCount.toLocaleString()}+ people who&apos;ve reflected
          </p>
        )}
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          <FeatureCard
            title="Adaptive conversation"
            body="Each question responds to what you've shared before — no two reflections are the same."
          />
          <FeatureCard
            title="Pattern recognition"
            body="Surface recurring themes in how you reason, decide, and relate to uncertainty."
          />
          <FeatureCard
            title="Private by design"
            body="Your responses inform your report and nothing else. No accounts, no tracking."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="pb-10 text-center text-sm" style={{ opacity: 0.4 }}>
        Built by{" "}
        <a
          href="https://s-samarth.lovable.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          Samarth Saraswat
        </a>
      </footer>
    </main>
  );
}
