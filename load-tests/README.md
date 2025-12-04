# 🔥 Testes de Carga - Sistema Gateway + Microsserviços

Este diretório contém uma suite completa de testes de carga para validar a performance, escalabilidade e resiliência do sistema de microsserviços com autoscaling.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Ferramentas](#ferramentas)
- [Instalação](#instalação)
- [Testes K6](#testes-k6)
- [Testes Locust](#testes-locust)
- [Monitoramento](#monitoramento)
- [Tipos de Teste](#tipos-de-teste)
- [Interpretando Resultados](#interpretando-resultados)

---

## 🎯 Visão Geral

O sistema sob teste consiste em:
- **Gateway API** (HTTP REST)
- **Microsserviço A** - Link Shortener (gRPC)
- **Microsserviço B** - QR Code Generator (gRPC)
- **Kubernetes** com 3 nós (1 Master + 2 Workers)
- **HPA** (Horizontal Pod Autoscaler) configurado

### Endpoints Testados

| Endpoint | Método | Descrição | Carga Típica |
|----------|--------|-----------|--------------|
| `/url` | POST | Encurtador de URL | 60% do tráfego |
| `/qr` | POST | Gerador de QR Code | 40% do tráfego |

---

## 🛠️ Ferramentas

### K6
- **Descrição**: Ferramenta moderna de teste de carga open-source
- **Vantagens**: Scripts em JavaScript, métricas detalhadas, fácil automação
- **Uso**: Testes automatizados e CI/CD

### Locust
- **Descrição**: Framework Python para testes de carga
- **Vantagens**: Interface web interativa, testes distribuídos, fácil extensão
- **Uso**: Testes exploratórios e com interface visual

---

## 📦 Instalação

### Instalação Automática

```bash
cd load-tests
./install-tools.sh
```

Este script instala:
- K6
- Python 3 + pip + venv
- Locust (em ambiente virtual)

### Instalação Manual

#### K6

**Linux (Ubuntu/Debian):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**macOS:**
```bash
brew install k6
```

#### Locust

```bash
cd locust
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Verificação

```bash
k6 version
python3 --version
cd locust && source venv/bin/activate && locust --version
```

---

## 🚀 Testes K6

### Execução Rápida

```bash
# Menu interativo
./run-k6-tests.sh

# Executar teste específico
./run-k6-tests.sh smoke
./run-k6-tests.sh load
./run-k6-tests.sh stress
./run-k6-tests.sh spike
./run-k6-tests.sh soak

# Executar todos os testes
./run-k6-tests.sh all
```

### Execução Manual

```bash
# Obter IP do Minikube
MINIKUBE_IP=$(minikube ip)

# Executar teste
k6 run -e BASE_URL="http://${MINIKUBE_IP}:30000" k6/smoke-test.js

# Com export de relatórios
k6 run \
  --out json=reports/results.json \
  --summary-export=reports/summary.json \
  -e BASE_URL="http://${MINIKUBE_IP}:30000" \
  k6/load-test.js
```

### Scripts K6 Disponíveis

| Script | Duração | VUs* | Descrição |
|--------|---------|------|-----------|
| `smoke-test.js` | 2 min | 2-5 | Validação básica do sistema |
| `load-test.js` | 16 min | 10-20 | Carga normal esperada |
| `stress-test.js` | 30 min | 10-150 | Testa limites do sistema |
| `spike-test.js` | 5 min | 5-200 | Picos súbitos de carga |
| `soak-test.js` | 40 min | 20 | Teste de longa duração |

*VUs = Virtual Users (usuários virtuais)

---

## 🦗 Testes Locust

### Execução Rápida

```bash
# Menu interativo
./run-locust.sh

# Modo Web (interface interativa)
./run-locust.sh web
# Acesse: http://localhost:8089

# Modo Headless (automatizado)
./run-locust.sh headless

# Cenários predefinidos
./run-locust.sh shapes
```

### Execução Manual

#### Modo Web UI

```bash
cd locust
source venv/bin/activate
locust -f locustfile.py --host=http://$(minikube ip):30000
```

Acesse http://localhost:8089 e configure:
- **Number of users**: Quantidade de usuários simultâneos
- **Spawn rate**: Usuários por segundo
- **Host**: Preenchido automaticamente

#### Modo Headless

```bash
cd locust
source venv/bin/activate
locust -f locustfile.py \
  --host=http://$(minikube ip):30000 \
  --headless \
  -u 50 \
  -r 5 \
  --run-time 5m \
  --html=../reports/locust_report.html
```

#### Cenários Predefinidos (Shapes)

```bash
cd locust
source venv/bin/activate
locust -f scenarios.py \
  --host=http://$(minikube ip):30000 \
  --headless \
  --load-shape SpikeTestShape \
  --html=../reports/spike_report.html
```

**Shapes disponíveis:**
- `SmokeTestShape` - 2 minutos, carga baixa
- `LoadTestShape` - 10 minutos, ramp-up gradual
- `StressTestShape` - 20 minutos, carga crescente
- `SpikeTestShape` - 5 minutos, picos súbitos
- `WaveTestShape` - 15 minutos, padrão de ondas

### Tipos de Usuários Locust

No arquivo `locustfile.py`:

- **MicroserviceUser**: Usuário padrão (60% URL, 40% QR)
- **QuickLoadUser**: Usuário agressivo (apenas QR, menos wait time)
- **MixedWorkloadUser**: Workflow realista (encurta URL e gera QR)

---

## 📊 Monitoramento

### Script de Monitoramento

```bash
# Menu interativo
./monitor-hpa.sh

# Monitorar HPA
./monitor-hpa.sh hpa

# Monitorar Pods
./monitor-hpa.sh pods

# Métricas (CPU/Memória)
./monitor-hpa.sh metrics

# Status dos Nodes
./monitor-hpa.sh nodes

# Tudo em split screen (requer tmux)
./monitor-hpa.sh all

# Kubernetes Dashboard
./monitor-hpa.sh dashboard
```

### Comandos Kubectl Úteis

```bash
# HPA em tempo real
kubectl get hpa -w

# Pods em tempo real
kubectl get pods -w

# Métricas de CPU/Memória
kubectl top pods
kubectl top nodes

# Logs de um pod específico
kubectl logs -f <pod-name>

# Descrever HPA
kubectl describe hpa

# Events do cluster
kubectl get events --sort-by='.lastTimestamp'
```

### Configuração Recomendada para Testes

Abra 3 terminais:

**Terminal 1: Monitorar HPA**
```bash
kubectl get hpa -w
```

**Terminal 2: Monitorar Pods**
```bash
kubectl get pods -w
```

**Terminal 3: Executar Testes**
```bash
./run-k6-tests.sh stress
# ou
./run-locust.sh web
```

---

## 📝 Tipos de Teste

### 1. Smoke Test
**Objetivo**: Verificar se o sistema está funcionando básicamente
**Quando usar**: Antes de rodar testes maiores, após deploys
**Critério de sucesso**: Taxa de erro < 1%, tempo de resposta < 2s

### 2. Load Test
**Objetivo**: Testar com carga normal esperada
**Quando usar**: Validar performance em produção
**Critério de sucesso**: Sistema estável, HPA pode escalar mas não deve atingir limites

### 3. Stress Test
**Objetivo**: Encontrar os limites do sistema
**Quando usar**: Planejamento de capacidade
**Critério de sucesso**: Identificar ponto de quebra, sistema deve se recuperar após ramp-down

### 4. Spike Test
**Objetivo**: Testar resiliência a picos súbitos
**Quando usar**: Antes de eventos esperados (Black Friday, lançamentos)
**Critério de sucesso**: Sistema deve sobreviver ao pico, mesmo com degradação temporária

### 5. Soak Test
**Objetivo**: Detectar problemas de longa duração (memory leaks, etc.)
**Quando usar**: Antes de releases importantes
**Critério de sucesso**: Performance não deve degradar ao longo do tempo

---

## 📈 Interpretando Resultados

### Métricas K6

```
✓ http_req_duration..............: avg=250ms min=10ms med=200ms max=5s p(90)=500ms p(95)=800ms
✓ http_req_failed................: 0.01% (10 of 10000)
✓ http_reqs......................: 10000 (166.67/s)
✓ iteration_duration.............: avg=1.5s min=1s med=1.4s max=8s
✓ iterations.....................: 5000 (83.33/s)
✓ vus............................: 10 min=10 max=10
```

**Entendendo:**
- `http_req_duration`: Tempo de resposta (p95 < 2s é bom)
- `http_req_failed`: Taxa de erro (< 1% é aceitável)
- `http_reqs`: Requisições por segundo (throughput)
- `vus`: Usuários virtuais simultâneos

### Métricas Locust

Na interface web, observe:
- **RPS (Requests per Second)**: Throughput do sistema
- **Failures**: Taxa de falhas
- **Response Time**: Percentis (50%, 95%, 99%)
- **Charts**: Gráficos de RPS e tempo de resposta ao longo do tempo

### Métricas HPA

```
NAME                        REFERENCE                              TARGETS   MINPODS   MAXPODS   REPLICAS
microservice-a-grpc-hpa     Deployment/microservice-a-grpc-deploy  45%/50%   1         10        3
microservice-b-grpc-hpa     Deployment/microservice-b-grpc-deploy  78%/50%   1         10        5
```

**Análise:**
- `TARGETS`: CPU atual / Target (se > 100%, vai escalar)
- `REPLICAS`: Número atual de pods
- Escala up quando CPU > 50%
- Escala down quando CPU < 50% por 5 minutos

### Sinais de Problema

🔴 **Crítico:**
- Taxa de erro > 5%
- p95 > 5s
- HPA no limite de MAX_PODS por muito tempo
- Pods em CrashLoopBackOff

🟡 **Atenção:**
- Taxa de erro > 1%
- p95 > 2s
- CPU consistentemente > 80%
- Memory leak detectado (uso crescente no soak test)

🟢 **Saudável:**
- Taxa de erro < 1%
- p95 < 1s
- HPA escalando suavemente
- Sistema se recupera após stress

---

## 🎯 Workflow Recomendado

### 1. Preparação
```bash
# Garantir que o cluster está rodando
./init.sh

# Instalar ferramentas de teste
cd load-tests
./install-tools.sh
```

### 2. Validação Inicial
```bash
# Smoke test para garantir que está tudo funcionando
./run-k6-tests.sh smoke
```

### 3. Testes Progressivos
```bash
# Load test - carga normal
./run-k6-tests.sh load

# Stress test - encontrar limites
./run-k6-tests.sh stress

# Spike test - testar resiliência
./run-k6-tests.sh spike
```

### 4. Teste de Longa Duração
```bash
# Soak test - detectar problemas ao longo do tempo
./run-k6-tests.sh soak
```

### 5. Análise
- Revisar relatórios em `reports/`
- Analisar métricas do HPA
- Verificar logs dos pods se houver erros
- Ajustar configurações de HPA se necessário

---

## 📂 Estrutura de Arquivos

```
load-tests/
├── README.md                    # Este arquivo
├── install-tools.sh             # Instalação de ferramentas
├── run-k6-tests.sh             # Executor de testes K6
├── run-locust.sh               # Executor de testes Locust
├── monitor-hpa.sh              # Monitor de Kubernetes
├── k6/                         # Scripts K6
│   ├── config.js               # Configuração compartilhada
│   ├── smoke-test.js
│   ├── load-test.js
│   ├── stress-test.js
│   ├── spike-test.js
│   └── soak-test.js
├── locust/                     # Scripts Locust
│   ├── locustfile.py           # Arquivo principal
│   ├── scenarios.py            # Cenários com Shapes
│   ├── requirements.txt
│   └── venv/                   # Ambiente virtual Python
└── reports/                    # Relatórios gerados
    ├── k6_YYYYMMDD_HHMMSS/
    └── locust_YYYYMMDD_HHMMSS/
```

---

## 🔧 Troubleshooting

### K6

**Problema**: `Error: connection refused`
**Solução**: Verificar se minikube está rodando e se o IP está correto
```bash
minikube status
minikube ip
```

**Problema**: Testes muito lentos
**Solução**: Reduzir o número de VUs ou ajustar os stages

### Locust

**Problema**: `ModuleNotFoundError: No module named 'locust'`
**Solução**: Ativar o ambiente virtual
```bash
cd locust
source venv/bin/activate
```

**Problema**: Interface web não abre
**Solução**: Verificar se a porta 8089 está livre
```bash
lsof -i :8089
```

### Kubernetes

**Problema**: HPA não escala
**Solução**: Verificar se metrics-server está rodando
```bash
kubectl get deployment metrics-server -n kube-system
minikube addons enable metrics-server
```

**Problema**: Pods em Pending
**Solução**: Verificar recursos dos nodes
```bash
kubectl describe nodes
kubectl top nodes
```

---

## 📚 Referências

- [K6 Documentation](https://k6.io/docs/)
- [Locust Documentation](https://docs.locust.io/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Load Testing Best Practices](https://k6.io/docs/test-types/introduction/)

---

## 🤝 Contribuindo

Para adicionar novos cenários de teste:

1. **K6**: Criar novo arquivo em `k6/` seguindo o padrão dos existentes
2. **Locust**: Adicionar nova classe de usuário ou Shape em `locust/`
3. Atualizar este README com a nova documentação

---

## 📄 Licença

Este projeto é parte do trabalho acadêmico de Programação de Sistemas Paralelos e Distribuídos (PSPD) da UnB.
