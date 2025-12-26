# PM Internship Allocation Portal

A centralized platform developed for the **PM Internship Scheme**, designed to facilitate fair, transparent, and efficient internship allocations using an advanced stable matching algorithm enhanced with machine learning.

## 🚀 Features

### 🔐 Authentication & Security
- **Role-Based Access**: Specialized portals for **Students**, **Companies**, and **Admins**
- **Dual Auth System**: 
  - Session-based (Passport.js) for web frontend
  - JWT tokens (access + refresh) for API/mobile clients
- **Brute Force Protection**: IP-based rate limiting with 5-minute lockout after 5 failed attempts
- **Google reCAPTCHA v2**: Bot protection on login forms
- **Content Safety**: Profanity filter for usernames and emails with objection workflow
- **Password Security**: scrypt-based hashing with unique salts + timing-safe comparison

### 🎓 Student Portal
- **Profile Management**: GPA, skills, reservation category, rural/urban, gender
- **e-KYC Verification**: Aadhaar QR code scanning with Twilio SMS OTP verification
- **Preference Selection**: Select up to 6 ranked internship preferences
- **Smart Search**: Search and filter internships by sector, location, tier
- **Allocation Tracking**: Real-time view of allocation status and offers
- **Career Hub**: Learning paths, resume tips, and placement insights
- **Multilingual Chatbot**: AI assistant supporting English, Hinglish, Hindi, and Gujarati

### 🏢 Company Portal
- **Company Registration**: Onboarding flow with company profile setup
- **Dashboard**: Real-time KPIs (offers sent, acceptances, acceptance rate)
- **Candidate View**: View ML-matched allocated candidates
- **Analytics**: Skill distribution charts and time-series offer tracking
- **Role Management**: Create and edit internship listings

### 🏛️ Admin Portal
- **Dashboard**: Real-time statistics on applicants, internships, and allocations
- **Allocation Control**: 
  - Upload CSV datasets or sync directly from database
  - Trigger ML allocation engine
  - View allocation progress in real-time
- **Fairness Metrics**: Detailed breakdown by gender, category (SC/ST/OBC/EWS), rural/urban
- **Round Logs**: Step-by-step allocation logs from ML engine
- **Per-Student Table**: Individual allocation results with preference rank achieved
- **Model Explanation Panel**: 5-step ML process documentation
- **Audit Panel**: Session tracking, user events, allocation run history
- **Verification Requests**: Review and approve/reject profanity objections
- **Reports & Exports**: Download CSVs from ML backend or database

### 🤖 Allocation Engine (ML Backend)
- **Algorithm**: Modified Gale-Shapley (Deferred Acceptance) for stable matching
- **ML Enhancements**: Scoring based on academic history, skill alignment, geographic preferences
- **Fairness Constraints**: Strict enforcement of reservation policies at every step
- **Railway Deployment**: External Python ML service at `internship-ml-backend-production.up.railway.app`

## 🛠️ Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | Node.js, Express.js, Passport.js |
| **Database** | PostgreSQL (Neon Serverless), Drizzle ORM |
| **Caching** | Redis (optional, with graceful fallback) |
| **ML Service** | External Python API (Railway) |
| **OTP/SMS** | Twilio |
| **Email** | Nodemailer (Gmail SMTP) |
| **AI Chatbot** | GROQ API (Llama) |

## 📂 Project Structure

```
frontend_final/
├── client/                 # React Frontend
│   └── src/
│       ├── components/     # 94 UI components
│       │   ├── ChatbotWidget.tsx      # Multilingual AI chatbot
│       │   ├── EKycSection.tsx        # Aadhaar + OTP verification
│       │   ├── AuditPanel.tsx         # Admin audit logs
│       │   ├── ModerationPanel.tsx    # Profanity objection review
│       │   └── ui/                    # shadcn/ui primitives
│       ├── pages/          # Application pages
│       │   ├── LoginPage.tsx          # Student login with reCAPTCHA
│       │   ├── RegisterPage.tsx       # Student registration
│       │   ├── StudentPortal.tsx      # Student dashboard & preferences
│       │   ├── CompanyPortal.tsx      # Company dashboard & candidates
│       │   ├── AdminPortal.tsx        # Admin control center
│       │   └── ObjectionPage.tsx      # Profanity objection form
│       ├── lib/            # Utilities
│       │   ├── AuthProvider.tsx       # Auth context & API calls
│       │   └── profanityFilter.ts     # Client-side content filter
│       └── hooks/          # Custom hooks
│           └── useRecaptcha.ts        # reCAPTCHA integration
│
├── server/                 # Express.js Backend
│   ├── routes.ts           # API routes (~1340 lines)
│   ├── auth.ts             # Passport + brute force protection
│   ├── jwt.ts              # JWT token utilities
│   ├── jwtRoutes.ts        # JWT auth endpoints
│   ├── storage.ts          # Drizzle ORM database layer
│   ├── profanityFilter.ts  # Server-side content filter
│   ├── emailService.ts     # Nodemailer + objection workflow
│   ├── chatContext.ts      # Portal-specific chatbot prompts
│   ├── cache.ts            # Redis caching layer
│   ├── db-router.ts        # Database sharding router
│   └── db-replicas.ts      # Read replica configuration
│
├── shared/                 # Shared TypeScript types
│   └── schema.ts           # Drizzle schema (single source of truth)
│
├── dbms/                   # Database management
│   ├── data/               # CSV data files
│   └── *.sql, *.ts         # Migration & utility scripts
│
└── docs/                   # Documentation
```

## ⚡ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=5000

# REQUIRED: Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# REQUIRED: Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/database

# ML Backend
ML_BASE_URL=https://internship-ml-backend-production.up.railway.app

# Google reCAPTCHA v2
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

# Optional: Twilio OTP
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM=+1234567890

# Optional: Email Service (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional: Redis Caching
REDIS_URL=redis://localhost:6379

# Optional: AI Chatbot
GROQ_API_KEY=your-groq-api-key
```

### 3. Run Development Server
```bash
npm run dev
```
Server runs on `http://localhost:5000`

### 4. Database Setup
```bash
npm run db:push                    # Push Drizzle schema
npx tsx script/seed.ts             # Seed initial data
```

## 🗄️ Database Architecture

### Sharding Strategy
Internships are partitioned across 3 tier-based schemas:

| Schema | States | Description |
|--------|--------|-------------|
| `tier1_db` | MH, KA | Metro Hubs |
| `tier2_db` | GJ, TG | Growing Cities |
| `tier3_db` | UP, RJ | Emerging Regions |

### Key Tables
- `users` - Authentication accounts
- `candidates` - Student profiles with preferences (pref_1 to pref_6)
- `internships` - Company internship listings
- `companies` - Company profiles
- `allocations` - ML allocation results
- `audit_sessions` - Login/logout tracking
- `audit_user_events` - User creation/deletion logs
- `audit_allocation_runs` - Allocation execution history

### Foreign Key Cascades
All references configured with `ON DELETE CASCADE` for data integrity.

## 🛡️ Security Features

| Feature | Implementation |
|---------|----------------|
| Brute Force | 5 attempts → 5 min IP lockout |
| Password Hashing | scrypt + random salts |
| Session Security | HTTP-only cookies, 24hr expiry |
| JWT Tokens | Access (15min) + Refresh (7d) |
| Bot Protection | Google reCAPTCHA v2 |
| Content Filter | Profanity check on registration |
| Input Validation | Zod schemas for all API inputs |

## 📊 API Endpoints

### Authentication
- `POST /api/register` - Student registration
- `POST /api/login` - Session-based login
- `POST /api/logout` - End session
- `POST /api/auth/login` - JWT login
- `POST /api/auth/refresh` - Refresh JWT

### Students
- `GET /api/student/:studentId` - Get student profile
- `POST /api/student/:studentId/preferences` - Submit preferences
- `GET /api/internships` - List all internships

### Companies
- `GET /api/company/profile` - Get company profile
- `POST /api/company/register` - Register company
- `GET /api/company/allocations` - View allocated candidates

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `POST /api/admin/run-allocation` - Trigger ML allocation
- `GET /api/admin/audit/*` - Audit logs

### ML Integration
- Proxies requests to Railway-hosted ML backend
- Endpoints for candidate/internship CSV sync
- Allocation results download

## 📄 License
MIT
