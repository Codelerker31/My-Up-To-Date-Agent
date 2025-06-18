# Your Updates Agent

A conversational AI application that helps you stay informed on any topic through automated research and scheduled newsletters. The application features real-time chat, automated content research, scheduled updates, and personalized newsletters delivered via email.

## Features

🤖 **Conversational AI Interface** - Natural language interaction for managing research topics
📊 **Automated Research** - Continuous monitoring and analysis of specified topics
📧 **Scheduled Newsletters** - Automated generation and delivery of personalized updates
⏰ **Flexible Scheduling** - Daily, weekly, bi-weekly, or monthly update frequencies
🔍 **Real-time Chat** - WebSocket-powered instant messaging
👤 **User Authentication** - Secure JWT-based authentication system
📱 **Responsive Design** - Modern, mobile-friendly interface

## Architecture

### Frontend (Next.js)

- **React 18** with TypeScript
- **Tailwind CSS** + **Radix UI** for styling
- **WebSocket Client** for real-time communication
- **Three-pane Layout**: Sidebar (streams) + Chat + Content viewer

### Backend (Node.js/Express)

- **Express.js** server with WebSocket support
- **SQLite** database for data persistence
- **OpenAI API** integration for AI conversations
- **Node-cron** for automated task scheduling
- **Nodemailer** for email delivery
- **JWT** authentication with bcrypt

### Key Services

- **DatabaseService**: SQLite operations and schema management
- **AIService**: OpenAI integration and conversation management
- **ChatService**: Real-time WebSocket chat handling
- **ResearchService**: Automated content research and analysis
- **SchedulerService**: Cron-based task scheduling
- **AuthService**: User authentication and authorization
- **EmailService**: Newsletter generation and delivery

## Prerequisites

- **Node.js** 18+ and npm
- **OpenAI API Key** (for AI conversations)
- **Email SMTP credentials** (for newsletter delivery)

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd My-Up-To-Date-Agent
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Copy the template and configure
   cp server/env.template server/.env
   ```

4. **Configure server environment** (`server/.env`)

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database
   DATABASE_PATH=./data/database.sqlite

   # JWT Configuration
   JWT_SECRET=your-secure-jwt-secret-key-here
   JWT_EXPIRES_IN=7d

   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key-here

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password-here
   EMAIL_FROM=your-email@gmail.com
   EMAIL_FROM_NAME=Your Updates Agent

   # CORS Origins
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

5. **Initialize the database**

   ```bash
   npm run db:migrate
   ```

6. **Start the development servers**
   ```bash
   # Starts both frontend (Next.js) and backend (Express) concurrently
   npm run dev
   ```

The application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Usage

### Getting Started

1. **Create an Account**: Register with your email and password
2. **Create Research Stream**: Click "New Research Stream" to set up a topic
3. **Configure Schedule**: Set your preferred update frequency and timing
4. **Start Chatting**: Interact with the AI to refine your research parameters

### Chat Commands

- **"change schedule"** - Modify your update frequency
- **"research now"** - Trigger immediate research update
- **"Can you elaborate on [topic]?"** - Ask for more details on any section

### Stream Management

- **Active Streams**: Shows streams with new updates available
- **Priority Filtering**: Filter by high-priority streams
- **Search**: Find specific streams by topic

### Newsletter Features

- **Automated Generation**: AI creates comprehensive research summaries
- **Email Delivery**: Newsletters sent directly to your inbox
- **Interactive Content**: Click newsletter cards to view full content
- **Follow-up Questions**: Ask the AI to elaborate on specific sections

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Streams

- `GET /api/streams` - Get user's research streams
- `POST /api/streams` - Create new research stream
- `PUT /api/streams/:id` - Update research stream
- `DELETE /api/streams/:id` - Delete research stream

### Chat

- `GET /api/chat/:streamId` - Get chat messages for stream
- WebSocket events for real-time messaging

### Newsletters

- `GET /api/newsletters/:streamId` - Get newsletters for stream

## WebSocket Events

### Client → Server

- `authenticate` - Authenticate WebSocket connection
- `send-message` - Send chat message
- `create-stream` - Create new research stream
- `update-schedule` - Update stream schedule
- `trigger-research` - Manually trigger research

### Server → Client

- `message` - New chat message received
- `streams-updated` - Stream list updated
- `stream-created` - New stream created
- `stream-updated` - Stream data updated
- `research-triggered` - Research process started

## Database Schema

### Core Tables

- **users** - User accounts and profiles
- **streams** - Research streams and configurations
- **messages** - Chat message history
- **newsletters** - Generated newsletter content
- **research_sessions** - Research activity tracking
- **scheduled_tasks** - Automated task management

## Development

### Project Structure

```
├── app/                    # Next.js app directory
├── components/             # React components
│   ├── auth/              # Authentication components
│   ├── chat/              # Chat interface components
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── server/                # Backend Express server
│   ├── services/          # Core business logic
│   ├── routes/            # API route handlers
│   └── utils/             # Server utilities
└── types/                 # TypeScript type definitions
```

### Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run server:dev` - Start backend only
- `npm run db:migrate` - Initialize database

## Deployment

1. **Environment Setup**: Configure production environment variables
2. **Build Application**: `npm run build`
3. **Database Migration**: `npm run db:migrate`
4. **Start Production**: `npm run start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please open an issue on the GitHub repository.

---

**Your Updates Agent** - Stay informed, automatically.
