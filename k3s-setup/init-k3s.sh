#!/bin/bash

# Script para fazer deploy da aplicação no cluster K3s
# Execute este script no MASTER após todos os workers estarem conectados

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
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
    echo -e "${MAGENTA}$1${NC}"
}

# Banner
clear
echo ""
print_title "╔════════════════════════════════════════════════════╗"
print_title "║     🚀 K3s Application Deployment                 ║"
print_title "║     Gateway + Microsserviços gRPC + HPA           ║"
print_title "╚════════════════════════════════════════════════════╝"
echo ""

# Verificar se kubectl está disponível
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl não encontrado!"
    print_info "Este script deve ser executado no MASTER"
    exit 1
fi

# Verificar se há nodes no cluster
NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
if [ "$NODE_COUNT" -eq 0 ]; then
    print_error "Nenhum node encontrado no cluster!"
    print_info "Instale o K3s master primeiro: ./install-master.sh"
    exit 1
fi

print_info "Cluster K3s detectado com $NODE_COUNT node(s)"
echo ""

# Mostrar nodes
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Nodes no Cluster:"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
kubectl get nodes
echo ""

# Confirmar deploy
if [ "$NODE_COUNT" -lt 2 ]; then
    print_warning "Recomendado ter pelo menos 2 nodes (1 master + 1 worker)"
    print_info "Atualmente há apenas $NODE_COUNT node(s)"
    echo ""
fi

read -p "Deseja continuar com o deploy? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_info "Deploy cancelado"
    exit 0
fi

echo ""
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Passo 1: Construindo Imagens Docker"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ir para o diretório raiz do projeto
cd "$(dirname "$0")/.."

# Construir imagens
print_info "Construindo imagens Docker..."
docker compose build api-gateway microservice-a-grpc microservice-b-grpc

print_success "Imagens construídas!"
echo ""

# Para K3s, as imagens precisam estar em um registry ou serem importadas
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Passo 2: Preparando Imagens para K3s"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_warning "IMPORTANTE: Escolha como disponibilizar as imagens Docker:"
echo ""
echo "  1) Salvar imagens e copiar para cada node (offline)"
echo "  2) Usar Docker Registry local (recomendado para produção)"
echo "  3) Já tenho as imagens disponíveis (pular)"
echo ""
read -p "Escolha uma opção [1-3]: " image_option

case $image_option in
    1)
        print_info "Salvando imagens em arquivos..."
        mkdir -p k3s-setup/images

        docker save trabalho1-api-gateway:latest -o k3s-setup/images/gateway.tar
        docker save trabalho1-microservice-a-grpc:latest -o k3s-setup/images/microservice-a.tar
        docker save trabalho1-microservice-b-grpc:latest -o k3s-setup/images/microservice-b.tar

        print_success "Imagens salvas em k3s-setup/images/"
        echo ""
        print_warning "Copie estas imagens para cada worker e importe com:"
        echo ""
        echo "  sudo k3s ctr images import gateway.tar"
        echo "  sudo k3s ctr images import microservice-a.tar"
        echo "  sudo k3s ctr images import microservice-b.tar"
        echo ""
        read -p "Pressione ENTER após importar as imagens em todos os nodes..."
        ;;
    2)
        print_info "Configurando registry local não implementado neste script"
        print_info "Por favor, configure um registry Docker e atualize as imagens"
        exit 1
        ;;
    3)
        print_info "Pulando preparação de imagens..."
        ;;
    *)
        print_error "Opção inválida!"
        exit 1
        ;;
esac

echo ""
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Passo 3: Verificando Metrics Server"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! kubectl get deployment metrics-server -n kube-system &>/dev/null; then
    print_warning "Metrics Server não encontrado, instalando..."
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

    # Patch para funcionar em ambientes de desenvolvimento
    kubectl patch deployment metrics-server -n kube-system --type='json' \
      -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

    print_info "Aguardando Metrics Server iniciar..."
    kubectl wait --for=condition=available --timeout=60s deployment/metrics-server -n kube-system || true
fi

print_success "Metrics Server OK!"
echo ""

print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Passo 4: Aplicando Manifestos Kubernetes"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Aplicar services
print_info "Aplicando Services..."
kubectl apply -f k8s/services.yaml
sleep 2

# Aplicar deployments
print_info "Aplicando Deployments..."
kubectl apply -f k8s/deployments.yaml
sleep 5

# Aplicar HPA
print_info "Aplicando HPA..."
kubectl apply -f k8s/prometheus.yaml || true

print_success "Manifestos aplicados!"
echo ""

print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Passo 5: Aguardando Pods Iniciarem"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

print_info "Aguardando pods ficarem prontos (pode demorar alguns minutos)..."
echo ""

kubectl get pods -w &
WATCH_PID=$!

sleep 30
kill $WATCH_PID 2>/dev/null || true

echo ""
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Status do Deployment"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Pods:"
kubectl get pods
echo ""

echo "Services:"
kubectl get svc
echo ""

echo "HPA:"
kubectl get hpa || echo "HPA ainda não disponível (normal, aguarde alguns minutos)"
echo ""

# Obter IP para acesso
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Informações de Acesso"
print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# No K3s, usar IP de qualquer node + NodePort
MASTER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
GATEWAY_PORT=$(kubectl get svc api-gateway-service -o jsonpath='{.spec.ports[0].nodePort}')

print_success "Deploy concluído!"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          🎉 Aplicação Disponível!                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}URL Base:${NC}     http://$MASTER_IP:$GATEWAY_PORT"
echo -e "  ${BLUE}Endpoint URL:${NC} http://$MASTER_IP:$GATEWAY_PORT/url"
echo -e "  ${BLUE}Endpoint QR:${NC}  http://$MASTER_IP:$GATEWAY_PORT/qr"
echo ""

# Teste básico
print_info "Teste de conectividade:"
echo ""
echo "  curl -X POST http://$MASTER_IP:$GATEWAY_PORT/url \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -H \"x-protocol-choice: grpc\" \\"
echo "    -d '{\"url\": \"https://www.google.com\"}'"
echo ""

print_info "Comandos úteis:"
echo ""
echo "  • Ver pods:        kubectl get pods -w"
echo "  • Ver HPA:         kubectl get hpa -w"
echo "  • Ver logs:        kubectl logs -f <pod-name>"
echo "  • Ver events:      kubectl get events --sort-by='.lastTimestamp'"
echo "  • Escalar manual:  kubectl scale deployment api-gateway-deploy --replicas=3"
echo ""

print_info "Para executar testes de carga:"
echo ""
echo "  cd load-tests"
echo "  export BASE_URL=\"http://$MASTER_IP:$GATEWAY_PORT\""
echo "  ./run-k6-tests.sh stress"
echo ""
