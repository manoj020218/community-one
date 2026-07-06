# Jenix Community One — Setup Guide

## Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- MongoDB (running on port 27017 — local or VPS native install)

---

## 1. Start MongoDB

### Linux VPS (systemd)
```bash
sudo systemctl start mongod
sudo systemctl enable mongod   # auto-start on reboot
mongosh                        # verify connection
```

### Windows (local dev)
```bash
net start MongoDB              # if installed as service
# or: mongod --dbpath C:\data\db
```

---

## 2. Backend Setup

```bash
cd backend
pnpm install
```

Copy and configure environment:
```bash
cp .env.example .env
# Edit .env — change JWT secrets before production!
```

### Seed the database (roles, modules, reports, super admin)
```bash
pnpm run seed
```

### Start the API server
```bash
pnpm run dev        # development (ts-node-dev, hot reload)
pnpm run build      # compile TypeScript → dist/
pnpm start          # production (requires build first)
```

API runs at `http://localhost:5000`
Health check: `http://localhost:5000/health`

### Run tests
```bash
pnpm test
```

---

## 3. Frontend Setup

```bash
cd frontend
pnpm install
pnpm run dev        # development server
pnpm run build      # production build → dist/
pnpm run preview    # preview production build locally
```

App runs at `http://localhost:5173`

---

## 4. Default Login Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | admin@jenix.in     |
| Password | Admin@123          |
| Role     | JENIX_SUPER_ADMIN  |

---

## 5. First Steps After Login

1. Go to **Societies** → Create your first society
2. Open the society → click **Onboard** to launch the 7-step wizard
3. The wizard auto-generates Towers → Floors → Flats
4. Add residents, vehicles, and devices
5. Enable modules via **Module Registry**

---

## 6. VPS Deployment (no Docker)

### PM2 for process management
```bash
npm install -g pm2

# Backend
cd backend
pnpm run build
pm2 start dist/server.js --name jenix-api

# Frontend (Nginx serves the static build)
cd frontend
pnpm run build
# Copy dist/ to Nginx web root, e.g. /var/www/jenix/
```

### Nginx reverse proxy config
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploaded files
    location /uploads/ {
        proxy_pass http://localhost:5000;
    }

    # Frontend SPA
    location / {
        root /var/www/jenix;
        try_files $uri $uri/ /index.html;
    }
}
```

### PM2 auto-start on reboot
```bash
pm2 startup
pm2 save
```

---

## 7. API Endpoints Overview

| Resource        | Base Route              |
|-----------------|-------------------------|
| Auth            | POST /api/auth/login    |
| Societies       | /api/societies          |
| Towers          | /api/towers             |
| Floors          | /api/floors             |
| Flats           | /api/flats              |
| Residents       | /api/residents          |
| Vehicles        | /api/vehicles           |
| Pets            | /api/pets               |
| Payments        | /api/payments           |
| Receipts        | /api/receipts           |
| Devices         | /api/devices            |
| Notifications   | /api/notifications      |
| Audit Logs      | /api/audit              |
| File Upload     | POST /api/files/upload  |
| Reports         | /api/reports            |
| Module Registry | /api/modules            |
| Roles           | /api/roles              |
| Health          | GET /health             |

---

## 8. Production Environment Checklist

- [ ] Set `NODE_ENV=production` in backend `.env`
- [ ] Change `JWT_SECRET` → 64-character random string
- [ ] Change `JWT_REFRESH_SECRET` → different 64-character random string
- [ ] Update `MONGODB_URI` → production URI (with auth if enabled)
- [ ] Change `SUPER_ADMIN_PASSWORD` → strong password
- [ ] Set `FRONTEND_URL` → your deployed domain
- [ ] Enable MongoDB auth and create a dedicated user
- [ ] Configure firewall — only expose 80/443 publicly; keep 5000/27017 internal
- [ ] Set up SSL with Let's Encrypt (`certbot --nginx`)

---

## 9. Project Structure

```
jenix-community-one/
├── backend/
│   ├── src/
│   │   ├── config/         # env, database, constants
│   │   ├── common/         # middleware, utils, types, errors
│   │   ├── modules/        # feature modules (model+service+controller+routes)
│   │   ├── seeds/          # data seeders
│   │   └── tests/          # Jest test suite
│   ├── .env                # local dev config (DO NOT commit to git)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # layout + common components
│   │   ├── modules/        # page components per feature
│   │   ├── services/       # axios API client
│   │   ├── store/          # Zustand state stores
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # helpers (cn, formatters)
│   └── package.json
└── SETUP.md
```
