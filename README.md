# Real-Time Collaborative Whiteboard

[![Live Demo](https://img.shields.io/badge/Live_Demo-whiteboard.404by.me-blue?style=for-the-badge&logo=vercel)](https://whiteboard.404by.me/)

A feature-rich, persistent, real-time collaborative whiteboard application built with FastAPI (WebSockets), Next.js (React), and PostgreSQL.



## Overview

This project implements a web-based whiteboard where multiple users can join a shared room and collaborate visually in real-time. Drawings, shapes, and chat messages appear instantly for all connected participants. The application state is persistently stored, allowing users to rejoin sessions and resume their work.

The goal was to build a robust, stateful application demonstrating mastery of WebSocket communication, asynchronous backend processing, and a polished, responsive frontend user experience.

## Key Features

* **Real-Time Collaboration:** Changes made by one user (drawing, erasing, shapes, chat) are broadcast instantly to all other users in the same room via WebSockets.
* **Persistent Drawing State:** All drawing actions are saved to a PostgreSQL database. Users joining a room receive the full history, ensuring they always see the latest canvas state.
* **Multi-Tool Support:** Includes tools for free-form drawing, rectangles, lines, arrows, and a pixel-level eraser.
* **Responsive UI:** A clean, modern interface with a fixed sidebar for tools and chat, designed to work seamlessly on various screen sizes.
* **Integrated Chat:** A dedicated chat window allows users within the same room to communicate via text messages.
* **User Identity:** Simple user naming stored in `localStorage` for session continuity and chat identification, editable within the UI.
* **Shareable Rooms:** Automatically generates unique room IDs upon visiting the root URL and provides an easy "Copy Link" button for sharing.
* **Human-Readable Room Names:** Displays fun, generated names (e.g., "Happy Forest 965b") in the UI while using secure UUIDs for routing.

## Architecture

The application follows a client-server architecture with a clear separation between the frontend and backend.



```mermaid
graph TD
    subgraph Browser Clients
        Client1[Client 1 (Next.js @ whiteboard.404by.me)]
        Client2[Client 2 (Next.js @ whiteboard.404by.me)]
    end

    subgraph Cloud Infrastructure
        subgraph Heroku
            Backend[Backend (FastAPI + Uvicorn)]
        end
        subgraph Neon / Heroku Postgres
            DB[(PostgreSQL Database)]
        end
    end

    Client1 -- Secure WebSocket (wss://) --> Backend
    Client2 -- Secure WebSocket (wss://) --> Backend
    Backend -- SQL Queries (Thread Pool) --> DB
    Backend -- Broadcast --> Client1
    Backend -- Broadcast --> Client2

    style Client1 fill:#D6EAF8,stroke:#3498DB
    style Client2 fill:#D6EAF8,stroke:#3498DB
    style Backend fill:#D5F5E3,stroke:#2ECC71
    style DB fill:#FDEDEC,stroke:#E74C3C
