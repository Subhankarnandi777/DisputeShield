"""SQLAlchemy engine, session factory, Base — SQLite for local dev."""
import json
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, Integer, String, Text, create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class DisputeRow(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True)  # PayPal dispute_id
    paypal_dispute_id = Column(String, unique=True, index=True)
    status = Column(String, default="RECEIVED")  # RECEIVED|ANALYSING|READY|APPROVED|SUBMITTED|RESOLVED
    reason = Column(String)  # ITEM_NOT_RECEIVED|NOT_AS_DESCRIBED|UNAUTHORIZED|DUPLICATE|OTHER
    amount = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    buyer_name = Column(String, default="")
    buyer_email = Column(String, default="")
    seller_message_to_buyer = Column(Text, default="")
    create_time = Column(DateTime, default=datetime.utcnow)
    update_time = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    response_due_date = Column(DateTime, nullable=True)
    is_simulated = Column(Boolean, default=False)
    raw_paypal_json = Column(Text, default="{}")

    # AI analysis fields
    analysis_status = Column(String, default="pending")  # pending|running|done|error
    classification = Column(String, nullable=True)  # category from AI
    classification_confidence = Column(Float, nullable=True)
    classification_rationale = Column(Text, nullable=True)
    evidence_score = Column(Float, nullable=True)  # 0.0–1.0
    evidence_score_breakdown = Column(Text, default="{}")  # JSON
    p_win = Column(Float, nullable=True)
    ev_fight = Column(Float, nullable=True)
    fight_threshold = Column(Float, nullable=True)
    recommendation = Column(String, nullable=True)  # fight|accept
    decision_explanation = Column(Text, nullable=True)
    evidence_narrative = Column(Text, nullable=True)
    buyer_message_draft = Column(Text, nullable=True)
    missing_evidence = Column(Text, default="[]")  # JSON list
    cited_passages = Column(Text, default="[]")  # JSON list
    prompt_version = Column(String, default="v1")
    tone = Column(String, default="professional")

    # Action tracking
    action_taken = Column(String, nullable=True)  # fight|accept|offer
    action_timestamp = Column(DateTime, nullable=True)
    action_approved_by = Column(String, nullable=True)
    outcome = Column(String, nullable=True)  # WON|LOST|STALEMATE


class AuditLogRow(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dispute_id = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String, default="system")  # system|merchant|agent
    action = Column(String)
    detail = Column(Text, default="")


class WebhookEventRow(Base):
    __tablename__ = "webhook_events"

    event_id = Column(String, primary_key=True)
    event_type = Column(String)
    received_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)
    raw_body = Column(Text)


class MerchantSettingsRow(Base):
    __tablename__ = "merchant_settings"

    id = Column(Integer, primary_key=True, default=1)
    dispute_fee = Column(Float, default=20.0)
    effort_cost = Column(Float, default=5.0)
    base_rate_item_not_received = Column(Float, default=0.60)
    base_rate_not_as_described = Column(Float, default=0.40)
    base_rate_unauthorized = Column(Float, default=0.30)
    base_rate_duplicate = Column(Float, default=0.50)
    base_rate_other = Column(Float, default=0.35)


def _get_engine():
    settings = get_settings()
    return create_engine(settings.database_url, connect_args={"check_same_thread": False})


_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = _get_engine()
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


def init_db():
    engine = get_engine()
    Base.metadata.create_all(engine)
    # Seed default merchant settings if not present
    SessionLocal = get_session_factory()
    with SessionLocal() as session:
        if not session.get(MerchantSettingsRow, 1):
            session.add(MerchantSettingsRow(id=1))
            session.commit()


def get_db():
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
