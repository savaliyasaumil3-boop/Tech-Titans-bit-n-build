# SwachhSetu Standalone Backend API

High-performance standalone backend service for AI-powered waste management, real-time IoT bin monitoring, fleet dispatching, and route optimization.

---

## Tech Stack
- **Framework:** FastAPI (Python 3.10+)
- **Server:** Uvicorn (ASGI)
- **Database:** PostgreSQL (Supabase)
- **Routing Engine:** Heuristic Vehicle Routing Problem (VRP) & Google OR-Tools ready
- **Validation:** Pydantic v2

---

## Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── bins.py          # Bins CRUD & IoT sensor telemetry ingestion
│   │   ├── vehicles.py      # Fleet tracking & capacity updates
│   │   ├── alerts.py        # Real-time alert feed & dismissal
│   │   └── ml.py            # Fill prediction & route optimization
│   ├── core/
│   │   ├── config.py        # Settings & environment configuration
│   │   └── supabase.py      # Database client wrapper
│   └── ml/
│       ├── predictor.py     # AI fill-rate prediction & priority score engine
│       └── routing.py       # Haversine distance & VRP route optimizer
├── database/
│   ├── schema.sql           # PostgreSQL table definitions & RLS policies
│   ├── seed.sql             # 52 Ahmedabad smart bins, 6 vehicles, alerts
│   ├── seed.py              # Python seeding script
│   └── seed.js              # Node.js seeding helper
├── main.py                  # Server entrypoint (Port 8000)
├── requirements.txt         # Dependencies
└── README.md
```

---

## Quickstart

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
python main.py
# or
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
The server will start at: `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

---

## Database Setup (Supabase)

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard).
2. Run `backend/database/schema.sql` to create all tables with proper alphanumeric primary keys and permissive RLS policies.
3. Run `backend/database/seed.sql` to insert all 52 Ahmedabad smart bins, 6 municipal collection trucks, and initial active alerts.

---

## Core API Endpoints

### 1. Bins & IoT Telemetry
- `GET /api/bins`: List all monitored smart bins (ordered by priority score).
- `GET /api/bins/{id}`: Detailed telemetry and metadata for a specific bin.
- `POST /api/bins/{id}/telemetry`: Ingest ultrasonic sensor fill percentage and battery readings from physical/simulated hardware.

### 2. Fleet & Vehicles
- `GET /api/vehicles`: Real-time status and coordinates for all collection trucks.
- `PATCH /api/vehicles/{id}`: Update vehicle current payload or dispatch status.

### 3. Alerts
- `GET /api/alerts`: Active overflow and maintenance alerts.
- `PATCH /api/alerts/{id}/resolve`: Dismiss or mark alert as handled.

### 4. AI & Routing
- `POST /api/predict-fill` (or `/api/ml/predict-fill`): Predicts time until overflow and hazard multiplier.
- `POST /api/optimize-route` (or `/api/routes/optimize`): Computes optimized dispatch sequence respecting vehicle capacity and urgency.
