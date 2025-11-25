# 🚀 Guia de Execução: Ambiente Kubernetes (Configuração Base)

Este guia descreve como rodar a versão "Base" do projeto (Gateway + 2 Microsserviços gRPC) em um cluster Kubernetes local simulado com 3 nós.

📋 Pré-requisitos

- Docker instalado e rodando.
- Minikube instalado.
- Kubectl instalado.
- O repositório clonado na máquina.

## 🧹 Passo 1: Limpeza do Ambiente (Crucial)

Para evitar conflitos de IP ou erros de "cluster existente", sempre comece limpando o ambiente, especialmente se você já usou o Minikube para outros projetos ou testes single-node.

Abra o terminal e execute:

```Bash
# 1. Para o cluster atual
minikube stop

# 2. Deleta o cluster (remove configurações antigas de rede/nós)
minikube delete
```

## ⚙️ Passo 2: Iniciar o Cluster (Topologia 3 Nós)

O projeto exige 1 nó mestre e 2 workers. Execute:

```Bash
# Inicia o cluster com 3 nós simulados via Docker
minikube start --nodes 3
```

Verifique se subiu corretamente:

```Bash
kubectl get nodes
# Deve listar: minikube, minikube-m02, minikube-m03
```

## 📦 Passo 3: Build e Carga das Imagens

Como estamos usando um cluster multi-node, o comando `docker-env` do Minikube não funciona bem. A estratégia correta é: Construir na máquina host e carregar para dentro do cluster.

1. Construa as imagens localmente: (Nota: Construímos apenas os serviços gRPC e Gateway para evitar erros com os serviços REST legados)
```Bash
docker-compose build api-gateway microservice-a-grpc microservice-b-grpc
```
2. Carregue as imagens para os nós do Minikube: (Isso pode levar cerca de 1 a 2 minutos)
```Bash
minikube image load trabalho1-api-gateway:latest trabalho1-microservice-a-grpc:latest trabalho1-microservice-b-grpc:latest
```

## 🚀 Passo 4: Deploy no Kubernetes

Agora aplicamos os arquivos de configuração (Manifestos) que definem os Pods e Serviços.

```Bash
# 1. Cria os Serviços (DNS interno e acesso externo)
kubectl apply -f k8s/services.yaml

# 2. Cria os Deployments (Sobe os Pods)
kubectl apply -f k8s/deployments.yaml
```

Aguarde a inicialização:

```Bash
kubectl get pods -w
```

Siga em frente apenas quando todos os status estiverem `Running`.

## ✅ Passo 5: Teste de Funcionamento (Smoke Test)

Como o Gateway está exposto via `NodePort: 30000`, precisamos descobrir o IP do Minikube para acessá-lo.

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