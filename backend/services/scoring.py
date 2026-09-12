from typing import Dict, Any, List, Tuple

def calculate_confidence_and_flags(
    top_services: List[Dict[str, Any]],
    extracted_data: Dict[str, Any],
    raw_transcript: str
) -> Tuple[float, str, bool, List[str]]:
    """
    Computes a mathematically justified confidence score, human-readable rationale,
    and review flags based on vector similarity, data completeness, and semantic nuance.
    """
    flag_reasons = []
    
    # 1. Base Retrieval Score from top vector match (calibrated from cosine similarity)
    if top_services:
        s1 = top_services[0]["similarity_score"]
        s2 = top_services[1]["similarity_score"] if len(top_services) > 1 else 0.0
    else:
        s1, s2 = 0.5, 0.0

    # Calibrate raw cosine similarity (typically 0.40 - 0.75) into base confidence (0.50 - 0.95)
    # Cosine similarity >= 0.65 represents a strong semantic match in Gemini embedding space
    if s1 >= 0.65:
        base_score = min(0.95, 0.85 + (s1 - 0.65) * 1.0)
    elif s1 >= 0.50:
        base_score = 0.70 + (s1 - 0.50) * 1.0
    else:
        base_score = max(0.40, 0.50 + (s1 - 0.40))

    deductions = 0.0
    reasons_breakdown = [f"Base vector fit: {base_score:.0%} (raw sim: {s1:.2f})"]

    # 2. Margin Check (Service Ambiguity)
    margin = s1 - s2
    has_conflicting_intent = extracted_data.get("has_conflicting_intent", False)
    if has_conflicting_intent:
        deductions += 0.15
        flag_reasons.append(extracted_data.get("conflict_reason", "Conflicting client request / intent shift"))
        reasons_breakdown.append("-15% for conflicting client intent")
    elif margin < 0.02 and s1 < 0.65:
        deductions += 0.10
        flag_reasons.append("Close competition between multiple service lines (scope ambiguity)")
        reasons_breakdown.append("-10% for narrow service margin")


    # 3. Contact Info Completeness Check
    contact = extracted_data.get("contact_info", {})
    has_phone = bool(contact.get("phone"))
    has_email = bool(contact.get("email"))
    has_name = bool(extracted_data.get("client_name"))

    if not has_phone and not has_email:
        deductions += 0.20
        flag_reasons.append("Missing client contact information (no phone or email provided)")
        reasons_breakdown.append("-20% for missing contact info")
    elif not has_phone or not has_email:
        # Partial contact info (e.g. only email or only phone)
        pass

    if not has_name:
        deductions += 0.08
        flag_reasons.append("Client name omitted from transcript")
        reasons_breakdown.append("-8% for missing client name")

    # 4. Budget Mismatch Check
    has_budget_constraint = extracted_data.get("has_budget_constraint", False)
    if has_budget_constraint:
        deductions += 0.08
        flag_reasons.append("Client expressed budget sensitivity against potentially high-touch services")
        reasons_breakdown.append("-8% for budget constraint")

    # Calculate Final Score (Clamped between 0.20 and 0.98)
    final_score = round(max(0.20, min(0.98, base_score - deductions)), 3)

    # 5. Flag for Review Determination
    # Review is needed ONLY when confidence is low (< 0.75) or when there are data defects / ambiguities
    has_defects_or_ambiguities = bool(
        (not has_phone and not has_email) or
        not has_name or
        has_conflicting_intent or
        (margin < 0.02 and s1 < 0.65) or
        has_budget_constraint
    )

    is_flagged = (final_score < 0.75) or has_defects_or_ambiguities

    # Construct Rationale
    if final_score >= 0.80 and not is_flagged:
        confidence_rationale = (
            f"High confidence ({final_score:.0%}). Clear service alignment with "
            f"{top_services[0]['service_name']}, complete client details, and no ambiguity."
        )
    else:
        confidence_rationale = (
            f"Confidence calculated at {final_score:.0%} ({', '.join(reasons_breakdown)}). "
            f"Flags: {'; '.join(flag_reasons) if flag_reasons else 'None'}."
        )

    return final_score, confidence_rationale, is_flagged, flag_reasons
