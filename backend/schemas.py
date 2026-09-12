from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ContactInfo(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class ServiceItem(BaseModel):
    id: str
    name: str
    description: str

class ServiceMatch(BaseModel):
    service_id: str
    service_name: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    match_type: str = Field(default="REQUIRED", description="REQUIRED or SUGGESTED")
    is_primary: bool = False
    rationale: Optional[str] = None

class IntakeProcessRequest(BaseModel):
    transcript: str = Field(..., min_length=3, description="Raw spoken or written client intake transcript")

class IntakeResponse(BaseModel):
    id: str
    raw_transcript: str
    client_name: Optional[str] = None
    business_name: Optional[str] = None
    contact_info: ContactInfo
    matched_services: List[ServiceMatch]
    urgency: str = Field(..., description="LOW, MEDIUM, or HIGH")
    urgency_rationale: Optional[str] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    confidence_rationale: Optional[str] = None
    is_flagged_for_review: bool
    flag_reasons: List[str] = Field(default_factory=list)
    status: str = "PROCESSED"
    summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntakeListItem(BaseModel):
    id: str
    raw_transcript_preview: str
    client_name: Optional[str] = None
    business_name: Optional[str] = None
    primary_service: Optional[str] = None
    required_services: List[str] = Field(default_factory=list)
    suggested_services: List[str] = Field(default_factory=list)
    all_matched_services: List[str] = Field(default_factory=list)
    urgency: str
    urgency_rationale: Optional[str] = None
    confidence_score: float
    confidence_rationale: Optional[str] = None
    is_flagged_for_review: bool
    flag_reasons: List[str]
    status: str
    has_contact_info: bool
    created_at: datetime

class IntakeStatusUpdate(BaseModel):
    status: str = Field(..., description="PROCESSED, UNDER_REVIEW, APPROVED, REJECTED")
    notes: Optional[str] = None

class AddServiceMatchRequest(BaseModel):
    service_id: str
    match_type: str = Field(default="REQUIRED", description="REQUIRED or SUGGESTED")
    is_primary: bool = False
    rationale: Optional[str] = "Manually added by reviewer."
