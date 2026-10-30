"""
Quote parser from PDF/free text into GroupDrive Quote schema with human confirmation workflow.
"""
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ParsedQuoteSchema(BaseModel):
    ex_showroom_price_inr: int
    group_discount_inr: int
    accessories_inr: int = 0
    logistics_cost_inr: int = 0
    insurance_est_inr: int = 0
    rto_tax_est_inr: int = 0
    net_landed_estimate_inr: int
    delivery_timeline_days: int = 14
    quote_validity_days: int = 7
    freebies_offered: List[str] = []
    field_confidences: Dict[str, float] = {}
    status: str = "PENDING_CONFIRMATION"
    requires_human_review: bool = True
    audit_notes: str = "System extracted from dealer document. Mandatory human approval required before DB persistence."
    validation_warnings: List[str] = []

class QuoteParser:
    def parse_quote_text(self, text: str) -> ParsedQuoteSchema:
        t = text.replace(",", "").lower()
        confidences: Dict[str, float] = {}
        warnings: List[str] = []

        # 1. Ex-Showroom Price
        ex_showroom = 0
        ex_match = re.search(r"ex[- ]?showroom\s*(?:price|cost|mrp)?[:\s=₹rs.]*(\d{6,8})", t)
        if ex_match:
            ex_showroom = int(ex_match.group(1))
            confidences["ex_showroom"] = 0.95
        else:
            # Fallback search for first 7-digit number
            num_match = re.search(r"\b(\d{7})\b", t)
            if num_match:
                ex_showroom = int(num_match.group(1))
                confidences["ex_showroom"] = 0.60
                warnings.append("Ex-showroom inferred from first large amount; please verify.")
            else:
                ex_showroom = 1200000
                confidences["ex_showroom"] = 0.30
                warnings.append("Could not confidently identify ex-showroom price.")

        # 2. Group Discount
        discount = 0
        disc_match = re.search(r"(?:group\s+discount|discount|bulk\s+concession|rebate)[:\s=₹rs.]*(\d{4,7})", t)
        if disc_match:
            discount = int(disc_match.group(1))
            confidences["discount"] = 0.90
        else:
            confidences["discount"] = 0.50
            warnings.append("No explicit group discount identified in document.")

        # 3. Logistics & Transit
        logistics = 0
        log_match = re.search(r"(?:logistics|freight|transit|handling|delivery\s+charge)[:\s=₹rs.]*(\d{3,6})", t)
        if log_match:
            logistics = int(log_match.group(1))
            confidences["logistics"] = 0.90
        else:
            confidences["logistics"] = 0.40

        # 4. Accessories
        accessories = 0
        acc_match = re.search(r"(?:accessories|kit)[:\s=₹rs.]*(\d{3,6})", t)
        if acc_match:
            accessories = int(acc_match.group(1))
            confidences["accessories"] = 0.85

        # 5. Insurance & RTO
        insurance = int(ex_showroom * 0.04)  # rough 4% default
        ins_match = re.search(r"insurance[:\s=₹rs.]*(\d{4,6})", t)
        if ins_match:
            insurance = int(ins_match.group(1))
            confidences["insurance"] = 0.90
        else:
            confidences["insurance"] = 0.60

        rto = int(ex_showroom * 0.12)  # rough 12% default
        rto_match = re.search(r"(?:rto|road\s+tax|registration)[:\s=₹rs.]*(\d{4,6})", t)
        if rto_match:
            rto = int(rto_match.group(1))
            confidences["rto"] = 0.90
        else:
            confidences["rto"] = 0.60

        # 6. Delivery Timeline
        timeline_days = 14
        time_match = re.search(r"(\d{1,2})\s*(?:days|business\s+days|weeks)", t)
        if time_match:
            val = int(time_match.group(1))
            timeline_days = val * 7 if "week" in time_match.group(0) else val
            confidences["delivery_timeline"] = 0.85
        else:
            confidences["delivery_timeline"] = 0.50

        # 7. Freebies
        freebies: List[str] = []
        if "mat" in t or "mats" in t:
            freebies.append("OEM Floor Mats")
        if "mudflap" in t or "mud flap" in t:
            freebies.append("Mud Flaps")
        if "extended warranty" in t or "warranty" in t:
            freebies.append("Extended Warranty")
        if "fastag" in t:
            freebies.append("FASTag")

        # Compute net landed estimate
        net_landed = (ex_showroom - discount) + accessories + logistics + insurance + rto

        return ParsedQuoteSchema(
            ex_showroom_price_inr=ex_showroom,
            group_discount_inr=discount,
            accessories_inr=accessories,
            logistics_cost_inr=logistics,
            insurance_est_inr=insurance,
            rto_tax_est_inr=rto,
            net_landed_estimate_inr=net_landed,
            delivery_timeline_days=timeline_days,
            quote_validity_days=7,
            freebies_offered=freebies,
            field_confidences=confidences,
            status="PENDING_CONFIRMATION",
            requires_human_review=True,
            audit_notes="Extracted successfully. Human dealer or admin confirmation mandatory prior to saving.",
            validation_warnings=warnings,
        )

quote_parser = QuoteParser()
