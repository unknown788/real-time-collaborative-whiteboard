Real-Time Collaborative Whiteboard
A real-time whiteboard application built with a modern tech stack, allowing multiple users to draw, erase, and chat in a shared room. The application features a persistent drawing state, ensuring that new users see the complete history of the canvas.
Key Features
Real-Time Collaboration: Changes made by one user are instantly broadcast to all other users in the same room using WebSockets.
Persistent State: The entire drawing history, including shapes and chat messages, is saved to a PostgreSQL database.
On-Demand Saving: The canvas state is saved as a highly optimized snapshot when a user clicks "Save", ensuring fast load times for new participants.
Interactive Tools: Includes essential tools like a pen, eraser, basic shapes (rectangle, line), and color/width selectors.
Live Chat: Each room has a dedicated, persistent chat for users to communicate.
Tech Stack
Backend: FastAPI (Python), Uvicorn, SQLAlchemy
Frontend: Next.js (React), TypeScript, Tailwind CSS
Database: PostgreSQL (managed by Neon, run locally with Docker)
Real-Time Communication: WebSockets
Getting Started
Prerequisites
Docker & Docker Compose
Node.js & npm
Python & pip
Running Locally
Clone the repository:
git clone [YOUR_NEW_GITHUB_REPO_URL]
cd real-time-collaborative-whiteboard


Set up the backend:
Navigate to the backend directory.
Create a Python virtual environment and install dependencies.
Run the Docker containers: docker-compose up --build
Set up the frontend:
Navigate to the frontend directory.
Install npm packages: npm install
Run the development server: npm run dev
The application will be available at http://localhost:3000.
