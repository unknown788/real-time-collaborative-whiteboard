from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func, Text, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
import os

# --- Database Setup ---
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@whiteboard_db:5432/whiteboarddb"
)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- SQLAlchemy Models ---


class WhiteboardEvent(Base):
    __tablename__ = 'whiteboard_events'
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True, nullable=False)
    event_type = Column(String, nullable=False)
    event_data = Column(JSON, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class WhiteboardSnapshot(Base):
    __tablename__ = 'whiteboard_snapshots'
    id = Column(Integer, primary_key=True)
    room_id = Column(String, unique=True, index=True, nullable=False)
    snapshot_data = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True),
                       server_default=func.now(), onupdate=func.now())

# NEW: Model for saving chat messages


class ChatMessage(Base):
    __tablename__ = 'chat_messages'
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, index=True, nullable=False)
    user_name = Column(String, nullable=False)
    text = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# This line will create any missing tables on startup
Base.metadata.create_all(bind=engine)

# --- Connection Manager (No Changes) ---


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections.get(room_id, []):
                del self.active_connections[room_id]

    async def broadcast(self, data: Dict[str, Any], room_id: str, sender: WebSocket):
        # Broadcast to all clients, including the sender for simplicity on the frontend
        for connection in self.active_connections.get(room_id, []):
            await connection.send_json(data)


# --- FastAPI App ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=[
                   "*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
manager = ConnectionManager()

# --- Pydantic model for receiving snapshot data ---


class SnapshotIn(BaseModel):
    image_data: str

# --- HTTP Endpoint for Saving the Whiteboard ---


# In backend/main.py, replace your existing save_whiteboard_state function with this one

@app.post("/save/{room_id}")
async def save_whiteboard_state(room_id: str, snapshot: SnapshotIn):
    print(f"--- SAVE ENDPOINT HIT for room: {room_id} ---")
    try:
        print(
            f"Received image data (first 50 chars): {snapshot.image_data[:50]}")
        with SessionLocal() as db:
            print("Database session opened.")

            # Check if a snapshot for this room already exists
            print("Querying for existing snapshot...")
            existing_snapshot = db.query(WhiteboardSnapshot).filter(
                WhiteboardSnapshot.room_id == room_id).first()

            if existing_snapshot:
                # If it exists, update it
                print("Found existing snapshot. Updating...")
                existing_snapshot.snapshot_data = snapshot.image_data
            else:
                # If it doesn't exist, create a new one
                print("No existing snapshot found. Creating new one...")
                new_snapshot = WhiteboardSnapshot(
                    room_id=room_id, snapshot_data=snapshot.image_data)
                db.add(new_snapshot)

            print("Attempting to commit to the database...")
            db.commit()
            print("SUCCESS: Database commit successful.")

        return {"message": "Whiteboard state saved successfully."}
    except Exception as e:
        print(f"CRITICAL ERROR in save endpoint: {e}")
        # We still raise an HTTPException, but the log will tell us what happened
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
# --- WebSocket Endpoint for Real-Time Communication ---


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        with SessionLocal() as db:
            # 1. On connect, send the saved snapshot if it exists
            snapshot = db.query(WhiteboardSnapshot).filter(
                WhiteboardSnapshot.room_id == room_id).first()
            if snapshot:
                await websocket.send_json({"type": "SNAPSHOT", "data": snapshot.snapshot_data})

            # 2. On connect, send the saved chat history
            chat_history = db.query(ChatMessage).filter(
                ChatMessage.room_id == room_id).order_by(ChatMessage.timestamp).all()
            if chat_history:
                history_data = [{"user": msg.user_name, "text": msg.text}
                                for msg in chat_history]
                await websocket.send_json({"type": "CHAT_HISTORY", "data": history_data})

        # 3. Listen for live events
        while True:
            data = await websocket.receive_json()

            # NEW: If the event is a chat message, save it to the database
            if data.get("type") == "CHAT":
                with SessionLocal() as db:
                    chat_data = data.get("data", {})
                    db_message = ChatMessage(
                        room_id=room_id,
                        user_name=chat_data.get("user"),
                        text=chat_data.get("text")
                    )
                    db.add(db_message)
                    db.commit()

            # Broadcast ALL incoming messages to all clients in the room
            await manager.broadcast(data, room_id, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
    except Exception as e:
        print(f"Error in websocket for room {room_id}: {e}")
        manager.disconnect(websocket, room_id)
