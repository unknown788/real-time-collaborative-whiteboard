// src/components/Whiteboard.tsx
"use client";

import { useRef, useEffect, useState } from 'react';

// 1. Accept roomId as a prop
interface WhiteboardProps {
  roomId: string;
}

export default function Whiteboard({ roomId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Canvas setup logic is unchanged
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      canvas.style.width = `${canvas.offsetWidth}px`;
      canvas.style.height = `${canvas.offsetHeight}px`;

      const context = canvas.getContext('2d');
      if (context) {
        context.scale(2, 2);
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 3;
        contextRef.current = context;
      }
    }
  }, []);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = nativeEvent;
    if (contextRef.current) {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    }
  };

  const stopDrawing = () => {
    if (contextRef.current) {
      contextRef.current.closePath();
      setIsDrawing(false);
    }
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  // 2. The main layout and title are now INSIDE the Client Component
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">
        Whiteboard Room: <span className="text-blue-600">{roomId}</span>
      </h1>
      <div className="w-full max-w-6xl h-[80vh] shadow-lg bg-white border-2 border-gray-300 rounded-lg">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          className="w-full h-full"
        />
      </div>
    </main>
  );
}