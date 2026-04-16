from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class ResidentProfile:
    resident_id: str
    name: str
    age: int
    room: str
    voice_profile: str
    allow_activities: bool
    guardian_username: str
    guardian_password: str
    guardian_email: str
    children_emails: List[str]
    nearby_guardian_emails: List[str]


def _seed_profiles() -> Dict[str, ResidentProfile]:
    profiles: List[ResidentProfile] = [
        ResidentProfile("elder_001", "Lakshmi", 74, "A-101", "ta_female_soft_01", False, "guardian001", "guard@001", "guardian1@caremail.com", ["child1a@caremail.com", "child1b@caremail.com"], ["near1@caremail.com"]),
        ResidentProfile("elder_002", "Raman", 78, "A-102", "ta_male_warm_01", False, "guardian002", "guard@002", "guardian2@caremail.com", ["child2a@caremail.com"], ["near2@caremail.com"]),
        ResidentProfile("elder_003", "Meenakshi", 81, "A-103", "ta_female_calm_02", False, "guardian003", "guard@003", "guardian3@caremail.com", ["child3a@caremail.com"], ["near3@caremail.com"]),
        ResidentProfile("elder_004", "Sundaram", 76, "A-104", "ta_male_deep_02", False, "guardian004", "guard@004", "guardian4@caremail.com", ["child4a@caremail.com", "child4b@caremail.com"], ["near4@caremail.com"]),
        ResidentProfile("elder_005", "Parvathi", 72, "A-105", "ta_female_clear_03", False, "guardian005", "guard@005", "guardian5@caremail.com", ["child5a@caremail.com"], ["near5@caremail.com"]),
        ResidentProfile("elder_006", "Gopal", 79, "B-201", "ta_male_soft_03", False, "guardian006", "guard@006", "guardian6@caremail.com", ["child6a@caremail.com"], ["near6@caremail.com"]),
        ResidentProfile("elder_007", "Janaki", 83, "B-202", "ta_female_warm_04", False, "guardian007", "guard@007", "guardian7@caremail.com", ["child7a@caremail.com"], ["near7@caremail.com"]),
        ResidentProfile("elder_008", "Muthu", 77, "B-203", "ta_male_calm_04", False, "guardian008", "guard@008", "guardian8@caremail.com", ["child8a@caremail.com"], ["near8@caremail.com"]),
        ResidentProfile("elder_009", "Revathi", 75, "B-204", "ta_female_soft_05", False, "guardian009", "guard@009", "guardian9@caremail.com", ["child9a@caremail.com"], ["near9@caremail.com"]),
        ResidentProfile("elder_010", "Anand", 80, "B-205", "ta_male_clear_05", False, "guardian010", "guard@010", "guardian10@caremail.com", ["child10a@caremail.com"], ["near10@caremail.com"]),
    ]
    return {profile.resident_id: profile for profile in profiles}


class ResidentRegistry:
    def __init__(self) -> None:
        self._profiles = _seed_profiles()

    def list_residents(self) -> List[Dict[str, object]]:
        return [
            {
                "resident_id": p.resident_id,
                "name": p.name,
                "age": p.age,
                "room": p.room,
                "voice_profile": p.voice_profile,
                "allow_activities": p.allow_activities,
                "guardian_username": p.guardian_username,
            }
            for p in self._profiles.values()
        ]

    def authenticate_guardian(self, username: str, password: str) -> Optional[Dict[str, str]]:
        for p in self._profiles.values():
            if p.guardian_username == username and p.guardian_password == password:
                return {
                    "resident_id": p.resident_id,
                    "resident_name": p.name,
                    "guardian_email": p.guardian_email,
                }
        return None

    def escalation_recipients(self, resident_id: str) -> Dict[str, List[str]]:
        p = self._profiles.get(resident_id)
        if not p:
            return {"children": [], "guardians": []}
        return {
            "children": p.children_emails,
            "guardians": [p.guardian_email, *p.nearby_guardian_emails],
        }
