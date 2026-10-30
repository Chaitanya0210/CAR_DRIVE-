"""
Intent and entity extraction for Hinglish, Hindi, Marathi, and English buyer queries.
Extracts budget, fuel type, body type, delivery zone/city, and feature preferences.
"""
import re
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ExtractedEntities(BaseModel):
    intent: str
    budget_max_inr: Optional[int] = None
    budget_max_paise: Optional[int] = None
    fuel_type: Optional[str] = None      # DIESEL, PETROL, CNG, EV
    body_type: Optional[str] = None      # SUV, HATCHBACK, SEDAN, MUV
    city_or_zone: Optional[str] = None   # e.g. Baramati, Pune, Satara
    brand_preference: Optional[str] = None
    features_requested: List[str] = []
    language_detected: str = "en"
    raw_query: str

class HinglishExtractor:
    CITIES = [
        "baramati", "pune", "satara", "karad", "kolhapur", "nagpur", "nashik",
        "solapur", "aurangabad", "chhatrapati sambhajinagar", "indore", "bhopal",
        "jabalpur", "ujjain", "dewas", "sangli", "mumbai", "thane"
    ]

    BRANDS = ["mahindra", "tata", "maruti", "suzuki", "hyundai", "kia", "toyota"]

    def extract(self, query: str) -> ExtractedEntities:
        q_lower = query.lower()

        # 1. Detect Language
        lang = "en"
        if re.search(r"[\u0900-\u097F]", query):
            if any(w in q_lower for w in ["आहे", "गाडी", "मायलेज", "सवलत", "कशी", "करा"]):
                lang = "marathi"
            else:
                lang = "hindi"
        elif any(w in q_lower for w in ["bhai", "kaunsi", "chahiye", "me", "ke", "liye", "kitna", "karo", "kashi", "sang"]):
            lang = "hinglish"

        # 2. Extract Budget (e.g. 12 lakh, 15L, 12L tak, 14-16 lakh)
        budget_inr = None
        # Match e.g. "12 lakh", "12.5 lakh", "12l", "15 l", "10-12 lakh"
        budget_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*(?:lakh|lac|l\b)", q_lower)
        if budget_match:
            # take upper bound if range
            num_str = budget_match.group(2) or budget_match.group(1)
            try:
                budget_inr = int(float(num_str) * 100000)
            except ValueError:
                budget_inr = None
        else:
            # Direct integer amount (e.g. 1200000)
            direct_match = re.search(r"\b(\d{6,8})\b", q_lower)
            if direct_match:
                budget_inr = int(direct_match.group(1))

        budget_paise = budget_inr * 100 if budget_inr else None

        # 3. Fuel Type
        fuel = None
        if "diesel" in q_lower or "डिझेल" in query or "डीजल" in query:
            fuel = "DIESEL"
        elif "cng" in q_lower or "सीएनजी" in query:
            fuel = "CNG"
        elif "petrol" in q_lower or "पेट्रोल" in query:
            fuel = "PETROL"
        elif "ev" in q_lower or "electric" in q_lower:
            fuel = "EV"

        # 4. Body Type
        body = None
        if "suv" in q_lower or "एसयूव्ही" in query:
            body = "SUV"
        elif "hatchback" in q_lower or "small car" in q_lower:
            body = "HATCHBACK"
        elif "sedan" in q_lower:
            body = "SEDAN"
        elif "7-seater" in q_lower or "7 seater" in q_lower or "muv" in q_lower:
            body = "MUV"

        # 5. City or Delivery Zone
        city = None
        for c in self.CITIES:
            if c in q_lower:
                city = c.capitalize()
                break

        # 6. Brand Preference
        brand = None
        for b in self.BRANDS:
            if b in q_lower:
                brand = "Tata Motors" if b == "tata" else "Maruti Suzuki" if b in ["maruti", "suzuki"] else b.capitalize()
                break

        # 7. Feature requests
        features: List[str] = []
        if "sunroof" in q_lower:
            features.append("sunroof")
        if "airbag" in q_lower:
            features.append("6 airbags")
        if "4x4" in q_lower or "4wd" in q_lower:
            features.append("4x4")
        if "automatic" in q_lower or "at" in q_lower or "dca" in q_lower:
            features.append("automatic")
        if "camera" in q_lower or "360" in q_lower:
            features.append("360 camera")

        # 8. Intent Classification
        if any(w in q_lower for w in ["human", "agent", "executive", "call", "baat karni", "phone"]):
            intent = "HUMAN_SUPPORT"
        elif any(w in q_lower for w in ["auction", "reverse", "policy", "safe", "escrow", "refund", "threshold"]):
            intent = "POLICY_ENQUIRY"
        elif any(w in q_lower for w in ["vs", "fark", "difference", "compare", "better"]):
            intent = "COMPARISON"
        elif any(w in q_lower for w in ["price", "cost", "on-road", "on road", "tax"]):
            intent = "PRICE_CHECK"
        elif any(w in q_lower for w in ["past", "deal", "savings", "history", "previous"]):
            intent = "DEAL_HISTORY"
        else:
            intent = "RECOMMEND_CAR"

        return ExtractedEntities(
            intent=intent,
            budget_max_inr=budget_inr,
            budget_max_paise=budget_paise,
            fuel_type=fuel,
            body_type=body,
            city_or_zone=city,
            brand_preference=brand,
            features_requested=features,
            language_detected=lang,
            raw_query=query,
        )

hinglish_extractor = HinglishExtractor()
