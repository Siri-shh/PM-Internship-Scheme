# PM Internship Scheme - AI Allocation Engine

## Overview
A multi-portal web application for the PM Internship Scheme hackathon project. The platform features an AI-powered internship allocation engine connecting students with companies, with government oversight and administration capabilities.

## Project State
- **Status**: Frontend prototype complete
- **Last Updated**: November 30, 2025

## Architecture

### Frontend Structure
```
client/src/
├── components/           # Reusable UI components
│   ├── ThemeProvider.tsx  # Dark/light mode context
│   ├── ThemeToggle.tsx    # Theme switch button
│   ├── Header.tsx         # Main navigation header
│   ├── StatsBar.tsx       # Animated statistics display
│   ├── IndiaMap.tsx       # Interactive map with glowing dots
│   ├── SuccessStories.tsx # Testimonial cards
│   ├── NotificationTicker.tsx # Live scrolling updates
│   │
│   │ # Student Portal Components
│   ├── EligibilityChecker.tsx  # Eligibility verification widget
│   ├── QRAuth.tsx              # QR code authentication (mock)
│   ├── ProfileSetup.tsx        # Multi-step profile form
│   ├── SwipeCard.tsx           # Tinder-style internship matching
│   ├── ApplicationTracker.tsx  # Application status & funnel
│   │
│   │ # Company Portal Components
│   ├── CompanyDashboard.tsx    # Company overview & metrics
│   ├── ShortlistPanel.tsx      # Drag-drop candidate selection
│   ├── OnboardingSection.tsx   # Offer/rejection letters
│   │
│   │ # Admin Portal Components
│   ├── AdminDashboard.tsx      # Metrics & policy sliders
│   ├── VerificationPanel.tsx   # Document review
│   ├── ModerationPanel.tsx     # Company approvals & grievances
│   └── OperationsCenter.tsx    # Circulars & notifications
│
├── pages/
│   ├── HomePage.tsx       # Landing page with all home components
│   ├── StudentPortal.tsx  # Student dashboard with tabs
│   ├── CompanyPortal.tsx  # Company dashboard with tabs
│   └── AdminPortal.tsx    # Government admin dashboard
│
└── App.tsx               # Main app with routing
```

### Key Features
1. **Home Page**
   - Government logo & tagline
   - Animated statistics bar
   - Interactive India heatmap with glowing internship locations
   - Success stories carousel
   - Live notification ticker

2. **Student Portal**
   - Eligibility checker widget
   - QR code authentication (mocked for demo)
   - Multi-step profile setup
   - Tinder-style swipe matching for internships
   - Application tracker with conversion funnel

3. **Company Portal**
   - Dashboard with active roles & pending applications
   - Drag-and-drop candidate shortlisting (Kanban-style)
   - AI shortlist with human override
   - Offer/rejection letter templates

4. **Government Admin Portal**
   - Daily metrics dashboard with charts
   - Policy sliders (quotas, minimum stipend)
   - Document verification queue
   - Company approval moderation
   - Grievance management
   - Operations center for circulars & notifications

### Design System
- **Color Palette**: Pastel colors (soft blues, purples, teals)
- **Styling**: Rounded corners, soft shadows, floating elements
- **Animations**: Micro-interactions via Framer Motion
- **Dark/Light Mode**: Full theme support

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, Shadcn/UI
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Routing**: Wouter
- **State**: React Query, React Hooks

## Running the Project
The application runs with `npm run dev` via the "Start application" workflow. It serves on port 5000.

## User Preferences
- Pastel color palette throughout
- Rounded cards with soft shadows
- Micro-animations and floating UI elements
- Dark/light mode toggle in all portals
