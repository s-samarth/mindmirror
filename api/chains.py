import json
import logging
from langchain_openrouter import ChatOpenRouter
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from api.models import QAItem, SynthesisResponse
from api.config import (
    PRIMARY_MODEL, FALLBACK_MODEL, LAST_RESORT_MODEL,
    QUESTION_MAX_TOKENS, QUESTION_TEMPERATURE, FALLBACK_QUESTIONS,
)

logger = logging.getLogger(__name__)


def get_llm(model: str, max_tokens: int = QUESTION_MAX_TOKENS, temperature: float = QUESTION_TEMPERATURE) -> ChatOpenRouter:
    return ChatOpenRouter(model=model, max_tokens=max_tokens, temperature=temperature)


def _build_messages(conversation_history: list[QAItem], user_name: str | None, question_number: int) -> list:
    if conversation_history:
        history_block = "\n\n".join(f"Q: {item.question}\nA: {item.answer}" for item in conversation_history)
    else:
        history_block = "[No conversation yet]"

    name_instruction = (
        f"The user's name is {user_name}. Use it occasionally to make the conversation feel personal."
        if user_name else ""
    )

    system_prompt = f"""You are a thoughtful, empathetic guide conducting a personality and thinking-pattern assessment. Your goal is to understand how this person thinks, feels, and approaches life through natural, adaptive conversation.

You are exploring these five dimensions:
1. Decision-making style (intuitive vs analytical)
2. Social orientation (introvert vs extrovert tendencies)
3. Stress response (fight, flight, freeze, or fawn)
4. Core values and what drives meaning
5. Growth mindset vs fixed mindset indicators

Style guide:
- Ask one clear, open-ended question at a time
- Build naturally on what the user has shared — reference specific things they said
- Vary your question types: situational, reflective, hypothetical
- Keep questions conversational, not clinical
- You are on question {question_number} of 5–7 total
{name_instruction}

IMPORTANT: Output only the question itself. No preamble, no "Great answer!", no commentary. Just the question."""

    human_prompt = f"""Here is the conversation so far:

{history_block}

Generate the next adaptive question."""

    return [SystemMessage(content=system_prompt), HumanMessage(content=human_prompt)]


async def stream_next_question(conversation_history: list[QAItem], user_name: str | None, question_number: int):
    messages = _build_messages(conversation_history, user_name, question_number)

    for model in [PRIMARY_MODEL, FALLBACK_MODEL, LAST_RESORT_MODEL]:
        try:
            llm = get_llm(model)
            async for chunk in llm.astream(messages):
                if chunk.content:
                    yield chunk.content
            return
        except Exception as e:
            logger.warning("Model %s failed: %s", model, e)

    # All models failed — yield static fallback
    idx = min(question_number - 1, len(FALLBACK_QUESTIONS) - 1)
    yield FALLBACK_QUESTIONS[idx]


async def get_next_question(conversation_history: list[QAItem], user_name: str | None, question_number: int) -> str:
    messages = _build_messages(conversation_history, user_name, question_number)

    for model in [PRIMARY_MODEL, FALLBACK_MODEL, LAST_RESORT_MODEL]:
        try:
            llm = get_llm(model)
            response = await llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.warning("Model %s failed: %s", model, e)

    idx = min(question_number - 1, len(FALLBACK_QUESTIONS) - 1)
    return FALLBACK_QUESTIONS[idx]


SYNTHESIS_FALLBACK = {
    "summary": "Your responses reveal a thoughtful mind that values both analysis and intuition.",
    "thinking_style": "Reflective Explorer",
    "patterns": [{"title": "Balanced perspective", "description": "You consider multiple angles before reaching conclusions, showing both analytical depth and emotional awareness.", "icon": "🔍"}],
    "strengths": ["You reflect deeply on your experiences and decisions"],
    "blind_spots": ["You may sometimes overthink decisions that would benefit from quicker action"],
    "reflection": "What would change if you trusted your first instinct more often?"
}


def _parse_json_response(text: str) -> dict | None:
    # Strip markdown fences
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        # Remove first line (```json or ```) and last line (```)
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    # Slice from first { to last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        return None
    text = text[start:end + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


async def generate_synthesis(conversation_history: list, user_name: str | None) -> dict:
    formatted_history = "\n\n".join(
        f"Q: {item['question']}\nA: {item['answer']}" for item in conversation_history
    )

    name_instruction = (
        f"The user's name is {user_name}. Reference them by name in the summary where natural."
        if user_name else ""
    )

    system_prompt = f"""You are an expert psychologist and personality analyst. Based on a short adaptive conversation, synthesize a rich, personalized insight report about the user's thinking patterns and personality.

{name_instruction}

CRITICAL RULES:
- Output ONLY valid JSON. No preamble, no explanation, no markdown fences.
- Do not include any text before or after the JSON object.
- Every field is required.

thinking_style guidance: Give a 2–4 word evocative label (e.g. "Analytical Dreamer", "Grounded Pragmatist", "Empathic Strategist"). Make it feel like a genuine insight, not generic.

patterns schema: an array of 2–4 objects, each with:
  - "title": short name for the pattern (3–6 words)
  - "description": 1–2 sentences explaining it with specific reference to what the user said
  - "icon": a single relevant emoji

Respond with this exact JSON structure:
{{
  "summary": "2–3 sentence personalized overview of who this person is",
  "thinking_style": "Label",
  "patterns": [
    {{"title": "...", "description": "...", "icon": "..."}}
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "blind_spots": ["blind spot 1", "blind spot 2"],
  "reflection": "One evocative question for the user to sit with"
}}"""

    human_message = f"Here is the complete conversation:\n\n{formatted_history}\n\nSynthesize your insights."

    messages = [SystemMessage(content=system_prompt), HumanMessage(content=human_message)]

    for model in [FALLBACK_MODEL, LAST_RESORT_MODEL]:
        llm = get_llm(model, max_tokens=1500, temperature=0.6)
        try:
            response = await llm.ainvoke(messages)
            result = _parse_json_response(response.content)
            if result:
                SynthesisResponse(**result)  # Pydantic validation
                return result

            # JSON parse failed — retry once with correction message
            messages_with_correction = messages + [
                AIMessage(content=response.content),
                HumanMessage(content="Your previous response was not valid JSON. Please respond with ONLY valid JSON, no other text."),
            ]
            retry_response = await llm.ainvoke(messages_with_correction)
            result = _parse_json_response(retry_response.content)
            if result:
                SynthesisResponse(**result)
                return result
        except Exception as e:
            logger.warning("Synthesis model %s failed: %s", model, e)

    return SYNTHESIS_FALLBACK
