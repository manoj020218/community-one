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

## 6. VPS — First-Time Setup

VPS path: `/root/projects/community`
GitHub:   `https://github.com/manoj020218/community-one`

```bash
# Clone the repo (first time only)
cd /root/projects
git clone https://github.com/manoj020218/community-one.git community
cd community

# Install PM2 globally (once)
pnpm add -g pm2

# Backend
cd /root/projects/community/backend
cp .env.example .env
nano .env                  # set JWT secrets, MONGODB_URI, etc.
pnpm install
pnpm run seed              # seed roles, modules, reports, super admin
pnpm run build
pm2 start dist/server.js --name jenix-api

# Frontend
cd /root/projects/community/frontend
pnpm install
pnpm run build
cp -r dist/* /var/www/jenix/   # or your Nginx web root

# Save PM2 process list and enable auto-start
pm2 startup                # follow the printed command
pm2 save
```

---

## 7. VPS — Updating the Project

Every time you push new code to GitHub, run these commands on the VPS to deploy the update:

```bash
cd /root/projects/community

# Pull latest code
git pull origin master

# ── Backend update ──────────────────────────────────────────
cd /root/projects/community/backend
pnpm install               # install any new dependencies
pnpm run build             # recompile TypeScript → dist/
pm2 restart jenix-api      # apply the new build (zero-downtime)
pm2 logs jenix-api --lines 20   # verify no startup errors

# ── Frontend update ─────────────────────────────────────────
cd /root/projects/community/frontend
pnpm install               # install any new dependencies
pnpm run build             # rebuild → dist/
cp -r dist/* /var/www/jenix/    # replace static files
```

**One-liner deploy script** — paste this as `/root/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "==> Pulling latest code..."
cd /root/projects/community
git pull origin master

echo "==> Building backend..."
cd backend
pnpm install --frozen-lockfile
pnpm run build
pm2 restart jenix-api

echo "==> Building frontend..."
cd ../frontend
pnpm install --frozen-lockfile
pnpm run build
cp -r dist/* /var/www/jenix/

echo "==> Done! API status:"
pm2 status jenix-api
```

Make it executable and run with:
```bash
chmod +x /root/deploy.sh
bash /root/deploy.sh
```

---

## 8. Nginx Config (VPS)

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
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Uploaded files served by backend
    location /uploads/ {
        proxy_pass http://localhost:5000;
    }

    # Frontend SPA — must come last
    location / {
        root /var/www/jenix;
        try_files $uri $uri/ /index.html;
    }
}
```

Apply config:
```bash
sudo nginx -t                     # test syntax
sudo systemctl reload nginx       # apply without downtime
```

SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## 9. PM2 Cheatsheet (VPS)

```bash
pm2 status                        # all processes
pm2 restart jenix-api             # restart after code update
pm2 logs jenix-api --lines 50     # live logs
pm2 monit                         # CPU/memory dashboard
pm2 reload jenix-api              # graceful reload (zero-downtime)
pm2 delete jenix-api              # remove process
```

---

## 10. API Endpoints Overview

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

## 11. Production Environment Checklist

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

## 12. Project Structure

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
