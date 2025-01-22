# backend/models.py
from sqlalchemy import Column, Integer, String, JSON, DateTime, func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class WhiteboardEvent(Base):
    __tablename__ = 'whiteboard_events'
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True, nullable=False)
    event_type = Column(String, nullable=False)
    event_data = Column(JSON, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
