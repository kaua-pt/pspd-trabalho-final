#!/bin/bash

# Script para instalar K3s Master (Server)
# Execute este script na máquina que será o MASTER/Control Plane

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
echo -e "${BLUE}║       🚀 K3s Master Node Installation              ║${NC}"
echo -e "${BLUE}║       Kubernetes Leve para Multi-Máquinas          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Este script precisa ser executado com sudo"
    echo "Execute: sudo ./install-master.sh"
    exit 1
fi

print_info "Iniciando instalação do K3s Master Node..."
echo ""

# Obter IP da máquina
MASTER_IP=$(hostname -I | awk '{print $1}')
print_info "IP detectado desta máquina (Master): $MASTER_IP"
echo ""

# Confirmar instalação
read -p "Deseja continuar com a instalação? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_info "Instalação cancelada"
    exit 0
fi

echo ""
print_info "Instalando K3s Server..."

# Instalar K3s como Server (Master)
curl -sfL https://get.k3s.io | sh -s - server \
    --write-kubeconfig-mode 644 \
    --disable traefik \
    --node-external-ip "$MASTER_IP" \
    --advertise-address "$MASTER_IP" \
    --bind-address "$MASTER_IP"

# Aguardar K3s iniciar
print_info "Aguardando K3s inicializar..."
sleep 10

# Verificar se K3s está rodando
if ! systemctl is-active --quiet k3s; then
    print_error "K3s não está rodando!"
    print_info "Verifique os logs: sudo journalctl -u k3s -xe"
    exit 1
fi

print_success "K3s Master instalado com sucesso!"
echo ""

# Configurar kubectl para usuário normal
print_info "Configurando kubectl para usuário..."
REAL_USER=$(logname)
REAL_HOME=$(eval echo ~$REAL_USER)

mkdir -p "$REAL_HOME/.kube"
cp /etc/rancher/k3s/k3s.yaml "$REAL_HOME/.kube/config"
chown -R "$REAL_USER:$REAL_USER" "$REAL_HOME/.kube"
chmod 600 "$REAL_HOME/.kube/config"

print_success "Kubectl configurado!"
echo ""

# Obter token para workers
TOKEN=$(cat /var/lib/rancher/k3s/server/node-token)

# Exibir informações para conectar workers
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Instalação Concluída!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Informações do Cluster:"
echo ""
echo -e "  ${BLUE}Master IP:${NC}    $MASTER_IP"
echo -e "  ${BLUE}Node Token:${NC}   $TOKEN"
echo ""
print_warning "IMPORTANTE: Salve estas informações!"
echo ""
print_info "Para conectar workers, execute nas outras máquinas:"
echo ""
echo -e "  ${YELLOW}export K3S_URL=\"https://$MASTER_IP:6443\"${NC}"
echo -e "  ${YELLOW}export K3S_TOKEN=\"$TOKEN\"${NC}"
echo -e "  ${YELLOW}./install-worker.sh${NC}"
echo ""

# Salvar informações em arquivo
INFO_FILE="$REAL_HOME/k3s-cluster-info.txt"
cat > "$INFO_FILE" <<EOF
K3s Cluster Information
=======================

Master IP: $MASTER_IP
Node Token: $TOKEN

Para conectar workers:
export K3S_URL="https://$MASTER_IP:6443"
export K3S_TOKEN="$TOKEN"
./install-worker.sh

Gerado em: $(date)
EOF

chown "$REAL_USER:$REAL_USER" "$INFO_FILE"

print_success "Informações salvas em: $INFO_FILE"
echo ""

# Verificar nodes (usando kubeconfig do K3s diretamente)
print_info "Status do cluster:"
echo ""
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl get nodes
echo ""

# Instalar Metrics Server
print_info "Instalando Metrics Server para HPA..."
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch para funcionar em ambientes de desenvolvimento
KUBECONFIG=/etc/rancher/k3s/k3s.yaml kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

print_success "Metrics Server instalado!"
echo ""

# Comandos úteis
print_info "Comandos úteis:"
echo ""
echo "  • Ver nodes:           kubectl get nodes"
echo "  • Ver pods:            kubectl get pods -A"
echo "  • Ver services:        kubectl get svc -A"
echo "  • Ver token novamente: sudo cat /var/lib/rancher/k3s/server/node-token"
echo "  • Logs do K3s:         sudo journalctl -u k3s -f"
echo "  • Parar K3s:           sudo systemctl stop k3s"
echo "  • Iniciar K3s:         sudo systemctl start k3s"
echo "  • Desinstalar K3s:     /usr/local/bin/k3s-uninstall.sh"
echo ""

print_success "Master node pronto para receber workers!"
echo ""
