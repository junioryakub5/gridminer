#!/bin/bash
# ============================================================
#  Deploy server to Hostinger VPS
#  Run from project root: bash deploy/deploy-server.sh
# ============================================================

VPS_IP="187.124.35.84"
VPS_USER="root"
VPS_PASS="Gbangbin@2001"
REMOTE_DIR="/var/www/cloudmining-api"

echo "📦 Deploying CloudMining API to VPS..."

# Step 1: rsync server files (exclude node_modules and SQLite data)
sshpass -p "$VPS_PASS" rsync -avz --progress \
  -e "ssh -o StrictHostKeyChecking=no" \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='*.db' --exclude='*.db-shm' --exclude='*.db-wal' \
  server/ $VPS_USER@$VPS_IP:$REMOTE_DIR/server/

# Step 2: Copy package files
sshpass -p "$VPS_PASS" rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no" \
  package.json package-lock.json \
  $VPS_USER@$VPS_IP:$REMOTE_DIR/

# Step 3: Copy deploy config
sshpass -p "$VPS_PASS" rsync -avz \
  -e "ssh -o StrictHostKeyChecking=no" \
  deploy/ $VPS_USER@$VPS_IP:$REMOTE_DIR/deploy/

# Step 4: Install dependencies on VPS and restart with PM2
sshpass -p "$VPS_PASS" ssh \
  -o StrictHostKeyChecking=no \
  $VPS_USER@$VPS_IP << 'REMOTE_COMMANDS'

set -e
cd /var/www/cloudmining-api

# Install Node if not present
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  pm2 startup systemd -u root --hp /root
fi

# Create log directory
mkdir -p /var/log/cloudmining
mkdir -p /var/www/cloudmining-api/server/uploads

# Install production dependencies
npm install --omit=dev

# Start/restart with PM2
if pm2 list | grep -q "cloudmining-api"; then
  pm2 restart cloudmining-api
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save

# Quick health check
sleep 3
curl -s http://localhost:3001/api/health || echo "Health check failed — check pm2 logs"

REMOTE_COMMANDS

echo ""
echo "✅ Deployment complete!"
echo "   API: http://$VPS_IP/api/health"
