# Written Reflection: Meridian Tax & Advisory Intake System

### 1. Main Architecture Decisions & Trade-Offs
Given the time constraints and the scope of the assessment, we made three deliberate architectural choices:
- **Decoupled Semantic Retrieval & Structured Extraction**: Rather than dumping the entire catalog into an LLM prompt or using hardcoded keyword regexes, we built a 2-stage retrieval pipeline. Dense vector embeddings (using Google Gemini `text-embedding-004` with a deterministic local fallback) compute cosine similarity across the 8 service lines, providing mathematical grounding. The structured LLM then disambiguates nuanced edge cases.
- **Relational Schema with Optimized Composite Indexes**: We structured PostgreSQL with a normalized join table (`intake_service_matches`) rather than an unstructured JSON blob. This allowed us to add high-performance B-tree indexes directly targeting the two core query patterns: `idx_intakes_flagged_created` on `(is_flagged_for_review, created_at DESC)` and `idx_intake_service_matches_service_id` on `(service_id, intake_id)`.
- **Deterministic, Transparent Confidence Scoring**: Instead of letting the LLM hallucinate an arbitrary "vibe" confidence number, our backend calculates confidence mathematically: starting from the top vector similarity score and deducting explicit, auditable penalty points for missing phone/email, omitted names, narrow service margins, and conflicting client intents.

---

### 2. Which Transcript Gave the Most Trouble and Why?
**Transcript 3 (Audit Hearsay vs. CFO & Budget)** was the most challenging:
- *The Challenge*: The caller begins with *"I think I need the audit protection kind of package, my friend mentioned that"*, before pivoting to *"what I might really need is somebody to just run the finance side... tell me if I'm profitable"* and concluding with *"I don't have a huge budget"*. Naive keyword matchers or single-pass vector searches get tricked by the prominent mention of "audit", ignoring that it was third-party hearsay.
- *The Solution*: In our prompt engineering, we introduced an explicit **Hearsay vs. Real Need Disambiguation Rule**. The system correctly classifies the primary need as **Advisory & Fractional CFO** / **Bookkeeping**, while outputting discrete ambiguity flags (`CONFLICTING_SERVICE_REQUEST` and `BUDGET_MISMATCH`) and automatically discounting the confidence score to $44\%$, properly routing it to a partner for triage.

---

### 3. What to Change Before Real Client Data
Before deploying with live client data at a professional CPA firm like Meridian:
1. **PII Masking & Privacy Tokenization**: Client voice notes contain sensitive identifiers (SSNs, EINs, bank accounts, personal phone numbers). We would implement a client-side or gateway PII scrubbing layer (e.g., Microsoft Presidio) to tokenize PII before transmitting transcripts to third-party LLM providers.
2. **SOC 2 & HIPAA-Compliant Data Retention**: Enforce role-based access control (RBAC), end-to-end encryption at rest (pgcrypto/AES-256), and immutable audit logs tracking who viewed or edited each intake.

---

### 4. Assumptions Made vs. What We Would Have Asked
- *Assumptions*: We assumed transcripts originate from voice-to-text without caller ID metadata attached (prompting us to flag transcripts missing phone numbers as incomplete). We also assumed a single intake can be mapped to primary and secondary services for cross-department handoffs.
- *What We Would Have Asked*:
  1. Does Meridian's telephony system provide automatic caller ID / CRM customer record links to resolve anonymous transcripts?
  2. For multi-service matches (e.g., LLC Tax Prep + Payroll in Transcript 1), should the system spawn linked sub-tickets across separate practice departments?

---

### 5. What We Would Build with a Full Week
1. **AI-Drafted Clarification Emails**: One-click generation of personalized, courteous draft emails for flagged intakes (e.g., asking Transcript 2 for their phone number and entity name).
2. **Audio Upload & Streaming Transcription**: Direct audio file upload (MP3/WAV) using Gemini's native audio processing or local Whisper to eliminate manual transcription.
3. **Active Learning Feedback Loop**: An intake coordinator correction UI that logs human adjustments to retune catalog embeddings and few-shot calibration dynamically.
