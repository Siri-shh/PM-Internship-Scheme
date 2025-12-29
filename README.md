# 🚀 SIH_BSoD — PM Internship Allocation Portal

> **Smart India Hackathon (SIH) Project**
> A centralized, secure, and ML-driven platform for **fair, transparent, and auditable internship allocation** under the **Prime Minister Internship Scheme**.
<p align="center">
  <img width="327" height="345" alt="image" src="https://github.com/user-attachments/assets/0ac163ba-aee4-4c4d-8f6a-f622223912f5" />
</p>

---

## 📌 Table of Contents

1. Introduction & Vision
2. Problem Statement
3. Solution Overview
4. Core Features
5. System Architecture
6. Allocation Engine (ML Backend)
7. Technology Stack
8. Project Structure
9. Getting Started
10. Environment Configuration
11. Database Architecture
12. API Overview (Exhaustive)
13. Security, Authentication & Authorization
14. Licensing & Legal Compliance
15. Screenshots & Demo Guide
16. Contributors

---

## 1️⃣ Introduction & Vision

The **PM Internship Allocation Portal (SIH_BSoD)** is a full-stack platform built to manage the **end-to-end lifecycle of internship allocation** at a national scale. The system prioritizes **fairness, transparency, security, scalability, and auditability**, making it suitable for real-world government deployment.

---

## 2️⃣ Problem Statement

Large-scale internship allocation programs face challenges such as:

* Manual or opaque allocation mechanisms
* Inconsistent enforcement of reservation policies
* Lack of explainability and audit trails
* Weak identity verification
* Poor scalability under heavy load

SIH_BSoD addresses these issues using **algorithmic matching**, **machine learning**, and **robust system architecture**.

---

## 3️⃣ Solution Overview

The solution is built as a **distributed, service-oriented system** consisting of:

* A modern **React-based frontend** for all stakeholders
* A secure **Node.js + Express backend** for business logic
* A **PostgreSQL database** with schema-level sharding
* An **external ML allocation engine** (Python) deployed independently
* Secure integrations with third-party services (Twilio, reCAPTCHA, Email, AI)

---

## 4️⃣ Core Features

### 🔐 Authentication & Security

* Role-Based Access Control (Student, Company, Admin)
* Dual authentication system (Passport.js sessions + JWT tokens)
* IP-based brute-force protection (5 attempts → 5-minute lockout)
* Google reCAPTCHA v2
* scrypt-based password hashing with unique salts
* Profanity filtering with admin objection workflow

### 🎓 Student Portal

* Profile management (GPA, skills, gender, category, rural/urban)
* Aadhaar-based e-KYC using QR scanning + Twilio OTP
* Selection of up to 6 ranked internship preferences
* Smart search and filtering
* Real-time allocation tracking
* Career hub and insights
* Multilingual AI chatbot (English, Hindi, Hinglish, Gujarati)

### 🏢 Company Portal

* Company onboarding and profile setup
* Internship creation and role management
* KPI dashboard (offers sent, acceptances, acceptance rate)
* View ML-matched candidates
* Skill distribution analytics

### 🏛️ Admin Portal

* System-wide dashboards
* CSV upload or DB sync
* Trigger and monitor allocation runs
* Fairness metrics (gender, category, rural/urban)
* Allocation round logs and per-student breakdown
* Audit logs (sessions, user events, allocation history)
* Profanity objection review
* CSV exports

---

## 5️⃣ System Architecture

The system architecture defines **how each component interacts**, where **security boundaries exist**, and how **scalability and fault isolation** are achieved.

```
┌──────────────────────────┐
│        Users             │
│  Students | Companies |  │
│        Admins            │
└─────────────┬────────────┘
              │ HTTPS
              ▼
┌──────────────────────────┐
│   Frontend (React 18)    │
│  - Role-based UI         │
│  - reCAPTCHA             │
│  - Chatbot Widget        │
└─────────────┬────────────┘
              │ REST APIs
              ▼
┌──────────────────────────────────┐
│ Backend (Node.js + Express)      │
│                                  │
│ - Passport.js (Sessions)         │
│ - JWT Auth (Access + Refresh)    │
│ - RBAC Middleware                │
│ - Audit Logging                  │
│ - Profanity Moderation           │
│                                  │
│  ┌──────────────┐  ┌──────────┐  │
│  │ PostgreSQL   │  │ Redis    │  │
│  │ (Neon)       │  │          │  |
│  └──────────────┘  └──────────┘  │
│                                  │
└─────────────┬────────────────────┘
              │ Secure HTTP
              ▼
┌──────────────────────────────────┐
│ ML Allocation Engine (Python)    │
│                                  │
│ - Gale–Shapley Stable Matching   │
│ - ML Scoring                     │
│ - Reservation Enforcement        │
│ - Fairness Metrics               │
│                                  │
│ Hosted on Railway                │
└──────────────────────────────────┘
```

This architecture ensures:

* Strong isolation between frontend, backend, database, and ML
* Independent scaling of ML services
* Centralized security and authorization
* Full auditability for government compliance

---

## 6️⃣ Allocation Engine (ML Backend)

* Algorithm: Modified **Gale–Shapley (Deferred Acceptance)**
* ML-based scoring using academic history, skills, and geographic preferences
* Reservation enforcement at every allocation step
* Fairness metrics generation
* Deployed as an independent Python service on Railway

---

## 7️⃣ Technology Stack

| Layer      | Technologies                                                       |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend    | Node.js, Express.js, Passport.js                                   |
| Database   | PostgreSQL (Neon Serverless), Drizzle ORM                          |
| Caching    | Redis (optional)                                                   |
| ML Service | Python (Railway)                                                   |
| OTP/SMS    | Twilio                                                             |
| Email      | Nodemailer (Gmail SMTP)                                            |
| AI Chatbot | GROQ API (LLaMA)                                                   |

---

## 8️⃣ Project Structure

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

---

## 9️⃣ Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

### Database Setup

```bash
npm run db:push
npx tsx script/seed.ts
```

---

## 🔟 Environment Configuration

> ⚠️ Never commit `.env` files to version control.

```env
PORT=5000
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
DATABASE_URL=postgresql://user:password@host:5432/database
ML_BASE_URL=https://internship-ml-backend-production.up.railway.app
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM=+1234567890
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=your-groq-api-key
```

---

## 1️⃣1️⃣ Database Architecture

* PostgreSQL with schema-level sharding
* Tier-based state partitioning
* Foreign keys enforced with `ON DELETE CASCADE`

---

## 1️⃣2️⃣ API Overview (Exhaustive)

All application-level APIs are grouped below. Internal middleware utilities are excluded.

### Authentication

* POST `/api/register`
* POST `/api/login`
* POST `/api/logout`
* POST `/api/auth/login`
* POST `/api/auth/refresh`

### Students

* GET `/api/student/:studentId`
* POST `/api/student/:studentId/preferences`
* GET `/api/internships`

### Companies

* GET `/api/company/profile`
* POST `/api/company/register`
* GET `/api/company/allocations`

### Admin

* GET `/api/admin/stats`
* POST `/api/admin/run-allocation`
* GET `/api/admin/audit/*`

### ML Integration

* POST `/api/ml/sync/candidates`
* POST `/api/ml/sync/internships`
* POST `/api/ml/run`
* GET `/api/ml/status/:runId`
* GET `/api/ml/results/:runId`
* GET `/api/ml/fairness/:runId`

---

## 1️⃣3️⃣ Security, Authentication & Authorization

* Role-based access control at route level
* Admin-only privileged endpoints
* Session-based auth + JWT hybrid model
* Full audit logging
* No Aadhaar number storage

---

## 1️⃣4️⃣ Licensing & Legal Compliance

This project is licensed under the **MIT License**.

---

## 1️⃣5️⃣ Screenshots & Demo Guide(Yet to be added)



1. Landing page
2. Student portal
3. Company dashboard
4. Admin dashboard
5. Allocation results & fairness metrics

---

## 1️⃣6️⃣ Contributors

* **Sirish Saraf (Team Lead)** — Backend Development, Database Management
  GitHub: [https://github.com/Siri-shh](https://github.com/Siri-shh)

* **Atulya Ishan** — Backend Development, Aadhaar Integration
  GitHub: [https://github.com/Binaryblaze64](https://github.com/Binaryblaze64)

* **Kushal Raj** — Machine Learning Model Development
  GitHub: [https://github.com/rkushell](https://github.com/rkushell)

* **Aditya Jain** — Machine Learning Model Development
  GitHub: [https://github.com/Aditya-Jain-01](https://github.com/Aditya-Jain-01)

* **Srinidhi Aravind** — Frontend Development, Database Management
  GitHub: [https://github.com/purple-glass-dev](https://github.com/purple-glass-dev)

* **Trusha Mukhopadhyay** — Frontend Development 
  GitHub: [https://github.com/tfortrusha](https://github.com/tfortrusha)
