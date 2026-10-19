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
- **Authentication**: JWT tokens with bcrypt
- **AI Integration**: Configurable (OpenAI, Giani AI, etc.)
- **Speech-to-Text**: Configurable (OpenAI Whisper, Google, Azure)

### Database
- **Provider**: Supabase PostgreSQL
- **Features**: Row Level Security (RLS), triggers, indexes
- **Tables**: users, practice_sessions, user_progress, feedback_items

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 18.x or higher
- **Python**: 3.9 or higher
- **npm** or **yarn**: Latest version
- **Supabase Account**: [Sign up here](https://supabase.com)
- **AI Provider Account**: OpenAI or Giani AI (optional for testing)

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
SUPABASE_KEY=your_supabase_service_role_key
DATABASE_URL=your_postgres_connection_string

# AI Provider (choose one)
AI_PROVIDER=openai  # or giani
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Security
SECRET_KEY=generate_a_secure_random_key_min_32_chars
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

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `backend/app/db/schema.sql`
4. Paste and execute in the SQL Editor

Detailed instructions: See `backend/app/db/README.md`

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

#### OpenAI (Default)

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
```

#### Giani AI (Future Integration)

Once Giani AI API details are verified:

```env
AI_PROVIDER=giani
GIANI_API_KEY=your_giani_api_key
GIANI_API_URL=https://api.giani.ai/v1
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
# Run tests (when implemented)
pytest

# Check code formatting
black --check .
```

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
POST /api/v1/sessions/                    # Create session
GET /api/v1/sessions/{session_id}         # Get session
GET /api/v1/sessions/user/{user_id}       # Get user sessions
GET /api/v1/sessions/user/{user_id}/progress  # Get progress
```

#### AI Feedback
```
POST /api/v1/feedback/analyze      # Analyze text
POST /api/v1/feedback/transcribe   # Transcribe audio
```

## 🔐 Security

- **API Keys**: Never commit API keys to version control
- **Environment Files**: `.env` files are git-ignored
- **Password Hashing**: bcrypt with salt
- **JWT Tokens**: HS256 algorithm
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
- Ensure service role key (not anon key) is used

**AI provider errors:**
- Verify API key is correct
- Check if you have API credits
- Review provider-specific error messages

### Database Issues

**Tables not created:**
- Run the schema.sql file in Supabase SQL Editor
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
