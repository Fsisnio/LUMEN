# Lumen — CARIPRIP

**Caritas Integrated Program Intelligence Platform**

A program management intelligence system for faith-based humanitarian networks. Built for Caritas-type institutions with multi-country projects, multiple donors, diocesan partners, and strong accountability requirements.

## Structure

The platform is organized in a 3-level hierarchy:

> **Organization → Programs → Projects**

### Programs (Thematic Areas)

- Food Security
- Health & Nutrition
- Education
- Livelihoods
- Emergency Response
- Social Protection
- Climate Resilience

## Features

- **Executive Dashboard** — Global overview: active projects, budget totals, utilization rate, beneficiaries, projects ending soon, high-risk alerts
- **Program-Level Dashboards** — Per-program KPIs, donor breakdown, risk summary, project list
- **Project Detail View** — General info, financials, implementation status, M&E indicators, budget lines, risk register, documents
- **Financial Oversight** — Budget vs actual, burn rate, spending alerts (slow/fast), donor reporting tracking
- **Geographic Overview** — Projects by region, beneficiaries by region, location table
- **Risk & Compliance** — Risk register, compliance checklist, governance & data security
- **User Roles** — Executive Director, Program Manager, Project Manager, Finance Officer, M&E Officer, Partner/Diocese

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Recharts** (charts)
- **Lucide React** (icons)

## Getting Started

```bash
cd lumen
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data

The app uses mock data in `src/lib/mock-data.ts`. Replace with a backend (Django/FastAPI + PostgreSQL) for production.

## Future Enhancements

- Map integration (Leaflet/Mapbox) for geographic view
- Document upload & management
- Donor reporting period tracking
- API integration (DHS, Kobo)
- Authentication & role-based access
