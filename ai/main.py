"""GlobalBridge AI Service.

FastAPI microservice for visa guidance, document checking, and translation.
Backed by Anthropic Claude with prompt caching for cost control.
"""

import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from visa_assistant import VisaAssistant
from checklist_generator import generate_checklist
from doc_checker import check_document
from translator import translate_text

load_dotenv()

app = FastAPI(title="GlobalBridge AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

assistant = VisaAssistant()


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    conversation_id: Optional[str] = None
    origin_country: Optional[str] = None
    destination_country: Optional[str] = None
    visa_type: Optional[str] = None


class ChecklistRequest(BaseModel):
    origin_country: str
    destination_country: str
    visa_type: str


class DocCheckRequest(BaseModel):
    document_type: str
    document_text: str


class TranslateRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "globalbridge-ai"}


@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        reply, sources = await assistant.respond(
            messages=[m.model_dump() for m in req.messages],
            origin=req.origin_country,
            destination=req.destination_country,
            visa_type=req.visa_type,
        )
        return {"reply": reply, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/checklist")
async def checklist(req: ChecklistRequest):
    items = await generate_checklist(
        req.origin_country, req.destination_country, req.visa_type
    )
    return {"items": items}


@app.post("/doc-check")
async def doc_check(req: DocCheckRequest):
    result = await check_document(req.document_type, req.document_text)
    return result


@app.post("/translate")
async def translate(req: TranslateRequest):
    result = await translate_text(req.text, req.target_lang, req.source_lang)
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
