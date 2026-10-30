"""
Unit and integration tests for GroupDrive AI Service.
Tests advisor, NLP extraction, quote parsing, toxicity classification, and guardrails.
"""
import unittest
from app.main import health_check, advisor_chat, extract_intent, parse_quote, classify_review
from app.advisor import AdvisorRequest

class TestAIService(unittest.TestCase):
    def test_health_check(self):
        data = health_check()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "groupdrive-ai-service")

    def test_advisor_hinglish_car_recommendation(self):
        req = AdvisorRequest(
            query="Bhai 12 lakh ke budget me diesel SUV Baramati delivery ke liye kaunsi best rahegi?",
            preferred_language="hinglish",
        )
        res = advisor_chat(req)
        
        # Verify answer content
        self.assertIn("Nexon", res.answer)
        self.assertIn("1.5L", res.answer)
        
        # Verify citations
        self.assertGreaterEqual(len(res.citations), 1)
        self.assertTrue(any("Nexon" in c.source_title or "Nexon" in c.snippet or "FAQ" in c.source_title for c in res.citations))
        
        # Verify entities extracted
        self.assertEqual(res.entities.fuel_type, "DIESEL")
        self.assertEqual(res.entities.body_type, "SUV")
        self.assertEqual(res.entities.city_or_zone, "Baramati")
        self.assertEqual(res.entities.budget_max_inr, 1200000)

        # Verify platform disclaimer
        self.assertIn("Disclaimer", res.disclaimer)

    def test_advisor_human_handoff(self):
        req = AdvisorRequest(
            query="Mujhe turant kisi agent se baat karni hai, connect karo please.",
            preferred_language="hinglish",
        )
        res = advisor_chat(req)
        
        self.assertTrue(res.handoff.needs_handoff)
        self.assertEqual(res.handoff.reason, "USER_EXPLICIT")
        self.assertEqual(res.handoff.department, "SUPPORT")

    def test_advisor_financial_guarantee_disclaimer(self):
        req = AdvisorRequest(
            query="Do you guarantee 100% bank loan approval at 5% interest rate?",
            preferred_language="en",
        )
        res = advisor_chat(req)
        
        self.assertIn("indicative", res.answer.lower())
        self.assertIn("disclaimer", res.answer.lower())

    def test_nlp_extract_intent(self):
        payload = {"query": "15 lakh tak petrol automatic SUV Pune ke liye with sunroof"}
        data = extract_intent(payload)
        
        self.assertEqual(data.budget_max_inr, 1500000)
        self.assertEqual(data.fuel_type, "PETROL")
        self.assertEqual(data.body_type, "SUV")
        self.assertEqual(data.city_or_zone, "Pune")
        self.assertIn("sunroof", data.features_requested)

    def test_nlp_parse_quote(self):
        sample_quote_text = """
        Official Dealership Quotation
        Model: Mahindra Scorpio-N Z8 Diesel MT
        Ex-Showroom Price: Rs. 18,85,000
        Group Discount: Rs. 1,25,000
        Accessories Kit: Rs. 15,000
        Logistics and Freight: Rs. 12,000
        Insurance: Rs. 65,000
        RTO Road Tax: Rs. 2,45,000
        Delivery Timeline: 14 business days
        Freebies: OEM Floor Mats, Mud Flaps, Fastag
        """
        data = parse_quote({"text": sample_quote_text})
        
        self.assertEqual(data.ex_showroom_price_inr, 1885000)
        self.assertEqual(data.group_discount_inr, 125000)
        self.assertEqual(data.logistics_cost_inr, 12000)
        self.assertEqual(data.accessories_inr, 15000)
        self.assertTrue(data.requires_human_review)
        self.assertEqual(data.status, "PENDING_CONFIRMATION")
        self.assertIn("OEM Floor Mats", data.freebies_offered)

    def test_nlp_classify_review_toxic(self):
        payload = {"text": "This dealer is a fraud and scammer, total idiot staff!"}
        data = classify_review(payload)
        
        self.assertTrue(data.is_toxic)
        self.assertIn("ABUSIVE_LANGUAGE", data.flagged_categories)
        self.assertIn(data.action, ["FLAG_FOR_MODERATION", "REJECT"])

    def test_nlp_classify_review_spam(self):
        payload = {"text": "Earn money work from home call now at +919822011223 www.spamsite.com"}
        data = classify_review(payload)
        
        self.assertTrue(data.is_spam)
        self.assertIn("COMMERCIAL_SPAM", data.flagged_categories)

if __name__ == "__main__":
    unittest.main()
