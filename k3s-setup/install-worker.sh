#!/bin/bash

# Script para instalar K3s Worker (Agent)
# Execute este script nas máquinas WORKER que vão se conectar ao master

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

# Banner
clear
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🔧 K3s Worker Node Installation              ║${NC}"
echo -e "${BLUE}║       Conecta ao Master K3s                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Este script precisa ser executado com sudo"
    echo "Execute: sudo ./install-worker.sh"
    exit 1
fi

print_info "Iniciando instalação do K3s Worker Node..."
echo ""

# Verificar se variáveis de ambiente estão definidas
if [ -z "$K3S_URL" ] || [ -z "$K3S_TOKEN" ]; then
    print_error "Variáveis de ambiente não definidas!"
    echo ""
    echo "Antes de executar este script, defina:"
    echo ""
    echo -e "  ${YELLOW}export K3S_URL=\"https://IP_DO_MASTER:6443\"${NC}"
    echo -e "  ${YELLOW}export K3S_TOKEN=\"TOKEN_DO_MASTER\"${NC}"
    echo ""
    echo "Obtenha estas informações executando no Master:"
    echo ""
    echo -e "  ${BLUE}cat ~/k3s-cluster-info.txt${NC}"
    echo ""
    exit 1
fi

# Obter IP desta máquina worker
WORKER_IP=$(hostname -I | awk '{print $1}')
WORKER_NAME=$(hostname)

print_info "IP detectado deste Worker: $WORKER_IP"
print_info "Nome do Worker: $WORKER_NAME"
echo ""
print_info "Master URL: $K3S_URL"
echo ""

# Confirmar instalação
read -p "Deseja continuar com a instalação? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_info "Instalação cancelada"
    exit 0
fi

echo ""
print_info "Testando conectividade com o Master..."

# Extrair IP do master da URL
MASTER_IP=$(echo $K3S_URL | sed -E 's|https?://([^:]+):.*|\1|')

# Testar conectividade
if ! ping -c 1 "$MASTER_IP" &> /dev/null; then
    print_warning "Não foi possível pingar o Master ($MASTER_IP)"
    print_info "Verifique se:"
    echo "  1. O Master está ligado e com K3s rodando"
    echo "  2. As máquinas estão na mesma rede"
    echo "  3. Firewall permite comunicação"
    echo ""
    read -p "Deseja continuar mesmo assim? (y/N): " force
    if [[ ! $force =~ ^[Yy]$ ]]; then
        print_info "Instalação cancelada"
        exit 0
    fi
fi

print_success "Conectividade OK!"
echo ""

print_info "Instalando K3s Agent..."

# Instalar K3s como Agent (Worker)
curl -sfL https://get.k3s.io | K3S_URL="$K3S_URL" K3S_TOKEN="$K3S_TOKEN" sh -s - agent \
    --node-external-ip "$WORKER_IP" \
    --node-name "$WORKER_NAME"

# Aguardar K3s Agent iniciar
print_info "Aguardando K3s Agent inicializar..."
sleep 10

# Verificar se K3s Agent está rodando
if ! systemctl is-active --quiet k3s-agent; then
    print_error "K3s Agent não está rodando!"
    print_info "Verifique os logs: sudo journalctl -u k3s-agent -xe"
    exit 1
fi

print_success "K3s Worker instalado com sucesso!"
echo ""

# Informações
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Instalação Concluída!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Worker Node Information:"
echo ""
echo -e "  ${BLUE}Worker Name:${NC}   $WORKER_NAME"
echo -e "  ${BLUE}Worker IP:${NC}     $WORKER_IP"
echo -e "  ${BLUE}Master URL:${NC}    $K3S_URL"
echo ""

print_warning "IMPORTANTE: Verifique no Master se este node foi adicionado:"
echo ""
echo -e "  No Master, execute: ${YELLOW}kubectl get nodes${NC}"
echo ""

# Comandos úteis
print_info "Comandos úteis (execute no MASTER):"
echo ""
echo "  • Ver todos os nodes:  kubectl get nodes"
echo "  • Detalhes deste node: kubectl describe node $WORKER_NAME"
echo "  • Labels deste node:   kubectl get node $WORKER_NAME --show-labels"
echo ""

print_info "Comandos úteis (neste WORKER):"
echo ""
echo "  • Status do K3s:       sudo systemctl status k3s-agent"
echo "  • Logs do K3s:         sudo journalctl -u k3s-agent -f"
echo "  • Parar K3s:           sudo systemctl stop k3s-agent"
echo "  • Iniciar K3s:         sudo systemctl start k3s-agent"
echo "  • Desinstalar K3s:     /usr/local/bin/k3s-agent-uninstall.sh"
echo ""

print_success "Worker node conectado ao cluster!"
echo ""
