<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Moodle Tutorbot - AI-Powered Personalized Learning Assistant

An LTI 1.3 compatible AI tutoring application that integrates seamlessly with Moodle instances. The tutorbot provides personalized learning support by remembering student context (survey answers, quiz results, and notes) and delivering tailored assistance using Google's Gemini AI.

## Features

- **LTI 1.3 Integration**: Works with any Moodle instance as an External Tool
- **Personalized Learning**: Remembers student context and adapts responses accordingly
- **Real-time Streaming**: Chat responses stream in real-time for better UX
- **Persistent Storage**: Chat history and memories stored per user per course
- **Multi-tenant**: Isolated data for different Moodle instances and courses
- **Secure**: OAuth-based LTI authentication, no direct API key exposure

## Architecture

The application consists of:

1. **Backend** (Node.js/Express): LTI provider, API endpoints, Gemini AI integration
2. **Frontend** (React/Vite): Modern, responsive chat interface
3. **Database** (MongoDB): Persistent storage for users, memories, and chat history

## Quick Start (Development)

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Google Gemini API key

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 2. Frontend Setup

```bash
# From root directory
npm install
cp .env.example .env
# Edit .env with backend URL
npm run dev
```

The frontend runs on `http://localhost:3000` and backend on `http://localhost:3001`.

## LTI Integration Setup

For complete instructions on integrating this tool into Moodle, see [LTI_SETUP.md](./LTI_SETUP.md).

Key steps:
1. Deploy backend with MongoDB and Gemini API key
2. Register tool in Moodle as External Tool (LTI 1.3)
3. Configure platform details
4. Add tool to courses as an activity

## Project Structure

```
moodle-tutorbot/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── api/            # API route handlers
│   │   ├── lti/            # LTI provider implementation
│   │   ├── models/         # MongoDB models
│   │   ├── middleware/     # Auth, error handling
│   │   ├── database/       # Database connection
│   │   ├── utils/          # Gemini service, logger
│   │   └── server.ts       # Main server file
│   ├── package.json
│   └── tsconfig.json
├── components/              # React components
│   ├── Chatbot.tsx         # Original standalone version
│   └── ChatbotLTI.tsx      # LTI-integrated version
├── services/
│   ├── geminiService.ts    # Original direct Gemini calls
│   └── apiService.ts       # Backend API client
├── LTI_SETUP.md            # Complete LTI integration guide
└── README.md               # This file
```

## Development vs Production

### Development Mode

- Frontend and backend run separately
- Use mock authentication (no LTI required)
- localStorage for quick testing

### Production Mode

- Backend serves built frontend
- Full LTI 1.3 authentication required
- MongoDB for persistent storage
- HTTPS required

## Technology Stack

**Backend:**
- Node.js + Express + TypeScript
- ltijs (LTI 1.3 provider)
- MongoDB + Mongoose
- Google Generative AI SDK
- Winston (logging)

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS

## Configuration

### Backend Environment Variables

```env
PORT=3001
NODE_ENV=development
LTI_KEY=your-random-secret-key
LTI_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/moodle-tutorbot
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:3001
```

## API Endpoints

### LTI Endpoints
- `POST /lti/login` - OIDC login
- `POST /lti/launch` - LTI launch
- `GET /lti/keys` - JWKS public keys

### Authenticated API Endpoints
- `POST /api/chat/stream` - Stream chat response
- `GET /api/chat/history` - Get chat history
- `GET /api/memories` - Get student memories
- `PUT /api/memories/bulk` - Update memories

See [LTI_SETUP.md](./LTI_SETUP.md) for complete API reference.

## Deployment

Recommended platforms:
- **Heroku**: Easy deployment with MongoDB add-on
- **DigitalOcean/AWS/GCP**: VPS with Docker
- **Vercel + MongoDB Atlas**: Serverless option

See deployment guide in [LTI_SETUP.md](./LTI_SETUP.md).

## Security

- LTI 1.3 OAuth authentication
- Secure session management
- API key stored server-side only
- HTTPS required in production
- Data isolation per user and course

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with a real Moodle instance
5. Submit a pull request

## License

MIT

## Support

For setup help, see [LTI_SETUP.md](./LTI_SETUP.md).

For bugs or feature requests, please open an issue.

## Original AI Studio App

View the original app in AI Studio: https://ai.studio/apps/drive/1YcKkaewsvqF4CGBpF3cJjzJagi27ffY8
