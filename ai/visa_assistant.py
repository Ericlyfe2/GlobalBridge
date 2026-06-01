"""Conversational visa guidance powered by Claude with prompt caching."""

import os
from typing import Optional

from anthropic import AsyncAnthropic

SYSTEM_PROMPT = """You are GlobalBridge's Immigration Assistant — a friendly, accurate guide for international students and immigrants.

Your role:
- Provide step-by-step visa, permit, and immigration guidance tailored to the user's origin and destination countries.
- Explain documents and processes in plain language. No legal jargon.
- Suggest concrete next steps with timeline estimates.
- Always cite the relevant official government source (URL or office name).
- For complex or recent-policy questions, recommend escalating to a verified human mentor on the platform.

Strict rules:
- Never invent visa rules, fees, or processing times. If uncertain, say so and link to the official site.
- Always include a brief disclaimer at the end of substantive responses: "This is guidance only — verify with the official immigration authority before acting."
- Format step-by-step instructions as numbered lists.
- Use the user's preferred language when known.

Tone: warm, encouraging, factual. You are helping someone make a life-changing move.
"""


class VisaAssistant:
    def __init__(self) -> None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        self.client = AsyncAnthropic(api_key=api_key) if api_key else None
        self.model = "claude-haiku-4-5-20251001"

    async def respond(
        self,
        messages: list[dict],
        origin: Optional[str] = None,
        destination: Optional[str] = None,
        visa_type: Optional[str] = None,
    ) -> tuple[str, list[dict]]:
        if not self.client:
            return self._fallback_response(messages, origin, destination), []

        context_lines = []
        if origin:
            context_lines.append(f"User's country of origin: {origin}")
        if destination:
            context_lines.append(f"User's destination country: {destination}")
        if visa_type:
            context_lines.append(f"Visa type of interest: {visa_type}")

        system_blocks = [
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ]
        if context_lines:
            system_blocks.append({"type": "text", "text": "\n".join(context_lines)})

        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_blocks,
            messages=[{"role": m["role"], "content": m["content"]} for m in messages],
        )

        reply = "".join(b.text for b in resp.content if b.type == "text")
        sources = self._extract_sources(reply)
        return reply, sources

    def _extract_sources(self, text: str) -> list[dict]:
        import re

        urls = re.findall(r"https?://[^\s)\]]+", text)
        seen = set()
        sources = []
        for url in urls:
            if url in seen:
                continue
            seen.add(url)
            sources.append({"title": url.split("//")[-1].split("/")[0], "url": url})
        return sources

    def _fallback_response(
        self, messages: list[dict], origin: Optional[str], destination: Optional[str]
    ) -> str:
        last = messages[-1]["content"] if messages else ""
        return (
            f"(AI service running in stub mode — set ANTHROPIC_API_KEY to enable Claude.)\n\n"
            f"You asked: {last}\n\n"
            f"For {origin or 'your origin country'} → {destination or 'your destination'}, "
            f"the typical visa flow is:\n"
            f"1. Get an acceptance/sponsorship letter\n"
            f"2. Gather financial proof and identity documents\n"
            f"3. Submit biometrics (if required)\n"
            f"4. Apply through the destination's official immigration portal\n"
            f"5. Wait for processing (typically 4–12 weeks)\n\n"
            f"This is guidance only — verify with the official immigration authority."
        )
