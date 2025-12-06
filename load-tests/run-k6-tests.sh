#!/bin/bash

# Script para executar testes K6 automaticamente
# Uso: ./run-k6-tests.sh [test-type]
# Tipos: smoke, load, stress, spike, soak, all

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Verificar se k6 está instalado
if ! command -v k6 &> /dev/null; then
    print_error "K6 não está instalado!"
    print_info "Instale com: ./install-tools.sh"
    exit 1
fi

# Detectar tipo de cluster e obter URL base
if [ -n "$BASE_URL" ]; then
    # URL fornecida manualmente via variável de ambiente
    print_info "Usando URL base fornecida: $BASE_URL"
elif command -v minikube &> /dev/null && minikube status &> /dev/null; then
    # Minikube detectado e rodando
    MINIKUBE_IP=$(minikube ip 2>/dev/null)
    BASE_URL="http://${MINIKUBE_IP}:30000"
    print_info "Minikube detectado - URL base: $BASE_URL"
elif kubectl get nodes &> /dev/null; then
    # K3s ou outro Kubernetes detectado
    GATEWAY_PORT=$(kubectl get svc svc-api-gateway -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null)

    if [ -n "$GATEWAY_PORT" ]; then
        # Usar localhost (funciona para K3s local e WSL2)
        BASE_URL="http://localhost:${GATEWAY_PORT}"
        print_info "K3s/Kubernetes detectado - URL base: $BASE_URL"
    else
        print_error "Não foi possível detectar o gateway service!"
        print_info "Defina manualmente: export BASE_URL=\"http://IP:PORTA\""
        exit 1
    fi
else
    print_error "Nenhum cluster Kubernetes detectado!"
    echo ""
    print_info "Opções:"
    echo "  1. Inicie o Minikube: ./init.sh"
    echo "  2. Configure K3s: cd k3s-setup && ./install-master.sh"
    echo "  3. Defina URL manual: export BASE_URL=\"http://IP:PORTA\""
    exit 1
fi

# Criar diretório de relatórios com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="reports/k6_${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

# Função para executar um teste
run_test() {
    local test_name=$1
    local test_file="k6/${test_name}.js"

    if [ ! -f "$test_file" ]; then
        print_error "Arquivo de teste não encontrado: $test_file"
        return 1
    fi

    print_info "Executando teste: $test_name"
    echo "=================================================="

    # Executar k6 com export para HTML e JSON
    k6 run \
        --out json="${REPORT_DIR}/${test_name}.json" \
        --summary-export="${REPORT_DIR}/${test_name}_summary.json" \
        -e BASE_URL="$BASE_URL" \
        "$test_file"

    if [ $? -eq 0 ]; then
        print_success "Teste $test_name concluído!"
        print_info "Relatórios salvos em: $REPORT_DIR"
    else
        print_error "Teste $test_name falhou!"
        return 1
    fi

    echo ""
}

# Menu de testes
TEST_TYPE=${1:-menu}

case $TEST_TYPE in
    smoke)
        run_test "smoke-test"
        ;;
    load)
        run_test "load-test"
        ;;
    stress)
        run_test "stress-test"
        ;;
    spike)
        run_test "spike-test"
        ;;
    soak)
        print_warning "Soak test demora ~40 minutos. Tem certeza? (y/N)"
        read -r confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            run_test "soak-test"
        else
            print_info "Soak test cancelado"
        fi
        ;;
    all)
        print_info "Executando TODOS os testes (exceto soak)"
        print_warning "Isso vai demorar aproximadamente 1 hora"
        echo ""

        run_test "smoke-test"
        sleep 30

        run_test "load-test"
        sleep 30

        run_test "stress-test"
        sleep 30

        run_test "spike-test"

        print_success "Todos os testes concluídos!"
        ;;
    menu|*)
        echo "=================================================="
        echo "🚀 K6 Load Testing Suite"
        echo "=================================================="
        echo "Selecione o tipo de teste:"
        echo ""
        echo "1) Smoke Test    (2 min)  - Teste básico de funcionamento"
        echo "2) Load Test     (16 min) - Teste de carga normal"
        echo "3) Stress Test   (30 min) - Teste dos limites do sistema"
        echo "4) Spike Test    (5 min)  - Teste de picos súbitos"
        echo "5) Soak Test     (40 min) - Teste de longa duração"
        echo "6) All Tests     (~1h)    - Todos exceto Soak"
        echo ""
        echo -n "Digite o número da opção [1-6]: "
        read -r option

        case $option in
            1) run_test "smoke-test" ;;
            2) run_test "load-test" ;;
            3) run_test "stress-test" ;;
            4) run_test "spike-test" ;;
            5)
                print_warning "Soak test demora ~40 minutos. Confirma? (y/N)"
                read -r confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    run_test "soak-test"
                fi
                ;;
            6)
                print_warning "Executar todos os testes vai demorar ~1 hora. Confirma? (y/N)"
                read -r confirm
                if [[ $confirm =~ ^[Yy]$ ]]; then
                    $0 all
                fi
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
echo "=================================================="
print_info "Relatórios disponíveis em: $REPORT_DIR"
print_info "Para ver métricas do HPA: kubectl get hpa -w"
print_info "Para ver pods: kubectl get pods"
echo "=================================================="
