// src/app/page.tsx
"use client"; // This must be a client component for useEffect and useRouter

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidV4 } from 'uuid';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // When the component mounts, create a new unique room ID
    const newRoomId = uuidV4();
    // And immediately redirect the user to the new whiteboard room
    router.push(`/whiteboard/${newRoomId}`);
  }, [router]);

  // Render a simple loading state while the redirect is happening
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <p className="text-xl font-semibold text-gray-700">Creating a new whiteboard room...</p>
      </div>
    </div>
  );
}