# SiMAPD Backend Architecture Plan

Overview of the SiMAPD backend application, a Computer Vision-based real-time PPE compliance monitoring system. 

## Project Type
BACKEND

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI (async)
- **Database:** PostgreSQL 15 + SQLAlchemy 2 (asyncpg) + Alembic
- **Auth:** JWT (python-jose + passlib bcrypt)
- **AI/CV:** ultralytics (YOLOv8m), sahi, supervision (ByteTrack), OpenCV
- **Real-time:** Native FastAPI WebSocket
- **Infra:** Docker, docker-compose, NGINX

## Success Criteria
- Backend endpoints return successful responses for PPE Detection, Personnel & SP, and Violations modules.
- WebSockets provide real-time updates compliant with the specified payload format.
- Automated SP escalation mechanism correctly handles SP1 -> SP2 -> SP3 based on configurable thresholds.

## User Review Required
Please review the architecture and Socratic gate questions below before I proceed with generating any code. Do not skip the Socratic gate questions.

## Open Questions (Socratic Gate)
1. **Detection Pipeline Scaling:** Since we are running YOLOv8m + SAHI + ByteTrack on video streams via WebSockets, how will the AI models be deployed? Will the inference run within the FastAPI event loop, in a separate process/worker, or on a dedicated GPU server? Running heavy CV inference directly inside FastAPI async endpoints will block the event loop and crash the server if not handled correctly.
2. **SP Configuration Details:** You mentioned the SP threshold and validity periods are "CONFIGURABLE". Should these configurations be stored in the database (so admins can change them via an API) or in environment variables/config files (requiring a restart to change)?
3. **WebSocket Connection Handling:** How will we handle multiple camera streams? Does `camera_id` imply one WebSocket connection per camera pushing frames to the server, or one connection per client receiving the parsed CV results?
4. **Existing Frontend Issue:** I noticed the frontend Next.js server (`npm run dev`) recently failed due to a CSS `@import` error in `client/app/globals.css`. Should I fix this before working on the backend, or completely ignore it for now?

## Proposed Changes

### Database & Models Setup
- Create initial Alembic migrations.
- Define SQLAlchemy models for `Personnel`, `Violation`, `WarningLetter`, and possibly `Camera`/`Config` (depending on answers to the questions).

### API Endpoints
- **Auth:** Login/Token generation.
- **Personnel & SP Module:** CRUD operations for personnel and automated warning letters logic.
- **Violation Module:** Record violation, retrieve history.

### Real-Time WebSocket
- Create `WebSocketManager` to handle connections.
- Implement the specified payload processing.

### Docker & Infrastructure
- Write `Dockerfile` for the FastAPI app.
- Write `docker-compose.yml` for FastAPI, PostgreSQL, and NGINX.
- Write `nginx/nginx.conf` for reverse proxy.

## File Structure
```text
/home/ruhai/skripsi/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/ (personnel.py, violation.py, etc.)
│   │   ├── schemas/ (pydantic models)
│   │   ├── api/v1/routes/ (auth.py, personnel.py, violations.py)
│   │   ├── api/v1/deps.py
│   │   ├── services/ (sp_service.py)
│   │   ├── ai/ (pipeline.py)
│   │   └── websocket/ (manager.py)
│   ├── alembic/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── nginx/nginx.conf
```

## Task Breakdown
- **Task 1:** Initialize folder structure, `requirements.txt`, and basic FastAPI setup. (Agent: `backend-specialist`, Skills: `python-patterns`, `api-patterns`)
- **Task 2:** Setup PostgreSQL connection, SQLAlchemy Base, and Alembic migrations. (Agent: `database-architect`, Skills: `database-design`)
- **Task 3:** Implement Authentication (JWT) and User/Personnel schemas & models. (Agent: `security-auditor`, `backend-specialist`)
- **Task 4:** Implement SP (Warning Letter) escalation logic and Violations models. (Agent: `backend-specialist`)
- **Task 5:** Implement AI Pipeline integration placeholder and WebSocket Manager. (Agent: `backend-specialist`)
- **Task 6:** Create Dockerfile, docker-compose.yml, and NGINX configuration. (Agent: `devops-engineer`, Skills: `server-management`)

## Phase X: Verification Plan

### Automated Tests
- Run `flake8` or `ruff` for linting.
- Run `pytest` for critical unit tests (e.g., SP escalation logic).

### Manual Verification
- Start `docker-compose up`.
- Connect a test WebSocket client to verify the JSON payload format.
- Send API requests to `/docs` (Swagger UI) to test CRUD endpoints.
