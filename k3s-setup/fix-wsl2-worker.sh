#!/bin/bash

# Script para corrigir Worker K3s no WSL2
# Este script deve ser executado NO WORKER (WSL2) com sudo

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    print_error "Este script precisa ser executado com sudo"
    echo "Execute: sudo ./fix-wsl2-worker.sh"
    exit 1
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🔧 Fix K3s Worker for WSL2                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se é WSL2
if ! grep -qi microsoft /proc/version; then
    print_error "Este script é para WSL2. Sistema não detectado como WSL2."
    exit 1
fi

print_info "WSL2 detectado"
echo ""

# Detectar IPs
WSL2_IP=$(hostname -I | awk '{print $1}')
PHYSICAL_IP=$(hostname -I | awk '{print $2}')

echo -e "  ${BLUE}IP WSL2 (interno):${NC}  $WSL2_IP"
echo -e "  ${BLUE}IP Físico (rede):${NC}   $PHYSICAL_IP"
echo ""

print_warning "O K3s worker deve usar o IP físico ($PHYSICAL_IP), não o IP WSL2 ($WSL2_IP)"
echo ""

# Verificar variáveis de ambiente
if [ -z "$K3S_URL" ] || [ -z "$K3S_TOKEN" ]; then
    print_error "Variáveis de ambiente não definidas!"
    echo ""
    echo "Defina antes de executar:"
    echo ""
    echo -e "  ${YELLOW}export K3S_URL=\"https://IP_DO_MASTER:6443\"${NC}"
    echo -e "  ${YELLOW}export K3S_TOKEN=\"TOKEN_DO_MASTER\"${NC}"
    echo ""
    exit 1
fi

print_info "Master URL: $K3S_URL"
echo ""

# Confirmar
read -p "Deseja reinstalar o K3s Agent com o IP físico? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_info "Cancelado"
    exit 0
fi

echo ""
print_info "Passo 1: Desinstalando K3s Agent atual..."

if [ -f /usr/local/bin/k3s-agent-uninstall.sh ]; then
    /usr/local/bin/k3s-agent-uninstall.sh
    print_success "K3s Agent desinstalado"
else
    print_warning "K3s Agent não estava instalado"
fi

sleep 3

echo ""
print_info "Passo 2: Reinstalando K3s Agent com IP físico..."

# Instalar com IP físico explícito
curl -sfL https://get.k3s.io | K3S_URL="$K3S_URL" K3S_TOKEN="$K3S_TOKEN" sh -s - agent \
    --node-ip "$PHYSICAL_IP" \
    --node-external-ip "$PHYSICAL_IP" \
    --flannel-iface eth0 \
    --node-name "$(hostname)"

print_info "Aguardando K3s Agent iniciar..."
sleep 10

# Verificar status
if systemctl is-active --quiet k3s-agent; then
    print_success "K3s Agent rodando com sucesso!"
else
    print_error "K3s Agent não está rodando!"
    print_info "Verifique os logs: sudo journalctl -u k3s-agent -xe"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Worker Reconfigurado!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

print_info "Verificação (execute no MASTER):"
echo ""
echo "  kubectl get nodes -o wide"
echo ""
echo "O worker deve aparecer com IP: $PHYSICAL_IP"
echo ""

print_warning "PRÓXIMO PASSO: No MASTER, reimporte as imagens e reinicie os pods:"
echo ""
echo "  cd k3s-setup"
echo "  kubectl delete pods --all"
echo ""
