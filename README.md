# SpeakReady AI 🎯

India's first AI-powered English communication coach focused on interview and viva preparation.

## 📋 Overview

SpeakReady AI helps users improve their English communication skills through:
- **AI-Powered Feedback**: Instant analysis of grammar, fluency, vocabulary, and content
- **Voice Practice**: Speech-to-text transcription for realistic practice
- **Progress Tracking**: Monitor improvement with detailed analytics
- **Multilingual Support**: Support for Indian languages (Hindi, Tamil, Telugu, etc.)
- **Interview & Viva Prep**: Specialized coaching for job interviews and academic vivas

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: React hooks
- **API Client**: Axios with interceptors

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth bearer tokens
- **Session authorization**: user-scoped PostgREST requests plus PostgreSQL RLS
- **AI Integration**: backend-only, one-question-at-a-time generation with validated provider adapters; answer evaluation is not implemented
- **Speech-to-Text**: browser transcription remains separate from persisted voice transcripts

### Database
- **Provider**: Supabase PostgreSQL
- **Features**: Row Level Security (RLS), triggers, indexes
- **Legacy tables**: users, practice_sessions, user_progress, feedback_items
- **Session tables**: sessions, session_questions, session_responses

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.11.1 (see `.nvmrc`)
- **Python**: 3.11.9 (see `.python-version`)
- **npm** or **yarn**: Latest version
- **Supabase Account**: [Sign up here](https://supabase.com)
- **AI Provider Account**: OpenAI (optional); local development uses the deterministic mock adapter. Giani AI is not enabled because its public generation API could not be verified.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd speakready-ai
```

### 2. Frontend Setup

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Run Development Server

```bash
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

### 3. Backend Setup

#### Create Virtual Environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Database (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key # backend-only legacy/admin operations
SUPABASE_ANON_KEY=your_supabase_anon_key     # Auth validation and user-scoped API calls
DATABASE_URL=your_postgres_connection_string

# AI Provider (choose one)
AI_PROVIDER=mock    # mock or openai
AI_REQUEST_TIMEOUT_SECONDS=20
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Security
SECRET_KEY=generate_a_secure_random_key_min_32_chars
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Note**: To generate a secure secret key, run:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### Run Development Server

```bash
python -m uvicorn main:app --reload
```

The backend API will be available at [http://localhost:8000](http://localhost:8000)

API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Database Setup

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (2-3 minutes)
3. Note your project URL and keys from Settings → API

#### Run Database Migrations

1. Configure `DATABASE_URL` outside the repository (secret manager or shell).
2. Install the PostgreSQL `psql` client in the documented environment.
3. Apply `backend/app/db/migrations/001_initial_schema.sql`, then
   `backend/app/db/migrations/002_session_management.sql`, then
   `backend/app/db/migrations/003_ai_question_generation.sql` with
   `-v ON_ERROR_STOP=1`.
4. Confirm the Auth users and RLS/RPC checks described in
   `backend/app/db/README.md`.

The migrations have been applied to the configured Supabase database using a
disposable Docker PostgreSQL client with host networking. The local workspace
does not have a native `psql` executable; the Docker alternative is documented
in `backend/app/db/README.md`. Never put a service-role key in frontend
variables or browser code.

## 📁 Project Structure

```
speakready-ai/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Landing page
│   ├── dashboard/           # User dashboard
│   └── practice/            # Practice sessions
├── components/              # React components
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utilities and libraries
│   ├── api/                 # API client modules
│   ├── api-client.ts        # Axios configuration
│   ├── error-handler.ts     # Error handling
│   ├── supabase.ts          # Supabase client
│   └── utils.ts             # Utility functions
├── hooks/                   # Custom React hooks
├── backend/                 # FastAPI backend
│   ├── main.py             # Application entry point
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── core/           # Configuration and security
│   │   ├── db/             # Database and migrations
│   │   ├── models/         # Pydantic schemas
│   │   └── services/       # Business logic
│   └── requirements.txt    # Python dependencies
├── .env.example            # Frontend env template
├── backend/.env.example    # Backend env template
└── README.md              # This file
```

## 🔧 Configuration

### AI Provider Configuration

The backend is designed to work with multiple AI providers. To use a specific provider:

#### OpenAI (optional)

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
```

When selected, the backend uses OpenAI's documented chat-completions JSON
contract at `https://api.openai.com/v1/chat/completions`; the key never leaves
the backend.

#### Giani AI (not currently available)

The public Giani.ai pages do not publish a verifiable text-generation endpoint,
authentication scheme, request shape, response shape, or model identifier.
The official public sources checked were [giani.ai](https://www.giani.ai/) and
its [support page](https://www.giani.ai/support); neither provides a developer
API contract.
SpeakReady therefore does **not** guess an endpoint or send credentials. Use
the explicit mock adapter for offline development, or OpenAI with its official
API key until Giani supplies an official developer specification:

```env
AI_PROVIDER=giani  # fails closed with a clear configuration error
GIANI_API_KEY=your_giani_api_key
GIANI_API_URL=
GIANI_MODEL=giani-model-name
```

### Speech-to-Text Configuration

```env
STT_PROVIDER=openai  # or google, azure
```

## 🧪 Testing

### Frontend

```bash
npm run lint
npm run type-check
```

### Backend

```bash
# Run offline API/session tests from backend/
python -m unittest discover -s tests -v

# Check code formatting
black --check .
```

From the repository root, `make test` runs the backend tests and frontend
type-check. The root `Dockerfile` builds the FastAPI image; run the Next.js
frontend separately with the pinned Node version in `.nvmrc`.

### Backend container

```bash
docker build -t speakready-ai-backend .
docker run --rm -p 8000:8000 --env-file backend/.env speakready-ai-backend
```

Provide `backend/.env` through a secret manager or local ignored file; never
build service-role credentials into an image or pass them as `NEXT_PUBLIC_*`
variables.

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Health Check
```
GET /api/v1/health/
GET /api/v1/health/ready
```

#### Users
```
POST /api/v1/users/          # Create user
GET /api/v1/users/{user_id}  # Get user
```

#### Practice Sessions
```
POST /api/v1/sessions/                     # Create owned session
GET /api/v1/sessions/                      # List the authenticated user's sessions
GET /api/v1/sessions/{session_id}           # Get owned session and details
PATCH /api/v1/sessions/{session_id}         # Update state/navigation while allowed
POST /api/v1/sessions/{session_id}/questions/generate # Generate and save the next question
POST /api/v1/sessions/{session_id}/start # Start after the first question is ready
PUT /api/v1/sessions/{session_id}/questions # Legacy/static question-set endpoint
POST /api/v1/sessions/{session_id}/responses # Save text/voice transcript answer
POST /api/v1/sessions/{session_id}/complete # Complete after every answer is saved
```

Session routes require a Supabase Auth `Authorization: Bearer <access-token>`
header. The server derives ownership from the token; there is no `user_id`
query parameter for these routes. Session mutations are checked again by the
`manage_practice_session` PostgreSQL function, and RLS protects direct reads.
Question generation uses the stored session configuration and previous answers,
one question per request. Generated questions are persisted with their sequence
under an atomic session lock; private evaluation criteria are stored separately
and are not returned in the practice-room response. Answer evaluation is not
implemented.

#### AI Feedback
```
POST /api/v1/feedback/analyze      # Analyze text
POST /api/v1/feedback/transcribe   # Transcribe audio
```

## 🔐 Security

- **API Keys**: Never commit API keys to version control
- **Environment Files**: `.env` files are git-ignored
- **Password Hashing**: bcrypt with salt
- **Auth tokens**: Supabase Auth bearer tokens are validated server-side
- **Service-role credentials**: backend-only; never expose them to the browser
- **RLS Policies**: Row Level Security in Supabase
- **CORS**: Configured for frontend origins only

## 🚢 Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Add environment variables in Vercel dashboard.

### Backend (Railway, Render, or AWS)

1. Set up environment variables
2. Configure build command: `pip install -r requirements.txt`
3. Configure start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Database (Supabase)

Already hosted! Just ensure your production environment variables point to your Supabase project.

## 🛠️ Development Workflow

1. **Feature Development**: Create a feature branch
2. **Code Changes**: Make changes in frontend and/or backend
3. **Testing**: Test locally with dev servers
4. **Commit**: Use clear commit messages
5. **Pull Request**: Create PR for review

## 🐛 Troubleshooting

### Frontend Issues

**Port already in use:**
```bash
# Change port
PORT=3001 npm run dev
```

**Module not found:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
```

### Backend Issues

**Database connection failed:**
- Check Supabase credentials in `.env`
- Verify Supabase project is active
- Ensure `SUPABASE_ANON_KEY` is configured for Auth and user-scoped session requests
- Keep `SUPABASE_KEY` service-role credentials backend-only

**AI provider errors:**
- Verify API key is correct
- Check if you have API credits
- Review provider-specific error messages

### Database Issues

**Tables not created:**
- Apply numbered migrations `001_initial_schema.sql` then `002_session_management.sql`
- Check for SQL errors in the editor
- Verify migrations were applied in order

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary and confidential.

## 👥 Team

Built with ❤️ for India's English learners.

## 🔄 Roadmap

- [ ] User authentication and authorization
- [ ] Real-time voice recording and analysis
- [ ] Multilingual UI support
- [ ] Mobile app (React Native)
- [ ] Giani AI integration
- [ ] Advanced analytics dashboard
- [ ] Social features (share progress)
- [ ] Subscription plans

## 📞 Support

For support, email support@speakready.ai or open an issue in the repository.

---

**Version**: 0.1.0  
**Last Updated**: October 19, 2024
