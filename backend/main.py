import os
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from backend.config import settings
from backend.database import get_db, init_db
from backend.models import Service, Intake, IntakeServiceMatch
from backend.schemas import (
    IntakeProcessRequest,
    IntakeResponse,
    IntakeListItem,
    IntakeStatusUpdate,
    AddServiceMatchRequest,
    ServiceItem,
    ServiceMatch,
    ContactInfo
)
from backend.services.catalog import get_service_catalog, get_service_by_id
from backend.services.retrieval import initialize_catalog_embeddings, retrieve_matching_services
from backend.services.extractor import extract_structured_intake
from backend.services.scoring import calculate_confidence_and_flags
from backend.services.transcriber import transcribe_audio_bytes
from backend.services.seed_data import get_sample_transcripts
from backend.services.validation import validate_transcript_input

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup initialization: initialize DB and pre-compute catalog embeddings."""
    init_db()
    
    # Pre-seed service catalog into DB
    db = next(get_db())
    try:
        catalog = get_service_catalog()
        for s in catalog:
            existing = db.query(Service).filter(Service.id == s["id"]).first()
            if not existing:
                db.add(Service(id=s["id"], name=s["name"], description=s["description"]))
        db.commit()
    finally:
        pass
        
    initialize_catalog_embeddings(db)
    db.close()
    yield

app = FastAPI(
    title="Meridian Tax & Advisory Client Intake API",
    description="Intelligent client intake triage assistant with semantic retrieval and structured LLM extraction.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend clients
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "app": "Meridian Tax & Advisory Intake API",
        "status": "healthy",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service_catalog_count": len(get_service_catalog())}

@app.get("/api/services", response_model=List[ServiceItem])
def list_services(db: Session = Depends(get_db)):
    """List all 8 available service lines from the catalog."""
    services = db.query(Service).all()
    return [ServiceItem(id=s.id, name=s.name, description=s.description) for s in services]

@app.post("/api/intakes/process", response_model=IntakeResponse, status_code=status.HTTP_201_CREATED)
def process_intake(payload: IntakeProcessRequest, db: Session = Depends(get_db)):
    """
    Accepts raw spoken/written intake transcript and returns structured JSON output.
    Executes semantic vector retrieval against the service catalog, LLM extraction,
    and deterministic confidence scoring.
    """
    transcript = validate_transcript_input(payload.transcript)

    # 1. Semantic Vector Retrieval Step (Queries pgvector in PostgreSQL)
    retrieved_services = retrieve_matching_services(transcript, top_k=4, db=db)
    
    # 2. LLM Extraction & Nuance Disambiguation Step
    extracted = extract_structured_intake(transcript, retrieved_services)

    # 3. Confidence Scoring & Review Flagging Engine
    confidence_score, confidence_rationale, is_flagged, flag_reasons = calculate_confidence_and_flags(
        retrieved_services, extracted, transcript
    )

    # 4. Resolve Dynamic Matched Services List
    matched_services_list: List[ServiceMatch] = []
    raw_matches = extracted.get("matched_services", [])
    
    # If LLM didn't return an array, fallback to primary_service_id
    if not raw_matches or not isinstance(raw_matches, list):
        primary_id = extracted.get("primary_service_id")
        if primary_id:
            raw_matches = [{
                "service_id": primary_id,
                "is_primary": True,
                "rationale": extracted.get("primary_service_rationale")
            }]
        elif retrieved_services:
            raw_matches = [{
                "service_id": retrieved_services[0]["service_id"],
                "is_primary": True,
                "rationale": "Top semantic vector retrieval match."
            }]

    seen_service_ids = set()
    primary_assigned = False

    for idx, m in enumerate(raw_matches):
        s_id = m.get("service_id")
        if not s_id or s_id in seen_service_ids:
            continue
        s_meta = get_service_by_id(s_id)
        if not s_meta:
            continue
        
        seen_service_ids.add(s_id)
        # Look up dense vector similarity score from retrieved_services
        ret_score = next((r["similarity_score"] for r in retrieved_services if r["service_id"] == s_id), 0.65)
        
        raw_mtype = str(m.get("match_type", "REQUIRED")).upper()
        match_type = "SUGGESTED" if "SUGGEST" in raw_mtype else "REQUIRED"
        
        is_prim = m.get("is_primary", False)
        if is_prim:
            primary_assigned = True
        elif not primary_assigned and idx == 0 and match_type == "REQUIRED":
            is_prim = True
            primary_assigned = True

        matched_services_list.append(
            ServiceMatch(
                service_id=s_meta["id"],
                service_name=s_meta["name"],
                similarity_score=ret_score,
                match_type=match_type,
                is_primary=is_prim,
                rationale=m.get("rationale") or f"Identified service requirement: {s_meta['name']}."
            )
        )

    # Ensure at least one primary match exists if list is not empty
    if matched_services_list and not any(m.is_primary for m in matched_services_list):
        matched_services_list[0].is_primary = True

    # 5. Persist Intake Record into Database
    contact_data = extracted.get("contact_info", {})
    intake = Intake(
        raw_transcript=transcript,
        client_name=extracted.get("client_name"),
        business_name=extracted.get("business_name"),
        email=contact_data.get("email"),
        phone=contact_data.get("phone"),
        urgency=extracted.get("urgency", "MEDIUM"),
        urgency_rationale=extracted.get("urgency_rationale"),
        confidence_score=confidence_score,
        confidence_rationale=confidence_rationale,
        is_flagged_for_review=is_flagged,
        flag_reasons=flag_reasons,
        status="PROCESSED",
        summary=extracted.get("summary")
    )
    db.add(intake)
    db.flush()

    # Persist Service Matches join records
    for match in matched_services_list:
        join_rec = IntakeServiceMatch(
            intake_id=intake.id,
            service_id=match.service_id,
            similarity_score=match.similarity_score,
            match_type=match.match_type,
            is_primary=match.is_primary,
            match_rationale=match.rationale
        )
        db.add(join_rec)

    db.commit()
    db.refresh(intake)

    return IntakeResponse(
        id=intake.id,
        raw_transcript=intake.raw_transcript,
        client_name=intake.client_name,
        business_name=intake.business_name,
        contact_info=ContactInfo(
            email=intake.email,
            phone=intake.phone,
            notes=contact_data.get("notes")
        ),
        matched_services=matched_services_list,
        urgency=intake.urgency,
        urgency_rationale=intake.urgency_rationale,
        confidence_score=intake.confidence_score,
        confidence_rationale=intake.confidence_rationale,
        is_flagged_for_review=intake.is_flagged_for_review,
        flag_reasons=intake.flag_reasons,
        status=intake.status,
        summary=intake.summary,
        created_at=intake.created_at
    )

@app.post("/api/intakes/process-audio", response_model=IntakeResponse, status_code=status.HTTP_201_CREATED)
async def process_audio_intake(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accepts an audio recording/voicemail file (MP3, WAV, M4A, OGG, WebM),
    transcribes the spoken audio using Gemini multimodal AI, and processes the intake.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No audio file was uploaded.")

    content_type = file.content_type or "audio/wav"
    audio_bytes = await file.read()

    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty or corrupted.")

    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds maximum 25MB limit.")

    # Transcribe audio using Gemini multimodal model
    try:
        transcription = transcribe_audio_bytes(audio_bytes, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio transcription failed: {str(e)}")

    if not transcription or len(transcription.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="Could not detect intelligible speech in the audio file. Please ensure the audio is audible."
        )

    # Forward the transcribed text through standard intake pipeline
    req = IntakeProcessRequest(transcript=transcription.strip())
    return process_intake(req, db)

@app.get("/api/intakes", response_model=List[IntakeListItem])
def list_intakes(
    tab: Optional[str] = Query(None, description="Tab filter: ALL, REVIEW_NEEDED, AWAITING_CONFIRMATION, APPROVED"),
    is_flagged: Optional[bool] = Query(None, description="Filter for review queue (is_flagged_for_review)"),
    service_id: Optional[str] = Query(None, description="Filter intakes matched to a specific service ID"),
    urgency: Optional[str] = Query(None, description="Filter by urgency: LOW, MEDIUM, HIGH"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by intake status"),
    search: Optional[str] = Query(None, description="Search client name or transcript keywords"),
    db: Session = Depends(get_db)
):
    """
    Query processed intakes queue with indexed filters for tabs, services, search.
    """
    query = db.query(Intake).options(
        joinedload(Intake.matched_services).joinedload(IntakeServiceMatch.service)
    )

    # 1. Tab / Queue Category Filter
    if tab:
        tab_upper = tab.upper()
        if tab_upper == "APPROVED":
            query = query.filter(Intake.status == "APPROVED")
        elif tab_upper == "REJECTED":
            query = query.filter(Intake.status == "REJECTED")
        elif tab_upper in ["REVIEW_NEEDED", "FLAGGED"]:
            query = query.filter(
                (Intake.status == "UNDER_REVIEW") | 
                (Intake.is_flagged_for_review == True)
            ).filter(Intake.status.notin_(["APPROVED", "REJECTED"]))
        elif tab_upper in ["AWAITING_CONFIRMATION", "CLEAN"]:
            query = query.filter(
                Intake.status.notin_(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
                Intake.is_flagged_for_review == False
            )
    elif is_flagged is not None:
        if is_flagged:
            query = query.filter(
                (Intake.status == "UNDER_REVIEW") | 
                (Intake.is_flagged_for_review == True)
            ).filter(Intake.status.notin_(["APPROVED", "REJECTED"]))
        else:
            query = query.filter(
                Intake.status.notin_(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
                Intake.is_flagged_for_review == False
            )

    # 2. Service Match Filter
    if service_id:
        query = query.join(Intake.matched_services).filter(IntakeServiceMatch.service_id == service_id)

    if urgency:
        query = query.filter(Intake.urgency == urgency.upper())

    if status_filter and not tab:
        query = query.filter(Intake.status == status_filter.upper())

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Intake.client_name.ilike(search_fmt)) | 
            (Intake.business_name.ilike(search_fmt)) | 
            (Intake.raw_transcript.ilike(search_fmt))
        )

    # Order by creation date descending
    intakes = query.order_by(desc(Intake.created_at)).all()

    items = []
    for item in intakes:
        req_services = [m.service.name for m in item.matched_services if m.service and getattr(m, "match_type", "REQUIRED") == "REQUIRED"]
        sugg_services = [m.service.name for m in item.matched_services if m.service and getattr(m, "match_type", "REQUIRED") == "SUGGESTED"]
        all_services = [m.service.name for m in item.matched_services if m.service]

        # Find primary service name
        primary_match = next((m for m in item.matched_services if m.is_primary), None)
        primary_name = primary_match.service.name if primary_match and primary_match.service else (
            req_services[0] if req_services else (all_services[0] if all_services else None)
        )

        items.append(
            IntakeListItem(
                id=item.id,
                raw_transcript_preview=item.raw_transcript[:140] + ("..." if len(item.raw_transcript) > 140 else ""),
                client_name=item.client_name,
                business_name=item.business_name,
                primary_service=primary_name,
                required_services=req_services,
                suggested_services=sugg_services,
                all_matched_services=all_services,
                urgency=item.urgency,
                urgency_rationale=item.urgency_rationale,
                confidence_score=item.confidence_score,
                confidence_rationale=item.confidence_rationale,
                is_flagged_for_review=item.is_flagged_for_review,
                flag_reasons=item.flag_reasons or [],
                status=item.status,
                has_contact_info=bool(item.phone or item.email),
                created_at=item.created_at
            )
        )
    return items

@app.get("/api/intakes/{intake_id}", response_model=IntakeResponse)
def get_intake_detail(intake_id: str, db: Session = Depends(get_db)):
    """Retrieve full detail for a single processed intake."""
    intake = db.query(Intake).options(
        joinedload(Intake.matched_services).joinedload(IntakeServiceMatch.service)
    ).filter(Intake.id == intake_id).first()

    if not intake:
        raise HTTPException(status_code=404, detail="Intake record not found")

    matches = [
        ServiceMatch(
            service_id=m.service_id,
            service_name=m.service.name if m.service else m.service_id,
            similarity_score=m.similarity_score,
            match_type=getattr(m, "match_type", "REQUIRED") or "REQUIRED",
            is_primary=m.is_primary,
            rationale=m.match_rationale
        ) for m in intake.matched_services
    ]

    return IntakeResponse(
        id=intake.id,
        raw_transcript=intake.raw_transcript,
        client_name=intake.client_name,
        business_name=intake.business_name,
        contact_info=ContactInfo(
            email=intake.email,
            phone=intake.phone,
            notes=None
        ),
        matched_services=matches,
        urgency=intake.urgency,
        urgency_rationale=intake.urgency_rationale,
        confidence_score=intake.confidence_score,
        confidence_rationale=intake.confidence_rationale,
        is_flagged_for_review=intake.is_flagged_for_review,
        flag_reasons=intake.flag_reasons or [],
        status=intake.status,
        summary=intake.summary,
        created_at=intake.created_at
    )

@app.patch("/api/intakes/{intake_id}", response_model=IntakeResponse)
def update_intake_status(intake_id: str, payload: IntakeStatusUpdate, db: Session = Depends(get_db)):
    """Update intake status (e.g. APPROVED, UNDER_REVIEW, REJECTED)."""
    intake = db.query(Intake).filter(Intake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Intake record not found")

    new_status = payload.status.upper()

    if new_status == "APPROVED":
        # 1. Enforce that at least one required service is assigned
        req_count = db.query(IntakeServiceMatch).filter(
            IntakeServiceMatch.intake_id == intake_id,
            (IntakeServiceMatch.match_type == "REQUIRED") | (IntakeServiceMatch.match_type.is_(None))
        ).count()
        if req_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot approve intake: At least one Required Service must be assigned."
            )

        # 2. Enforce client name is present
        if not intake.client_name or not intake.client_name.strip():
            raise HTTPException(
                status_code=400,
                detail="Cannot approve intake: Client Name is missing. Please provide the client name before approval."
            )

        # 3. Enforce at least one contact method (phone or email)
        if not intake.email and not intake.phone:
            raise HTTPException(
                status_code=400,
                detail="Cannot approve intake: Missing contact information (at least a phone number or email is required to approve)."
            )

        intake.is_flagged_for_review = False
        intake.status = "APPROVED"

    elif new_status in ["PROCESSED", "UNAPPROVED", "REVERT"]:
        # Revert to previous intake queue state based on flags and urgency
        intake.status = "PROCESSED"
        if intake.flag_reasons and len(intake.flag_reasons) > 0:
            intake.is_flagged_for_review = True
        elif intake.urgency == "HIGH":
            intake.is_flagged_for_review = True
        else:
            intake.is_flagged_for_review = False

    elif new_status == "UNDER_REVIEW":
        intake.status = "UNDER_REVIEW"
        intake.is_flagged_for_review = True

    elif new_status == "REJECTED":
        intake.status = "REJECTED"

    else:
        intake.status = new_status

    db.commit()
    return get_intake_detail(intake_id, db)

@app.post("/api/intakes/{intake_id}/services", response_model=IntakeResponse)
def add_service_to_intake(intake_id: str, payload: AddServiceMatchRequest, db: Session = Depends(get_db)):
    """Allow human reviewer to manually add or update a service match on an intake."""
    intake = db.query(Intake).filter(Intake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Intake record not found")

    s_meta = get_service_by_id(payload.service_id)
    if not s_meta:
        raise HTTPException(status_code=400, detail="Invalid service ID")

    # Check if this service is already matched on the intake
    existing = db.query(IntakeServiceMatch).filter(
        IntakeServiceMatch.intake_id == intake_id,
        IntakeServiceMatch.service_id == payload.service_id
    ).first()

    target_type = payload.match_type.upper()
    if target_type not in ["REQUIRED", "SUGGESTED"]:
        target_type = "REQUIRED"

    if existing:
        existing.match_type = target_type
        if payload.rationale:
            existing.match_rationale = payload.rationale
        if payload.is_primary:
            # Demote others if this one is set as primary
            for other in intake.matched_services:
                if other.id != existing.id:
                    other.is_primary = False
            existing.is_primary = True
    else:
        if payload.is_primary:
            for other in intake.matched_services:
                other.is_primary = False

        new_match = IntakeServiceMatch(
            intake_id=intake_id,
            service_id=payload.service_id,
            similarity_score=1.0,  # Human verified
            match_type=target_type,
            is_primary=payload.is_primary,
            match_rationale=payload.rationale or f"Manually designated as {target_type.lower()} by reviewer."
        )
        db.add(new_match)

    db.commit()
    return get_intake_detail(intake_id, db)

@app.delete("/api/intakes/{intake_id}/services/{service_id}", response_model=IntakeResponse)
def remove_service_from_intake(intake_id: str, service_id: str, db: Session = Depends(get_db)):
    """Allow human reviewer to remove a service match from an intake."""
    match = db.query(IntakeServiceMatch).filter(
        IntakeServiceMatch.intake_id == intake_id,
        IntakeServiceMatch.service_id == service_id
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Service match not found on this intake")

    db.delete(match)
    db.commit()
    return get_intake_detail(intake_id, db)

@app.post("/api/seed")
def seed_sample_transcripts(db: Session = Depends(get_db)):
    """1-Click endpoint to process and store all 4 official assessment transcripts."""
    samples = get_sample_transcripts()
    results = []

    for item in samples:
        # Check if transcript already exists
        existing = db.query(Intake).filter(Intake.raw_transcript == item["transcript"]).first()
        if existing:
            results.append({"title": item["title"], "id": existing.id, "status": "already_exists"})
            continue

        # Process intake through the pipeline
        req = IntakeProcessRequest(transcript=item["transcript"])
        res = process_intake(req, db)
        results.append({"title": item["title"], "id": res.id, "status": "processed", "flagged": res.is_flagged_for_review})

    return {
        "message": "Sample transcripts processed successfully",
        "processed_count": len(results),
        "results": results
    }

@app.delete("/api/intakes/{intake_id}")
def delete_intake(intake_id: str, db: Session = Depends(get_db)):
    """Delete a single intake record and its associated matches."""
    intake = db.query(Intake).filter(Intake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Intake record not found")
    
    db.delete(intake)
    db.commit()
    return {"message": "Intake deleted successfully", "id": intake_id}

@app.delete("/api/intakes")
def clear_all_intakes(db: Session = Depends(get_db)):
    """Utility endpoint to clear all intakes for fresh testing."""
    db.query(IntakeServiceMatch).delete()
    deleted_count = db.query(Intake).delete()
    db.commit()
    return {"message": "All intake records deleted", "deleted_count": deleted_count}
