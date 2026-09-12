-- Meridian Tax & Advisory Client Intake Database Schema (PostgreSQL)

-- 1. Service Catalog Table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Processed Intakes Table
CREATE TABLE IF NOT EXISTS intakes (
    id VARCHAR(64) PRIMARY KEY,
    raw_transcript TEXT NOT NULL,
    client_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(64),
    urgency VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
    urgency_rationale TEXT,
    confidence_score NUMERIC(4, 3) NOT NULL, -- e.g. 0.935
    confidence_rationale TEXT,
    is_flagged_for_review BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reasons JSONB DEFAULT '[]'::jsonb, -- Array of string reasons / codes
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED', -- 'PROCESSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Intake-to-Service Matches Join Table
CREATE TABLE IF NOT EXISTS intake_service_matches (
    id SERIAL PRIMARY KEY,
    intake_id VARCHAR(64) NOT NULL REFERENCES intakes(id) ON DELETE CASCADE,
    service_id VARCHAR(64) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    similarity_score NUMERIC(4, 3) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    match_rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_intake_service UNIQUE (intake_id, service_id)
);

-- =========================================================================
-- REQUIRED PERFORMANCE INDEXES FOR TARGET QUERY PATTERNS
-- =========================================================================

-- Query Pattern 1: "Everything flagged for review"
-- Optimized for queue triage sorted by creation time
CREATE INDEX IF NOT EXISTS idx_intakes_flagged_created 
ON intakes (is_flagged_for_review, created_at DESC);

-- Query Pattern 2: "Everything matched to a given service"
-- Optimized for service-line filtering and routing
CREATE INDEX IF NOT EXISTS idx_intake_service_matches_service_id 
ON intake_service_matches (service_id, intake_id);

-- Supporting index for fast joins from intakes
CREATE INDEX IF NOT EXISTS idx_intake_service_matches_intake_id 
ON intake_service_matches (intake_id);
