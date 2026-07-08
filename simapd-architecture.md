# SiMAPD Architecture Plan

Overview of the SiMAPD backend application, a Computer Vision-based real-time PPE compliance monitoring system, splitting the architecture into NestJS and Python.

## Project Type
BACKEND

## Tech Stack
- **NestJS (Node.js):** REST API, WebSocket Gateway, DB queries, Redis Subscriber.
- **Python:** AI Service (YOLOv8m, SAHI, ByteTrack) in daemon thread, Redis Publisher.
- **Database:** PostgreSQL.
- **Message Broker:** Redis.
- **Infra:** Docker, docker-compose, NGINX.

## Success Criteria
- Separation of concerns: NestJS handles all I/O non-blocking work, Python handles CPU-bound inference.
- Redis Pub/Sub successfully bridges AI Service detections to NestJS WebSocket Gateway.
- System does not freeze during heavy CV inference.

## Open Questions (Socratic Gate)
1. **Package Manager:** Should we use `yarn`, `npm`, or `pnpm` for the NestJS backend to maintain consistency with the existing Next.js frontend?
2. **AI Service Health:** For the Python AI service, since it runs a daemon thread with blocking OpenCV calls, should we expose a minimal HTTP server JUST for Docker health checks, or should it run purely as a headless script?
3. **Database & Configuration:** For the SP configuration (threshold & duration), should these be stored in a PostgreSQL table (so they can be dynamically updated via `PUT /sp/config` as mentioned) or via Redis?

## File Structure
```text
/home/ruhai/skripsi/
├── backend-nest/
│   ├── src/
│   │   ├── personnel/
│   │   ├── violations/
│   │   ├── sp/
│   │   ├── ai-bridge/ (Redis subscriber & WS gateway)
│   ├── package.json
├── ai-service/
│   ├── main.py
│   ├── inference.py
│   ├── redis_pub.py
│   ├── requirements.txt
├── docker-compose.yml
└── nginx/nginx.conf
```

## Task Breakdown
- **Task 1:** Initialize `backend-nest` NestJS structure, TypeORM, and Redis WS Gateway. (Agent: `backend-specialist`)
- **Task 2:** Initialize `ai-service` Python headless script with daemon thread and Redis Publisher. (Agent: `backend-specialist`)
- **Task 3:** Implement REST endpoints for Personnel, Violations, SP in NestJS. (Agent: `backend-specialist`)
- **Task 4:** Create Dockerfile for both services and setup `docker-compose.yml`. (Agent: `devops-engineer`)

## ✅ PHASE X COMPLETE
- Lint: [ ] Pass
- Security: [ ] No critical issues
- Build: [ ] Success
- Date: [Pending]
