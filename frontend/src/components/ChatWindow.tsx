"use client";
import { useState, FormEvent, useEffect, useRef } from 'react';

export interface ChatMessage {
  user: string;
  text: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  userName: string;
  onSendMessage: (message: string) => void;
  onNameChange: (newName: string) => void;
}

export default function ChatWindow({ messages, userName, onSendMessage, onNameChange }: ChatWindowProps) {
  const [text, setText] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(userName);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setCurrentName(userName);
  }, [userName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleNameSave = () => {
    if (currentName.trim()) {
      onNameChange(currentName);
      setIsEditingName(false);
    }
  };

  return (
    <div className="bg-white h-full flex flex-col p-4 space-y-4">
      <div className="border-b pb-2">
        <h3 className="font-semibold text-gray-800 text-center">Room Chat</h3>
        <div className="text-xs text-center text-gray-500 mt-1">
          {isEditingName ? (
            <div className="flex items-center space-x-2">
              <input 
                type="text" 
                value={currentName} 
                onChange={(e) => setCurrentName(e.target.value)}
                className="flex-grow p-1 border rounded-md text-xs"
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
              />
              <button onClick={handleNameSave} className="p-1 text-green-600 hover:bg-green-100 rounded-full" title="Save Name">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m9 16.17l-4.17-4.17l1.41-1.41L9 13.34l7.17-7.17l1.41 1.41z"/></svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-1">
              <span>Logged in as: <span className="font-bold text-slate-700">{userName}</span></span>
              <button onClick={() => setIsEditingName(true)} className="p-1 hover:bg-gray-200 rounded-full" title="Edit Name">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83l3.75 3.75z"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto h-0 space-y-3 pr-2">
        {messages.map((msg, index) => (
          <div key={index} className="text-sm break-words">
            <span className="font-bold text-blue-600">{msg.user}: </span>
            <span className="text-slate-800">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex shrink-0">
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 text-black focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white font-semibold px-4 rounded-r-md hover:bg-blue-700 transition-colors">Send</button>
      </form>
    </div>
  );
}

