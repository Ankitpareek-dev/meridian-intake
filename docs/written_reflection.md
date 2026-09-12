# Written Reflection: Meridian Tax & Advisory Intake System

### **1. Architecture Decisions & Trade-offs**
* **Frontend**: Built with **React 18 and Tailwind CSS** for a responsive two-column triage interface (inquiry queue on the left, side-by-side raw transcript and structured details on the right) with audio player preview and real-time filtering by status tab, service, and urgency.
* **Backend**: Built with **FastAPI (Python)** to provide clean, validated REST endpoints with asynchronous request handling and Pydantic schema validation.
* **Database & Vector Search**: Used **PostgreSQL with `pgvector`** to store relational data (`intakes`, `services`, `intake_service_matches`) and execute SQL-native cosine similarity queries (`<=>`) directly against 3072-dimensional service embeddings.
* **Three Gemini AI Models**:
  1. **Multimodal Audio (`gemini-flash`)**: Transcribes incoming client voicemails (WAV/MP3) directly into clean text without third-party speech-to-text tools.
  2. **Dense Vector Embeddings (`gemini-embedding-001`)**: Converts service descriptions and caller inquiries into 3072-dimensional vectors for semantic cosine retrieval in `pgvector`.
  3. **Structured JSON Extraction (`gemini-flash`)**: Extracts caller contact info, urgency level, notes, and ambiguity flags into strict JSON schemas.
* **Confidence Engine**: Rather than asking the LLM to rate itself, confidence is calculated deterministically in Python—starting from the vector similarity score and docking points for missing contact info or conflicting requests.
* **Trade-offs / Scope**: Kept the architecture clean and self-contained as a unified FastAPI + PostgreSQL setup rather than over-engineering with unnecessary microservices, external message queues, or third-party vector SaaS vendors. This met 100% of the assignment requirements with zero excess operational overhead.

---

### **2. Which Transcript Gave the Most Trouble and Why?**
**Transcript 3**. The caller mentions their friend recommended an *"audit package"*, but their actual operational need is cash flow and profitability advice on a tight budget. A basic keyword search would wrongly match Audit Support. I added a rule to ignore third-party hearsay and focus on the caller’s actual business pain (*Advisory / Fractional CFO* + *Bookkeeping*), plus a budget conflict check that lowers the confidence score to **36%** to trigger human review.

---

### **3. First Thing to Change Before Real Client Data**
**Security and client privacy.** Tax voicemails contain personal phone numbers and confidential financial details. Before processing live data, I would add user authentication with role-based access control (RBAC), database encryption at rest, and an enterprise zero-data-retention agreement with the LLM provider so client financial info is never stored or used for model training.

---

### **4. Assumptions Made vs. What I Would Have Asked**
* **Assumptions**: Callers often need multiple services at once (e.g., Business Tax Prep + Payroll), and staff cannot approve an intake without at least a client name and a working phone number or email.
* **Questions I'd ask**:
  1. What is the expected response SLA for high-urgency statutory deadlines?
  2. Should approved intakes automatically export into practice management tools (Karbon, Canopy, QuickBooks)?
  3. How should existing client records or duplicate inquiries be matched?

---

### **5. What I'd Build with a Full Week**
1. **Practice Management Sync**: Push approved intakes directly into tools like Karbon, Canopy, or QuickBooks Online.
2. **One-Click Follow-Up Drafts**: A button to instantly generate a quick email or SMS draft asking callers for missing details (like Transcript 2, who forgot to leave a phone number).
3. **Live Phone Line Hook**: Connect a Twilio phone number so incoming client voicemails drop directly into the triage queue automatically.

