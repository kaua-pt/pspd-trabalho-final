# ⚡ Quick Start - Testes de Carga

## 🚀 Começando em 5 minutos

### Passo 1: Garantir que o cluster está rodando

```bash
# No diretório raiz do projeto
./init.sh
```

Aguarde até ver: `✅ Ambiente pronto!`

### Passo 2: Instalar ferramentas de teste

```bash
cd load-tests
./install-tools.sh
```

### Passo 3: Executar seu primeiro teste

```bash
# Teste básico com K6 (2 minutos)
./run-k6-tests.sh smoke
```

### Passo 4: Ver o HPA em ação

Abra outro terminal e execute:

```bash
cd load-tests
./monitor-hpa.sh hpa
```

Agora execute um teste mais pesado:

```bash
./run-k6-tests.sh stress
```

Você verá o número de réplicas aumentar no monitor!

---

## 🎯 Comandos Mais Usados

### Testes K6

```bash
# Menu interativo
./run-k6-tests.sh

# Teste rápido (2 min)
./run-k6-tests.sh smoke

# Teste de carga (16 min)
./run-k6-tests.sh load

# Teste de estresse (30 min)
./run-k6-tests.sh stress

# Teste de pico (5 min)
./run-k6-tests.sh spike
```

### Testes Locust

```bash
# Interface web interativa
./run-locust.sh web
# Acesse: http://localhost:8089
```

Configure na interface:
- **Number of users**: 50
- **Spawn rate**: 5
- Clique em "Start swarming"

### Monitoramento

```bash
# HPA (Autoscaling)
./monitor-hpa.sh hpa

# Pods
./monitor-hpa.sh pods

# Métricas de CPU/Memória
./monitor-hpa.sh metrics

# Tudo junto (split screen)
./monitor-hpa.sh all
```

---

## 📊 Workflow Completo de Teste

### Setup (uma vez)

```bash
# Terminal 1
cd /caminho/para/projeto
./init.sh

cd load-tests
./install-tools.sh
```

### Durante os testes

```bash
# Terminal 1: Monitor HPA
./monitor-hpa.sh hpa

# Terminal 2: Monitor Pods
./monitor-hpa.sh pods

# Terminal 3: Executar testes
./run-k6-tests.sh
# ou
./run-locust.sh web
```

---

## 🎓 Exemplos Práticos

### Exemplo 1: Validar se tudo está funcionando

```bash
# Teste smoke (2 minutos)
./run-k6-tests.sh smoke

# Verificar pods
kubectl get pods
```

**Esperado**: Sem erros, pods rodando

### Exemplo 2: Ver o autoscaling funcionando

```bash
# Terminal 1: Monitorar HPA
kubectl get hpa -w

# Terminal 2: Executar stress test
cd load-tests
./run-k6-tests.sh stress
```

**Esperado**: Você verá as réplicas aumentarem de 1 para 5-10

### Exemplo 3: Teste de pico (Black Friday simulation)

```bash
# Executar spike test
./run-k6-tests.sh spike

# Enquanto roda, verificar métricas
kubectl top pods
```

**Esperado**: Sistema deve sobreviver ao pico

### Exemplo 4: Interface visual com Locust

```bash
# Iniciar Locust
./run-locust.sh web

# Acessar http://localhost:8089
# Configurar:
#   - Number of users: 100
#   - Spawn rate: 10
#   - Host: (preenchido automaticamente)
#
# Clicar em "Start swarming"
```

**Esperado**: Gráficos em tempo real de RPS e tempo de resposta

---

## 🔍 Verificando Resultados

### K6

Resultados aparecem no terminal:

```
✓ http_req_duration..............: avg=250ms
✓ http_req_failed................: 0.01%
✓ http_reqs......................: 10000
```

✅ **Bom**: Taxa de erro < 1%, avg < 500ms
❌ **Ruim**: Taxa de erro > 5%, avg > 2s

### Locust

Na interface web (http://localhost:8089):

- **Charts**: Gráficos de RPS e Response Time
- **Statistics**: Tabela com métricas por endpoint
- **Failures**: Lista de erros

### HPA

```bash
kubectl get hpa
```

```
NAME                    TARGETS   REPLICAS
microservice-a-grpc-hpa 45%/50%   3
microservice-b-grpc-hpa 78%/50%   5
```

✅ **Bom**: TARGETS < 100%, sistema escalando suavemente
❌ **Ruim**: TARGETS > 100% por muito tempo, MAX_PODS atingido

---

## 🆘 Problemas Comuns

### "Connection refused"

```bash
# Verificar se minikube está rodando
minikube status

# Se não estiver, iniciar
./init.sh
```

### "k6: command not found"

```bash
# Instalar ferramentas
./install-tools.sh
```

### HPA não está escalando

```bash
# Verificar metrics-server
kubectl get pods -n kube-system | grep metrics-server

# Se não estiver rodando
minikube addons enable metrics-server
```

### Pods em "Pending"

```bash
# Verificar recursos dos nodes
kubectl top nodes
kubectl describe nodes

# Pode ser necessário mais recursos
# Reiniciar minikube com mais CPU/memória
minikube delete
minikube start --nodes 3 --cpus=4 --memory=8192
```

---

## 📁 Onde estão os relatórios?

```bash
# Listar relatórios gerados
ls -la reports/

# Relatórios K6
ls -la reports/k6_*/

# Relatórios Locust
ls -la reports/locust_*/
```

Relatórios Locust incluem HTML visual:

```bash
# Abrir relatório Locust no navegador
firefox reports/locust_YYYYMMDD_HHMMSS/report.html
# ou
google-chrome reports/locust_YYYYMMDD_HHMMSS/report.html
```

---

## 🎯 Próximos Passos

1. ✅ Execute um smoke test
2. ✅ Veja o HPA escalando com stress test
3. ✅ Explore a interface Locust
4. ✅ Experimente spike test
5. 📚 Leia o [README completo](README.md) para mais detalhes

---

## 📞 Ajuda

- **Documentação completa**: Veja [README.md](README.md)
- **Scripts disponíveis**: Use `./script.sh --help` ou sem parâmetros para menu interativo
- **Comandos úteis**:
  ```bash
  kubectl get all              # Ver todos os recursos
  kubectl logs -f <pod-name>   # Ver logs de um pod
  kubectl describe hpa         # Detalhes do autoscaler
  minikube dashboard           # Dashboard visual do Kubernetes
  ```
