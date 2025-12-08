#!/bin/bash

# 1. Limpeza do ambiente anterior (evita conflitos de IP e nós)
echo "🧹 Limpando cluster anterior..."
minikube delete

# 2. Inicia o Minikube com 3 Nós (Requisito do Trabalho)
echo "🚀 Iniciando Minikube com 3 nós (1 Master + 2 Workers)..."
minikube start --nodes 3

# 3. Habilita o Metrics Server (Essencial para o HPA funcionar)
echo "📈 Habilitando Metrics Server..."
minikube addons enable metrics-server

# 4. Build das imagens (Localmente)
echo "🏗️ Construindo imagens localmente..."
# Removemos o 'eval minikube docker-env' pois ele falha em multi-node
docker compose build api-gateway microservice-a-grpc microservice-b-grpc

# 5. Carrega as imagens para dentro dos nós do Cluster
echo "📦 Carregando imagens para o cluster (isso pode demorar um pouco)..."
minikube image load trabalho1-api-gateway:latest \
                    trabalho1-microservice-a-grpc:latest \
                    trabalho1-microservice-b-grpc:latest

# 6. Aplicação dos Manifestos Kubernetes
echo "🚀 Aplicando configurações no Kubernetes..."
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/prometheus.yaml

# 7. Aguarda os Pods iniciarem
echo "⏳ Aguardando pods inicializarem..."
kubectl wait --for=condition=ready pod --all --timeout=120s

echo "✅ Ambiente pronto!"
echo "➡️  IP do Minikube: $(minikube ip)"
echo "➡️  Para monitorar o HPA: kubectl get hpa -w"
echo "➡️  Para abrir o Prometheus: kubectl port-forward service/prometheus-service 9090:8080"
echo "➡️  Para rodar o teste de carga: locust -f locustfile.py --host http://$(minikube service api-gateway --url | head -n 1 | awk '{print $2}')"