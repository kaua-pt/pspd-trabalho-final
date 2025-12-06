#!/bin/bash

# Script para executar testes K6 automaticamente
# Uso: ./run-k6-tests.sh [protocol]
# Protocolos: grpc, rest, both

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_title() {
    echo -e "${MAGENTA}$1${NC}"
}

# Verificar se k6 está instalado
if ! command -v k6 &> /dev/null; then
    print_error "K6 não está instalado!"
    echo ""
    print_info "Instale o K6:"
    echo "  Linux/Debian: sudo apt-get install k6"
    echo "  macOS: brew install k6"
    echo "  Windows: choco install k6"
    echo "  Mais informações: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Verificar se Minikube está rodando
MINIKUBE_IP=$(minikube ip 2>/dev/null)
if [ -z "$MINIKUBE_IP" ]; then
    print_warning "Minikube não está rodando ou não está disponível!"
    print_info "Usando localhost como fallback..."
    BASE_URL="http://localhost:8000"
else
    BASE_URL="http://${MINIKUBE_IP}:30000"
fi

print_info "URL base: $BASE_URL"

# Criar diretório de relatórios com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="reports/k6_${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

# Função para executar um teste
run_test() {
    local protocol=$1
    local test_file="k6/stress-test.js"

    if [ ! -f "$test_file" ]; then
        print_error "Arquivo de teste não encontrado: $test_file"
        return 1
    fi

    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "Executando Stress Test com protocolo: ${protocol^^}"
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Executar k6 com export para JSON
    k6 run \
        --out json="${REPORT_DIR}/stress-test-${protocol}.json" \
        --summary-export="${REPORT_DIR}/stress-test-${protocol}_summary.json" \
        -e BASE_URL="$BASE_URL" \
        -e PROTOCOL="$protocol" \
        "$test_file"

    local exit_code=$?

    echo ""
    if [ $exit_code -eq 0 ]; then
        print_success "Teste com ${protocol^^} concluído com sucesso!"
    else
        print_error "Teste com ${protocol^^} falhou ou não atingiu os thresholds!"
    fi

    print_info "Relatórios salvos em: $REPORT_DIR"
    echo ""

    return $exit_code
}

# Função para mostrar status do cluster
show_cluster_status() {
    echo ""
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "Status do Cluster Kubernetes"
    print_title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if command -v kubectl &> /dev/null && [ -n "$MINIKUBE_IP" ]; then
        echo ""
        echo -e "${CYAN}Pods:${NC}"
        kubectl get pods 2>/dev/null || echo "Não foi possível obter status dos pods"

        echo ""
        echo -e "${CYAN}HPA (Horizontal Pod Autoscaler):${NC}"
        kubectl get hpa 2>/dev/null || echo "Nenhum HPA configurado"

        echo ""
        echo -e "${CYAN}Services:${NC}"
        kubectl get svc 2>/dev/null || echo "Não foi possível obter services"
    else
        print_warning "Kubectl não disponível ou cluster não está rodando"
    fi

    echo ""
}

# Função para aguardar entre testes
wait_between_tests() {
    local seconds=${1:-60}
    print_info "Aguardando ${seconds}s para estabilização do sistema..."

    for i in $(seq $seconds -1 1); do
        echo -ne "\r⏳ ${i}s restantes...  "
        sleep 1
    done
    echo -e "\r✅ Sistema estabilizado!    "
    echo ""
}

# Banner inicial
clear
echo ""
print_title "╔════════════════════════════════════════════════════╗"
print_title "║         🚀 K6 Stress Testing Suite                ║"
print_title "║         Testes de Stress para Microserviços       ║"
print_title "╚════════════════════════════════════════════════════╝"
echo ""

# Menu de testes
TEST_TYPE=${1:-menu}

case $TEST_TYPE in
    grpc)
        show_cluster_status
        run_test "grpc"
        ;;

    rest)
        show_cluster_status
        run_test "rest"
        ;;

    both|compare)
        print_info "Comparando performance REST vs gRPC"
        print_warning "Isso vai demorar aproximadamente 20 minutos"
        echo ""
        read -p "Deseja continuar? (y/N): " confirm

        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            print_info "Comparação cancelada"
            exit 0
        fi

        show_cluster_status

        # Teste com gRPC primeiro
        print_title "═══════════════════════════════════════════════════"
        print_info "Teste 1/2: Stress Test com gRPC"
        print_title "═══════════════════════════════════════════════════"
        run_test "grpc"
        wait_between_tests 120

        # Teste com REST
        print_title "═══════════════════════════════════════════════════"
        print_info "Teste 2/2: Stress Test com REST"
        print_title "═══════════════════════════════════════════════════"
        run_test "rest"

        echo ""
        print_success "Comparação concluída!"
        print_info "Compare os resultados em: $REPORT_DIR"
        ;;

    menu|*)
        show_cluster_status

        echo ""
        print_title "═══════════════════════════════════════════════════"
        echo "  Selecione o tipo de teste:"
        print_title "═══════════════════════════════════════════════════"
        echo ""
        echo "  1) Stress Test gRPC      (~10 min) - Testa com protocolo gRPC"
        echo "  2) Stress Test REST      (~10 min) - Testa com protocolo REST"
        echo "  3) Compare gRPC vs REST  (~20 min) - Compara ambos protocolos"
        echo "  4) Exit                            - Sair"
        echo ""
        echo -n "  Digite o número da opção [1-4]: "
        read -r option

        case $option in
            1)
                run_test "grpc"
                ;;
            2)
                run_test "rest"
                ;;
            3)
                print_warning "Comparar protocolos vai demorar ~20 minutos. Confirma? (y/N)"
                read -r confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    $0 both
                else
                    print_info "Comparação cancelada"
                fi
                ;;
            4)
                print_info "Saindo..."
                exit 0
                ;;
            *)
                print_error "Opção inválida!"
                exit 1
                ;;
        esac
        ;;
esac

# Resumo final
echo ""
print_title "═══════════════════════════════════════════════════"
print_info "Resumo dos Testes"
print_title "═══════════════════════════════════════════════════"
echo ""
print_info "📊 Relatórios salvos em: $REPORT_DIR"
echo ""
print_info "Comandos úteis:"
echo "  • Ver métricas HPA:     kubectl get hpa -w"
echo "  • Ver pods:             kubectl get pods"
echo "  • Ver logs Gateway:     kubectl logs -l app=api-gateway -f"
echo "  • Ver métricas:         kubectl top pods"
echo "  • Prometheus:           minikube service prometheus -n default"
echo ""
print_info "Análise dos resultados:"
echo "  • Relatórios JSON:      ls -lh $REPORT_DIR"
echo "  • Ver summary:          cat $REPORT_DIR/*_summary.json | jq"
echo ""
print_title "═══════════════════════════════════════════════════"
echo ""
