from __future__ import annotations

import time
import re
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List

from src.modules.advanced_anomaly_detection import AdvancedAnomalyDetector, AnomalyResult
from src.alzheimer_bridge import safe_evaluate_alzheimer
from src.modules.attention_integration import (
    MultiModalAttention,
    MultiModalAttentionResult,
    SelfAttention,
    TemporalAttention,
)
from src.modules.behavior_logging import BehaviorLogger
from src.modules.caregiver_reporting import CaregiverReportBuilder
from src.modules.emotion_detection import EmotionDetector
from src.modules.health_schedule import HealthScheduleManager
from src.modules.long_term_memory import LongTermMemory, MemoryItem
from src.modules.proactive_engagement import ProactiveEngagement
from src.modules.session_history import SessionHistoryStore, SessionTurn


@dataclass
class DecisionOutput:
    """Combined result returned by the central decision engine."""

    response: str
    emotion: Dict[str, Any]
    memory_hits: List[str]
    session_id: str
    upcoming_schedule: List[Dict[str, str]]
    attention: Dict[str, Any]
    caregiver_dashboard: Dict[str, Any]
    proactive_message: str
    anomaly_alert: Dict[str, Any]
    alzheimer_risk: Dict[str, Any]
    disease_assessment: Dict[str, Any]


class DecisionEngine:
    """Orchestrates emotion, memory, behavior, and anomaly modules."""

    def __init__(self) -> None:
        self.emotion_detector = EmotionDetector()
        self.memory = LongTermMemory()
        self.proactive = ProactiveEngagement(threshold_hours=6)
        self.logger = BehaviorLogger()
        self.schedule = HealthScheduleManager()
        self.session_history = SessionHistoryStore()
        self.report_builder = CaregiverReportBuilder(self.schedule, self.session_history)
        self.anomaly_detector = AdvancedAnomalyDetector(z_threshold=2.0)
        self.self_attention = SelfAttention()
        self.temporal_attention = TemporalAttention()
        self.multi_modal_attention = MultiModalAttention()

    def _adapt_tone(self, base_response: str, emotion_label: str, language: str = 'ta') -> str:
        use_tamil = language == 'ta'
        if emotion_label == "sad":
            if use_tamil:
                return f"நான் உங்களுடன் இருக்கிறேன். {base_response}"
            return f"I am here with you. {base_response}"
        if emotion_label == "anxious":
            if use_tamil:
                return f"நாம் மெதுவாக ஒரு மூச்சை எடுப்போம். {base_response}"
            return f"Take a slow breath with me. {base_response}"
        return base_response

    def _compose_memory_context(self, memories: List[MemoryItem], language: str = 'ta') -> str:
        if not memories:
            return ""
        snippets = "; ".join(item.text for item in memories[:2])
        if language == 'ta':
            return f" எனக்கு நினைவில் உள்ளது: {snippets}."
        return f" I remember: {snippets}."

    def _should_add_memory_context(self, user_text: str) -> bool:
        lowered = user_text.lower()
        recall_intents = [
            "remember",
            "recall",
            "what did i say",
            "earlier",
            "last time",
            "previous",
            "before",
        ]
        return any(intent in lowered for intent in recall_intents)

    def _should_create_schedule(self, user_text: str) -> bool:
        lowered = user_text.lower()
        creation_phrases = [
            "make a schedule",
            "create a schedule",
            "help me to make a schedule",
            "make schedule for me",
            "schedule for me",
            "plan my day",
            "make a plan",
            "set a schedule",
            "build a schedule",
        ]
        return any(phrase in lowered for phrase in creation_phrases)

    def _format_created_schedule(self, plan: Dict[str, List[Dict[str, str]]], language: str = 'ta') -> str:
        items = []
        for category in ["medications", "meals", "exercises"]:
            for entry in plan.get(category, []):
                time = entry.get("time", "")
                title = entry.get("title", "")
                if time and title:
                    items.append(f"{time} - {title}")
        if language == 'ta':
            return "இன்றைக்கான உங்கள் அட்டவணையை அமைத்துவிட்டேன்: " + "; ".join(items) + "."
        return "I have created a simple schedule for today: " + "; ".join(items) + "."

    def _base_chatbot_response(self, user_text: str) -> str:
        lowered = user_text.lower()
        if "medicine" in lowered or "medication" in lowered:
            return "Let us check your medication reminders together."
        if "sad" in lowered or "worried" in lowered or "anxious" in lowered:
            return "I am here for you. Would you like a calming breathing exercise?"
        if "alzheimer" in lowered:
            return "I can run an Alzheimer risk screening from your voice interaction now."
        if "parkinson" in lowered:
            return "I can run a Parkinson symptom-risk screening from your voice interaction now."
        return "Thank you for sharing. How can I support you right now?"

    def _contains_any(self, text: str, words: List[str]) -> bool:
        return any(word in text for word in words)

    def _choose(self, options: List[str]) -> str:
        return random.choice(options) if options else ""

    def _is_gratitude(self, text: str) -> bool:
        lowered = text.lower().strip()
        return lowered in {"thanks", "thank you", "thankyou", "thx", "appreciate it"} or "thank" in lowered

    def _is_identity_question(self, text: str) -> bool:
        lowered = text.lower().strip()
        return any(
            phrase in lowered
            for phrase in ["what is your name", "who are you", "what are you", "tell me your name"]
        )

    def _is_capability_question(self, text: str) -> bool:
        lowered = text.lower().strip()
        return any(
            phrase in lowered
            for phrase in ["what can you do", "how can you help", "what do you do", "help me", "what are you able to do"]
        )

    def _is_farewell(self, text: str) -> bool:
        lowered = text.lower().strip()
        return lowered in {"bye", "goodbye", "see you", "see you later", "good night"} or lowered.startswith("bye ")

    def _companion_response(self, user_text: str, user_id: str, now: datetime, language: str = 'ta') -> str:
        lowered = user_text.lower().strip()
        compact = re.sub(r"\s+", " ", lowered)
        tamil_mode = any("\u0b80" <= ch <= "\u0bff" for ch in user_text)
        use_tamil = language == 'ta' or tamil_mode

        greetings = ["hi", "hello", "hey", "good morning", "good evening"]
        wellbeing = ["how are you", "how do you feel", "are you there"]
        schedule = ["schedule", "plan", "what next", "reminder", "calendar"]
        medication = ["medicine", "medication", "tablet", "pill", "dose"]
        food = ["food", "meal", "eat", "diet", "hungry", "drink"]
        exercise = ["walk", "exercise", "yoga", "stretch", "activity"]
        sleep = ["sleep", "insomnia", "nap", "tired"]
        emotion = ["sad", "anxious", "worried", "lonely", "upset", "afraid", "stress"]
        memory = ["forgot", "remember", "memory", "confused", "forget"]
        family = ["daughter", "son", "family", "grandchild", "friend", "visit"]
        safety = ["emergency", "fall", "severe pain", "dizzy", "chest pain", "ambulance", "breathless"]
        prayer = ["pray", "prayer", "spiritual", "god", "meditation"]
        fun = ["joke", "story", "song", "motivate", "motivation"]

        if self._contains_any(compact, safety):
            if use_tamil:
                return (
                    "உங்கள் பாதுகாப்பு முதலில். இது அவசரமாக இருந்தால் உடனே பராமரிப்பாளர் அல்லது அவசர சேவையை தொடர்பு கொள்ளுங்கள். "
                    "நான் உங்களுடன் இருந்து அடுத்த படியை அமைதியாகச் செய்வேன்."
                )
            return (
                "Your safety comes first. If this feels urgent or severe, please contact a caregiver or emergency services now. "
                "I can stay with you while we do the next step calmly."
            )

        if self._contains_any(compact, greetings):
            if use_tamil:
                return self._choose([
                    "நான் உங்களுடன் இருக்கிறேன். இப்போது என்ன உதவி வேண்டும் என்று சொல்லுங்கள், படிப்படியாக செய்து விடலாம்.",
                    "வணக்கம். நான் உங்களுக்கு தயார். இன்று எந்த விஷயத்தில் உதவி வேண்டும்?",
                    "நான் இங்கே இருக்கிறேன். இப்போது நாம் சேர்ந்து எதை தொடங்கலாம்?",
                ])
            return self._choose([
                "I am here with you. Tell me what you need right now, and we will do it together step by step.",
                "Hello. I am ready to help. What would you like to do first today?",
                "I am here for you. Tell me one thing you want help with right now.",
            ])

        if self._is_identity_question(compact):
            if use_tamil:
                return "நான் உங்கள் தினசரி உதவி துணை. நினைவூட்டல், உரையாடல், அட்டவணை, மற்றும் நலன் பற்றிய உதவிக்கு நான் இருக்கிறேன்."
            return "I am your daily care companion. I can help with reminders, conversation, schedules, and wellbeing support."

        if self._is_capability_question(compact):
            if use_tamil:
                return "நான் உங்களுக்கு பேச உதவுவேன், நினைவூட்டல்கள் அமைப்பேன், அட்டவணை உருவாக்குவேன், மற்றும் தேவையானபோது அமைதியாக வழிகாட்டுவேன்."
            return "I can talk with you, set reminders, create schedules, and guide you gently when you need support."

        if self._is_gratitude(compact):
            if use_tamil:
                return "உங்களுக்கு உதவியது என் மகிழ்ச்சி. இன்னும் ஏதாவது வேண்டுமென்றால் சொல்லுங்கள்."
            return "You are very welcome. I am happy to help anytime."

        if self._is_farewell(compact):
            if use_tamil:
                return "சரி, கவனமாக இருங்கள். பிறகு மீண்டும் பேசலாம்."
            return "Take care. I will be here whenever you come back."

        if self._contains_any(compact, wellbeing):
            if use_tamil:
                return self._choose([
                    "நான் முழுமையாக உங்களுக்காக இருக்கிறேன். மனநிலை, அட்டவணை, நினைவூட்டல் அல்லது சும்மா உரையாடல் எதுவாக இருந்தாலும் பேசலாம்.",
                    "நான் நன்றாக இருக்கிறேன், நன்றி. நீங்கள் எப்படி உணருகிறீர்கள்? இன்று உங்கள் அட்டவணையையும் பார்க்கலாம்.",
                    "நான் கவனமாக கேட்கிறேன். உங்களுக்கு இப்போது மனநிலை ஆதரவு வேண்டுமா அல்லது நினைவூட்டல் உதவி வேண்டுமா?",
                ])
            return self._choose([
                "I am fully available for you. We can check your mood, schedule, reminders, or just have a friendly conversation.",
                "Thank you for asking. I am here and ready to support you. How are you feeling right now?",
                "I am with you. Would you like mood support, reminders, or a simple chat?",
            ])

        if self._should_create_schedule(user_text):
            plan = self.schedule.create_default_day_plan(user_id=user_id, now=now)
            return self._format_created_schedule(plan, language=language)

        if self._contains_any(compact, schedule):
            upcoming = self.schedule.get_upcoming_items(user_id=user_id, now=now)
            if upcoming:
                first = upcoming[0]
                if use_tamil:
                    return f"உங்களின் அடுத்த செயல் {first.title}, நேரம் {first.time}. இன்று மீதமுள்ள அட்டவணையையும் சொல்வேனா?"
                return f"Your next plan is {first.title} at {first.time}. Would you like me to walk you through the rest of your day?"
            if use_tamil:
                return self._choose([
                    "இப்போது அட்டவணையில் உருப்படி இல்லை. இன்றைக்கு ஒரு திட்டத்தை அமைக்கலாம்: காலை மருந்து, மதிய உணவு, மாலை நடை, இரவு மருந்து.",
                    "உங்களுக்காக இன்று ஒரு எளிய திட்டத்தை உருவாக்கலாம்: காலை மருந்து, மதிய உணவு, மாலை நடை, இரவு மருந்து நினைவூட்டல்.",
                ])
            return (
                self._choose([
                    "I do not see a saved schedule yet. I can build one for you now: morning medicine, lunch, evening walk, and night medicine.",
                    "There is no saved schedule at the moment. I can set up a simple day plan now: morning medicine, lunch, evening walk, and night medicine.",
                ])
            )

        if self._contains_any(compact, medication):
            if use_tamil:
                return self._choose([
                    "மருந்தை கவனமாக எடுத்துக்கொள்ளலாம். நேரத்திற்கு நினைவூட்டியும், எடுத்ததை உறுதிப்படுத்தியும் உதவுகிறேன்.",
                    "சரி, மருந்து நேரத்தை பார்க்கலாம். எந்த மாத்திரை எடுத்தீர்கள் என்று சேர்த்து பதிவு செய்யலாம்.",
                    "நான் மருந்து மேலாண்மையில் உதவுவேன். நேரம் வந்தால் உடனே நினைவூட்டுவேன்.",
                ])
            return self._choose([
                "Let us handle medicines carefully. I can remind you on time and we can confirm each dose together.",
                "Sure, let us review your medication timing and mark what is already taken.",
                "I can help manage your medicines with reminders and simple confirmations.",
            ])

        if self._contains_any(compact, food):
            if use_tamil:
                return "இன்றைக்கு உணவை எளிதாகவும் சீராகவும் வைத்துக்கொள்வோம். தண்ணீர், உணவு, மருந்து நேரங்களை நினைவூட்ட உதவுவேன்."
            return "For today, let us keep meals simple, light, and regular. I can remind you for water, meals, and medication timing."

        if self._contains_any(compact, exercise):
            if use_tamil:
                return "சிறியவும் பாதுகாப்பானதும் ஒரு பயிற்சி மிகவும் உதவும். மெதுவான நீட்டிப்புகள் அல்லது சின்ன நடைப்பயிற்சியுடன் தொடங்கலாம்."
            return "A short, safe routine helps a lot. We can start with gentle stretches and a brief walk if you feel comfortable."

        if self._contains_any(compact, sleep):
            if use_tamil:
                return "நன்றாக உறங்க, அமைதியான பழக்கத்தை வைத்துக்கொள்வோம்: லேசான இரவு உணவு, குறைவான திரை நேரம், படுக்கும் முன் சில ஆழ்ந்த மூச்சுகள்."
            return "For better sleep, let us keep a calm routine: light dinner, less screen time, and a short breathing exercise before bed."

        if self._contains_any(compact, emotion):
            if use_tamil:
                return "பகிர்ந்ததற்கு நன்றி. நாமொரு மெதுவான மூச்சை எடுத்துக்கொள்வோம். நான் உங்களுக்கு உதவ இருக்கிறேன்."
            return "Thank you for sharing that. Let us take one slow breath together. I am here to support you and we can go one small step at a time."

        if self._contains_any(compact, memory):
            if use_tamil:
                return "பரவாயில்லை, நினைவிழப்பு சில நேரங்களில் நடக்கும். முக்கிய விஷயங்களை மீண்டும் சொல்லி, எளிய தினசரி பட்டியலை வைத்துக்கொள்வோம்."
            return "No problem, memory slips happen. I can repeat important points, set reminders, and keep a simple daily checklist for you."

        if self._contains_any(compact, family):
            if use_tamil:
                return "அது மிக முக்கியமானது. குடும்பத்துடன் பேசுவதற்கு முன் ஒரு நினைவூட்டலை அமைத்து, நீங்கள் சிரமமில்லாமல் தயாராக இருக்க உதவுவேன்."
            return "That sounds meaningful. I can help you prepare a reminder before your family call or visit so you feel ready and relaxed."

        if self._contains_any(compact, prayer):
            if use_tamil:
                return "அது ஒரு அமைதியான தேர்வு. விருப்பமிருந்தால் இப்போது சில நிமிடங்கள் மூச்சு, தியானம், அல்லது பிரார்த்தனைக்கு எடுத்துக்கொள்வோம்."
            return "That is a peaceful choice. We can take a quiet minute now for breathing, reflection, or prayer if you like."

        if self._contains_any(compact, fun):
            if use_tamil:
                return "மனம் சுறுசுறுப்பாகவும் மகிழ்ச்சியாகவும் இருக்கலாம். சிறிய நினைவாற்றல் விளையாட்டு அல்லது ஒரு ஊக்கமளிக்கும் செய்தியை சொல்லவா?"
            return "Let us keep your mind active and cheerful. I can start a light memory game or share a short motivational thought."

        if compact.endswith("?") or self._contains_any(compact, ["what", "why", "how", "when", "where"]):
            if use_tamil:
                return "அது நல்ல கேள்வி. அதை சிறிது மேலும் குறிப்பாக சொன்னால், நான் நேரடியாகவும் தெளிவாகவும் பதில் சொல்ல முடியும்."
            return "That is a thoughtful question. If you make it a little more specific, I can answer it directly and clearly."

        if use_tamil:
            return self._choose([
                "நான் உங்கள் தினசரி துணை. நினைவூட்டல், மனநிலை ஆதரவு, ஆரோக்கிய பழக்கம் மற்றும் உரையாடலில் எப்போதும் உதவுவேன்.",
                "நான் உங்களுடன் தொடர்ச்சியாக இருக்கிறேன். நாம் ஒரு விஷயத்தை தேர்வு செய்து இப்போது தொடங்கலாம்.",
                "நீங்கள் சொல்வதனை அடிப்படையாக வைத்து தனிப்பட்ட உதவி தருவேன். அடுத்தது என்ன செய்யலாம்?",
            ])
        return self._choose([
            "I understand. I am your daily companion, and I can help with reminders, mood support, health routines, and conversation anytime.",
            "I am with you. We can take one practical step now based on what you need.",
            "I am ready to help in a personal way. Tell me the exact thing you want me to do.",
        ])

    def _detect_disease_intent(self, user_text: str) -> str:
        lowered = user_text.lower()
        if any(keyword in lowered for keyword in ["alzheimer", "alzheimers", "dementia"]):
            return "alzheimer"
        if any(keyword in lowered for keyword in ["parkinson", "parkinsons", "tremor", "rigidity"]):
            return "parkinson"
        return "none"

    def _evaluate_parkinson_proxy(self, text: str, cognitive_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
        words = [w for w in text.lower().split() if w.strip()]
        unique_ratio = (len(set(words)) / len(words)) if words else 0.0
        pause_markers = text.count("...") + text.count("--")
        repetition_count = max(0, len(words) - len(set(words))) if words else 0
        gait_terms = sum(
            1
            for marker in ["tremor", "shaking", "stiff", "slow", "balance", "walk"]
            if marker in text.lower()
        )

        score = min(
            0.95,
            0.1
            + (0.28 if pause_markers >= 2 else 0.0)
            + min(0.25, repetition_count * 0.03)
            + (0.22 if unique_ratio < 0.45 else 0.0)
            + min(0.3, gait_terms * 0.08),
        )

        if cognitive_data and isinstance(cognitive_data, dict):
            speech_rate = cognitive_data.get("speech_rate")
            if isinstance(speech_rate, (int, float)) and speech_rate < 90:
                score = min(0.95, score + 0.1)

            tremor_metric = cognitive_data.get("parkinson_tremor")
            coordination_metric = cognitive_data.get("parkinson_coordination")
            reaction_metric = cognitive_data.get("parkinson_reaction")

            if isinstance(tremor_metric, (int, float)):
                score = min(0.95, score + min(0.22, max(0.0, float(tremor_metric)) / 100.0 * 0.22))
            if isinstance(coordination_metric, (int, float)):
                score = min(0.95, score + min(0.16, max(0.0, 100.0 - float(coordination_metric)) / 100.0 * 0.16))
            if isinstance(reaction_metric, (int, float)) and float(reaction_metric) < 65:
                score = min(0.95, score + 0.08)

        risk_level = "low" if score < 0.35 else "moderate" if score < 0.65 else "high"
        confidence = min(0.9, 0.55 + (0.07 * gait_terms) + (0.05 if pause_markers > 0 else 0.0))

        return {
            "ok": True,
            "risk_score": {
                "risk_score": round(score, 3),
                "risk_level": risk_level,
                "confidence": round(confidence, 3),
                "features": {
                    "pause_markers": pause_markers,
                    "repetition_count": repetition_count,
                    "vocabulary_diversity": round(unique_ratio, 3),
                    "motor_term_hits": gait_terms,
                    "parkinson_tremor": cognitive_data.get("parkinson_tremor") if isinstance(cognitive_data, dict) else None,
                    "parkinson_coordination": cognitive_data.get("parkinson_coordination") if isinstance(cognitive_data, dict) else None,
                    "parkinson_reaction": cognitive_data.get("parkinson_reaction") if isinstance(cognitive_data, dict) else None,
                },
            },
            "error": None,
        }

    def process_interaction(
        self,
        user_id: str,
        user_text: str,
        base_chatbot_response: str | None = None,
        activity: str = "general_chat",
        reminder_missed: bool = False,
        session_id: str = "session-default",
        now: datetime | None = None,
        cognitive_data: Dict[str, Any] | None = None,
    ) -> DecisionOutput:
        started = time.perf_counter()
        current_time = now or datetime.now(timezone.utc)
        language = (cognitive_data or {}).get('language', 'ta')

        emotion = self.emotion_detector.detect(user_text)
        self_attention = self.self_attention.analyze(user_text, emotion.label)
        memories = self.memory.retrieve_relevant(user_id=user_id, query=user_text, top_k=3)
        upcoming_items = self.schedule.get_upcoming_items(user_id=user_id, now=current_time)

        uses_external_llm = bool(base_chatbot_response)

        if uses_external_llm:
            response_seed = base_chatbot_response
        elif language == 'ta':
            response_seed = self._companion_response(user_text, user_id, current_time, language=language)
        else:
            response_seed = self._companion_response(user_text, user_id, current_time, language=language)
        if uses_external_llm:
            # Keep cloud LLM replies clean and input-focused.
            enriched = response_seed
        else:
            enriched = self._adapt_tone(response_seed, emotion.label, language=language)
            if self._should_add_memory_context(user_text):
                enriched += self._compose_memory_context(memories, language=language)

        if upcoming_items and not uses_external_llm:
            first_item = upcoming_items[0]
            if language == 'ta':
                enriched += f" அடுத்த {first_item.category[:-1]} நேரம் {first_item.time}: {first_item.title}."
            else:
                enriched += (
                    f" Upcoming {first_item.category[:-1]} at {first_item.time}:"
                    f" {first_item.title}."
                )

        self.memory.store_conversation(user_id=user_id, text=user_text)

        elapsed_ms = (time.perf_counter() - started) * 1000.0
        record = self.logger.make_record(
            user_id=user_id,
            user_text=user_text,
            bot_response=enriched,
            emotion_label=emotion.label,
            emotion_score=emotion.score,
            response_time_ms=elapsed_ms,
            activity=activity,
            reminder_missed=reminder_missed,
            session_id=session_id,
            timestamp=now,
        )
        self.logger.log_interaction(record)

        self.session_history.append_turn(
            SessionTurn(
                user_id=user_id,
                session_id=session_id,
                timestamp=record.timestamp,
                user_text=user_text,
                assistant_text=enriched,
                emotion_label=emotion.label,
            )
        )

        self.proactive.update_last_interaction(user_id=user_id, ts=now)
        proactive_result = self.proactive.check(user_id=user_id, now=now)

        user_logs = self.logger.read_logs(user_id=user_id)
        anomaly: AnomalyResult = self.anomaly_detector.evaluate(user_logs)
        temporal_attention = self.temporal_attention.analyze(user_logs, now=current_time)
        weekly_summary = self.report_builder.build_weekly_summary(user_id=user_id, logs=user_logs, now=current_time)
        daily_nudges = self.report_builder.build_daily_nudges(user_id=user_id, now=current_time)
        dashboard_flags = self.report_builder.build_dashboard_flags(user_id=user_id, logs=user_logs, now=current_time)

        behavior_risk = 1.0 if anomaly.is_anomaly else 0.25
        memory_strength = min(1.0, len(memories) / 3.0)
        speech_strength = min(1.0, max(0.0, len(user_text.strip()) / 60.0))
        disease_intent = self._detect_disease_intent(user_text)
        attention_fusion: MultiModalAttentionResult = self.multi_modal_attention.fuse(
            emotion_score=abs(emotion.score),
            temporal_risk=temporal_attention.weighted_risk,
            behavior_risk=behavior_risk,
            memory_strength=memory_strength,
            speech_strength=speech_strength,
            focus_score=self_attention.focus_score,
            urgency_score=self_attention.urgency_score,
            disease_intent=disease_intent,
        )

        if attention_fusion.recommendation == "supportive_followup" and not uses_external_llm:
            if language == 'ta':
                enriched += " நான் இன்னும் கொஞ்சம் உங்களுடன் இருந்து பேசவா?"
            else:
                enriched += " Would you like me to stay with you and talk a little more?"
        elif attention_fusion.recommendation == "alert_caregiver":
            if not anomaly.is_anomaly:
                anomaly.is_anomaly = True
                anomaly.reasons.append("Multi-modal attention flagged elevated risk")

        alzheimer_risk = safe_evaluate_alzheimer(user_text, cognitive_data or {})
        parkinson_risk = self._evaluate_parkinson_proxy(user_text, cognitive_data)

        if disease_intent == "alzheimer" and not uses_external_llm:
            if alzheimer_risk.get("ok") and alzheimer_risk.get("risk_score"):
                risk = alzheimer_risk["risk_score"]
                if language == 'ta':
                    enriched += (
                        f" அல்சைமர் மதிப்பீட்டில் {risk.get('risk_level', 'unknown')} அளவு ஆபத்து "
                        f"காணப்படுகிறது. மதிப்பெண் {risk.get('risk_score', 'n/a')}."
                    )
                else:
                    enriched += (
                        f" Alzheimer screening indicates {risk.get('risk_level', 'unknown')} risk "
                        f"with score {risk.get('risk_score', 'n/a')}."
                    )
            else:
                if language == 'ta':
                    enriched += " இப்போது அல்சைமர் மதிப்பீட்டை முடிக்க முடியவில்லை."
                else:
                    enriched += " I could not complete Alzheimer screening right now."

        if disease_intent == "parkinson" and not uses_external_llm:
            risk = parkinson_risk["risk_score"]
            if language == 'ta':
                enriched += (
                    f" பார்கின்சன் மதிப்பீட்டில் {risk.get('risk_level', 'unknown')} அளவு ஆபத்து "
                    f"காணப்படுகிறது. மதிப்பெண் {risk.get('risk_score', 'n/a')}."
                )
            else:
                enriched += (
                    f" Parkinson screening indicates {risk.get('risk_level', 'unknown')} risk "
                    f"with score {risk.get('risk_score', 'n/a')}."
                )

        return DecisionOutput(
            response=enriched,
            emotion={"label": emotion.label, "score": round(emotion.score, 3)},
            memory_hits=[item.text for item in memories],
            session_id=session_id,
            upcoming_schedule=[
                {"category": item.category, "title": item.title, "time": item.time}
                for item in upcoming_items
            ],
            attention={
                "self_attention": {
                    "focus_terms": self_attention.focus_terms,
                    "focus_score": round(self_attention.focus_score, 3),
                    "urgency_score": round(self_attention.urgency_score, 3),
                    "risk_terms": self_attention.risk_terms,
                },
                "temporal_attention": {
                    "weighted_risk": round(temporal_attention.weighted_risk, 3),
                    "trend": temporal_attention.trend,
                },
                "multimodal_attention": {
                    "fused_risk": round(attention_fusion.fused_risk, 3),
                    "recommendation": attention_fusion.recommendation,
                    "modalities": {
                        k: round(v, 3) for k, v in attention_fusion.modality_scores.items()
                    },
                },
            },
            caregiver_dashboard={
                "daily_nudges": daily_nudges,
                "weekly_summary": {
                    "user_id": weekly_summary.user_id,
                    "total_interactions": weekly_summary.total_interactions,
                    "missed_reminders": weekly_summary.missed_reminders,
                    "silence_period_hours": weekly_summary.silence_period_hours,
                    "frequent_emotions": weekly_summary.frequent_emotions,
                    "top_concerns": weekly_summary.top_concerns,
                },
                "flags": dashboard_flags,
            },
            proactive_message=proactive_result.message,
            anomaly_alert={
                "is_anomaly": anomaly.is_anomaly,
                "reasons": anomaly.reasons,
                "z_scores": {k: round(v, 3) for k, v in anomaly.z_scores.items()},
                "iforest_outlier": anomaly.iforest_outlier,
                "iforest_score": round(anomaly.iforest_score, 4),
            },
            alzheimer_risk=alzheimer_risk,
            disease_assessment={
                "requested": disease_intent,
                "alzheimer": alzheimer_risk,
                "parkinson": parkinson_risk,
            },
        )

    def run_proactive_check(self, user_id: str, now: datetime | None = None) -> str:
        result = self.proactive.check(user_id=user_id, now=now)
        return result.message

    def get_session_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get session history for a user"""
        history = self.session_history.get_session_history(user_id)
        return [
            {
                "timestamp": str(turn.timestamp),
                "user_text": turn.user_text,
                "assistant_response": turn.assistant_text,
                "emotion": turn.emotion_label,
            }
            for turn in history
        ]

    def get_behavior_logs(self, user_id: str) -> List[Dict[str, Any]]:
        """Get behavior logs for a user"""
        logs = self.logger.read_logs(user_id)
        return logs

    def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """Get user profile information"""
        return {
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "modules": {
                "emotion_detection": True,
                "long_term_memory": True,
                "behavior_logging": True,
                "anomaly_detection": True,
                "caregiver_reporting": True,
                "attention_integration": True,
            }
        }

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        logs = self.get_behavior_logs(user_id)
        history = self.get_session_history(user_id)
        
        emotion_counts = {}
        total_interactions = len(history)
        
        for log in logs:
            emotion = getattr(log, "emotion_label", "unknown") or "unknown"
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        return {
            "user_id": user_id,
            "total_interactions": total_interactions,
            "total_logs": len(logs),
            "emotion_distribution": emotion_counts,
            "last_interaction": history[-1]["timestamp"] if history else None,
        }

    def get_alzheimer_prediction(
        self,
        user_id: str,
        text: str | None = None,
        cognitive_data: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """Compute Alzheimer risk from provided text or recent user logs."""
        source = "provided_text"
        sample_text = (text or "").strip()

        if not sample_text:
            logs = self.get_behavior_logs(user_id)
            recent_texts = [log.user_text for log in logs[-5:] if getattr(log, "user_text", "").strip()]
            if recent_texts:
                sample_text = " ".join(recent_texts)
                source = "recent_logs"
            else:
                sample_text = "No recent speech sample available"
                source = "fallback"

        result = safe_evaluate_alzheimer(sample_text, cognitive_data or {})
        return {
            "user_id": user_id,
            "source": source,
            "sample_text": sample_text[:240],
            **result,
        }

    def get_parkinson_prediction(
        self,
        user_id: str,
        text: str | None = None,
        cognitive_data: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """Compute Parkinson risk from provided text or recent user logs."""
        source = "provided_text"
        sample_text = (text or "").strip()

        if not sample_text:
            logs = self.get_behavior_logs(user_id)
            recent_texts = [log.user_text for log in logs[-5:] if getattr(log, "user_text", "").strip()]
            if recent_texts:
                sample_text = " ".join(recent_texts)
                source = "recent_logs"
            else:
                sample_text = "No recent speech sample available"
                source = "fallback"

        result = self._evaluate_parkinson_proxy(sample_text, cognitive_data)
        return {
            "user_id": user_id,
            "source": source,
            "sample_text": sample_text[:240],
            **result,
        }
