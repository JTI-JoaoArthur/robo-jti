#!/bin/bash
set -e

# =============================================================
#  Setup do robo-jti em VM Oracle Cloud (Ubuntu 22.04+ ARM)
#  Executar como: bash setup-oracle.sh
# =============================================================

echo ">>> Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

echo ">>> Instalando dependencias do sistema..."
sudo apt install -y curl git chromium-browser fonts-liberation libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxrandr2 xdg-utils

echo ">>> Instalando Node.js 20 via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo ">>> Verificando versoes..."
node -v
npm -v
chromium-browser --version

echo ">>> Instalando PM2 globalmente..."
sudo npm install -g pm2

echo ">>> Configurando PM2 para iniciar com o sistema..."
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash

echo ">>> Criando pasta do projeto..."
mkdir -p ~/robo-jti
echo ""
echo "============================================================"
echo "  Setup do sistema concluido!"
echo ""
echo "  Proximos passos:"
echo "    1. cd ~/robo-jti"
echo "    2. Copie os arquivos do projeto para esta pasta"
echo "    3. Crie o arquivo .env com suas credenciais"
echo "    4. npm install"
echo "    5. Siga o guia DEPLOY.md para o primeiro start"
echo "============================================================"
