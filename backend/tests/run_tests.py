import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Base, Service, Intake, IntakeServiceMatch
from backend.schemas import IntakeProcessRequest
from backend.services.catalog import get_service_catalog
from backend.services.retrieval import initialize_catalog_embeddings
from backend.services.seed_data import get_sample_transcripts
from backend.main import process_intake

def run_all_tests():
    print("=================================================================")
    print("Testing Meridian Tax & Advisory Intake Intelligence Pipeline")
    print("=================================================================\n")

    # In-memory test DB
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()

    # Seed catalog
    for s in get_service_catalog():
        db.add(Service(id=s["id"], name=s["name"], description=s["description"]))
    db.commit()

    initialize_catalog_embeddings()
    samples = get_sample_transcripts()

    passed = 0
    total = len(samples)

    for i, sample in enumerate(samples, 1):
        print(f"--- TEST {i}: {sample['title']} ---")
        req = IntakeProcessRequest(transcript=sample["transcript"])
        res = process_intake(req, db)

        print(f"Client Name     : {res.client_name}")
        print(f"Contact Info    : Phone={res.contact_info.phone}, Email={res.contact_info.email}")
        print(f"Matched Service : {res.matched_services[0].service_name} (Score: {res.matched_services[0].similarity_score})")
        print(f"Urgency         : {res.urgency} ({res.urgency_rationale})")
        print(f"Confidence Score: {res.confidence_score:.0%} ({res.confidence_rationale})")
        print(f"Flagged Review  : {res.is_flagged_for_review}")
        print(f"Flag Reasons    : {res.flag_reasons}")
        print()

        # Validation assertions
        if i == 1:
            assert res.client_name == "Karen Ibsen", "Test 1 failed: Client name mismatch"
            assert res.contact_info.email == "karen.ibsen@ibsenlandscaping.com", "Test 1 failed: Email mismatch"
            assert res.matched_services[0].service_id == "business_tax_prep", "Test 1 failed: Service mismatch"
            assert res.confidence_score >= 0.80, "Test 1 failed: Expected high confidence"
            assert res.is_flagged_for_review is False, "Test 1 failed: Clean intake should not be flagged"
            passed += 1

        elif i == 2:
            assert res.matched_services[0].service_id == "bookkeeping_monthly_close", "Test 2 failed: Service mismatch"
            assert res.contact_info.phone is None, "Test 2 failed: Phone should be None"
            assert res.is_flagged_for_review is True, "Test 2 failed: Missing info should be flagged"
            assert res.confidence_score < 0.75, "Test 2 failed: Confidence should be penalized"
            passed += 1

        elif i == 3:
            assert res.matched_services[0].service_id in ["advisory_fractional_cfo", "bookkeeping_monthly_close"], "Test 3 failed: Service mismatch"
            assert res.is_flagged_for_review is True, "Test 3 failed: Conflicted intent should be flagged"
            passed += 1

        elif i == 4:
            assert res.matched_services[0].service_id == "retirement_estate_planning", "Test 4 failed: Service mismatch"
            assert res.urgency == "HIGH", "Test 4 failed: Estate deadline should be HIGH urgency"
            assert res.is_flagged_for_review is True, "Test 4 failed: High urgency estate should be flagged"
            passed += 1

    print("=================================================================")
    print(f"RESULTS: {passed}/{total} tests PASSED successfully!")
    print("=================================================================")

if __name__ == "__main__":
    run_all_tests()
