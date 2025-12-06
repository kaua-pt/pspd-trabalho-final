#!/bin/bash

# Script para verificar conectividade e configuração do cluster K3s
# Execute este script em qualquer máquina para diagnosticar problemas

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_title() {
    echo -e "${CYAN}$1${NC}"
}

# Banner
clear
echo ""
print_title "╔════════════════════════════════════════════════════╗"
print_title "║       🔍 K3s Cluster Diagnostic Tool              ║"
print_title "╚════════════════════════════════════════════════════╝"
echo ""

# Detectar tipo de node
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "1. Detectando tipo de node"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if systemctl is-active --quiet k3s; then
    NODE_TYPE="master"
    SERVICE_NAME="k3s"
    print_success "Detectado: K3s Master (Server)"
elif systemctl is-active --quiet k3s-agent; then
    NODE_TYPE="worker"
    SERVICE_NAME="k3s-agent"
    print_success "Detectado: K3s Worker (Agent)"
else
    NODE_TYPE="none"
    print_error "K3s não está instalado ou não está rodando"
    echo ""
    print_info "Instale o K3s:"
    echo "  • Master: cd k3s-setup && sudo ./install-master.sh"
    echo "  • Worker: cd k3s-setup && sudo ./install-worker.sh"
    exit 1
fi

echo ""
HOSTNAME=$(hostname)
IP_ADDRESS=$(hostname -I | awk '{print $1}')
echo -e "  ${BLUE}Hostname:${NC}  $HOSTNAME"
echo -e "  ${BLUE}IP:${NC}        $IP_ADDRESS"
echo -e "  ${BLUE}Tipo:${NC}      $NODE_TYPE"
echo ""

# Status do serviço
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "2. Status do serviço K3s"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sudo systemctl status $SERVICE_NAME --no-pager -l | head -20
echo ""

if systemctl is-active --quiet $SERVICE_NAME; then
    print_success "Serviço $SERVICE_NAME está rodando"
else
    print_error "Serviço $SERVICE_NAME NÃO está rodando!"
    print_info "Tente iniciar: sudo systemctl start $SERVICE_NAME"
    print_info "Ver logs: sudo journalctl -u $SERVICE_NAME -xe"
fi

echo ""

# Verificar kubectl
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "3. Configuração do kubectl"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$NODE_TYPE" = "master" ]; then
    # Master deve ter kubeconfig
    if [ -f "$HOME/.kube/config" ]; then
        print_success "Kubeconfig encontrado: $HOME/.kube/config"

        # Testar kubectl
        if kubectl get nodes &>/dev/null; then
            print_success "kubectl funcionando corretamente"
        else
            print_error "kubectl não consegue conectar ao cluster"
            print_info "Reconfigure o kubeconfig:"
            echo ""
            echo "  mkdir -p $HOME/.kube"
            echo "  sudo cp /etc/rancher/k3s/k3s.yaml $HOME/.kube/config"
            echo "  sudo chown \$USER:\$USER $HOME/.kube/config"
        fi
    else
        print_warning "Kubeconfig não encontrado"
        print_info "Configure o kubectl (execute como seu usuário, não como root):"
        echo ""
        echo "  mkdir -p ~/.kube"
        echo "  sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config"
        echo "  sudo chown \$USER:\$USER ~/.kube/config"
    fi
elif [ "$NODE_TYPE" = "worker" ]; then
    print_info "Workers não precisam de kubectl configurado"
    print_info "Execute comandos kubectl no MASTER"
fi

echo ""

# Listar nodes (apenas no master)
if [ "$NODE_TYPE" = "master" ] && kubectl get nodes &>/dev/null; then
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "4. Nodes no Cluster"
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    kubectl get nodes -o wide
    echo ""

    NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
    READY_COUNT=$(kubectl get nodes --no-headers | grep -c " Ready ")

    echo -e "  ${BLUE}Total de nodes:${NC}  $NODE_COUNT"
    echo -e "  ${BLUE}Nodes prontos:${NC}   $READY_COUNT"

    if [ "$NODE_COUNT" -eq "$READY_COUNT" ]; then
        print_success "Todos os nodes estão prontos!"
    else
        print_warning "Alguns nodes não estão prontos"
    fi

    echo ""
fi

# Verificar pods (apenas no master)
if [ "$NODE_TYPE" = "master" ] && kubectl get pods &>/dev/null; then
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "5. Pods no Cluster"
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    kubectl get pods -A | head -20
    echo ""

    TOTAL_PODS=$(kubectl get pods -A --no-headers | wc -l)
    RUNNING_PODS=$(kubectl get pods -A --no-headers | grep -c "Running" || echo "0")

    echo -e "  ${BLUE}Total de pods:${NC}     $TOTAL_PODS"
    echo -e "  ${BLUE}Pods rodando:${NC}      $RUNNING_PODS"
    echo ""
fi

# Verificar conectividade (worker)
if [ "$NODE_TYPE" = "worker" ]; then
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "4. Conectividade com o Master"
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Tentar extrair URL do master dos logs
    MASTER_URL=$(sudo journalctl -u k3s-agent --no-pager | grep -oP 'K3S_URL=\K[^ ]+' | tail -1)

    if [ -n "$MASTER_URL" ]; then
        MASTER_IP=$(echo $MASTER_URL | sed -E 's|https?://([^:]+):.*|\1|')
        echo -e "  ${BLUE}Master URL:${NC}  $MASTER_URL"
        echo -e "  ${BLUE}Master IP:${NC}   $MASTER_IP"
        echo ""

        print_info "Testando conectividade..."
        if ping -c 2 "$MASTER_IP" &>/dev/null; then
            print_success "Conectividade OK com o Master ($MASTER_IP)"
        else
            print_error "Não foi possível conectar ao Master ($MASTER_IP)"
            print_info "Verifique rede e firewall"
        fi
    else
        print_warning "Não foi possível detectar URL do Master"
    fi
    echo ""
fi

# Verificar portas
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "6. Portas em uso"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$NODE_TYPE" = "master" ]; then
    print_info "Portas do Master:"
    echo ""
    echo -e "  ${BLUE}6443${NC}  - Kubernetes API (deve estar em LISTEN)"
    sudo ss -tlnp | grep ":6443" || echo "       ❌ Porta 6443 não está aberta"
    echo ""
    echo -e "  ${BLUE}10250${NC} - Kubelet (deve estar em LISTEN)"
    sudo ss -tlnp | grep ":10250" || echo "       ❌ Porta 10250 não está aberta"
else
    print_info "Portas do Worker:"
    echo ""
    echo -e "  ${BLUE}10250${NC} - Kubelet (deve estar em LISTEN)"
    sudo ss -tlnp | grep ":10250" || echo "       ❌ Porta 10250 não está aberta"
fi

echo ""

# Informações finais
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "7. Comandos Úteis"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$NODE_TYPE" = "master" ]; then
    echo "Ver cluster:"
    echo "  kubectl get nodes -o wide"
    echo "  kubectl get pods -A"
    echo "  kubectl cluster-info"
    echo ""
    echo "Ver token para workers:"
    echo "  sudo cat /var/lib/rancher/k3s/server/node-token"
    echo ""
    echo "Reiniciar K3s:"
    echo "  sudo systemctl restart k3s"
    echo ""
    echo "Logs:"
    echo "  sudo journalctl -u k3s -f"
else
    echo "Status do worker:"
    echo "  sudo systemctl status k3s-agent"
    echo ""
    echo "Reiniciar K3s Agent:"
    echo "  sudo systemctl restart k3s-agent"
    echo ""
    echo "Logs:"
    echo "  sudo journalctl -u k3s-agent -f"
    echo ""
    echo "Ver nodes (execute no MASTER):"
    echo "  kubectl get nodes"
fi

echo ""
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
