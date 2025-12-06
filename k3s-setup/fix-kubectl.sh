#!/bin/bash

# Script para corrigir configuração do kubectl no Master K3s
# Execute este script se kubectl mostrar erro de conexão

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

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       🔧 Fix kubectl Configuration                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se é o master
if ! systemctl is-active --quiet k3s; then
    print_error "Este script deve ser executado no Master K3s"
    print_info "K3s Server não está rodando nesta máquina"
    exit 1
fi

print_info "Master K3s detectado"
echo ""

# Verificar se kubeconfig existe
if [ ! -f "/etc/rancher/k3s/k3s.yaml" ]; then
    print_error "Arquivo k3s.yaml não encontrado!"
    print_info "Reinstale o K3s: sudo ./install-master.sh"
    exit 1
fi

print_success "Arquivo k3s.yaml encontrado"
echo ""

# Criar diretório .kube
print_info "Criando diretório ~/.kube..."
mkdir -p "$HOME/.kube"

# Copiar kubeconfig
print_info "Copiando kubeconfig..."
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"

# Ajustar permissões
print_info "Ajustando permissões..."
sudo chown "$USER:$USER" "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"

print_success "Kubeconfig configurado!"
echo ""

# Testar kubectl
print_info "Testando kubectl..."
echo ""

if kubectl get nodes &>/dev/null; then
    print_success "kubectl está funcionando!"
    echo ""
    kubectl get nodes
    echo ""
else
    print_error "kubectl ainda não está funcionando"
    echo ""
    print_info "Verifique se o K3s está rodando:"
    echo "  sudo systemctl status k3s"
    echo ""
    print_info "Tente manualmente:"
    echo "  export KUBECONFIG=$HOME/.kube/config"
    echo "  kubectl get nodes"
    exit 1
fi

# Adicionar ao .bashrc para persistir
if ! grep -q "KUBECONFIG" "$HOME/.bashrc" 2>/dev/null; then
    print_info "Adicionando KUBECONFIG ao .bashrc..."
    echo "" >> "$HOME/.bashrc"
    echo "# K3s kubectl configuration" >> "$HOME/.bashrc"
    echo "export KUBECONFIG=\$HOME/.kube/config" >> "$HOME/.bashrc"
    print_success "Configuração adicionada ao .bashrc"
else
    print_info "KUBECONFIG já está no .bashrc"
fi

echo ""
print_success "Configuração concluída!"
echo ""
print_info "Comandos úteis:"
echo "  • Ver nodes:    kubectl get nodes"
echo "  • Ver pods:     kubectl get pods -A"
echo "  • Ver services: kubectl get svc"
echo ""
