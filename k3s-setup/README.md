# 🚀 K3s Multi-Machine Setup

Este guia descreve como configurar o projeto em múltiplas máquinas usando **K3s** (Kubernetes leve), ideal para clusters distribuídos reais.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Requisitos](#requisitos)
- [Topologia do Cluster](#topologia-do-cluster)
- [Instalação Passo a Passo](#instalação-passo-a-passo)
- [Deploy da Aplicação](#deploy-da-aplicação)
- [Testes de Carga](#testes-de-carga)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

K3s é uma distribuição Kubernetes leve, perfeita para:
- ✅ Clusters multi-máquina
- ✅ Edge computing
- ✅ Ambientes com recursos limitados
- ✅ Produção real

### Diferenças vs Minikube

| Característica | Minikube | K3s |
|----------------|----------|-----|
| Tipo | Simulação local | Kubernetes real |
| Máquinas | 1 (multi-node simulado) | Múltiplas físicas |
| Produção | ❌ Não | ✅ Sim |
| Recursos | Alto (~4GB RAM) | Baixo (~512MB RAM) |
| Setup | Fácil | Moderado |

---

## 📦 Requisitos

### Cada Máquina Precisa

- **OS**: Linux (Ubuntu/Debian/CentOS/RHEL)
- **RAM**: Mínimo 512MB (recomendado 1GB+)
- **CPU**: 1 core (recomendado 2+)
- **Disco**: 10GB livre
- **Rede**: Todas as máquinas na mesma rede
- **Portas abertas**:
  - **Master**: 6443 (Kubernetes API), 10250 (kubelet)
  - **Workers**: 10250 (kubelet)

### Software

```bash
# Todas as máquinas
sudo apt-get update
sudo apt-get install -y curl
```

---

## 🏗️ Topologia do Cluster

### Configuração Mínima (2 máquinas)

```
┌─────────────────────┐
│   Máquina 1 (Master)│
│                     │
│  • K3s Server       │
│  • kubectl          │
│  • Control Plane    │
│  • Gateway API      │
│  • Prometheus       │
└─────────────────────┘
          │
          │ Rede Local
          │
┌─────────────────────┐
│  Máquina 2 (Worker) │
│                     │
│  • K3s Agent        │
│  • Microsserviço A  │
│  • Microsserviço B  │
└─────────────────────┘
```

### Configuração Ideal (4+ máquinas)

```
┌─────────────┐
│   Master    │  (Control Plane)
└─────────────┘
       │
   ┌───┴────┬─────────┬────────┐
   │        │         │        │
┌──┴──┐  ┌──┴──┐   ┌──┴──┐  ┌──┴──┐
│ W1  │  │ W2  │   │ W3  │  │ W4  │
│Gate │  │MsvcA│   │MsvcB│  │Prom │
└─────┘  └─────┘   └─────┘  └─────┘
```

---

## 🚀 Instalação Passo a Passo

### Passo 1: Preparar o Projeto

Em todas as máquinas (ou compartilhe via NFS/Git):

```bash
# Clone o repositório
git clone <seu-repo>
cd t3_stress
```

### Passo 2: Instalar Master Node

**Execute na Máquina 1 (Master):**

```bash
cd k3s-setup
sudo ./install-master.sh
```

O script irá:
1. Instalar K3s Server
2. Configurar kubectl
3. Instalar Metrics Server
4. Exibir o **Token** e **IP** para workers

**Salve estas informações!** Você precisará delas nos workers.

Exemplo de saída:
```
Master IP:    192.168.1.100
Node Token:   K10a1b2c3d4e5f6g7h8i9j0::server:abc123def456...
```

### Passo 3: Instalar Worker Nodes

**Execute na Máquina 2, 3, 4... (Workers):**

```bash
# Defina as variáveis (use os valores do Master)
export K3S_URL="https://192.168.1.100:6443"
export K3S_TOKEN="K10a1b2c3d4e5f6g7h8i9j0::server:abc123def456..."

# Execute a instalação
cd k3s-setup
sudo ./install-worker.sh
```

O script irá:
1. Verificar conectividade com o Master
2. Instalar K3s Agent
3. Conectar automaticamente ao cluster

### Passo 4: Verificar Cluster

**No Master, verifique os nodes:**

```bash
kubectl get nodes
```

Saída esperada:
```
NAME       STATUS   ROLES                  AGE   VERSION
master     Ready    control-plane,master   5m    v1.28.5+k3s1
worker1    Ready    <none>                 2m    v1.28.5+k3s1
worker2    Ready    <none>                 1m    v1.28.5+k3s1
```

✅ Todos devem estar **Ready**!

---

## 📦 Deploy da Aplicação

### Opção A: Script Automático (Recomendado)

**No Master:**

```bash
cd k3s-setup
./init-k3s.sh
```

O script irá:
1. Construir imagens Docker
2. Preparar imagens para K3s
3. Aplicar manifestos Kubernetes
4. Configurar HPA
5. Exibir URL de acesso

### Opção B: Manual

```bash
# 1. Construir imagens (no Master)
docker-compose build

# 2. Salvar imagens
docker save trabalho1-api-gateway:latest -o gateway.tar
docker save trabalho1-microservice-a-grpc:latest -o microservice-a.tar
docker save trabalho1-microservice-b-grpc:latest -o microservice-b.tar

# 3. Copiar para workers
scp *.tar user@worker1:/tmp/
scp *.tar user@worker2:/tmp/

# 4. Importar nos workers
ssh worker1 "sudo k3s ctr images import /tmp/gateway.tar /tmp/microservice-a.tar /tmp/microservice-b.tar"
ssh worker2 "sudo k3s ctr images import /tmp/gateway.tar /tmp/microservice-a.tar /tmp/microservice-b.tar"

# 5. Deploy (no Master)
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/prometheus.yaml
```

### Verificar Deploy

```bash
# Ver pods
kubectl get pods -w

# Ver services
kubectl get svc

# Ver HPA
kubectl get hpa
```

Aguarde até todos os pods estarem **Running**!

---

## 🧪 Testes de Carga

### Preparar Máquina de Testes

Pode ser sua máquina local ou uma quarta máquina:

```bash
# Instalar k6
sudo apt-get install k6

# Configurar URL do cluster
export BASE_URL="http://192.168.1.100:30000"  # IP do Master + NodePort

cd load-tests
./run-k6-tests.sh
```

### Executar Testes

```bash
# O script detecta automaticamente K3s ou Minikube
./run-k6-tests.sh stress
```

### Monitorar Durante Testes

**Terminal 1 (Master) - HPA:**
```bash
kubectl get hpa -w
```

**Terminal 2 (Master) - Pods:**
```bash
kubectl get pods -w
```

**Terminal 3 (Testes) - K6:**
```bash
cd load-tests
./run-k6-tests.sh stress
```

---

## 🔧 Comandos Úteis

### Gerenciamento do Cluster

```bash
# Ver todos os nodes
kubectl get nodes -o wide

# Ver pods em todos os namespaces
kubectl get pods -A

# Ver logs de um pod
kubectl logs -f <pod-name>

# Executar comando em um pod
kubectl exec -it <pod-name> -- sh

# Escalar manualmente
kubectl scale deployment api-gateway-deploy --replicas=5

# Ver eventos do cluster
kubectl get events --sort-by='.lastTimestamp'
```

### Informações do K3s

```bash
# Status do K3s
sudo systemctl status k3s        # Master
sudo systemctl status k3s-agent  # Workers

# Logs do K3s
sudo journalctl -u k3s -f        # Master
sudo journalctl -u k3s-agent -f  # Workers

# Configuração do cluster
kubectl cluster-info

# Versão do K3s
k3s --version
```

### Recuperar Token (se perdeu)

```bash
# No Master
sudo cat /var/lib/rancher/k3s/server/node-token
```

---

## 🐛 Troubleshooting

### Worker não conecta ao Master

**Problema**: Worker não aparece em `kubectl get nodes`

**Soluções**:

1. Verificar conectividade:
```bash
# No worker
ping <IP_DO_MASTER>
telnet <IP_DO_MASTER> 6443
```

2. Verificar firewall:
```bash
# No master, abrir portas
sudo ufw allow 6443/tcp
sudo ufw allow 10250/tcp
```

3. Verificar logs:
```bash
# No worker
sudo journalctl -u k3s-agent -xe
```

### Pods ficam em Pending

**Problema**: Pods não saem do estado **Pending**

**Soluções**:

1. Verificar recursos:
```bash
kubectl describe node <node-name>
kubectl top nodes
```

2. Verificar imagens:
```bash
# Listar imagens disponíveis no node
sudo k3s ctr images list | grep trabalho1
```

3. Ver eventos do pod:
```bash
kubectl describe pod <pod-name>
```

### HPA não escala

**Problema**: HPA não responde à carga

**Soluções**:

1. Verificar Metrics Server:
```bash
kubectl get deployment metrics-server -n kube-system
kubectl logs -n kube-system -l k8s-app=metrics-server
```

2. Ver métricas:
```bash
kubectl top pods
kubectl top nodes
```

3. Aguardar (~2-3 minutos):
```bash
kubectl get hpa -w
```

### Imagens não encontradas

**Problema**: `ImagePullBackOff` ou `ErrImagePull`

**Soluções**:

1. Importar imagens manualmente:
```bash
# Salvar no master
docker save trabalho1-api-gateway:latest -o gateway.tar

# Copiar para worker
scp gateway.tar user@worker:/tmp/

# Importar no worker
ssh worker "sudo k3s ctr images import /tmp/gateway.tar"
```

2. Usar image pull policy:
```yaml
# Em deployments.yaml
imagePullPolicy: IfNotPresent  # ou Never
```

---

## 🧹 Desinstalação

### Remover Aplicação

```bash
kubectl delete -f k8s/
```

### Desinstalar K3s

**No Master:**
```bash
/usr/local/bin/k3s-uninstall.sh
```

**Nos Workers:**
```bash
/usr/local/bin/k3s-agent-uninstall.sh
```

---

## 📚 Referências

- [K3s Documentation](https://docs.k3s.io/)
- [K3s GitHub](https://github.com/k3s-io/k3s)
- [K3s vs K8s](https://k3s.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

---

## 💡 Dicas de Produção

1. **Use um Registry**: Configure um Docker Registry local ou use DockerHub
2. **Backup**: Faça backup do token e configurações do Master
3. **Monitoramento**: Configure Prometheus + Grafana para produção
4. **Alta Disponibilidade**: Use múltiplos masters (embedded etcd)
5. **Segurança**: Configure TLS, RBAC, e network policies

---

## 📄 Licença

Este projeto é parte do trabalho acadêmico de Programação de Sistemas Paralelos e Distribuídos (PSPD) da UnB.
