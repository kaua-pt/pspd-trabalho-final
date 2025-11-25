# PSPD Lab - gRPC Kubernetes 2025

## 🏗️ Arquitetura

A aplicação desenvolvida consiste em um conjunto de microserviços que oferecem funcionalidades de encurtamento de URLs e geração de QR Codes. O sistema foi projetado para permitir uma comparação de performance direta entre as tecnologias gRPC e REST.
As principais funcionalidades são:

- Encurtador de URL (Microserviço A): Recebe uma URL longa e a converte em uma versão curta e única, que redireciona para o endereço original.
- Gerador de QR Code (Microserviço B): Gera uma imagem de QR Code a partir de um texto ou URL fornecido.
- Frontend Unificado: Uma interface web (Web Client) que permite ao usuário interagir com ambos os serviços.
- Gateway de API (Módulo P): Um módulo intermediário que recebe as requisições do frontend, mede o tempo de resposta e as encaminha para os microserviços correspondentes (A ou B), abstraindo a complexidade da comunicação.
- Alternância de Protocolo: O frontend pode, em tempo real, alternar entre fazer requisições para os serviços na versão REST ou na versão gRPC, permitindo uma análise comparativa de desempenho imediata.


## 🚀 Como Executar Localmente

### Pré-requisitos
- Docker instalado

### 1. Navegue até a Raiz do Projeto

Abra um terminal e certifique-se de que você está no diretório raiz do projeto, onde o arquivo docker-compose.yml está localizado.

### 2. Execute o Docker Compose

```bash
docker compose up --build
```

Este comando irá baixar as dependências necessárias, compilar as aplicações .NET, construir as imagens Docker para cada serviço e iniciá-los em uma rede interna gerenciada pelo Docker.

### 3. Acesse a Aplicação

Uma vez que todos os contêineres estejam em execução (você verá os logs de cada serviço no seu terminal), abra um navegador web e acesse o seguinte endereço:

http://localhost:3000

Isto abrirá o Web Client, a partir do qual é possível interagir com todas as funcionalidades da aplicação.

## 🚀 Como Executar Com Kubernetes

### Pré-requisitos
- Minikube instalado

### 1. Iniciar o Cluster

```bash
minikube start
```

### 2. Configurar o Ambiente Docker

Para permitir que o cluster Minikube utilize imagens Docker construídas localmente sem a necessidade de um registry externo, o seguinte comando foi executado:

```bash
eval $(minikube docker-env)
```

### 3. Aplicar as Configurações

Para implantar todos os componentes da aplicação (Deployments e Services) no cluster, utilizou-se o comando apply, apontando para o diretório que contém os arquivos de manifesto YAML:

```bash
kubectl apply -f k8s/
```

### 4. Monitoramento e Depuração

 Durante o desenvolvimento, comandos como kubectl get pods, kubectl get services e kubectl logs <nome-do-pod> foram essenciais para verificar o status dos componentes e diagnosticar problemas. Por fim, executa-se o comando para conseguir a url de acesso do web-client:

 ```bash
minikube service web-client --url
```
