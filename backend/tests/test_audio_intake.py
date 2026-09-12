import io
import wave
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.database import get_db
from backend.models import Base, Service
from backend.services.catalog import get_service_catalog
from backend.services.transcriber import transcribe_audio_bytes

# Test In-Memory Database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)
db = TestingSessionLocal()
for s in get_service_catalog():
    db.add(Service(id=s["id"], name=s["name"], description=s["description"]))
db.commit()

def override_get_db():
    try:
        session = TestingSessionLocal()
        yield session
    finally:
        session.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def create_mock_wav_bytes(duration_sec=0.5):
    """Generate minimal valid WAV audio bytes."""
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b'\x00' * int(16000 * duration_sec * 2))
    return buf.getvalue()

def test_transcribe_validation():
    """Test that empty or too-small audio raises ValueError."""
    with pytest.raises(ValueError):
        transcribe_audio_bytes(b"", "audio/wav")

    with pytest.raises(ValueError):
        transcribe_audio_bytes(b"short", "audio/wav")

def test_process_audio_empty_file():
    """Test POST /api/intakes/process-audio with empty bytes returns 400."""
    response = client.post(
        "/api/intakes/process-audio",
        files={"file": ("test.wav", b"", "audio/wav")}
    )
    assert response.status_code == 400
