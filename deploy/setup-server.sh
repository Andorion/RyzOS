#!/bin/bash
# RyzOS Server Setup Script
# Run this on a fresh Ubuntu EC2/Lightsail instance
# Usage: bash setup-server.sh andorion.net your-email@example.com

set -e

DOMAIN="${1:?Usage: bash setup-server.sh <domain> <email>}"
EMAIL="${2:?Usage: bash setup-server.sh <domain> <email>}"

echo "=== RyzOS Server Setup ==="
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# 1. System updates
echo ">>> Updating system..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. Install Node.js 20
echo ">>> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install nginx and certbot
echo ">>> Installing nginx + certbot..."
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 4. Install PM2 globally
echo ">>> Installing PM2..."
sudo npm install -g pm2

# 5. Create app directory and clone/copy files
echo ">>> Setting up app directory..."
sudo mkdir -p /opt/ryzos
sudo chown $USER:$USER /opt/ryzos

# If files are already in current dir, copy them
if [ -f "server.js" ]; then
  cp -r ./* /opt/ryzos/
  cd /opt/ryzos
else
  echo "!!! Place your RyzOS files in /opt/ryzos first, then re-run."
  exit 1
fi

# 6. Install dependencies
echo ">>> Installing Node dependencies..."
cd /opt/ryzos
npm ci --production 2>/dev/null || npm install --production

# 7. Configure nginx
echo ">>> Configuring nginx..."
sudo tee /etc/nginx/sites-available/ryzos > /dev/null <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/ryzos /etc/nginx/sites-enabled/ryzos
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 8. Start app with PM2
echo ">>> Starting RyzOS with PM2..."
cd /opt/ryzos
pm2 delete ryzos 2>/dev/null || true
PORT=8080 pm2 start server.js --name ryzos
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

# 9. SSL certificate
echo ">>> Obtaining SSL certificate..."
sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"

# 10. Auto-renew cron
echo ">>> Setting up SSL auto-renewal..."
(sudo crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | sudo crontab -

echo ""
echo "=== DONE ==="
echo "RyzOS is running at https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs ryzos      - View logs"
echo "  pm2 restart ryzos   - Restart app"
echo "  cd /opt/ryzos       - App directory"
