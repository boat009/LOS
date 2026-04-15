# Loan Origination System (LOS)

ระบบขอสินเชื่อดิจิทัล — NestJS + React + PostgreSQL + Redis + MinIO

---

## สถาปัตยกรรม (Architecture)

```
┌─────────────┐     HTTPS      ┌──────────────┐
│  Frontend   │ ◄──────────── │    Nginx     │
│ React + Vite│               │ Reverse Proxy│
└─────────────┘               └──────┬───────┘
                                      │
                               ┌──────▼───────┐
                               │   Backend    │
                               │   NestJS     │
                               └──┬──┬──┬────┘
                                  │  │  │
                     ┌────────────┘  │  └──────────┐
                     ▼               ▼              ▼
              ┌──────────┐   ┌──────────┐   ┌──────────┐
              │PostgreSQL│   │  Redis   │   │  MinIO   │
              │    15    │   │    7     │   │ (Files)  │
              └──────────┘   └──────────┘   └──────────┘
```

**Stack:**
| Layer | Technology |
|-------|-----------|
| Backend API | NestJS 10, TypeORM, Passport-JWT |
| Database | PostgreSQL 15 (AES-256-GCM encrypted PII) |
| Session/Cache | Redis 7 (token blacklist, OTP store) |
| File Storage | MinIO (PDF, JPEG, PNG) |
| Message Queue | RabbitMQ 3 (notification queue) |
| Frontend | React 18, Vite, TanStack Query v5, Zustand |
| Styling | Tailwind CSS 3 |
| Auth | JWT RS256, TOTP/SMS MFA (L3+) |

---

## ข้อกำหนดระบบ (Prerequisites)

- **Docker Desktop** 24+ (with Compose v2)
- **Node.js** 20 LTS
- **npm** 10+

---

## การติดตั้งและรัน (Quick Start)

### 1. Clone / เปิด Project

```bash
cd C:\Users\admin\source\LOS
```

### 2. สร้าง Environment File

```bash
copy .env.example .env
# หรือ แก้ไข .env ตามต้องการ (ไม่จำเป็นสำหรับ local dev)
```

### 3. รัน Infrastructure ด้วย Docker Compose

```bash
docker-compose up -d
```

Services ที่จะรัน:
| Service | Port | หมายเหตุ |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Session store |
| RabbitMQ | 5672 / 15672 | Queue (UI: http://localhost:15672) |
| MinIO | 9000 / 9001 | File storage (UI: http://localhost:9001) |
| Backend | 3000 | NestJS API |
| Frontend | 5173 | React dev server |
| Nginx | 80 | Reverse proxy |

### 4. ติดตั้ง Backend Dependencies

```bash
cd backend
npm install
```

### 5. Seed ข้อมูลเริ่มต้น (Users, Products, Questions, Approval Matrix)

```bash
npm run seed
```

ข้อมูล Seed ที่สร้าง:
- **Users**: 10 users (admin / L1–L7 approvers / sale)
- **Products**: 4 loan products (บ้าน/รถ/ส่วนตัว/SME)
- **Questions**: 8 questions with scoring (income, employment, credit history, etc.)
- **Scoring Model**: Grade bands A/B/C/D/F
- **Approval Matrix**: 7 levels × 4 products

### 6. รัน Backend (Development)

```bash
npm run start:dev
```

API พร้อมที่ http://localhost:3000
Swagger UI (dev only): http://localhost:3000/api/docs

### 7. ติดตั้งและรัน Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend พร้อมที่ http://localhost:5173

---

## Default Users (หลัง Seed)

| Username | Password | Role | Level |
|----------|----------|------|-------|
| `admin` | `Admin1234!` | ADMIN | - |
| `sale01` | `Sale1234!!` | SALE_OFFICER | - |
| `officer01` | `Officer1!` | LOAN_OFFICER | L1 |
| `supervisor01` | `Supervisor1!` | CREDIT_SUPERVISOR | L2 |
| `manager01` | `Manager1!` | CREDIT_MANAGER | L3 |
| `director01` | `Director1!` | CREDIT_DIRECTOR | L4 |
| `vp01` | `VicePres1!` | VP_CREDIT | L5 |
| `committee01` | `Committee1!` | CREDIT_COMMITTEE | L6-L7 |

> **L3+ ต้องเปิด MFA ก่อน Login**  
> ใช้ `/api/v1/auth/mfa/setup` และ `/api/v1/auth/mfa/enable`

---

## API Endpoints หลัก

### Auth
```
POST /api/v1/auth/login          # Login (rate limited: 5/min)
POST /api/v1/auth/mfa/verify     # Verify TOTP/SMS OTP
POST /api/v1/auth/refresh        # Refresh access token
POST /api/v1/auth/logout         # Revoke token
POST /api/v1/auth/mfa/setup      # Setup TOTP (returns QR URI)
POST /api/v1/auth/mfa/enable     # Enable MFA after verify OTP
```

### Integration (Sale System)
```
POST /api/v1/integration/applications   # Create app (API Key + HMAC)
```

### Workflow
```
GET  /api/v1/workflow/queue             # Approval queue by level
POST /api/v1/workflow/:id/submit        # Submit draft to L1
POST /api/v1/workflow/:id/action        # APPROVE/REJECT/RETURN/ESCALATE
GET  /api/v1/workflow/:id/history       # Workflow history
```

### Questionnaire
```
GET  /api/v1/questionnaire/:appId/form  # Get form with conditional logic
POST /api/v1/questionnaire/:appId/save  # Save draft answers
POST /api/v1/questionnaire/:appId/submit # Submit answers → trigger workflow
```

### Reports
```
GET  /api/v1/reports/dashboard          # Dashboard statistics
GET  /api/v1/reports/applications       # Application report (date range)
GET  /api/v1/reports/sla                # SLA report
GET  /api/v1/reports/export/excel       # Export to Excel
GET  /api/v1/reports/approver-performance # Approver statistics
```

### Users (Admin)
```
GET    /api/v1/users                    # List users
POST   /api/v1/users                    # Create user
PATCH  /api/v1/users/:id               # Update user
DELETE /api/v1/users/:id               # Soft delete
POST   /api/v1/users/change-password   # Change password
POST   /api/v1/users/delegations        # Create delegation
GET    /api/v1/users/delegations/active # Active delegations
```

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT RS256, 15min access / 8h refresh |
| MFA | TOTP (Google Authenticator) + SMS OTP for L3+ |
| Token Revocation | Redis JTI blacklist |
| Password Policy | 8+ chars, upper+lower+digit+special, no reuse of 5 |
| Account Lockout | 5 failed attempts → 30min lock |
| PII Encryption | AES-256-GCM (nationalId, income, phone) |
| PII Lookup | SHA-256 hash (constant-time comparison) |
| Data Masking | By role (e.g. `X-XXXX-XXXXX-XX-X`) |
| File Upload | Magic bytes validation (PDF/JPEG/PNG only) |
| API Key Auth | HMAC-SHA256 + 5min replay prevention |
| Rate Limiting | 100 req/min global, 5/min on login |
| Audit Log | Immutable — all state changes recorded |
| CORS | Restricted to configured origins |
| Helmet | CSP, HSTS, X-Frame-Options |

---

## Database Entities (21 Tables)

```
users                 roles                 user_delegations
customers             loan_applications     products
approval_workflows    approval_matrices     approval_criteria
questions             question_categories   question_options
form_templates        form_questions        answers
scoring_models        scoring_rules         application_scores
blacklists            notifications         audit_logs
```

---

## Application Status Flow

```
DRAFT ──► SUBMITTED ──► PENDING_L1 ──► PENDING_L2 ──► ... ──► PENDING_L7
                │                                                     │
                │◄── RETURNED (กลับแก้ไข) ◄───────────────────────────┤
                │                                                     │
                └──► AUTO_REJECTED (blacklist / score)       APPROVED │
                                                             REJECTED ┘
```

Application ID format: `LOS-YYYYMMDD-XXXXXXXX`

---

## Cron Jobs

| Job | Schedule | หน้าที่ |
|-----|----------|--------|
| SLA Monitor | ทุก 30 นาที | ตรวจ SLA breach + mark expired drafts |

---

## Development Commands

```bash
# Backend
npm run start:dev      # Watch mode
npm run build          # Production build
npm run seed           # Seed database
npm run test           # Jest unit tests
npm run test:cov       # Coverage report

# Frontend
npm run dev            # Vite dev server
npm run build          # Production build
npm run preview        # Preview production build

# Docker
docker-compose up -d           # Start all services
docker-compose down            # Stop all
docker-compose logs -f backend # Follow backend logs
docker-compose exec postgres psql -U los_user los_db  # DB shell
```

---

## โครงสร้าง Project

```
LOS/
├── docker-compose.yml
├── .env
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── guards/         # JWT, Roles
│   │   │   ├── filters/        # Exception filter
│   │   │   ├── interceptors/
│   │   │   ├── enums/
│   │   │   └── utils/          # crypto, application-id
│   │   ├── database/
│   │   │   ├── entities/       # 21 TypeORM entities
│   │   │   └── seed.ts
│   │   └── modules/
│   │       ├── auth/           # Login, MFA, refresh, logout
│   │       ├── integration/    # Sale System API
│   │       ├── workflow/       # Approval engine + SLA monitor
│   │       ├── questionnaire/  # Forms + conditional logic
│   │       ├── users/          # User management + delegation
│   │       ├── master/         # Products, questions, blacklist
│   │       ├── notifications/  # Email/SMS queue
│   │       ├── reports/        # Dashboard + Excel export
│   │       └── minio/          # File upload service
│   └── database/
│       └── init.sql
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── components/        # Layout, sidebar
        ├── pages/             # All 13 pages
        ├── services/          # API client (axios)
        ├── stores/            # Zustand auth store
        └── utils/             # JWT decode
```
