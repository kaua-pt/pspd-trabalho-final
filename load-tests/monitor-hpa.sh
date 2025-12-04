#!/bin/bash

# Script para monitorar HPA e Pods durante testes de carga
# Executa em modo split screen ou múltiplas janelas

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

MODE=${1:-menu}

case $MODE in
    hpa)
        print_info "Monitorando HPA (Horizontal Pod Autoscaler)"
        print_info "Pressione Ctrl+C para sair"
        echo ""
        kubectl get hpa -w
        ;;

    pods)
        print_info "Monitorando Pods"
        print_info "Pressione Ctrl+C para sair"
        echo ""
        kubectl get pods -w
        ;;

    metrics)
        print_info "Métricas de CPU e Memória dos Pods"
        print_info "Atualizando a cada 5 segundos..."
        echo ""
        watch -n 5 "kubectl top pods"
        ;;

    nodes)
        print_info "Monitorando Nodes do cluster"
        echo ""
        kubectl get nodes
        echo ""
        print_info "Métricas dos Nodes:"
        kubectl top nodes
        ;;

    all)
        print_warning "Este modo requer 'tmux' instalado"

        if ! command -v tmux &> /dev/null; then
            echo "tmux não está instalado."
            echo "Instale com: sudo apt-get install tmux (Linux) ou brew install tmux (macOS)"
            exit 1
        fi

        # Criar sessão tmux com split screen
        tmux new-session -d -s load-test-monitor

        # Split horizontal
        tmux split-window -h

        # Split vertical no painel direito
        tmux select-pane -t 1
        tmux split-window -v

        # Comandos para cada painel
        tmux select-pane -t 0
        tmux send-keys "kubectl get hpa -w" C-m

        tmux select-pane -t 1
        tmux send-keys "kubectl get pods -w" C-m

        tmux select-pane -t 2
        tmux send-keys "watch -n 5 'kubectl top pods'" C-m

        # Attach na sessão
        tmux attach-session -t load-test-monitor
        ;;

    dashboard)
        print_info "Abrindo Kubernetes Dashboard..."
        minikube dashboard
        ;;

    menu|*)
        echo "=================================================="
        echo "📊 Monitor de Kubernetes durante Load Tests"
        echo "=================================================="
        echo ""
        echo "Selecione o que monitorar:"
        echo ""
        echo "1) HPA      - Horizontal Pod Autoscaler"
        echo "2) Pods     - Status dos Pods"
        echo "3) Metrics  - CPU/Memória dos Pods"
        echo "4) Nodes    - Status dos Nodes do cluster"
        echo "5) All      - Tudo em split screen (requer tmux)"
        echo "6) Dashboard - Kubernetes Dashboard Web UI"
        echo ""
        echo -n "Digite o número da opção [1-6]: "
        read -r option

        case $option in
            1) $0 hpa ;;
            2) $0 pods ;;
            3) $0 metrics ;;
            4) $0 nodes ;;
            5) $0 all ;;
            6) $0 dashboard ;;
            *)
                echo "Opção inválida!"
                exit 1
                ;;
        esac
        ;;
esac
