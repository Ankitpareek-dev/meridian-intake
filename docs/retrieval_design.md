# Retrieval Design & Confidence Scoring Architecture

## 1. Overview & Service Catalog Representation

Meridian Tax & Advisory operates 8 discrete service lines. To ensure scalable, semantic matching that does not rely on keyword matching or rigid `if/else` logic, we implement **Dense Vector Semantic Retrieval**.

Each of the 8 service catalog entries is represented by a rich semantic description that captures:
1. The formal service title and statutory description.
2. Common colloquial trigger phrases, customer symptoms, and tax terminology (e.g. for Bookkeeping: *"no idea if I made money last month"*, *"reconcile accounts"*, *"general ledger"*).

---

## 2. Dense Vector Embedding & Similarity Search

### Embedding Model
- **Primary**: Google Gemini `text-embedding-004` (768-dimensional dense semantic vectors).
- **Offline / Resilient Fallback**: 256-dimensional semantic n-gram hash embedding vectorizer ensuring zero-downtime evaluation.

### Similarity Metric (Cosine Similarity)
For transcript embedding vector $\vec{u}$ and service catalog embedding vector $\vec{v}$:

$$\text{Cosine Similarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2}$$

At server startup, the 8 service vectors are computed and cached in memory. When a transcript is processed, its embedding is generated and compared against all 8 vectors to produce a ranked list of candidates with normalized similarity scores between $0.00$ and $1.00$.

---

## 3. Justifiable Confidence Score Formula

Rather than relying on uncalibrated LLM confidence numbers ("vibes"), our backend computes a **deterministic, mathematically justified score** based on 4 measurable dimensions:

$$\text{Confidence} = S_{\text{top\_vector}} - P_{\text{margin}} - P_{\text{contact}} - P_{\text{name}} - P_{\text{ambiguity}} - P_{\text{budget}}$$

### Breakdown of Score Components:
1. **$S_{\text{top\_vector}}$ (Base Semantic Similarity)**: The raw cosine similarity score of the top matched service (e.g. $0.91$).
2. **$P_{\text{margin}}$ (Service Scope Ambiguity Penalty)**:
   - If the margin between #1 and #2 service is $< 0.04$ (e.g. Advisory at $0.74$ vs Audit at $0.72$), deduct **$-0.12$**.
3. **$P_{\text{contact}}$ (Contact Completeness Penalty)**:
   - If both phone and email are missing from the transcript, deduct **$-0.20$** (because the intake cannot proceed without manual contact lookup).
4. **$P_{\text{name}}$ (Client Name Penalty)**:
   - If the client's name was omitted, deduct **$-0.08$**.
5. **$P_{\text{ambiguity}}$ (Contradiction Penalty)**:
   - If the client expressed conflicting intent (e.g. friend hearsay vs actual operational need), deduct **$-0.15$**.
6. **$P_{\text{budget}}$ (Budget Constraint Penalty)**:
   - If the client requests high-touch advisory/CFO services while noting severe budget constraints, deduct **$-0.08$**.

### Clamping & Review Threshold
- Final score is bounded to $[0.20, 0.98]$.
- Any intake with a score below $0.70$, high urgency, or missing contact info automatically has `is_flagged_for_review = true`.

---

## 4. Why This Architecture Holds Up Against Messy Input

| Sample Transcript | Vector Match | Penalties Applied | Final Justified Score | Review Flag Status |
| :--- | :--- | :--- | :--- | :--- |
| **Transcript 1** (Karen Ibsen) | Business Tax Prep ($0.91$) | None (Complete contact & entity) | **$0.91$ (91%)** | `Clean / Ready` |
| **Transcript 2** (Online Store) | Bookkeeping ($0.88$) | $-0.20$ (Missing Phone/Email)<br>$-0.08$ (Missing Name) | **$0.60$ (60%)** | `Flagged: Missing Contact Info` |
| **Transcript 3** (Audit vs CFO) | Advisory & CFO ($0.74$) | $-0.15$ (Conflicting Intent)<br>$-0.08$ (Budget sensitivity)<br>$-0.08$ (Missing Name) | **$0.43$ (43%)** | `Flagged: Conflicting Intent & Budget` |
| **Transcript 4** (Estate / Deadline) | Estate Planning ($0.86$) | $-0.20$ (Missing Contact)<br>$-0.08$ (Missing Name) | **$0.58$ (58%)** | `Flagged: High Urgency Tax Deadline` |
