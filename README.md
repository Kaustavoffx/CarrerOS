# CareerOS

<p align="center">
  <strong>Private AI Career Workspace</strong>
</p>

<p align="center">
  Adaptive Career Planning • AI Mentorship • Dynamic Roadmaps • Progress Intelligence
</p>

---

## Overview

CareerOS is a modern AI-powered career operating system built for students, professionals, career switchers, and lifelong learners.

Instead of scattered notes, random bookmarks, and disconnected planning tools, CareerOS provides a single private workspace where users can:

* Define career goals
* Complete guided onboarding
* Generate adaptive career roadmaps
* Track readiness and progress
* Receive AI mentorship
* Store long-term career context
* Replan dynamically as circumstances change

The platform is designed around a calm, premium workspace experience inspired by modern productivity products while maintaining complete user ownership of career data.

---

## Core Features

### AI-Powered Career Roadmaps

Generate structured learning plans tailored to:

* Career goals
* Current experience level
* Available weekly time
* Existing skills
* Budget constraints
* Learning obstacles

Roadmaps include:

* Learning milestones
* Recommended resources
* Practical projects
* Deliverables
* Expected outcomes
* Completion estimates

---

### AI Mentor

Interactive mentoring experience powered by OpenAI.

Capabilities:

* Career guidance
* Skill gap analysis
* Project recommendations
* Learning strategy advice
* Roadmap clarification
* Portfolio planning

---

### Career Twin

A persistent career profile that stores:

* Career objectives
* Readiness score
* Progress history
* Learning context
* Roadmap state

Designed to evolve with the user over time.

---

### Private Workspace

Every user receives a dedicated workspace containing:

* Dashboard
* Roadmaps
* AI Mentor
* Career Twin
* Profile Management
* Settings

All protected through authentication and row-level security.

---

### Adaptive Replanning

Roadmaps can be regenerated when:

* Goals change
* Time availability changes
* Skill levels improve
* New opportunities emerge

This keeps plans aligned with real-world conditions instead of becoming outdated.

---

## Tech Stack

### Frontend

* Next.js 15
* React 19
* TypeScript
* Tailwind CSS
* Framer Motion

### Backend

* Next.js Route Handlers
* Supabase

### Authentication

* Supabase Auth
* Google OAuth
* GitHub OAuth
* Email Authentication

### Database

* PostgreSQL (Supabase)
* Row Level Security (RLS)

### AI

* OpenAI GPT Models

---

## Architecture

```text
User
 │
 ▼
Next.js Application
 │
 ├── Authentication Layer
 │       └── Supabase Auth
 │
 ├── Dashboard
 ├── Roadmaps
 ├── Career Twin
 ├── AI Mentor
 │
 ▼
Supabase Database
 │
 ├── profiles
 ├── roadmaps
 ├── roadmap_versions
 ├── user_usage
 └── career_workspace_state
 │
 ▼
OpenAI APIs
```

## Security

CareerOS follows a private-first architecture.

Implemented protections:

* Row Level Security
* Server-side session validation
* Protected routes
* Secure OAuth flows
* User-isolated data access
* Environment variable protection

Users can only access their own workspace records.

---

## Local Development

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
AI_KEY_ENCRYPTION_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

### BYOK AI Providers

CareerOS can continue roadmap generation after the free quota is exhausted when a user connects their own provider key in Settings -> AI Providers.

Supported providers:

* OpenAI API Key
* Gemini API Key

The app encrypts provider keys on the server before storing them in Supabase and never sends stored keys back to the browser.

### Run Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

---

## Database Setup

Run the schema located in:

```text
supabase/schema.sql
```

Required tables include:

* profiles
* roadmaps
* roadmap_versions
* user_usage
* career_workspace_state

---

## Project Structure

```text
app/
components/
lib/
supabase/
assets/
```

### App Router

Contains pages, APIs, onboarding flows, dashboard, mentor, roadmaps, and profile management.

### Components

Reusable workspace UI components and interactive experiences.

### Lib

Business logic, roadmap generation, exports, workspace management, and Supabase integrations.

### Supabase

Database schema and backend configuration.

---

## Current Status

### Production Ready

* Authentication
* User Profiles
* Dashboard
* Onboarding
* Roadmaps
* AI Mentor
* Career Twin
* Workspace Persistence
* Supabase Integration

### In Progress

* Advanced Career Intelligence
* Multi-Version Roadmap Analytics
* Cross-Session AI Memory
* Industry Benchmarking
* Deep Skill Graphs

---

## Vision

CareerOS aims to become a complete career operating system where planning, learning, execution, mentorship, and long-term growth happen inside a single intelligent workspace.

---

Built with Next.js, Supabase, TypeScript, OpenAI, and a strong focus on user ownership, privacy, and execution.
