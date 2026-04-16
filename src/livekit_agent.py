from __future__ import annotations

from datetime import datetime, timezone

from livekit import agents
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, inference, room_io
from livekit.plugins import silero

from src.decision_engine import DecisionEngine


class CareVoiceAgent(Agent):
    """LiveKit voice agent that routes transcribed text into the care decision engine."""

    def __init__(self, engine: DecisionEngine, session_id: str) -> None:
        super().__init__(
            instructions=(
                "You are a compassionate elderly care assistant. "
                "Use short, clear, and friendly responses."
            )
        )
        self.engine = engine
        self.session_id = session_id

    async def on_enter(self) -> None:
        # Greet the user as soon as the LiveKit session starts.
        self.session.generate_reply(instructions="Greet the user warmly and invite them to speak.")

    async def on_user_turn_completed(self, turn_ctx, new_message) -> None:
        user_text = (new_message.text_content or "").strip()
        if not user_text:
            return

        result = self.engine.process_interaction(
            user_id="elder_001",
            user_text=user_text,
            base_chatbot_response=None,
            activity="livekit_voice_chat",
            reminder_missed=False,
            session_id=self.session_id,
            now=datetime.now(timezone.utc),
        )

        print("User text:", user_text)
        print("Session ID:", result.session_id)
        print("Emotion:", result.emotion)
        print("Memory hits:", result.memory_hits)
        print("Upcoming schedule:", result.upcoming_schedule)
        print("Response:", result.response)
        print("Anomaly alert:", result.anomaly_alert)

        await self.session.say(result.response, allow_interruptions=False)


def _base_chatbot_response(user_text: str) -> str:
    lowered = user_text.lower()
    if "medicine" in lowered or "medication" in lowered:
        return "Let us check your medication reminders together."
    if "sad" in lowered or "worried" in lowered or "anxious" in lowered:
        return "I am here for you. Would you like a calming breathing exercise?"
    return "Thank you for sharing. How can I support you right now?"


server = AgentServer()


@server.rtc_session(agent_name="elder-care-agent")
async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    await ctx.connect()

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=inference.STT("deepgram/nova-3", language="multi"),
        llm=inference.LLM("openai/gpt-4.1-mini"),
        tts=inference.TTS("cartesia/sonic-3"),
        preemptive_generation=False,
    )

    agent = CareVoiceAgent(engine=DecisionEngine(), session_id=ctx.room.name)

    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            text_output=True,
            audio_output=True,
        ),
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
