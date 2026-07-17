#!/bin/bash
# ============================================================
#  CloudMining 2.0 — Hostinger VPS Setup Script
#  Run as root on Ubuntu 22.04/24.04
#  Usage: bash setup-vps.sh
# ============================================================
set -e

APP_DIR="/var/www/cloudmining-api"
NODE_VERSION="20"

echo "════════════════════════════════════════"
echo " CloudMining 2.0 — VPS Setup"
echo "════════════════════════════════════════"

# ── 1. System update ──────────────────────────────────────
echo "[1/7] Updating system..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# ── 2. Node.js 20 ─────────────────────────────────────────
echo "[2/7] Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs
node -v && npm -v

# ── 3. PM2 ────────────────────────────────────────────────
echo "[3/7] Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

# ── 4. App directory ──────────────────────────────────────
echo "[4/7] Setting up app directory..."
mkdir -p $APP_DIR/uploads
mkdir -p $APP_DIR/server

# ── 5. Copy server files (run this from your local machine) ─
echo "-----------------------------------------------------"
echo " MANUAL STEP:"
echo " From your local machine, run:"
echo "   rsync -avz --exclude='node_modules' --exclude='.git' \\"
echo "     ./server/ root@187.124.35.84:$APP_DIR/server/"
echo "   rsync -avz package.json package-lock.json \\"
echo "     root@187.124.35.84:$APP_DIR/"
echo "   ssh root@187.124.35.84 'cd $APP_DIR && npm install --omit=dev'"
echo "-----------------------------------------------------"

# ── 6. Nginx config ───────────────────────────────────────
echo "[6/7] Configuring Nginx..."
cat > /etc/nginx/sites-available/cloudmining-api << 'NGINX_EOF'
server {
    listen 80;
    server_name 187.124.35.84;

    # API proxy
    location /api/ {
        proxy_pass         http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # Upload files proxy
    location /uploads/ {
        proxy_pass http://localhost:3001;
    }

    location / {
        return 200 'CloudMining API is running';
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/cloudmining-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 7. Firewall ───────────────────────────────────────────
echo "[7/7] Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable

echo ""
echo "════════════════════════════════════════"
echo " ✅  VPS Setup Complete!"
echo ""
echo " Next steps:"
echo " 1. rsync your server files (see step 5 above)"
echo " 2. Create $APP_DIR/.env with your DATABASE_URL"
echo " 3. Run: cd $APP_DIR && pm2 start deploy/ecosystem.config.cjs"
echo " 4. Run: pm2 save"
echo "════════════════════════════════════════"
