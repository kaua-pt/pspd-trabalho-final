minikube stop

# 2. Deleta o cluster (remove configurações antigas de rede/nós)
minikube delete


minikube start --cpus=4 --memory=8192

minikube addons enable metrics-server


eval $(minikube docker-env)

docker build -t trabalho1-microservice-a-grpc:latest -f MicroserviceA_LinkShortener/MicroserviceA_LinkShortener/Dockerfile MicroserviceA_LinkShortener
docker build -t trabalho1-microservice-b-grpc:latest -f MicroserviceB_QRCode/MicroserviceB_QRCode/Dockerfile MicroserviceB_QRCode
docker build -t trabalho1-api-gateway:latest -f services/gateway/Dockerfile services/gateway

cd k8s

kubectl apply -f deployments.yaml
kubectl apply -f services.yaml
kubectl apply -f hpa.yaml

sleep 10

kubectl get deployments
kubectl get pods
kubectl get services
kubectl get hpa
kubectl top pods

