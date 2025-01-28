"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ChatWindow, { ChatMessage } from '@/components/ChatWindow';

// --- Type Definitions ---
interface Point { x: number; y: number; }
interface DrawData { points: Point[]; color: string; lineWidth: number; }
interface ShapeData { type: 'rect' | 'line' | 'arrow'; x1: number; y1: number; x2: number; y2: number; color: string; lineWidth: number; }
interface EraseData { points: Point[]; lineWidth: number; }
type Tool = 'draw' | 'rect' | 'line' | 'arrow' | 'eraser';

const generateCoolName = (uuid: string): string => {
  const adjectives = ['Happy', 'Jolly', 'Dreamy', 'Sparkling', 'Golden', 'Brave', 'Clever', 'Kind', 'Vivid', 'Silent'];
  const nouns = ['River', 'Forest', 'Mountain', 'Meadow', 'Sky', 'Ocean', 'Island', 'Star', 'Comet', 'Planet'];
  const uuidParts = uuid.split('-');
  if (uuidParts.length < 3) return uuid.slice(0, 8);
  const adjIndex = parseInt(uuidParts[0].slice(0, 2), 16) % adjectives.length;
  const nounIndex = parseInt(uuidParts[1].slice(0, 2), 16) % nouns.length;
  const numberPart = uuidParts[2].slice(0, 4);
  return `${adjectives[adjIndex]} ${nouns[nounIndex]} ${numberPart}`;
};

// --- Main Whiteboard Component ---
export default function WhiteboardPage() {
  const params = useParams();
  const roomId = useMemo(() => Array.isArray(params.roomId) ? params.roomId[0] : params.roomId, [params.roomId]);
  const coolRoomName = useMemo(() => roomId ? generateCoolName(roomId) : 'Loading...', [roomId]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  
  const [hasMounted, setHasMounted] = useState(false);
  const [userName, setUserName] = useState('Anonymous');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3B82F6');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<Tool>('draw');
  const drawPointsRef = useRef<Point[]>([]);
  const shapeStartPointRef = useRef<Point | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copy Link');

  // --- Drawing Functions ---
  const drawArrowhead = useCallback((ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, radius: number) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - radius * Math.cos(angle - Math.PI / 7), toY - radius * Math.sin(angle - Math.PI / 7));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - radius * Math.cos(angle + Math.PI / 7), toY - radius * Math.sin(angle + Math.PI / 7));
  }, []);

  const drawShape = useCallback((data: ShapeData) => {
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current) return;
    const { offsetWidth, offsetHeight } = canvasRef.current;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    const x1 = data.x1 * offsetWidth;
    const y1 = data.y1 * offsetHeight;
    const x2 = data.x2 * offsetWidth;
    const y2 = data.y2 * offsetHeight;
    ctx.beginPath();
    if (data.type === 'rect') {
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    } else if (data.type === 'line') {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else if (data.type === 'arrow') {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      drawArrowhead(ctx, x1, y1, x2, y2, 10 * data.lineWidth / 2);
    }
    ctx.stroke();
  }, [drawArrowhead]);

  const drawOnContext = useCallback((ctx: CanvasRenderingContext2D, data: DrawData | EraseData) => {
    if (!canvasRef.current || data.points.length < 2) return;
    const { offsetWidth, offsetHeight } = canvasRef.current;
    ctx.lineWidth = data.lineWidth;
    if ('color' in data) ctx.strokeStyle = data.color;
    ctx.beginPath();
    ctx.moveTo(data.points[0].x * offsetWidth, data.points[0].y * offsetHeight);
    for (let i = 1; i < data.points.length; i++) {
      ctx.lineTo(data.points[i].x * offsetWidth, data.points[i].y * offsetHeight);
    }
    ctx.stroke();
  }, []);
  
  const drawStroke = useCallback((data: DrawData) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    drawOnContext(ctx, data);
  }, [drawOnContext]);

  const eraseStroke = useCallback((data: EraseData) => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    drawOnContext(ctx, data);
  }, [drawOnContext]);

  const clearCanvas = useCallback(() => {
    const ctx = contextRef.current;
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }, []);
  
  // --- Lifecycle and WebSocket Setup ---
  useEffect(() => {
    setHasMounted(true);
    const storedName = localStorage.getItem('whiteboard-userName') || `User${Math.floor(Math.random() * 1000)}`;
    setUserName(storedName);
  }, []);

  useEffect(() => {
    if (!hasMounted || !roomId) return;
    
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    const setupCanvas = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width === 0) return;
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const context = canvas.getContext('2d');
        if (context) {
          context.scale(2, 2);
          context.lineCap = 'round';
          context.lineJoin = 'round';
          contextRef.current = context;
        }
    };

    const observer = new ResizeObserver(setupCanvas);
    observer.observe(container);
    
    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.replace('ROOM_ID', roomId) || `ws://localhost:8000/ws/${roomId}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => console.log('WebSocket connection established');

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'SNAPSHOT') {
            const ctx = contextRef.current;
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.drawImage(img, 0, 0, ctx.canvas.width / 2, ctx.canvas.height / 2);
            };
            img.src = message.data;
        } 
        else if (message.type === 'CHAT_HISTORY') {
            setMessages(message.data);
        }
        else if (message.type === 'CHAT') {
            // Since the backend now broadcasts all messages, we add any new message to our state
            setMessages(prev => [...prev, message.data]);
        }
        else if (message.type === 'DRAW') drawStroke(message.data);
        else if (message.type === 'SHAPE_ADD') drawShape(message.data);
        else if (message.type === 'ERASE') eraseStroke(message.data);
        else if (message.type === 'CLEAR') clearCanvas();
    };

    return () => {
        observer.disconnect();
        socket.close();
    };
  }, [hasMounted, roomId, clearCanvas, drawShape, drawStroke, eraseStroke]);

  const handleSave = async () => {
      const canvas = canvasRef.current;
      if (!canvas || !roomId) {
          alert("Canvas not ready.");
          return;
      }
      const imageData = canvas.toDataURL('image/png');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      try {
          const response = await fetch(`${apiUrl}/save/${roomId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: imageData })
          });
          if (response.ok) {
              alert("Whiteboard saved!");
          } else {
              alert("Failed to save whiteboard.");
          }
      } catch (error) {
          console.error("Error saving whiteboard:", error);
          alert("An error occurred while saving.");
      }
  };

  const getCanvasPoint = useCallback((event: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getCanvasPoint(event);
    drawPointsRef.current = [point];
    shapeStartPointRef.current = point;
  }, [getCanvasPoint]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const currentPoint = getCanvasPoint(event);
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    
    if (tool === 'draw' || tool === 'eraser') {
      const prevPoint = drawPointsRef.current[drawPointsRef.current.length - 1];
      if (!prevPoint) return;
      if (tool === 'eraser') {
        const eraseData: EraseData = { points: [prevPoint, currentPoint], lineWidth };
        eraseStroke(eraseData);
        socket.send(JSON.stringify({ type: 'ERASE', data: eraseData }));
      } else {
        const drawData: DrawData = { points: [prevPoint, currentPoint], color, lineWidth };
        drawStroke(drawData);
        socket.send(JSON.stringify({ type: 'DRAW', data: drawData }));
      }
      drawPointsRef.current.push(currentPoint);
    }
  }, [isDrawing, getCanvasPoint, tool, lineWidth, color, eraseStroke, drawStroke]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    const endPoint = getCanvasPoint(event);
    const startPoint = shapeStartPointRef.current;
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN || !startPoint) return;

    if (tool === 'rect' || tool === 'line' || tool === 'arrow') {
      const data: ShapeData = { type: tool, x1: startPoint.x, y1: startPoint.y, x2: endPoint.x, y2: endPoint.y, color, lineWidth };
      drawShape(data);
      socket.send(JSON.stringify({ type: 'SHAPE_ADD', data }));
    }
    drawPointsRef.current = [];
    shapeStartPointRef.current = null;
  }, [getCanvasPoint, tool, color, lineWidth, drawShape]);
  
  const handleClear = useCallback(() => {
    clearCanvas();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'CLEAR' }));
    }
  }, [clearCanvas]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopyButtonText('Copied!');
    setTimeout(() => setCopyButtonText('Copy Link'), 2000);
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      // The frontend no longer needs to update its own state directly
      // It sends the message, and the backend broadcasts it back to everyone
      socket.send(JSON.stringify({ type: 'CHAT', data: { user: userName, text } }));
    }
  }, [userName]);
  
  const handleNameChange = useCallback((newName: string) => {
    setUserName(newName);
    localStorage.setItem('whiteboard-userName', newName);
  }, []);

  const ToolButton = ({ toolName, children, title }: { toolName: Tool, children: React.ReactNode, title: string }) => (
    <button title={title} onClick={() => setTool(toolName)} className={`p-3 rounded-lg transition-colors ${tool === toolName ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>
      {children}
    </button>
  );

  if (!hasMounted) {
      return (
          <div className="flex items-center justify-center h-screen bg-slate-100">
              <p className="text-xl font-semibold text-gray-700 animate-pulse">Loading Whiteboard...</p>
          </div>
      );
  }

  return (
    <main className="w-screen h-screen bg-slate-100 flex flex-col font-sans">
        <header className="p-2 w-full flex items-center justify-between shadow-md bg-white z-20 shrink-0">
          <div className="w-1/3 pl-4"></div>
          <div className="w-1/3 text-center"><h1 className="text-xl font-semibold">Room: <span className="font-bold text-blue-600">{coolRoomName}</span></h1></div>
          <div className="w-1/3 flex justify-end pr-4"><button onClick={handleCopyLink} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">{copyButtonText}</button></div>
        </header>
        <div className="flex flex-grow overflow-hidden">
            <aside className="w-90 bg-white shadow-lg flex flex-col p-4 border-r border-slate-200 shrink-0">
                <div className="flex flex-col h-full space-y-6 overflow-y-auto">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-700 px-1">Tools</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <ToolButton toolName="draw" title="Pen"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="mx-auto"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 20h9m-9.5-9.5a5 5 0 0 1 7 7l-1.5 1.5L7 19l-4 1 1-4z"/></svg></ToolButton>
                            <ToolButton toolName="rect" title="Rectangle"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="mx-auto"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h18v18H3z"/></svg></ToolButton>
                            <ToolButton toolName="line" title="Line"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="mx-auto"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 19l14-14"/></svg></ToolButton>
                            <ToolButton toolName="arrow" title="Arrow"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="mx-auto"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7-7l7 7-7 7z"/></svg></ToolButton>
                            <ToolButton toolName="eraser" title="Eraser"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" className="mx-auto"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m7 21l-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7zm15 0H7"/></svg></ToolButton>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-700 px-1">Stroke Color</h3>
                        <div className="relative"><input type="color" id="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 p-1 border-none rounded-lg cursor-pointer"/></div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-semibold text-gray-700 px-1">Stroke Width</h3>
                        <div className="flex items-center space-x-2"><input type="range" id="lineWidth" min="1" max="100" value={lineWidth} onChange={(e) => setLineWidth(parseInt(e.target.value, 10))} className="w-full"/><span className="text-sm font-medium w-8 text-center">{lineWidth}</span></div>
                    </div>
                    <div className="flex-grow h-0 min-h-[40vh] border-t pt-4 mt-4">
                        <ChatWindow messages={messages} userName={userName} onSendMessage={handleSendMessage} onNameChange={handleNameChange} />
                    </div>
                    <div className="space-y-2">
                        <button onClick={handleSave} className="w-full bg-green-600 text-white font-semibold p-2 rounded-lg hover:bg-green-700 transition-colors">
                            Save Whiteboard
                        </button>
                        <button onClick={handleClear} className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-red-50 text-red-600 font-semibold transition-colors shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="mr-2"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Clear Canvas
                        </button>
                    </div>
                </div>
            </aside>
            <div className="flex-grow p-4 relative">
                <div className="w-full h-full relative">
                    <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="absolute inset-0 w-full h-full bg-white rounded-lg shadow-inner z-10"/>
                </div>
            </div>
        </div>
    </main>
  );
}

