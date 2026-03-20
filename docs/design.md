# Design System

MindMirror's design language is built around one principle: **calm, focused reflection**. The aesthetic draws from meditation apps (Headspace, Calm) and premium journaling products — warm, minimal, and intentionally sparse.

---

## Design Philosophy

- **One thing on screen at a time** — Each question occupies the full viewport. No chat bubbles, no message history, no sidebar navigation.
- **Smooth transitions, no jarring changes** — Every state change uses fade/slide animations. The experience feels like a continuous flow, not a multi-page wizard.
- **Mobile-first responsive** — Touch-friendly targets, fluid typography, no horizontal scrolling.
- **Earned complexity** — The landing page is simple. The report is rich. Visual density increases as the user invests more time.

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FAFAF8` | Warm off-white page background |
| `--foreground` | `#1a1a1a` | Primary text color (near-black) |
| Strengths accent | `rgba(13, 148, 136, 0.72)` | Teal bullet markers in report |
| Blind spots accent | `rgba(217, 119, 6, 0.72)` | Amber bullet markers in report |
| Reflection background | Warm beige/tan | Reflection question card |
| CTA border | `rgba(0, 0, 0, 0.75)` | Dark border ring on primary button |
| Muted text | `opacity: 0.6-0.78` | Secondary text hierarchy |

The palette is deliberately restrained — two core colors with accent tints only in the report. This creates visual calm during the conversation and a satisfying "reveal" when the colorful report appears.

---

## Typography

### Font Stack

| Role | Font | Fallback | CSS Variable |
|------|------|----------|--------------|
| Headings (serif) | Playfair Display | Georgia, serif | `--font-playfair` |
| Body (sans-serif) | Inter | system-ui, sans-serif | `--font-inter` |

Both fonts are loaded from Google Fonts in `app/layout.tsx` and registered as CSS variables on the body element.

### Size Hierarchy

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Hero heading (landing) | `text-5xl` / `sm:text-6xl` / `lg:text-7xl` | Bold | Playfair Display |
| Report thinking style | `clamp(2.6rem, 7vw, 5.25rem)` | Bold | Fluid scaling |
| Section headings | `clamp(1.6rem, 4vw, 2.1rem)` | Semibold | Playfair Display |
| Feature card titles | `text-base` | Semibold | Inter |
| Body text | `1rem` | Normal | `line-height: 1.625` (relaxed) |
| Labels | `text-xs` | Normal | `tracking-widest uppercase` |
| Mobile body | `16px` (locked) | — | Prevents iOS zoom on input focus |

### Special Treatments

- **Underlined headings** in report: `text-decoration: underline`, `text-underline-offset: 10px`, `text-decoration-thickness: 1.5px`
- **Serif italic** for reflection question: `font-serif` + `fontStyle: "italic"`
- **Opacity-based hierarchy**: Secondary text uses `opacity: 0.6`, `0.7`, or `0.78` rather than gray color values

---

## Animation Catalog

All animations are defined in `app/globals.css` as CSS keyframes.

### fadeInUp
- **Duration:** 0.7s ease, forwards
- **Effect:** `opacity: 0 → 1`, `translateY(16px → 0)`
- **Class:** `.animate-fade-in`
- **Purpose:** Entrance animation for all major sections. Used with staggered `animation-delay` values (60ms, 120ms, 240ms, 360ms, 480ms) to create a cascading reveal.

### breathe
- **Duration:** 3s ease-in-out, infinite
- **Effect:** `opacity: 0.5 → 1`, `scale(1 → 1.03)`
- **Class:** `.animate-breathe`
- **Purpose:** Pulsing animation during the GENERATING phase. Creates a sense of the AI "thinking" and deliberating.

### dotPulse
- **Duration:** 1.4s ease-in-out, infinite
- **Effect:** Opacity pulse with staggered delays (0s, 0.2s, 0.4s) across three dots
- **Class:** `.dot-pulse span`
- **Purpose:** Loading indicator while waiting for stream to start. Three dots pulse sequentially.

### shake
- **Duration:** 0.4s ease
- **Effect:** Horizontal shake (`translateX: 0 → -6px → 6px → -4px → 4px → 0`)
- **Class:** `.animate-shake`
- **Purpose:** Negative feedback when user tries to submit an empty answer. Gentle but clear.

### float
- **Duration:** 6s ease-in-out, infinite
- **Effect:** `translateY(0 → -5px → 0)`
- **Class:** `.question-float`
- **Purpose:** Idle floating effect on the question text when not actively streaming. Adds life without distraction.

### ctaBorderSpin
- **Duration:** 3s linear, infinite
- **Effect:** Rotates a CSS `--cta-angle` custom property from 135deg to 495deg
- **Class:** `.cta-button:hover::before`
- **Purpose:** Animated conic gradient border on the CTA button hover. Creates a spinning light effect around the button edge.
- **Implementation:** Uses `@property --cta-angle` for animatable custom properties.

---

## Special Effects

### Grain/Noise Texture Overlay
A subtle SVG fractal noise texture applied via `body::after` pseudo-element:
- **Opacity:** 0.032 (barely perceptible)
- **Position:** Fixed, full viewport, `z-index: 9999`
- **Pointer events:** None (doesn't interfere with interaction)
- **Purpose:** Adds organic warmth and tactile quality to the flat background. Prevents the page from feeling sterile.

### Pattern Card Hover
Report pattern cards lift on hover:
- `transform: translateY(-2px)`
- `box-shadow: 0 8px 28px rgba(0, 0, 0, 0.07)`
- Smooth 0.3s ease-out transition

### Focus States
- **Interactive elements:** `outline: 2px solid rgba(0, 0, 0, 0.28)`, `outline-offset: 3px`, `border-radius: 6px`
- **Inputs/textareas:** Outline removed, border-color change instead (prevents layout shift)

---

## Layout & Spacing

### Grid Patterns

| Context | Layout | Breakpoint |
|---------|--------|------------|
| Feature cards (landing) | `grid-cols-1` → `sm:grid-cols-3` | 640px |
| Strengths/blind spots (report) | `grid-cols-1` → `sm:grid-cols-2` | 640px |
| Patterns (report) | Single column flex | — |

### Spacing Scale

| Element | Padding/Gap | Notes |
|---------|-------------|-------|
| Page sections | `py-24` / `px-6` | Generous vertical breathing room |
| Cards | `1.375rem - 2rem` | Comfortable inner padding |
| Section gaps | `0.875rem - 3.5rem` | Semantic grouping |
| Button padding | `12px vertical, 32px horizontal` | Touch-friendly targets |

### Responsive Strategy

- **Mobile-first Tailwind** — Base styles target mobile, `sm:` / `lg:` add desktop enhancements
- **Fluid typography** — `clamp()` for headings: `clamp(2.6rem, 7vw, 5.25rem)`
- **Font-size lock** — `body { font-size: 16px }` at `max-width: 640px` prevents iOS auto-zoom on input focus
- **Max content width** — `max-w-2xl` (42rem) for conversation, `max-w-4xl` for report

---

## Component Design Patterns

### ScrollReveal (Report)
Wraps report sections for scroll-triggered entrance animations:
- Uses `IntersectionObserver` with 0.12 threshold (fires when 12% visible)
- Applies `opacity` + `transform` transition on first intersection
- Configurable `delay` prop for staggered reveals (75ms increments)
- Disconnects observer after first trigger (one-shot)
- Animation: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`

### FeatureCard (Landing)
Reusable card component with title and body text. Used for the three feature highlights.

### Progress Bar (Conversation)
- Fixed position at top of viewport, `z-index: 50`
- Width: `(questionNumber / MAX_QUESTIONS) * 100%`
- 0.5s smooth transition on width change
- 2px height, dark gray track on warm background

### useCountUp Hook (Landing)
Custom React hook for the reflection counter:
- Uses `requestAnimationFrame` for smooth counting
- Ease-out cubic easing function
- Animates from 0 to target number over configured duration

---

## UX Decisions

### Why Not a Chat Interface
The conversation is **not** displayed as a chat with bubbles and message history. Each question occupies the full screen alone. Rationale:
- Forces focused reflection on each question individually
- Prevents users from skimming back to "check" previous answers
- Creates a feeling of depth rather than rapid-fire exchange
- Avoids the casual, transactional feeling of chat UIs

### Streaming Typewriter Effect
Questions stream in token-by-token rather than appearing all at once:
- **UX benefit:** Feels alive and deliberate, like the AI is composing the question in real-time
- **Technical benefit:** Avoids Vercel serverless timeout issues
- The textarea only becomes active after streaming completes, preventing users from typing before reading

### Empty Submission Feedback
When a user tries to submit an empty answer:
1. Textarea shakes (0.4s horizontal shake animation)
2. Hint text appears: "Share what comes to mind — there are no wrong answers"
3. No error modal, no red borders — gentle nudge, not punishment

### Keyboard Behavior
- **Enter** submits the answer
- **Shift+Enter** adds a newline
- This matches common chat/form conventions and is documented in the placeholder text

### Navigation Guard
`beforeunload` event listener is active during CONVERSATION and GENERATING phases:
- Prevents accidental tab close or navigation mid-session
- Removed when entering REPORT or returning to INTRO
- Does not block intentional navigation (browser shows native confirmation dialog)

### Scroll-Triggered Reveals (Report)
Report sections fade in as the user scrolls:
- Creates a sense of progressive discovery
- Prevents information overload (user doesn't see everything at once)
- Staggered delays (75ms increments) create a cascading reveal effect

### Share-to-Clipboard
The "Share" button copies a pre-formatted text string to the clipboard:
- Format: `"{name} is a {thinking_style}"`
- Toast notification: "Copied to clipboard" with checkmark, visible for 2.5 seconds
- Uses `navigator.clipboard.writeText()` API

### Dynamic Page Title
The browser tab title changes based on phase:
- During conversation: "Reflecting..."
- On report: "Your Insights"
- Resets to "MindMirror" on unmount

---

## Accessibility

- **Focus-visible outlines** on all interactive elements (2px solid, 3px offset)
- **Semantic HTML** — headings, buttons, form elements used correctly
- **Color contrast** — `#1a1a1a` on `#FAFAF8` exceeds WCAG AA requirements
- **Touch targets** — Buttons have minimum 44px effective height
- **No motion preference** — Animations could be reduced for `prefers-reduced-motion` (not yet implemented)
