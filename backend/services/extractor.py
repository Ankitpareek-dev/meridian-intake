import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List
from backend.config import settings

EXTRACTION_SYSTEM_PROMPT = """You are an expert CPA client intake triage specialist for Meridian Tax & Advisory.
Your job is to analyze raw client intake transcripts (from phone, voicemail, web forms) and extract structured data.

Here is the firm's official Service Catalog for reference:
1. Individual Tax Preparation: Personal income tax filing, Form 1040, W-2, 1099, deductions, multi-state.
2. Business Tax Preparation: LLC, S-Corp, partnership annual filing, quarterly estimated payments, 1065, 1120-S.
3. Bookkeeping & Monthly Close: Ongoing transaction categorization, reconciliation, monthly P&L, balance sheets.
4. Advisory & Fractional CFO: Cash flow planning, budgeting, strategic financial guidance, profitability direction, expansion feasibility, hiring crew analysis.
5. Payroll Services: Payroll processing, tax withholding, W-2/W-4, direct deposit for businesses with employees.
6. Entity Formation & Compliance: New business formation, registered agent, annual state compliance filings.
7. Audit Support: Representation and documentation support during an IRS or state tax authority audit.
8. Retirement & Estate Planning: Retirement strategy, estate tax planning, inherited assets/property, deceased parent estate, succession.

CRITICAL INTAKE ANALYSIS RULES:
1. Dynamic Required vs. Suggested Service Classification:
   For every service matched, assign a `match_type`: `"REQUIRED"` or `"SUGGESTED"`.
   - **`REQUIRED`**: Assigned when there is high confidence, an explicit/direct client request, an active operational pain point, or a mandatory tax/legal filing (e.g., "I need my business taxes done", "our books are 4 months behind and need reconciliation", "father passed away and estate return must be filed"). There can be two or more REQUIRED services simultaneously.
   - **`SUGGESTED`**: Assigned when the client is asking tentatively, exploring possibilities, hedging ("maybe", "thinking about", "trying to figure out if I should", "once that is sorted out I'd like to look at...", "what would you recommend", "my friend mentioned..."), or seeking optional advisory advice. There can be two or more SUGGESTED services.
   Designate the central operational required service as `is_primary: true` (or the primary suggested service if no required services exist).
2. Multi-Service Scope: Extract ALL legitimate service lines discussed. Do NOT limit to only 1 or 2 services.
3. Advisory & Fractional CFO Intent: If a client asks for advice on cash flow, profitability, or whether they can afford to expand/hire another crew, classify as Advisory & Fractional CFO (REQUIRED if it is their primary stated goal, SUGGESTED if exploring "maybe" for the future). If they also have messy books/reconciliation, include Bookkeeping & Monthly Close as REQUIRED.
4. Distinguish Client Need vs. Hearsay: If a client says "my friend mentioned audit package, but what I really need is someone to run finances...", do NOT classify as Audit Support. Classify as Advisory & Fractional CFO or Bookkeeping, and flag the conflict.
5. Statutory Tax Deadlines & Deadline Alerts: Only set `deadline_alert` when there is a critical, impending, or potentially lapsed statutory deadline carrying serious penalty risk (e.g. inherited estate where IRS Form 706 is due within 9 months of death, or an active IRS audit deadline). Standard routine tax inquiries, regular LLC filings, or setting up future quarterly estimated tax payments do NOT constitute a statutory deadline risk and MUST have `deadline_alert: null`.
6. Missing Contact Details: If a client asks "call me back" but provides no phone number or email, explicitly record phone/email as null.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "client_name": string or null,
  "business_name": string or null,
  "contact_info": {
    "email": string or null,
    "phone": string or null,
    "notes": string or null
  },
  "primary_service_id": string (one of: individual_tax_prep, business_tax_prep, bookkeeping_monthly_close, advisory_fractional_cfo, payroll_services, entity_formation_compliance, audit_support, retirement_estate_planning),
  "primary_service_rationale": string,
  "matched_services": [
    {
      "service_id": string (one of: individual_tax_prep, business_tax_prep, bookkeeping_monthly_close, advisory_fractional_cfo, payroll_services, entity_formation_compliance, audit_support, retirement_estate_planning),
      "match_type": "REQUIRED" | "SUGGESTED",
      "is_primary": boolean,
      "rationale": string
    }
  ],
  "urgency": "LOW" | "MEDIUM" | "HIGH",
  "urgency_rationale": string,
  "has_conflicting_intent": boolean,
  "conflict_reason": string or null,
  "has_budget_constraint": boolean,
  "deadline_alert": string or null,
  "summary": string
}
"""

import time

CANDIDATE_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest"
]

def extract_structured_intake(transcript: str, retrieved_services: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Execute live structured extraction directly with Google Gemini models.
    Raises explicit RuntimeError on any failure or invalid response.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured in .env file.")

    payload = json.dumps({
        "contents": [
            {
                "parts": [
                    {"text": EXTRACTION_SYSTEM_PROMPT},
                    {"text": f"\n\nRAW TRANSCRIPT TO ANALYZE:\n\"\"\"{transcript}\"\"\""}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }).encode("utf-8")

    last_error = None
    for model_name in CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                cleaned_text = re.sub(r"^```json\s*|\s*```$", "", text_content.strip())
                return json.loads(cleaned_text)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            last_error = f"Gemini API Error with {model_name} ({e.code}): {err_body}"
            # If 503, 404, or 429, retry with brief pause
            if e.code in [404, 503, 429]:
                time.sleep(1)
                continue
            raise RuntimeError(last_error)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse Gemini JSON output: {str(e)}")
        except Exception as e:
            last_error = f"Network error connecting to Gemini API ({model_name}): {str(e)}"
            time.sleep(1)
            continue

    raise RuntimeError(f"All Gemini models failed: {last_error}")
