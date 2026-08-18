# AI-Enabled Geospatial Waste Management & Smart Routing System

CV-based waste classification + PostGIS spatial matching + route optimization,
end to end in Django.

```
Upload Image → YOLO classifier → organic / recyclable / e-waste
      → PostGIS spatial query → nearest suitable facility
      → OSRM route / OR-Tools multi-stop optimization → GIS dashboard (Leaflet)
```

## Apps

| App              | Responsibility |
|-------------------|----------------|
| `classification`  | Upload endpoint, `WasteRequest` model, YOLO inference wrapper |
| `facilities`       | `Facility` model, PostGIS nearest-facility matching |
| `routing`           | OSRM point-to-point routing, OR-Tools multi-stop VRP solver |
| `dashboard`         | GeoJSON API + Leaflet map frontend |

## 1. Prerequisites

- Python 3.11+
- PostgreSQL with the **PostGIS** extension
- GDAL/GEOS/PROJ system libraries (required by GeoDjango)

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis gdal-bin libgdal-dev
```

## 2. Setup

```bash
python -m venv venv
source venv/bin/activate          # venv\Scripts\activate on Windows
pip install -r requirements.txt

cp .env.example .env              # edit DB credentials etc.
```

Create the database and enable PostGIS:

```sql
CREATE DATABASE waste_management;
\c waste_management
CREATE EXTENSION postgis;
```

Run migrations and seed sample facilities:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_facilities
```

Run the server:

```bash
python manage.py runserver
```

- Dashboard: http://localhost:8000/
- Admin: http://localhost:8000/admin/

## 3. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/classification/requests/create/` | Upload image (+ lat/lon) → classifies and creates a `WasteRequest` |
| GET  | `/api/classification/requests/` | List all requests |
| GET  | `/api/facilities/nearby/?lat=&lon=&waste_class=` | Nearest facilities for a location + waste type |
| POST | `/api/routing/plan/` `{"waste_request_id": 1}` | Match nearest facility + compute driving route |
| GET  | `/api/dashboard/geojson/` | All requests/facilities/routes as GeoJSON (used by the map) |

Example: create a request with curl —

```bash
curl -X POST http://localhost:8000/api/classification/requests/create/ \
  -F "image=@sample.jpg" -F "latitude=26.45" -F "longitude=80.33"
```

Then plan a route for it —

```bash
curl -X POST http://localhost:8000/api/routing/plan/ \
  -H "Content-Type: application/json" \
  -d '{"waste_request_id": 1}'
```

## 4. Training the CV model

`classification/ml_model.py` currently falls back to a stub (`waste_class='unknown'`)
until real weights exist at `YOLO_MODEL_PATH`. To train:

1. Assemble/annotate a dataset across your 3 classes (TrashNet, TACO, or your own images)
2. Fine-tune with Ultralytics: `yolo train data=waste.yaml model=yolov8n.pt epochs=50`
3. Copy the resulting `best.pt` to `ml_models/waste_classifier.pt`
4. Update `CLASS_MAP` in `ml_model.py` to match your dataset's class names

## 5. Merging your existing Django work

If you already built part of this (e.g. the classification upload flow),
drop your app's `models.py`/`views.py` alongside these and reconcile the
model fields — the rest of the pipeline (`facilities`, `routing`, `dashboard`)
only depends on `WasteRequest` having `location` (PointField) and `waste_class`.

## 6. Notes / next steps

- Move YOLO inference to a background task (Celery + Redis) for production
- `OSRM_BASE_URL` defaults to the public demo server — self-host OSRM for reliability/scale
- `vrp_solver.py` is ready but not yet wired into a view — hook it up when you want
  to batch multiple pending requests into one optimized pickup route
