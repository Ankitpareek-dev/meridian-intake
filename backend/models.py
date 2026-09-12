import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, ForeignKey, Integer, Index, JSON
from sqlalchemy.orm import relationship, declarative_base

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None

Base = declarative_base()

def generate_uuid():
    return f"intake_{uuid.uuid4().hex[:12]}"

class Service(Base):
    __tablename__ = "services"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    embedding = Column(Vector(3072) if Vector else Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    matches = relationship("IntakeServiceMatch", back_populates="service", cascade="all, delete-orphan")

class Intake(Base):
    __tablename__ = "intakes"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    raw_transcript = Column(Text, nullable=False)
    client_name = Column(String(255), nullable=True)
    business_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    urgency = Column(String(32), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH
    urgency_rationale = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=False)
    confidence_rationale = Column(Text, nullable=True)
    is_flagged_for_review = Column(Boolean, nullable=False, default=False)
    flag_reasons = Column(JSON, default=list)
    status = Column(String(32), nullable=False, default="PROCESSED")  # PROCESSED, UNDER_REVIEW, APPROVED, REJECTED
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    matched_services = relationship("IntakeServiceMatch", back_populates="intake", cascade="all, delete-orphan")

    __table_args__ = (
        # Performance index 1: Filter by flagged status ordered by date
        Index("idx_intakes_flagged_created", "is_flagged_for_review", "created_at"),
    )

class IntakeServiceMatch(Base):
    __tablename__ = "intake_service_matches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    intake_id = Column(String(64), ForeignKey("intakes.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(String(64), ForeignKey("services.id", ondelete="RESTRICT"), nullable=False)
    similarity_score = Column(Float, nullable=False)
    match_type = Column(String(32), nullable=False, default="REQUIRED")  # "REQUIRED" or "SUGGESTED"
    is_primary = Column(Boolean, nullable=False, default=False)
    match_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    intake = relationship("Intake", back_populates="matched_services")
    service = relationship("Service", back_populates="matches")

    __table_args__ = (
        # Performance index 2: Filter by matched service ID
        Index("idx_intake_service_matches_service_id", "service_id", "intake_id"),
        Index("idx_intake_service_matches_intake_id", "intake_id"),
    )
