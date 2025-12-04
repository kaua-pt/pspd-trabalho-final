#!/bin/bash

# Script para instalar ferramentas de teste de carga
# Suporta: Linux (Ubuntu/Debian), macOS

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

# Detectar OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
fi

print_info "Sistema operacional detectado: $OS"
echo ""

# ===================================
# Instalar K6
# ===================================
print_info "Verificando K6..."

if command -v k6 &> /dev/null; then
    print_success "K6 já está instalado!"
    k6 version
else
    print_info "Instalando K6..."

    if [ "$OS" == "linux" ]; then
        sudo apt-get update
        sudo apt-get install k6 -y

    elif [ "$OS" == "macos" ]; then
        if command -v brew &> /dev/null; then
            brew install k6
        else
            print_error "Homebrew não encontrado. Instale em: https://brew.sh"
            exit 1
        fi
    else
        print_error "Sistema operacional não suportado para instalação automática"
        print_info "Instale manualmente: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    print_success "K6 instalado com sucesso!"
fi

echo ""

# ===================================
# Instalar Python e Locust
# ===================================
print_info "Verificando Python..."

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python já está instalado: $PYTHON_VERSION"
else
    print_info "Instalando Python 3..."

    if [ "$OS" == "linux" ]; then
        sudo apt-get update
        sudo apt-get install python3 python3-pip python3-venv -y
    elif [ "$OS" == "macos" ]; then
        brew install python3
    fi

    print_success "Python instalado!"
fi

# Criar venv e instalar Locust
print_info "Configurando ambiente virtual Python para Locust..."

cd locust
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

print_success "Locust instalado no ambiente virtual!"
deactivate

cd ..

echo ""

# ===================================
# Verificar instalações
# ===================================
echo "=================================================="
print_success "Instalação concluída!"
echo "=================================================="
echo ""
print_info "Ferramentas instaladas:"
echo "  - K6: $(k6 version)"
echo "  - Python: $(python3 --version)"
echo "  - Locust: $(cd locust && source venv/bin/activate && locust --version && deactivate && cd ..)"
echo ""
print_info "Próximos passos:"
echo "  1. Execute ./run-k6-tests.sh para testes K6"
echo "  2. Execute ./run-locust.sh para testes Locust"
echo "=================================================="
