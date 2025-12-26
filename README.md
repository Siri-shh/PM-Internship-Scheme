# PM Internship Allocation Portal

A centralized platform developed for the **PM Internship Scheme**, designed to facilitate fair, transparent, and efficient internship allocations using an advanced stable matching algorithm enhanced with machine learning.

## 🚀 Features

### 🔐 Authentication & Security
- **Role-Based Access**: Specialized portals for **Students**, **Companies**, and **Admins**.
- **Secure Handling**: JWT-based session management with HTTP-only cookies.
- **Bot Protection**: Google reCAPTCHA v2 implementation on login and potential abuse points.
- **Content Safety**: Integrated profanity filter for usernames and emails with automated blacklist enforcement.

### 🏛️ Admin Portal
- **Dashboard**: Real-time overview of applicants, internships, and allocation status.
- **Allocation Control**: Upload CSV datasets, sync from database, and trigger the matching algorithm.
- **Audit System**: 
    - Full session tracking (login/logout times) in compliance with PIA (no IP logging).
    - Event logs for user actions and allocation runs.
    - **Audit Panel** for reviewing active sessions and historical logs.
- **Verification**: Review and approve/reject objection requests from users blocked by the profanity filter.
- **Fairness Metrics**: Detailed reporting on placement rates across demographics (Gender, Category, Rural/Urban) to ensure equitable outcomes.
- **Model Explanation**: Transparent breakdown of the 5-step ML-enhanced allocation process.

### 🤖 Allocation Engine
- **Algorithm**: Modified Gale-Shapley (Deferred Acceptance) for stable matching.
- **ML Enhancements**: Scoring based on academic history, skill alignment, and geographic preferences.
- **Fairness Constraints**: Strict enforcement of reservation policies at every matching step.
- **O(n²) Efficiency**: Optimized to handle 10,000+ candidates efficiently.

## 🛠️ Technology Stack

- **Frontend**: React (TypeScript), Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js (Local & JWT strategies)

## 📂 Project Structure

```
/client             # React Frontend
  /src
    /components     # Reusable UI components (AuditPanel, etc.)
    /pages          # Page views (AdminPortal, LoginPage, etc.)
    /lib            # Utilities (API clients, validators)

/server             # Node.js Backend
  /routes.ts        # API Routes (Auth, Admin, Audit)
  /auth.ts          # Passport configuration & session logic
  /storage.ts       # Database access layer
  /emailService.ts  # Nodemailer configuration
```

## ⚡ Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Ensure `.env` contains:
    - `DATABASE_URL` (PostgreSQL connection)
    - `JWT_SECRET`
    - `RECAPTCHA_SITE_KEY` & `RECAPTCHA_SECRET_KEY`
    - SMTP credentials (`SMTP_HOST`, `SMTP_USER`, etc.)

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

4.  **Database Migration (Audit Tables)**
    ```bash
    npx tsx server/migrate-audit.ts
    ```

## 🛡️ Audit & Compliance

The system includes a robust **Audit Trail** to ensure accountability:
- **Session Logs**: Tracks who accessed the system and when.
- **Event Logs**: Records critical actions (allocations run, objections processed).
- **Privacy First**: Designed to be PIA compliant by excluding sensitive PII like IP addresses from long-term storage.
