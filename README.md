# 🚀 Guia de Execução: Ambiente Kubernetes (Configuração Base)

Este guia descreve como rodar a versão Melhorada do projeto (Gateway + 2 Microsserviços gRPC) em um cluster Kubernetes simulado com 3 nós, incluindo Metrics Server e Horizontal Pod Autoscaling (HPA).

📋 Pré-requisitos

- Docker instalado e rodando.
- Minikube instalado.
- Kubectl instalado.
- O repositório clonado na máquina.

## ⚡ Passo 1: Inicialização Automática

Para facilitar a configuração do cluster Multi-Node e a aplicação de manifestos, utilize o script de automação `init.sh`.

Este script irá:

1. Limpar clusters antigos (minikube delete).

2. Iniciar um cluster de 3 nós (1 Master + 2 Workers).

3. Habilitar o Metrics Server (essencial para o Autoscaling).

4. Construir as imagens Docker localmente.

5. Carregar as imagens para dentro dos nós do Cluster.

6. Aplicar todos os manifestos (deployments, services e hpa).

```Bash
# Dar permissão de execução
chmod +x init.sh

# Rodar o script
./init.sh
```

## ✅ Passo 2: Teste de Funcionamento (Smoke Test)

Antes de testar a carga, verifique se a aplicação responde corretamente na porta exposta (`30000`).

1. Obtenha o IP do Cluster:

```Bash
minikube ip
```
2. Teste - Encurtador de Link (Via gRPC): Substitua IP_DO_MINIKUBE pelo valor obtido acima.

```Bash
curl -X POST http://IP_DO_MINIKUBE:30000/url \
-H "Content-Type: application/json" \
-H "x-protocol-choice: grpc" \
-d '{"url": "https://www.google.com"}'
```
3. Teste - Gerador de QR Code (Via gRPC):

```Bash
curl -X POST http://IP_DO_MINIKUBE:30000/qr \
-H "Content-Type: application/json" \
-H "x-protocol-choice: grpc" \
-d '{"text": "TesteGrupoPSPD"}'
```
Se receber os JSONs de resposta, o ambiente está validado!

## 📈 Passo 3: Teste de Autoscaling (HPA) em Ação

O objetivo aqui é ver o Kubernetes criar novas réplicas automaticamente quando a CPU sobe. Siga este roteiro com 3 terminais abertos:

### Terminal 1: O Observador (HPA)

Monitore o HPA para ver a carga subir e o número de réplicas aumentar.

```Bash
kubectl get hpa -w
```

### Terminal 2: O Fiscal (Pods)

Monitore a criação física dos novos contêineres.

```Bash
kubectl get pods -w
```

### Terminal 3: O Gerador de Carga (Stress)

Execute este script para disparar múltiplas requisições simultâneas e estressar a CPU do microsserviço.

```Bash
# 1. Defina o IP (se ainda não definiu)
IP=$(minikube ip)

echo "🔥 Iniciando teste de carga em http://$IP:30000/qr ..."

# 2. Loop infinito agressivo (4 processos paralelos)
for i in {1..4}; do
  while true; do 
    curl -s -o /dev/null -X POST http://$IP:30000/qr \
    -H "Content-Type: application/json" \
    -H "x-protocol-choice: grpc" \
    -d '{"text": "StressTestAutoscaling"}'
  done &
done

# Mantém rodando
wait
```

### 🛑 Como Parar o Teste

1. No Terminal 3 (Gerador de Carga), pressione `CTRL+C`.
2. Para garantir que os processos de fundo parem:
```Bash
killall curl
```
3. Observe o Terminal 1: Após alguns minutos sem carga, o Kubernetes fará o scale down (redução) das réplicas automaticamente, voltando para 1.

### 🧹 Limpeza Final

Para remover tudo e liberar recursos da sua máquina:

```Bash
minikube delete
```