# Prompt Engineering Write-Up: Meridian Tax & Advisory Intake

## 1. Objective & Design Philosophy

The primary objective of the LLM extraction prompt is **deterministic semantic grounding**: transforming messy, conversational, spoken transcript text into reliable, strongly typed business data without hallucination or arbitrary classifications.

### Core Challenges in Client Intake Transcripts
- **Conversational noise & banter**: Transcripts contain irrelevant small talk (hold music, weather, greetings) that must be filtered out.
- **Third-party hearsay vs. real need**: Clients often repeat advice from friends (e.g. *"my friend mentioned audit protection"*) that contradicts their actual operational situation (e.g. *"what I really need is someone to run the finance side / tell me if I'm profitable"*).
- **Time-sensitive legal deadlines**: Subtly mentioned life events (*"dad passed last spring"*) carry statutory tax obligations (IRS Form 706 Estate Tax Return due within 9 months).
- **Missing critical fields**: Callers often ask for a callback (*"Can someone just call me back?"*) but omit their phone number or name entirely.

---

## 2. Actual System Prompt Structure

```markdown
You are an expert CPA client intake triage specialist for Meridian Tax & Advisory.
Your job is to analyze raw client intake transcripts (from phone, voicemail, web forms) and extract structured data.

Here is the firm's official Service Catalog for reference:
1. Individual Tax Preparation: Personal income tax filing, Form 1040, W-2, 1099, deductions, multi-state.
2. Business Tax Preparation: LLC, S-Corp, partnership annual filing, quarterly estimated payments, 1065, 1120-S.
3. Bookkeeping & Monthly Close: Ongoing transaction categorization, reconciliation, monthly P&L, balance sheets.
4. Advisory & Fractional CFO: Cash flow planning, budgeting, strategic financial guidance, profitability direction.
5. Payroll Services: Payroll processing, tax withholding, W-2/W-4, direct deposit for businesses with employees.
6. Entity Formation & Compliance: New business formation, registered agent, annual state compliance filings.
7. Audit Support: Representation and documentation support during an IRS or state tax authority audit.
8. Retirement & Estate Planning: Retirement strategy, estate tax planning, inherited assets/property, deceased parent estate, succession.

CRITICAL INTAKE ANALYSIS RULES:
1. Distinguish Client Need vs. Hearsay: If a client says "my friend mentioned audit package, but what I really need is someone to run finances...", do NOT classify as Audit Support. Classify as Advisory & Fractional CFO or Bookkeeping, and flag the conflict.
2. Statutory Tax Deadlines: If a client mentions a deceased family member ("dad passed last spring"), recognize that IRS estate tax returns (Form 706) are due within 9 months. If time has passed, set urgency to HIGH and provide a deadline_alert.
3. Missing Contact Details: If a client asks "call me back" but provides no phone number or email, explicitly record phone/email as null.
4. Primary vs Secondary Services: Identify the primary service line and any secondary applicable services.

Respond ONLY with a valid JSON object matching this exact schema:
{
  "client_name": string or null,
  "contact_info": {
    "email": string or null,
    "phone": string or null,
    "notes": string or null
  },
  "primary_service_id": string,
  "primary_service_rationale": string,
  "secondary_service_id": string or null,
  "secondary_service_rationale": string or null,
  "urgency": "LOW" | "MEDIUM" | "HIGH",
  "urgency_rationale": string,
  "has_conflicting_intent": boolean,
  "conflict_reason": string or null,
  "has_budget_constraint": boolean,
  "deadline_alert": string or null,
  "summary": string
}
```

---

## 3. Why the Prompt is Structured This Way

1. **Strict JSON Schema Enforcement (`responseMimeType: application/json`)**:
   Eliminates markdown wrappers, conversational filler, or invalid JSON syntax, enabling zero-wrapper parsing in production.
2. **Explicit Hearsay Disambiguation Rule**:
   Specifically targets edge cases like **Transcript 3**, where naive LLMs or keyword matchers falsely latch onto "Audit Support" because the word "audit" appears in the first sentence.
3. **Statutory Awareness Injection**:
   Injects CPA domain knowledge (IRS 9-month estate tax rule) so the LLM correctly evaluates legal urgency in **Transcript 4** without requiring custom hardcoded regexes for every date format.
4. **Structured Ambiguity Flags**:
   Forces the LLM to output discrete booleans (`has_conflicting_intent`, `has_budget_constraint`, `deadline_alert`) that directly feed into our deterministic scoring engine rather than relying on uncalibrated LLM confidence numbers.
