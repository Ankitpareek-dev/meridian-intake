import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base, Service, Intake, IntakeServiceMatch
from backend.schemas import IntakeProcessRequest
from backend.services.catalog import get_service_catalog
from backend.services.retrieval import initialize_catalog_embeddings, retrieve_matching_services
from backend.services.extractor import extract_structured_intake
from backend.services.scoring import calculate_confidence_and_flags
from backend.services.seed_data import get_sample_transcripts
from backend.main import process_intake

# Test In-Memory SQLite Database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # Seed services
    for s in get_service_catalog():
        db.add(Service(id=s["id"], name=s["name"], description=s["description"]))
    db.commit()
    
    initialize_catalog_embeddings()
    yield db
    db.close()

def test_transcript_1_karen_ibsen(db_session):
    """Test Karen Ibsen clean baseline intake."""
    samples = get_sample_transcripts()
    t1 = samples[0]["transcript"]

    req = IntakeProcessRequest(transcript=t1)
    res = process_intake(req, db_session)

    assert res.client_name == "Karen Ibsen"
    assert res.contact_info.email == "karen.ibsen@ibsenlandscaping.com"
    assert "614-555-0142" in res.contact_info.phone
    assert res.matched_services[0].service_id == "business_tax_prep"
    assert res.confidence_score >= 0.85
    assert res.is_flagged_for_review is False

def test_transcript_2_online_store(db_session):
    """Test Online Store with missing contact details & callback request."""
    samples = get_sample_transcripts()
    t2 = samples[1]["transcript"]

    req = IntakeProcessRequest(transcript=t2)
    res = process_intake(req, db_session)

    assert res.matched_services[0].service_id == "bookkeeping_monthly_close"
    assert res.contact_info.phone is None
    assert res.contact_info.email is None
    assert res.is_flagged_for_review is True
    assert any("contact" in f.lower() for f in res.flag_reasons)
    assert res.confidence_score < 0.75  # Confidence penalized for missing contact info

def test_transcript_3_audit_vs_cfo(db_session):
    """Test Audit Hearsay vs Fractional CFO & budget sensitivity."""
    samples = get_sample_transcripts()
    t3 = samples[2]["transcript"]

    req = IntakeProcessRequest(transcript=t3)
    res = process_intake(req, db_session)

    # Actual need is Advisory/CFO or Bookkeeping, not Audit
    assert res.matched_services[0].service_id in ["advisory_fractional_cfo", "bookkeeping_monthly_close"]
    assert res.is_flagged_for_review is True
    assert any("budget" in f.lower() or "conflict" in f.lower() or "ambiguity" in f.lower() or "service" in f.lower() for f in res.flag_reasons)

def test_transcript_4_estate_deadline(db_session):
    """Test Deceased parent estate tax with missing contact info."""
    samples = get_sample_transcripts()
    t4 = samples[3]["transcript"]

    req = IntakeProcessRequest(transcript=t4)
    res = process_intake(req, db_session)

    assert res.matched_services[0].service_id == "retirement_estate_planning"
    assert res.urgency == "HIGH"
    assert res.is_flagged_for_review is True  # Flagged because caller omitted name & contact info
    assert any("contact" in f.lower() or "name" in f.lower() for f in res.flag_reasons)

def test_clean_high_urgency_intake(db_session):
    """Test Robert Hayes complete high-urgency intake passes without review flag."""
    t = "Good morning, this is Robert Hayes calling at 512-555-8841. My father passed away recently and I am the executor of his estate. The probate attorney informed us that the federal estate tax filing deadline is in 10 days. We need immediate estate tax and inheritance advisory before the cutoff."
    req = IntakeProcessRequest(transcript=t)
    res = process_intake(req, db_session)

    assert res.client_name == "Robert Hayes"
    assert res.contact_info.phone is not None
    assert res.matched_services[0].service_id == "retirement_estate_planning"
    assert res.urgency == "HIGH"
    assert res.is_flagged_for_review is False  # Clean complete data is NOT flagged
    assert res.confidence_score >= 0.85
