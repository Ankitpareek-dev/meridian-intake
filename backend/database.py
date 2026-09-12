from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from backend.config import settings
from backend.models import Base

# Support SQLite connect_args if needed
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # If running on PostgreSQL, ensure the pgvector extension is enabled first
    if not settings.DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
        except Exception as e:
            print(f"Warning: Could not create vector extension automatically: {e}")

    Base.metadata.create_all(bind=engine)
