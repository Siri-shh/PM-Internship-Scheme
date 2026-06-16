# SIH_BSoD — PM Internship Allocation Portal

A centralized, secure, and ML-driven platform for fair, transparent, and auditable internship allocation under the Prime Minister Internship Scheme.

## Live Deployments

- **Web Portal:** [https://sih-bsod-portal.onrender.com/](https://sih-bsod-portal.onrender.com/)
- **ML Allocation Service:** [https://pm-internship-ml.onrender.com/](https://pm-internship-ml.onrender.com/)

---

## Contributors

* **[Sirish Saraf (Team Lead)](https://github.com/Siri-shh)** — Backend Development, Database Management
* **[Atulya Ishan](https://github.com/Binaryblaze64)** — Backend Development, Aadhaar Integration
* **[Kushal Raj](https://github.com/rkushell)** — Machine Learning Model Development
* **[Aditya Jain](https://github.com/Aditya-Jain-01)** — Machine Learning Model Development, JWT-based Authentication with RBAC
* **[Srinidhi Aravind](https://github.com/purple-glass-dev)** — Frontend Development, Database Management
* **[Trusha Mukhopadhyay](https://github.com/tfortrusha)** — Frontend Development (UI/UX)

---

## Overview

Large-scale internship allocation programs often suffer from manual errors, lack of transparency, and difficulties in enforcing reservation policies. SIH_BSoD solves these issues through automated algorithmic matching (based on the Gale-Shapley stable matching model), machine learning-based student scoring, and a secure full-stack portal.

---

## Core Features

### Authentication & Security
- **Role-Based Access Control (RBAC):** Separate interfaces and permissions for Students, Companies, and Admins.
- **Hybrid Auth:** Passport.js session-based auth combined with JWT tokens.
- **Rate Limiting:** IP-based brute-force protection (5 failed attempts locks out for 5 minutes).
- **Bot Protection:** Integrated with Google reCAPTCHA v2.
- **Content Moderation:** Profanity filtering with admin review workflows.

### Student Portal
- **Profile Management:** Input academic metrics, skills, gender, reservation category, and location preferences.
- **Aadhaar e-KYC Simulation:** QR code scanner + Twilio OTP verification (no raw Aadhaar numbers are stored).
- **Preference Ranking:** Select and rank up to 6 internship preferences.
- **Real-time Tracking:** Track allocation status and check career hub insights.
- **Multilingual AI Chatbot:** Support for English, Hindi, Hinglish, and Gujarati.

### Company Portal
- **Role Management:** Post internships, manage requirements, and set student capacities.
- **Analytics Dashboard:** Monitor internship statistics, skill distributions, and applicant match metrics.
- **Candidate Discovery:** View ML-matched candidates ranked by suitability.

### Admin Portal
- **System Control:** Run and monitor allocation rounds, and view fairness metrics (gender, category, geography).
- **Moderation Queue:** Approve/reject content flagged by the profanity filter.
- **Audit Logging:** Maintain logs of logins, admin actions, and allocation runs.
- **Data Portability:** CSV upload/sync and full database exports.

---

## System Architecture

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
│ Hosted on Render                 │
└──────────────────────────────────┘
```

---

## Technology Stack

| Layer      | Technologies                                                       |
| ---------- | ------------------------------------------------------------------ |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend    | Node.js, Express.js, Passport.js                                   |
| Database   | PostgreSQL (Neon Serverless), Drizzle ORM                          |
| Caching    | Redis (optional)                                                   |
| ML Service | Python, FastAPI (Render)                                           |
| OTP/SMS    | Twilio                                                             |
| Email      | Nodemailer (Gmail SMTP)                                            |
| AI Chatbot | GROQ API (LLaMA)                                                   |

---

## Project Structure

```
SIH_BSoD/
│
├── .env.example                 # Sample environment variables
├── package.json                 # Root scripts & shared dependencies
├── components.json
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
│
├── client/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.tsx             # Frontend entry point
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Student, Admin, and Company routes
│   │   └── hooks/               # Custom React hooks
│   └── public/
│
├── dbms/                        # Database schemas & migrations
│   ├── migrations/              # Schema & partition migrations
│   └── data/                    # Seed & sample datasets
│
└── ml-service/                  # Machine Learning FastAPI backend
    └── internship-ml-backend/
        └── backend/
            └── app/
                ├── main.py      # FastAPI Server
                ├── models.py    # ML & data models
                └── services/    # Core ML logic & Gale-Shapley matching
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the required credentials (see Environment Configuration below).

### 3. Run Development Server
```bash
npm run dev
```
The client runs on `http://localhost:5173` and backend runs on `http://localhost:5000`.

### 4. Database Setup
```bash
npm run db:push
npx tsx script/seed.ts
```

---

## Environment Configuration

Create a `.env` file in the root directory and configure the following variables:

### Server Settings
- `PORT`: Server port (defaults to `5000`)

### Authentication & Security
- `JWT_SECRET`: Secret key used to sign JWT access tokens.
- `SESSION_SECRET`: Secret used for session-based authentication (Passport.js).

### Database
- `DATABASE_URL`: PostgreSQL connection string (Neon Serverless).

### ML Allocation Service
- `ML_BASE_URL`: Endpoint for the external ML allocation service (default: `https://pm-internship-ml.onrender.com`).

### Integrations
- `VITE_RECAPTCHA_SITE_KEY`: Google reCAPTCHA v2 site key.
- `TWILIO_ACCOUNT_SID`: Twilio account ID.
- `TWILIO_AUTH_TOKEN`: Twilio auth token.
- `TWILIO_FROM`: Twilio sender phone number.
- `SMTP_HOST`: SMTP server host (e.g., `smtp.gmail.com`).
- `SMTP_PORT`: SMTP port (e.g., `587`).
- `SMTP_USER`: Email address for notifications.
- `SMTP_PASS`: SMTP email app password.
- `GROQ_API_KEY`: Groq API key for the LLaMA chatbot.

---

## License

This project is licensed under the [MIT License](LICENSE).
