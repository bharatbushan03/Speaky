# SpeakReady AI - Setup Verification Guide

This document provides step-by-step verification instructions to ensure the application is properly set up and running.

## ✅ Pre-Installation Checklist

Before running the application, ensure you have:

- [ ] Node.js 18.x or higher installed
- [ ] Python 3.9 or higher installed
- [ ] npm or yarn package manager
- [ ] A Supabase account and project created
- [ ] (Optional) OpenAI API key for AI features

## 📦 Installation Steps

### 1. Frontend Installation

```bash
# Install dependencies
npm install

# This will install:
# - Next.js 14.2.3
# - React 18.3.1
# - TypeScript 5.4.5
# - Tailwind CSS 3.4.3
# - shadcn/ui components
# - Axios for API calls
# - Supabase client
```

**Expected outcome**: A `node_modules` folder should be created with all dependencies installed.

### 2. Backend Installation

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# This will install:
# - FastAPI 0.109.2
# - Uvicorn 0.27.1
# - Pydantic 2.6.1
# - Supabase client 2.4.0
# - python-jose for JWT
# - passlib for password hashing
```

**Expected outcome**: All Python packages should be installed without errors.

## 🔧 Configuration Steps

### 1. Frontend Configuration

Copy and configure the environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Backend Configuration

Copy and configure the environment file:

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://...

# Optional (for AI features)
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

# Required for security
SECRET_KEY=generate_a_32_character_secret_key
```

Generate a secure secret key:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Database Configuration

1. Log in to your Supabase dashboard
2. Go to SQL Editor
3. Copy the entire contents of `backend/app/db/schema.sql`
4. Paste and execute in the SQL Editor
5. Verify tables were created: users, practice_sessions, user_progress, feedback_items

## 🚀 Running the Application

### Terminal 1: Backend Server

```bash
cd backend
# Ensure virtual environment is activated
python -m uvicorn main:app --reload
```

**Expected output**:
```
🚀 Starting SpeakReady AI Backend...
✅ Database initialized
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Verify backend is running**:
- Open http://localhost:8000
- You should see: `{"message":"Welcome to SpeakReady AI API","version":"0.1.0","status":"healthy"}`
- Open http://localhost:8000/docs for interactive API documentation

### Terminal 2: Frontend Server

```bash
# From project root
npm run dev
```

**Expected output**:
```
  ▲ Next.js 14.2.3
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.5s
```

**Verify frontend is running**:
- Open http://localhost:3000
- You should see the SpeakReady AI landing page
- Check that all UI components render correctly

## ✅ Verification Checklist

### Backend Verification

- [ ] Backend starts without errors
- [ ] GET http://localhost:8000 returns welcome message
- [ ] GET http://localhost:8000/api/v1/health/ returns `{"status":"healthy"}`
- [ ] API docs are accessible at http://localhost:8000/docs
- [ ] Database connection successful (check terminal output)

### Frontend Verification

- [ ] Frontend starts without errors
- [ ] Landing page loads at http://localhost:3000
- [ ] Navigation links work (Dashboard, Practice)
- [ ] UI components render correctly (buttons, cards, etc.)
- [ ] No console errors in browser developer tools

### Database Verification

- [ ] All tables created: users, practice_sessions, user_progress, feedback_items
- [ ] Triggers are in place (check Supabase Database > Triggers)
- [ ] RLS policies are enabled (check Supabase Authentication > Policies)
- [ ] Indexes are created (check Supabase Database > Indexes)

## 🧪 Testing API Endpoints

Use the Swagger UI at http://localhost:8000/docs or test with curl:

### Health Check
```bash
curl http://localhost:8000/api/v1/health/
```

Expected: `{"status":"healthy","service":"speakready-ai-api","version":"0.1.0"}`

### Create User (Example)
```bash
curl -X POST "http://localhost:8000/api/v1/users/" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secure123","full_name":"Test User"}'
```

Expected: User object with ID, email, and timestamps

## 🐛 Common Issues and Solutions

### Issue: Backend fails to start

**Symptoms**: Import errors, module not found errors

**Solution**:
```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Issue: Database connection failed

**Symptoms**: "⚠️ Database connection warning" in terminal

**Solution**:
- Verify SUPABASE_URL and SUPABASE_KEY in `backend/.env`
- Ensure you're using the **service role key**, not anon key
- Check that your Supabase project is active
- Verify database schema was applied

### Issue: Frontend shows API errors

**Symptoms**: "Network error" or "Connection refused" in browser console

**Solution**:
- Verify backend is running on http://localhost:8000
- Check NEXT_PUBLIC_API_URL in `.env.local`
- Ensure CORS is configured (already done in backend/main.py)

### Issue: TypeScript errors

**Symptoms**: Build fails with type errors

**Solution**:
```bash
npm run type-check
# Fix any type errors shown
```

### Issue: Missing dependencies

**Symptoms**: "Cannot find module" errors

**Solution**:
```bash
# Frontend
rm -rf node_modules .next
npm install

# Backend
pip install -r requirements.txt
```

## 📊 Feature Status

### ✅ Implemented (Foundation)

- [x] Next.js 14 frontend with TypeScript
- [x] FastAPI backend with Python
- [x] Supabase PostgreSQL database
- [x] Database schema with RLS and triggers
- [x] API endpoints (users, sessions, feedback, health)
- [x] UI components library (shadcn/ui)
- [x] API client with error handling
- [x] Environment configuration
- [x] Responsive landing page
- [x] Dashboard page skeleton
- [x] Practice page skeleton

### 🚧 Ready for Implementation (Next Steps)

- [ ] User authentication (JWT integration)
- [ ] Real-time voice recording
- [ ] AI answer evaluation/feedback integration (not part of question generation)
- [ ] Speech-to-text transcription
- [ ] Progress tracking with charts
- [ ] Session history with details
- [ ] User profile management
- [ ] Multilingual UI

### 🔮 Planned Features

- [ ] Mobile app (React Native)
- [ ] Social features (share progress)
- [ ] Advanced analytics
- [ ] Subscription plans
- [ ] Email notifications
- [ ] Practice reminders

## 📝 Notes

### AI Provider Configuration

Question generation now supports these backend-only provider modes:

- **Mock** (offline default): deterministic adapter for local development/tests
- **OpenAI**: Requires `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL`
- **Giani AI**: fail-closed; its public generation endpoint and contract are not verified
- **Others**: Add a provider adapter implementing `QuestionGenerator`

Generated questions are validated with Pydantic, persisted one at a time, and
their private evaluation criteria are not returned to the practice room. Answer
evaluation is intentionally not implemented in this feature.

### Security Considerations

- Never commit `.env` or `.env.local` files
- Use service role key only on backend
- Frontend uses anon key (has RLS restrictions)
- Passwords are hashed with bcrypt
- JWT tokens expire after 7 days (configurable)

### Development Workflow

1. Make changes to code
2. Backend: Changes auto-reload with uvicorn --reload
3. Frontend: Changes auto-reload with Next.js
4. Test changes in browser and API docs
5. Check for TypeScript errors: `npm run type-check`
6. Check for linting errors: `npm run lint`

## 🎉 Success Criteria

Your setup is complete when:

1. ✅ Backend runs without errors and shows database connection success
2. ✅ Frontend loads and displays the landing page
3. ✅ API documentation is accessible at /docs
4. ✅ Database tables are created in Supabase
5. ✅ You can navigate between pages (Home, Dashboard, Practice)
6. ✅ No console errors in browser developer tools

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. Check the main README.md for detailed documentation
2. Check backend/app/db/README.md for database-specific issues
3. Review the error logs carefully
4. Ensure all environment variables are set correctly
5. Verify all prerequisites are installed

## 🔗 Useful Links

- API Docs: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Supabase Dashboard: https://app.supabase.com
- Next.js Docs: https://nextjs.org/docs
- FastAPI Docs: https://fastapi.tiangolo.com

---

**Last Updated**: October 19, 2024
**Version**: 0.1.0
