# SIH_BSoD — PM Internship Allocation Portal

Smart India Hackathon (SIH) Project
A centralized, secure, and ML-driven platform for fair, transparent, and auditable internship allocation under the Prime Minister Internship Scheme.
<p align="center">
  <img width="327" height="345" alt="image" src="https://github.com/user-attachments/assets/0ac163ba-aee4-4c4d-8f6a-f622223912f5" />
</p>

---

## Contributors

* **[Sirish Saraf (Team Lead)](https://github.com/Siri-shh)** — Backend Development, Database Management
* **[Atulya Ishan](https://github.com/Binaryblaze64)** — Backend Development, Aadhaar Integration
* **[Kushal Raj](https://github.com/rkushell)** — Machine Learning Model Development
* **[Aditya Jain](https://github.com/Aditya-Jain-01)** — Machine Learning Model Development
* **[Srinidhi Aravind](https://github.com/purple-glass-dev)** — Frontend Development, Database Management
* **[Trusha Mukhopadhyay](https://github.com/tfortrusha)** — Frontend Development (UI/UX)

---

## Table of Contents

1. Introduction and Vision
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
13. Security, Authentication and Authorization
14. Licensing and Legal Compliance
15. Screenshots and Demo Guide

---




## 1️ Introduction & Vision

The **PM Internship Allocation Portal (SIH_BSoD)** is a full-stack platform built to manage the **end-to-end lifecycle of internship allocation** at a national scale. The system prioritizes **fairness, transparency, security, scalability, and auditability**, making it suitable for real-world government deployment.

---

## 2️ Problem Statement

Large-scale internship allocation programs face challenges such as:

* Manual or opaque allocation mechanisms
* Inconsistent enforcement of reservation policies
* Lack of explainability and audit trails
* Weak identity verification
* Poor scalability under heavy load

SIH_BSoD addresses these issues using **algorithmic matching**, **machine learning**, and **robust system architecture**.

---

## 3️ Solution Overview

The solution is built as a **distributed, service-oriented system** consisting of:

* A modern **React-based frontend** for all stakeholders
* A secure **Node.js + Express backend** for business logic
* A **PostgreSQL database** with schema-level sharding
* An **external ML allocation engine** (Python) deployed independently
* Secure integrations with third-party services (Twilio, reCAPTCHA, Email, AI)

---

## 4️ Core Features

###  Authentication & Security

* Role-Based Access Control (Student, Company, Admin)
* Dual authentication system (Passport.js sessions + JWT tokens)
* IP-based brute-force protection (5 attempts → 5-minute lockout)
* Google reCAPTCHA v2
* scrypt-based password hashing with unique salts
* Profanity filtering with admin objection workflow

###  Student Portal

* Profile management (GPA, skills, gender, category, rural/urban)
* Aadhaar-based e-KYC using QR scanning + Twilio OTP
* Selection of up to 6 ranked internship preferences
* Smart search and filtering
* Real-time allocation tracking
* Career hub and insights
* Multilingual AI chatbot (English, Hindi, Hinglish, Gujarati)

###  Company Portal

* Company onboarding and profile setup
* Internship creation and role management
* KPI dashboard (offers sent, acceptances, acceptance rate)
* View ML-matched candidates
* Skill distribution analytics

###  Admin Portal

* System-wide dashboards
* CSV upload or DB sync
* Trigger and monitor allocation runs
* Fairness metrics (gender, category, rural/urban)
* Allocation round logs and per-student breakdown
* Audit logs (sessions, user events, allocation history)
* Profanity objection review
* CSV exports

---

## 5️ System Architecture

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
│  │ (Neon)       │  │(Optional)│  │
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

## 6️ Allocation Engine (ML Backend)

* Algorithm: Modified **Gale–Shapley (Deferred Acceptance)**
* ML-based scoring using academic history, skills, and geographic preferences
* Reservation enforcement at every allocation step
* Fairness metrics generation
* Deployed as an independent Python service on Railway

---

## 7️ Technology Stack

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

## 8. Project Structure

The repository is organized as a multi-module system separating frontend, backend, database, and machine learning services.

```
SIH_BSoD/
│
├── .env.example                 # Sample environment variables
├── .gitignore
├── LICENSE
├── README.md
│
├── package.json                 # Root scripts & shared dependencies
├── package-lock.json
├── components.json
├── drizzle.config.ts
├── railway.toml                 # Deployment config (Railway)
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
│
├── client/                      # Frontend (React + Vite)
│   ├── index.html
│   ├── public/
│   │   ├── favicon.png
│   │   └── images/
│   │
│   └── src/
│       ├── main.tsx             # Frontend entry point
│       ├── App.tsx              # App root
│       ├── index.css
│       │
│       ├── components/          # Reusable UI components
│       ├── pages/               # Page-level routes (Student/Admin/Company)
│       ├── hooks/               # Custom React hooks
│       ├── lib/                 # API clients, helpers, auth utilities
│       └── types/               # TypeScript definitions
│
├── dbms/                        # Database layer (PostgreSQL)
│   ├── applications.sql
│   ├── candidates.sql
│   ├── companies.sql
│   ├── internships.sql
│   ├── match_results.sql
│   ├── migrations/              # Schema & partition migrations
│   └── data/                    # Seed & sample datasets
│
├── ml-service/                  # Backend + ML Service (FastAPI)
│   │
│   ├── internship-ml-backend-with-better-AUC/
│   │   ├── Dockerfile           # Backend container definition
│   │   ├── docker-compose.yml   # Local / prod service orchestration
│   │   ├── requirements.txt
│   │   ├── README.md
│   │
│   │   ├── backend/
│   │   │   └── app/
│   │   │       ├── main.py      # 🚀 MAIN BACKEND SERVER (FastAPI)
│   │   │       ├── models.py    # ML & data models
│   │   │       │
│   │   │       ├── routers/     # API endpoints
│   │   │       │   ├── admin_api.py
│   │   │       │   ├── student_api.py
│   │   │       │   ├── dashboard_api.py
│   │   │       │   └── upload_api.py
│   │   │       │
│   │   │       └── services/    # Core ML logic
│   │   │           ├── allocate_service.py
│   │   │           ├── model_service.py
│   │   │           ├── predict_service.py
│   │   │           └── train_service.py
│   │
│   │   ├── data/                # ML datasets
│   │   └── json_outputs/        # Allocation & fairness reports
│
└── docs/                        # Documentation & references
    ├── question_statement_and_approach.md
    ├── ml_model_variables.txt
    └── datasets/


---
```
## 9️ Getting Started

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

## 10 Environment Configuration



## Environment Variables

### Server Configuration
- **PORT**: 5000  
  Port on which the backend server runs.

### Authentication and Security
- **JWT_SECRET**: your-jwt-secret  
  Secret key used to sign JWT access tokens.

- **SESSION_SECRET**: your-session-secret  
  Secret used for session-based authentication (Passport.js).

### Database
- **DATABASE_URL**: postgresql://user:password@host:5432/database  
  PostgreSQL connection string (Neon Serverless).

### Machine Learning Backend
- **ML_BASE_URL**: https://internship-ml-backend-production.up.railway.app  
  Endpoint for the external ML allocation service.

### Bot Protection
- **VITE_RECAPTCHA_SITE_KEY**: your-recaptcha-site-key  
  Google reCAPTCHA v2 site key.

### SMS / OTP Service (Twilio)
- **TWILIO_ACCOUNT_SID**: your-twilio-sid  
- **TWILIO_AUTH_TOKEN**: your-twilio-token  
- **TWILIO_FROM**: +1234567890  

### Email Service
- **SMTP_HOST**: smtp.gmail.com  
- **SMTP_PORT**: 587  
- **SMTP_USER**: your-email@gmail.com  
- **SMTP_PASS**: your-app-password  

### Caching (Optional)
- **REDIS_URL**: redis://localhost:6379  

### AI Chatbot
- **GROQ_API_KEY**: your-groq-api-key  


---

## 1️1️ Database Architecture

* PostgreSQL with schema-level sharding
* Tier-based state partitioning
* Foreign keys enforced with `ON DELETE CASCADE`

---

## 1️2️ API Overview (Exhaustive)

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

## 1️3️ Security, Authentication & Authorization

* Role-based access control at route level
* Admin-only privileged endpoints
* Session-based auth + JWT hybrid model
* Full audit logging
* No Aadhaar number storage

---

## 1️4️ Licensing & Legal Compliance

This project is licensed under the **MIT License**.

---

## 1️5️ Screenshots & Demo Guide(Yet to be added)

Recommended screenshots:

1. Landing page
2. Student portal
3. Company dashboard
4. Admin dashboard
5. Allocation results & fairness metrics

---
