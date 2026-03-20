# Model identifiers — change only here to swap models
PRIMARY_MODEL     = "minimax/minimax-m2.5:free"
FALLBACK_MODEL    = "nvidia/nemotron-3-super-120b:free"
LAST_RESORT_MODEL = "openrouter/free"

# LLM generation params for follow-up questions
QUESTION_MAX_TOKENS  = 150
QUESTION_TEMPERATURE = 0.7

# Static fallback questions used when ALL models fail (0-indexed)
FALLBACK_QUESTIONS = [
    "What's a decision you've made recently that you're proud of, and what drove it?",
    "When you face a difficult situation, what's usually your first instinct — to act, reflect, or seek others' input?",
    "Can you think of a time when your gut feeling conflicted with logic? Which did you follow?",
    "What kind of environment brings out your best thinking?",
    "How do you typically handle it when things don't go according to plan?",
    "What's something you believe that most people around you don't?",
    "Looking back at what you've shared today, what pattern do you notice in how you approach challenges?",
]
