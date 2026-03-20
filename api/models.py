from pydantic import BaseModel, Field


class QAItem(BaseModel):
    question: str = Field(max_length=500)
    answer: str = Field(max_length=2000)


class NextQuestionRequest(BaseModel):
    conversation_history: list[QAItem] = Field(default_factory=list, max_length=10)
    user_name: str | None = Field(default=None, max_length=50)
    question_number: int = Field(ge=1, le=10)


class NextQuestionResponse(BaseModel):
    question: str


class SynthesisRequest(BaseModel):
    conversation_history: list[QAItem] = Field(default_factory=list, max_length=10)
    user_name: str | None = None


class InsightPattern(BaseModel):
    title: str
    description: str
    icon: str


class SynthesisResponse(BaseModel):
    summary: str
    thinking_style: str
    patterns: list[InsightPattern]
    strengths: list[str]
    blind_spots: list[str]
    reflection: str
