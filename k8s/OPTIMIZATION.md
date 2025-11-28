# Kubernetes Configuration - PSPD Lab

## 📋 Visão Geral

Esta configuração Kubernetes implementa alta disponibilidade e autoscaling para os microserviços gRPC.

### Componentes

- **Microservice A (Link Shortener)**: 3 réplicas iniciais, escalável até 10
- **Microservice B (QR Code)**: 3 réplicas iniciais, escalável até 10
- **API Gateway**: 2 réplicas iniciais, escalável até 8

## 🚀 Deploy

## 🧹 Passo 0: Limpeza do Ambiente (Crucial)

Para evitar conflitos de IP ou erros de "cluster existente", sempre comece limpando o ambiente, especialmente se você já usou o Minikube para outros projetos ou testes single-node.

Abra o terminal e execute:

```Bash
# 1. Para o cluster atual
minikube stop

# 2. Deleta o cluster (remove configurações antigas de rede/nós)
minikube delete
```


### 1. Preparação (Minikube)

#### Opção A: Single-node (Recomendado para desenvolvimento)

```bash
# Inicie o Minikube single-node com recursos adequados
minikube start --cpus=4 --memory=8192

# Habilite o Metrics Server (necessário para HPA)
minikube addons enable metrics-server

# Configure o Docker para usar o registry do Minikube (apenas single-node)
eval $(minikube docker-env)

# Build das imagens DENTRO do Docker do Minikube (na raiz do projeto)
cd ..
docker build -t trabalho1-microservice-a-grpc:latest -f MicroserviceA_LinkShortener/MicroserviceA_LinkShortener/Dockerfile MicroserviceA_LinkShortener
docker build -t trabalho1-microservice-b-grpc:latest -f MicroserviceB_QRCode/MicroserviceB_QRCode/Dockerfile MicroserviceB_QRCode
docker build -t trabalho1-api-gateway:latest -f services/gateway/Dockerfile services/gateway
```

#### Opção B: Multi-node (Para testes avançados)

```bash
# Inicie o Minikube multi-node
minikube start --cpus=4 --memory=8192 --nodes=3

# Habilite o Metrics Server
minikube addons enable metrics-server

# Habilite o Registry addon para multi-node
minikube addons enable registry

# Configure port-forward para acessar o registry (em um terminal separado)
# Mantenha este comando rodando em background
kubectl port-forward --namespace kube-system service/registry 5000:80 &

# Aguarde alguns segundos para o port-forward iniciar
sleep 5

# Build das imagens localmente (na raiz do projeto)
cd ..
docker build -t trabalho1-microservice-a-grpc:latest -f MicroserviceA_LinkShortener/MicroserviceA_LinkShortener/Dockerfile MicroserviceA_LinkShortener
docker build -t trabalho1-microservice-b-grpc:latest -f MicroserviceB_QRCode/MicroserviceB_QRCode/Dockerfile MicroserviceB_QRCode
docker build -t trabalho1-api-gateway:latest -f services/gateway/Dockerfile services/gateway

# Tag para o registry local
docker tag trabalho1-microservice-a-grpc:latest localhost:5000/trabalho1-microservice-a-grpc:latest
docker tag trabalho1-microservice-b-grpc:latest localhost:5000/trabalho1-microservice-b-grpc:latest
docker tag trabalho1-api-gateway:latest localhost:5000/trabalho1-api-gateway:latest

# Push para o registry do Minikube (certifique-se que port-forward está rodando)
docker push localhost:5000/trabalho1-microservice-a-grpc:latest
docker push localhost:5000/trabalho1-microservice-b-grpc:latest
docker push localhost:5000/trabalho1-api-gateway:latest

# IMPORTANTE: Atualize o deployments.yaml para usar as imagens do registry interno:
# Para multi-node, use o endereço interno do registry (não localhost):
# image: registry.kube-system.svc.cluster.local/trabalho1-microservice-a-grpc:latest
# imagePullPolicy: Always
```

**⚠️ RECOMENDAÇÃO FORTE**: Para desenvolvimento, use a **Opção A (Single-node)**. Multi-node adiciona complexidade desnecessária para testes locais.

**Nota**: Para a maioria dos casos de desenvolvimento e testes, use a **Opção A (Single-node)**.

### 2. Deploy dos Recursos

```bash
cd k8s

# Aplique os deployments e services
kubectl apply -f deployments.yaml
kubectl apply -f services.yaml

# Aplique os HPAs (Horizontal Pod Autoscalers)
kubectl apply -f hpa.yaml
```

### 3. Verificação

```bash
# Verifique os deployments
kubectl get deployments

# Verifique os pods
kubectl get pods

# Verifique os services
kubectl get services

# Verifique os HPAs
kubectl get hpa

# Verifique métricas dos pods
kubectl top pods
```

## 📊 Monitoramento

### Verificar Status do HPA

```bash
# Status detalhado do HPA
kubectl describe hpa microservice-a-hpa
kubectl describe hpa microservice-b-hpa
kubectl describe hpa api-gateway-hpa

# Monitoramento contínuo
watch kubectl get hpa
```

### Logs dos Pods

```bash
# Logs de um deployment específico
kubectl logs -l app=microservice-a --tail=50 -f

# Logs de todos os pods do gateway
kubectl logs -l app=api-gateway --all-containers=true
```

## 🧪 Teste de Autoscaling

### Teste de Carga Simples

```bash
# Obtenha a URL do serviço
minikube service svc-api-gateway --url

# Execute testes de carga (usando hey, wrk, ou ab)
# Exemplo com hey:
hey -z 2m -c 50 http://$(minikube service svc-api-gateway --url)/health

# Exemplo com Apache Bench:
ab -n 10000 -c 100 http://$(minikube service svc-api-gateway --url)/health
```

### Observe o Autoscaling em Ação

```bash
# Terminal 1: Monitore os HPAs
watch kubectl get hpa

# Terminal 2: Monitore os pods
watch kubectl get pods

# Terminal 3: Monitore métricas
watch kubectl top pods

# Terminal 4: Execute o teste de carga
hey -z 5m -c 100 http://$(minikube service svc-api-gateway --url)/api/grpc/shorten
```

## 📈 Recursos Configurados

### Microservice A e B (.NET)

- **Requests**: 256Mi RAM, 250m CPU (0.25 core)
- **Limits**: 512Mi RAM, 1000m CPU (1 core)
- **Réplicas**: 2-10 (min-max via HPA)
- **Threshold HPA**: 70% CPU, 80% Memória

### API Gateway (Node.js)

- **Requests**: 128Mi RAM, 100m CPU (0.1 core)
- **Limits**: 256Mi RAM, 500m CPU (0.5 core)
- **Réplicas**: 2-8 (min-max via HPA)
- **Threshold HPA**: 75% CPU, 80% Memória

## 🔍 Health Checks

Todos os serviços possuem:

- **Liveness Probe**: Verifica se o pod está "vivo" (reinicia se falhar)
- **Readiness Probe**: Verifica se o pod está pronto para receber tráfego

## 🛠️ Troubleshooting

### HPA não está funcionando

```bash
# Verifique se o Metrics Server está rodando
kubectl get deployment metrics-server -n kube-system

# Verifique se as métricas estão disponíveis
kubectl top nodes
kubectl top pods

# Se não funcionar, reinicie o Metrics Server
kubectl delete -n kube-system deployment metrics-server
minikube addons disable metrics-server
minikube addons enable metrics-server
```

### Pods não estão iniciando

```bash
# Verifique os eventos
kubectl get events --sort-by='.lastTimestamp'

# Descreva o deployment problemático
kubectl describe deployment microservice-a

# Verifique logs do pod
kubectl logs <pod-name>

# Verifique os pods em detalhe
kubectl get pods -o wide
kubectl describe pod <pod-name>
```

### Erro: "ErrImageNeverPull" - Image not present with pull policy of Never

```bash
# Este erro ocorre em clusters MULTI-NODE quando a imagem só existe no nó principal

# SOLUÇÃO RECOMENDADA: Recrie como single-node
minikube delete
minikube start --cpus=4 --memory=8192  # SEM --nodes=3
minikube addons enable metrics-server
eval $(minikube docker-env)

# Rebuild as imagens
docker build -t trabalho1-microservice-a-grpc:latest -f MicroserviceA_LinkShortener/MicroserviceA_LinkShortener/Dockerfile MicroserviceA_LinkShortener
docker build -t trabalho1-microservice-b-grpc:latest -f MicroserviceB_QRCode/MicroserviceB_QRCode/Dockerfile MicroserviceB_QRCode
docker build -t trabalho1-api-gateway:latest -f services/gateway/Dockerfile services/gateway

# Deploy novamente
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/hpa.yaml
```

### Health Check Failures - Connection Refused

```bash
# Verifique se as portas do health check estão corretas
kubectl logs <pod-name>

# O erro "connection refused" geralmente indica:
# 1. Porta do health check incorreta no deployment
# 2. Aplicação ainda não iniciou (aguarde initialDelaySeconds)
# 3. Endpoint /health não existe na aplicação

# Verifique quais portas a aplicação está escutando:
kubectl logs <pod-name> | grep "listening"

# Se necessário, ajuste as portas no deployments.yaml
# Microservice A: porta 8080 (HTTP/Health)
# Microservice B: porta 8081 (HTTP/Health)
# API Gateway: porta 8000 (HTTP/Health)
```

### Erro: "docker-env is incompatible with multi-node clusters"

```bash
# Se você receber este erro, você tem duas opções:

# OPÇÃO 1: Recrie o cluster como single-node (RECOMENDADO)
minikube delete
minikube start --cpus=4 --memory=8192
minikube addons enable metrics-server
eval $(minikube docker-env)
# Rebuild as imagens...

# OPÇÃO 2: Use o registry addon para multi-node (avançado)
minikube addons enable registry
kubectl port-forward --namespace kube-system service/registry 5000:80 &
# Siga as instruções da "Opção B: Multi-node" na seção de Preparação
```

### Erro: "dial tcp [::1]:5000: connection refused" ao fazer push

```bash
# Este erro ocorre quando o port-forward para o registry não está rodando

# Verifique se o registry está rodando
kubectl get service -n kube-system registry

# Inicie o port-forward manualmente
kubectl port-forward --namespace kube-system service/registry 5000:80

# Em outro terminal, faça o push
docker push localhost:5000/trabalho1-microservice-a-grpc:latest

# ALTERNATIVA: Recrie o cluster como single-node (muito mais simples)
minikube delete
minikube start --cpus=4 --memory=8192
minikube addons enable metrics-server
eval $(minikube docker-env)
# Rebuild as imagens dentro do Docker do Minikube
```

### Imagens não encontradas

```bash
# Para SINGLE-NODE: Use o Docker do Minikube
eval $(minikube docker-env)

# Liste as imagens disponíveis
docker images | grep trabalho1

# Rebuild se necessário
cd ..
docker build -t trabalho1-microservice-a-grpc:latest -f MicroserviceA_LinkShortener/MicroserviceA_LinkShortener/Dockerfile MicroserviceA_LinkShortener

# Para MULTI-NODE: Use o registry
# Veja as instruções na "Opção B: Multi-node" acima
```

## 🧹 Limpeza

```bash
# Deletar todos os recursos
kubectl delete -f hpa.yaml
kubectl delete -f deployments.yaml
kubectl delete -f services.yaml

# Ou deletar tudo de uma vez
kubectl delete all --all

# Parar o Minikube
minikube stop

# Deletar o cluster (CUIDADO!)
minikube delete
```

## 📝 Notas Importantes

1. **Metrics Server**: É essencial para o HPA funcionar. Aguarde 1-2 minutos após habilitar para que as métricas comecem a aparecer.

2. **Stabilization Windows**: O HPA tem janelas de estabilização para evitar "flapping" (escalar/reduzir rapidamente):
   - Scale Up: Imediato (0s)
   - Scale Down: 5 minutos (300s)

3. **Health Checks**: Os health checks precisam de endpoints `/health` funcionando nos microserviços. Verifique se eles estão implementados.

4. **Resource Limits**: Os valores de CPU e memória foram definidos considerando aplicações .NET e Node.js. Ajuste conforme necessário baseado em testes de carga reais.

5. **Production**: Para produção, considere:
   - Usar registry externo (DockerHub, GCR, ECR)
   - Implementar PodDisruptionBudget
   - Configurar NetworkPolicies
   - Adicionar monitoring (Prometheus/Grafana)
   - Implementar logging centralizado
