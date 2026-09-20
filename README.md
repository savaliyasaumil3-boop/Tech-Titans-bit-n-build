# 🌿 SwachhSetu — AI-Powered Smart Municipal Waste Management & Fleet Optimization

> **Next-Generation Smart City Digital Twin, IoT Sensor Telemetry, AI Overflow Forecasting, Vision Waste Classification & Dynamic Google OR-Tools Fleet Routing for Urban Waste Management.**

---

## 📌 Executive Summary

**SwachhSetu** is an enterprise-grade, end-to-end AI-powered municipal waste management platform designed for smart cities (configured for **Ahmedabad Municipal Corporation**). It combines real-time IoT ultrasonic sensor monitoring, 3D Digital Twin inspection, machine learning fill & hotspot forecasting, vision-based waste material sorting, supervisor dispatching, driver mobile routing, and Google OR-Tools vehicle route optimization into a unified real-time dashboard.

---

## ✨ Key Features & Architecture

### 🛰️ 1. Interactive Smart City Map & Telemetry Monitoring
- **Real-Time Map**: Built with OpenStreetMap & Leaflet, tracking smart bins across city zones.
- **IoT Telemetry Ingestion**: Ingests ultrasonic sensor fill percentages, battery levels, and ambient temperatures.
- **Priority Scoring Engine**: Calculates dynamic urgency scores (0–100) based on fill percentage, overflow ETA, service age anti-starvation, and waste hazard multipliers.

### 🧊 2. 3D Smart Bin Digital Twin Inspection
- **Three.js & React Three Fiber (R3F)**: Renders high-fidelity 3D models (`/public/models/bins/smart-bin.glb`) of smart bins.
- **Procedural 3D Waste Fill Volume**: Visualizes real-time fill levels inside the bin with color-coded waste stream materials.
- **Status LED & Sensor Rays**: Pulsing status lights, ultrasonic beam simulation, and ground hazard rings for critical bins ($>80\%$).
- **Interactive Controls**: Inspection angle presets (*Front View*, *Top Solar Lid*, *Side View*, *Internal Fill View*), lid toggle, and live fill simulator slider.

### 🧠 3. Machine Learning & Predictive Analytics
- **Fill-Level & Overflow Forecasting**: Time-series observation regression ML model forecasting hours until overflow and risk probability.
- **Location-Wise Waste Generation Forecasting**: Scikit-Learn models predicting daily generation, high-risk hotspots, and AI driver-vehicle collection matching.
- **Computer Vision Waste Classification**: Fast ML endpoint (`/api/ml/classify-waste`) providing real-time image classification across 6 material streams (*Plastic*, *Organic*, *Metal*, *Paper*, *Glass*, *Other*) using MobileNetV2 with colour-heuristic fallback.

### 🚚 4. OR-Tools Dynamic Fleet Route Generator
- **Vehicle Routing Problem (VRP)**: Uses Google OR-Tools (with OSRM road distance matrix and Haversine fallback) to calculate optimal multi-stop collection paths respecting vehicle payload capacity.
- **Driver Dispatch App**: Dedicated driver UI (`/driver/dashboard`) with step-by-step navigation, collection confirmation, and capacity progress tracking.
- **Impact Metrics**: Displays distance savings, fuel reduction, and CO₂ offset metrics compared to unoptimized baselines.

### ⚡ 5. Dual Operation & Render Production Ready
- **Live Supabase Synchronization**: Connects to PostgreSQL Supabase database with Row-Level Security (RLS).
- **Standalone Demo Mode**: Automatically falls back to simulated local dataset when Supabase credentials are not configured (`NEXT_PUBLIC_DEMO_MODE=true`).
- **Render Free-Tier Optimization**: Fully configured `render.yaml` with standalone Next.js builds, memory limits (`NODE_OPTIONS="--max-old-space-size=460"`), and single-worker compilation to fit inside 512MB RAM limits without OOM errors.

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Lucide Icons, tw-animate-css
- **3D Digital Twin**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), Framer Motion
- **State & Charts**: Zustand, Recharts, Leaflet, React-Leaflet

### **Backend Service**
- **Framework**: FastAPI (Python 3.10+), Uvicorn (ASGI)
- **Optimization & ML**: Google OR-Tools, Scikit-Learn, Pandas, NumPy, Pillow, Pydantic v2
- **Database Wrapper**: Supabase Python Client, PyJWT, Python-Dotenv

### **Database**
- **PostgreSQL (Supabase)**: Relational schema with RLS policies (`bins`, `vehicles`, `alerts`, `observations`, `waste_records`, `waste_sources`, `predictions`, `waste_classifications`).

---

## 📂 Project Directory Structure

```text
waste-management/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                 # Main Dashboard overview
│   │   ├── bins/                    # Smart Bin Network & table
│   │   ├── vehicles/                # Fleet tracking & capacity
│   │   ├── routes/                  # OR-Tools Route Generator
│   │   ├── driver/dashboard/        # Driver Mobile Dispatch UI
│   │   ├── waste-forecast/          # Supervisor Forecasting & Hotspots
│   │   ├── alerts/                  # Real-time alert feed & dismissal
│   │   ├── waste-classification/    # Vision AI Classifier Playground
│   │   ├── analytics/               # Reconciled Waste Flow Analytics
│   │   ├── settings/                # System & API Configuration
│   │   └── layout.tsx               # Main Dashboard Layout
│   └── layout.tsx
├── components/
│   ├── 3d/                          # 3D Digital Twin Components
│   ├── bins/                        # Bin tables, drawers, & filter controls
│   ├── layout/                      # Fixed Header, Sidebar, MobileNav
│   ├── map/                         # Leaflet map views & markers
│   ├── waste-forecasting/           # Forecasting charts & hotspot views
│   └── providers/                   # AppDataProvider state context
├── backend/
│   ├── app/
│   │   ├── api/                     # Bins, Vehicles, Alerts, ML, Forecasting & Routes API
│   │   ├── core/                    # Config, Supabase client, Auth & JWT
│   │   └── ml/                      # Predictor, Forecasting, Routing (VRP), Vision Classifier
│   ├── database/
│   │   ├── schema.sql               # PostgreSQL tables & RLS policies
│   │   └── seed.sql                 # Ahmedabad smart bins & vehicles seed
│   └── main.py                      # FastAPI App Entrypoint (Port 8000)
├── next.config.ts                   # Standalone build & proxy configuration
├── render.yaml                      # Render Infrastructure-as-Code manifest
└── package.json
```

---

## ⚙️ Environment Variables Setup

Create or update `.env.local` in the root directory:

```env
# Frontend Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend Supabase Credentials (DB Writes & Ingestion)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Microservices URLs
NEXT_PUBLIC_ML_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Demo Mode Flag ("true" for offline mock mode, "false" for live Supabase)
NEXT_PUBLIC_DEMO_MODE=false
```

---

## 🚀 Quickstart Guide

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Install Python Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Start Python FastAPI Backend Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
- Server URL: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

### 4. Start Next.js Development Server (in a new terminal)
```bash
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Render

This repository includes a production-ready `render.yaml` for zero-downtime deployment on Render:

1. Connect your GitHub repository to [Render](https://render.com).
2. Create a new **Blueprint** and select `render.yaml`.
3. Set the required secret environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ML_API_URL`).
4. Render will automatically provision both the `swachhsetu-backend` (FastAPI) and `swachhsetu-frontend` (Next.js Standalone) services.

---

## 📡 Key API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health & database readiness check |
| `GET` | `/api/bins` | List monitored smart bins ordered by priority |
| `POST` | `/api/bins/{id}/telemetry` | Ingest ultrasonic fill percentage & battery reading |
| `GET` | `/api/vehicles` | List fleet vehicles & current coordinates |
| `GET` | `/api/alerts` | Active overflow & maintenance alert feed |
| `POST` | `/api/ml/predict-fill` | Predict hours until overflow & risk score |
| `POST` | `/api/ml/optimize-route` | OR-Tools VRP multi-vehicle route optimization |
| `GET` | `/api/ml/forecast/all` | Bulk location-wise waste generation forecasts |
| `GET` | `/api/ml/forecast/hotspots` | Spatial waste generation hotspot data |
| `POST` | `/api/ml/classify-waste` | Computer Vision waste image classification |

---

## 📜 License & Acknowledgments

Built for municipal smart city deployment by **Tech Titans** (Bit n Build 2026). Designed for high efficiency, urban sustainability, and zero-waste cities.
