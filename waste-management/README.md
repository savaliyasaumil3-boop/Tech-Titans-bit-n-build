# 🌿 SwachhSetu — AI-Powered Smart Municipal Waste Management & Fleet Optimization

> **Next-Generation Smart City Digital Twin, IoT Sensor Telemetry, AI Overflow Prediction & Dynamic OR-Tools Fleet Routing for Urban Waste Management.**

---

## 📌 Executive Summary

**SwachhSetu** is an enterprise-grade, end-to-end AI-powered municipal waste management platform designed for smart cities (configured for **Ahmedabad Municipal Corporation**). It combines real-time IoT ultrasonic sensor monitoring, 3D Digital Twin inspection, machine learning fill prediction, computer vision waste sorting, and Google OR-Tools vehicle route optimization into a unified real-time dashboard.

---

## ✨ Key Features & Architecture

### 🛰️ 1. Interactive Smart City Map & Telemetry Monitoring
- **Real-Time Map**: Built with OpenStreetMap & Leaflet, tracking **52 smart bins** across Ahmedabad.
- **IoT Telemetry Ingestion**: Ingests ultrasonic sensor fill percentages, battery levels, and ambient temperatures.
- **Priority Scoring Engine**: Calculates dynamic urgency scores based on fill percentage, overflow ETA, and waste hazard multipliers.

### 🧊 2. 3D Smart Bin Digital Twin Inspection
- **Three.js & React Three Fiber (R3F)**: Renders a high-fidelity **3D GLB model** (`/public/models/bins/smart-bin.glb`) of smart bins.
- **Procedural 3D Waste Fill Volume**: Visualizes real-time fill levels inside the bin with color-coded waste stream materials.
- **Status LED & Sensor Rays**: Pulsing status lights, ultrasonic beam simulation, and ground hazard rings for critical bins ($>80\%$).
- **Interactive Controls**: Inspection angle presets (*Front View*, *Top Solar Lid*, *Side View*, *Internal Fill View*), lid toggle, and live fill simulator slider.

### 🧠 3. Machine Learning & Predictive Analytics
- **Fill-Level & Overflow Prediction**: Historical regression ML model forecasting hours until overflow and risk probability.
- **Computer Vision Waste Classification**: Fast ML endpoint (`/api/ml/classify-waste`) providing real-time image classification across 6 material streams (*Plastic*, *Organic*, *Metal*, *Paper*, *Glass*, *E-Waste*).

### 🚚 4. OR-Tools Dynamic Fleet Route Generator
- **Vehicle Routing Problem (VRP)**: Uses Google OR-Tools to calculate optimal collection paths respecting vehicle capacities and urgency.
- **Impact Metrics**: Displays distance savings, fuel reduction, and CO₂ offset metrics compared to unoptimized baselines.

### ⚡ 5. Dual Operation Mode
- **Live Supabase Synchronization**: Connects to PostgreSQL Supabase database with Row-Level Security (RLS).
- **Standalone Demo Mode**: Automatically falls back to simulated local dataset when Supabase credentials are not configured (`NEXT_PUBLIC_DEMO_MODE=true`).

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
- **PostgreSQL (Supabase)**: Relational schema with RLS policies (`bins`, `vehicles`, `alerts`, `observations`, `waste_records`, `predictions`).

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
│   │   ├── alerts/                  # Real-time alert feed & dismissal
│   │   ├── waste-classification/    # Vision AI Classifier Playground
│   │   ├── analytics/               # Reconciled Waste Flow Analytics
│   │   ├── settings/                # System & API Configuration
│   │   └── layout.tsx               # Main Dashboard Layout with fixed header & 3D Viewer
│   └── layout.tsx
├── components/
│   ├── 3d/                          # 3D Digital Twin Components
│   │   ├── SmartBinModel.tsx        # GLB Loader, Bounding Box Normalization & Mesh
│   │   ├── SmartBinViewer.tsx       # Framer Motion 3D Inspection Modal Dialog
│   │   ├── SmartBinScene.tsx        # R3F Canvas, HDRI Environment & Shadows
│   │   ├── SmartBinFill.tsx         # 3D Dynamic Waste Fill Level Volume
│   │   ├── SmartBinStatus.tsx       # 3D Status LED, Beam & Risk Ring
│   │   ├── SmartBinLabel.tsx        # Floating Drei Html 3D Telemetry Label
│   │   └── SmartBinControls.tsx     # Smooth OrbitControls View Camera Lerp
│   ├── bins/                        # Bin tables, drawers, & filter controls
│   ├── layout/                      # Fixed Header, Sidebar, MobileNav
│   ├── map/                         # Leaflet map views, bin & vehicle markers
│   └── providers/                   # AppDataProvider state context
├── backend/
│   ├── app/
│   │   ├── api/                     # Bins, Vehicles, Alerts, ML & Routes API
│   │   ├── core/                    # Config, Supabase client, Auth & JWT
│   │   └── ml/                      # Predictor, Routing (VRP), Vision Classifier
│   ├── database/
│   │   ├── schema.sql               # PostgreSQL tables & RLS policies
│   │   ├── seed.sql                 # 52 Ahmedabad smart bins & 6 vehicles seed
│   │   └── run_migrations.py        # Python migration runner
│   └── main.py                      # FastAPI App Entrypoint (Port 8000)
├── lib/
│   ├── store/
│   │   └── use-bin-3d-store.ts      # Zustand 3D Inspection Store
│   ├── services/
│   │   ├── ml-api.ts                # Client API wrapper & JS Fallback VRP Optimizer
│   │   └── priority-engine.ts       # Priority Score Calculation Engine
│   └── supabase/                    # Supabase client & query wrappers
└── public/
    └── models/
        └── bins/
            └── smart-bin.glb        # 3D Smart Bin GLB Model Asset
```

---

## ⚙️ Environment Variables Setup

Create or update `.env.local` in the root directory:

```env
# Frontend Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Backend Supabase Credentials (Bypasses RLS for DB Writes & Ingestion)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Microservices URLs
NEXT_PUBLIC_ML_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Demo Mode Flag (Set "true" for offline mock mode, "false" for live Supabase)
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

## 🗄️ Database Setup (Supabase SQL Editor)

To set up the live database:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Run [backend/database/schema.sql](file:///c:/Users/FENI%20GAJERA/Desktop/Bit%20n%20Build%2026/Tech-Titans-bit-n-build/waste-management/backend/database/schema.sql) to create tables and RLS policies.
4. Run [backend/database/seed.sql](file:///c:/Users/FENI%20GAJERA/Desktop/Bit%20n%20Build%2026/Tech-Titans-bit-n-build/waste-management/backend/database/seed.sql) to seed all 52 Ahmedabad smart bins, 6 municipal collection trucks, and initial active alerts.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & database readiness check |
| `GET` | `/api/bins` | List monitored smart bins ordered by priority score |
| `GET` | `/api/bins/{id}` | Telemetry details for a specific bin |
| `POST` | `/api/bins/{id}/telemetry` | Ingest ultrasonic fill percentage & battery reading |
| `GET` | `/api/vehicles` | List fleet vehicles & current coordinates |
| `GET` | `/api/alerts` | Active overflow & maintenance alert feed |
| `POST` | `/api/ml/predict-fill` | Predict hours until overflow & risk probability |
| `POST` | `/api/ml/optimize-route` | OR-Tools VRP multi-vehicle route optimization |
| `POST` | `/api/ml/classify-waste` | Computer Vision waste image classification |

---

## 📜 License & Acknowledgments

Built for municipal smart city deployment by **Tech Titans** (Bit n Build 2026). Designed for high efficiency, urban sustainability, and zero-waste cities.
