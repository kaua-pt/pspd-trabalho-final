# 📚 Documento Técnico: Testes de Carga em Sistemas Distribuídos

**Projeto**: Sistema de Microsserviços com Autoscaling
**Disciplina**: Programação de Sistemas Paralelos e Distribuídos (PSPD)
**Instituição**: Universidade de Brasília (UnB)

---

## 📑 Sumário

1. [Introdução](#1-introdução)
2. [Fundamentação Teórica](#2-fundamentação-teórica)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Decisões de Design](#4-decisões-de-design)
5. [Implementação dos Testes](#5-implementação-dos-testes)
6. [Métricas e Avaliação](#6-métricas-e-avaliação)
7. [Considerações sobre Autoscaling](#7-considerações-sobre-autoscaling)
8. [Melhores Práticas Aplicadas](#8-melhores-práticas-aplicadas)
9. [Conclusão](#9-conclusão)
10. [Referências](#10-referências)

---

## 1. Introdução

### 1.1 Contexto

Sistemas distribuídos modernos, especialmente aqueles baseados em arquiteturas de microsserviços, precisam lidar com cargas variáveis e imprevisíveis. O Horizontal Pod Autoscaling (HPA) do Kubernetes permite que aplicações escalem automaticamente baseadas em métricas como CPU e memória, mas é fundamental validar esse comportamento através de testes de carga rigorosos.

### 1.2 Objetivos

Este documento tem como objetivos:

1. **Fundamentar teoricamente** os diferentes tipos de testes de carga
2. **Justificar as decisões** de arquitetura e implementação
3. **Documentar as ferramentas** escolhidas e suas características
4. **Explicar as métricas** utilizadas e sua interpretação
5. **Estabelecer metodologia** para validação de sistemas distribuídos

### 1.3 Escopo

O sistema sob teste consiste em:
- **Gateway API** (HTTP/REST) que roteia requisições
- **Microsserviço A** - Link Shortener (comunicação gRPC)
- **Microsserviço B** - QR Code Generator (comunicação gRPC)
- **Infraestrutura Kubernetes** com 3 nós
- **HPA** configurado com limites de CPU

---

## 2. Fundamentação Teórica

### 2.1 O que são Testes de Carga?

**Testes de carga** (Load Testing) são uma categoria de testes de performance que avaliam o comportamento de um sistema sob condições específicas de carga. Diferentemente de testes funcionais que verificam **o que** o sistema faz, testes de carga verificam **como bem** o sistema faz isso sob pressão.

### 2.2 Por que Testar Carga em Sistemas Distribuídos?

Sistemas distribuídos apresentam desafios únicos:

1. **Latência de Rede**: Comunicação entre serviços adiciona overhead
2. **Falhas Parciais**: Um componente pode falhar enquanto outros continuam funcionando
3. **Contenção de Recursos**: Múltiplos serviços competem por CPU, memória, I/O
4. **Complexidade de Debugging**: Problemas podem surgir apenas sob carga específica
5. **Cascata de Falhas**: Falha em um serviço pode propagar para outros

### 2.3 Taxonomia de Testes de Performance

```
                    Testes de Performance
                            |
        ┌───────────────────┼───────────────────┐
        |                   |                   |
    Load Tests        Stress Tests         Endurance Tests
        |                   |                   |
   ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
Smoke    Load      Stress    Spike      Soak    Volume
```

#### 2.3.1 Smoke Test (Teste de Fumaça)

**Definição**: Validação básica com carga mínima para verificar se o sistema está funcionando.

**Características**:
- Carga: 1-5 usuários virtuais
- Duração: 1-3 minutos
- Objetivo: Detectar problemas óbvios antes de testes maiores

**Quando usar**:
- Após deploys
- Antes de executar testes mais pesados
- Como parte de CI/CD

**Base Teórica**: Princípio de "fail fast" - detectar falhas básicas rapidamente antes de investir tempo em testes complexos.

#### 2.3.2 Load Test (Teste de Carga)

**Definição**: Avalia o comportamento do sistema sob carga esperada em produção.

**Características**:
- Carga: Baseada em análise de tráfego real
- Duração: 10-30 minutos
- Padrão: Ramp-up → Sustentação → Ramp-down

**Quando usar**:
- Validar SLAs (Service Level Agreements)
- Planejamento de capacidade
- Antes de releases

**Base Teórica**: Lei de Little - `L = λW` onde:
- L = número médio de itens no sistema
- λ = taxa média de chegada
- W = tempo médio no sistema

#### 2.3.3 Stress Test (Teste de Estresse)

**Definição**: Identifica os limites do sistema aumentando gradualmente a carga até o ponto de quebra.

**Características**:
- Carga: Aumenta progressivamente até falha
- Duração: 20-60 minutos
- Objetivo: Encontrar bottlenecks e limites

**Quando usar**:
- Planejamento de capacidade
- Identificar pontos fracos
- Validar recuperação após falhas

**Base Teórica**: Teoria da Fila - em sistemas com taxa de chegada (λ) próxima ou superior à taxa de serviço (μ), o tempo de resposta tende ao infinito (ρ = λ/μ ≥ 1).

#### 2.3.4 Spike Test (Teste de Pico)

**Definição**: Avalia a resiliência do sistema a aumentos súbitos e drásticos de carga.

**Características**:
- Carga: Aumento abrupto (ex: 5 → 200 usuários em 30s)
- Duração: 5-10 minutos
- Padrão: Normal → SPIKE → Normal

**Quando usar**:
- Antes de eventos esperados (Black Friday, lançamentos)
- Validar circuito breakers e rate limiting
- Testar elasticidade

**Base Teórica**: Teoria de Controle - sistemas precisam de tempo para reagir (deadtime). Spikes testam se o sistema pode se adaptar mais rápido que a taxa de mudança da carga.

#### 2.3.5 Soak Test (Teste de Imersão/Endurance)

**Definição**: Valida a estabilidade do sistema sob carga moderada por período prolongado.

**Características**:
- Carga: Moderada e constante
- Duração: Horas ou dias
- Objetivo: Detectar degradação gradual

**Quando usar**:
- Detectar memory leaks
- Validar garbage collection
- Identificar degradação de performance ao longo do tempo

**Base Teórica**: Análise de Estabilidade - sistemas devem manter propriedades invariantes ao longo do tempo. Soak tests detectam drift (desvio gradual).

### 2.4 Métricas Fundamentais

#### 2.4.1 Throughput (Taxa de Transferência)

**Definição**: Número de requisições processadas por unidade de tempo.

**Fórmula**: `Throughput = Total de Requisições / Tempo Total`

**Unidade**: requests/second (RPS), transactions/second (TPS)

**Importância**: Indica capacidade do sistema. Relaciona-se com:
- Escalabilidade horizontal
- Utilização de recursos
- Custo operacional

#### 2.4.2 Latência e Tempo de Resposta

**Latência**: Tempo entre envio da requisição e recebimento da resposta.

**Percentis importantes**:
- **P50 (Mediana)**: 50% das requisições são mais rápidas
- **P95**: 95% das requisições são mais rápidas (experiência da maioria)
- **P99**: 99% das requisições são mais rápidas
- **P99.9**: Cauda longa - casos extremos

**Por que Percentis > Média?**

A média pode ser enganosa devido a outliers. Exemplo:

```
Requisições: [10ms, 10ms, 10ms, 10ms, 5000ms]
Média: 1008ms (ruim!)
P95: 10ms (bom!)
```

**Teorema CAP** e Latência: Em sistemas distribuídos, trade-offs entre Consistência, Disponibilidade e Tolerância a Partições afetam latência.

#### 2.4.3 Taxa de Erro

**Definição**: Percentual de requisições que falharam.

**Fórmula**: `Error Rate = (Falhas / Total) × 100`

**Classificação de Erros**:
- **4xx**: Erros do cliente (ex: 400 Bad Request, 404 Not Found)
- **5xx**: Erros do servidor (ex: 500 Internal Server Error, 503 Service Unavailable)

**Critérios de Aceitação**:
- < 0.1%: Excelente
- < 1%: Aceitável
- < 5%: Degradado mas funcional
- \> 5%: Problema crítico

#### 2.4.4 Utilização de Recursos

**CPU**: Percentual de uso do processador
- < 70%: Saudável com margem para spikes
- 70-85%: Bom ponto para autoscaling
- \> 85%: Risco de contenção

**Memória**: Uso de RAM
- Monitorar para detectar memory leaks
- Em Go/Java: observar garbage collection pressure

**Network I/O**: Banda de rede utilizada
- Importante para microsserviços (comunicação frequente)

**Disk I/O**: Leitura/escrita em disco
- Menos relevante para serviços stateless
- Crítico para bancos de dados

### 2.5 Lei de Amdahl e Escalabilidade

**Lei de Amdahl** estabelece limite teórico para speedup através de paralelização:

```
Speedup = 1 / [(1 - P) + (P / N)]
```

Onde:
- P = fração do código que pode ser paralelizada
- N = número de processadores

**Implicações para Autoscaling**:
- Componentes sequenciais (ex: acesso a banco de dados compartilhado) limitam escalabilidade
- Arquiteturas share-nothing escalam melhor
- HPA pode adicionar pods, mas gargalos externos (DB, cache) limitam ganhos

### 2.6 Teorema CAP e Testes de Carga

**Teorema CAP** (Brewer, 2000): Sistemas distribuídos podem garantir apenas 2 de 3 propriedades simultaneamente:
- **C**onsistency (Consistência)
- **A**vailability (Disponibilidade)
- **P**artition tolerance (Tolerância a Partições)

**Relação com Testes de Carga**:
- Spike tests podem simular partições de rede
- Trade-off CA vs AP afeta latência e taxa de erro sob carga
- Nosso sistema favorece AP (disponibilidade sobre consistência forte)

---

## 3. Arquitetura do Sistema

### 3.1 Visão Geral

```
                      Internet
                         |
                         v
                 [NodePort 30000]
                         |
                         v
                  ┌─────────────┐
                  │   Gateway   │ (HTTP/REST)
                  │     API     │
                  └─────────────┘
                    /           \
                   /             \
            (gRPC)               (gRPC)
             /                       \
            v                         v
    ┌──────────────┐          ┌──────────────┐
    │Microsserviço │          │Microsserviço │
    │      A       │          │      B       │
    │Link Shortener│          │ QR Generator │
    └──────────────┘          └──────────────┘
         |                         |
         v                         v
    [HPA: 1-10]              [HPA: 1-10]
```

### 3.2 Componentes

#### 3.2.1 Gateway API

**Responsabilidades**:
- Roteamento de requisições
- Seleção de protocolo (HTTP → gRPC)
- Load balancing (feito pelo Kubernetes Service)

**Características**:
- Stateless (permite escalonamento horizontal)
- Timeout configurado para prevenir requests pendurados
- Health checks para Kubernetes liveness/readiness

#### 3.2.2 Microsserviços

**Microsserviço A - Link Shortener**:
- **Função**: Encurtar URLs
- **Carga Computacional**: Baixa a moderada
- **I/O**: Mínimo (stateless, sem persistência)
- **Expectativa**: Escala linearmente

**Microsserviço B - QR Code Generator**:
- **Função**: Gerar códigos QR
- **Carga Computacional**: Moderada a alta (processamento de imagem)
- **I/O**: Encoding de imagens
- **Expectativa**: Maior uso de CPU, candidato principal para autoscaling

### 3.3 Infraestrutura Kubernetes

#### 3.3.1 Topologia do Cluster

```
┌─────────────────────────────────────────┐
│          Control Plane (Master)         │
│  - API Server                           │
│  - Scheduler                            │
│  - Controller Manager                   │
│  - etcd                                 │
└─────────────────────────────────────────┘
                    |
        ┌───────────┴───────────┐
        |                       |
┌───────────────┐       ┌───────────────┐
│   Worker 1    │       │   Worker 2    │
│  - kubelet    │       │  - kubelet    │
│  - kube-proxy │       │  - kube-proxy │
│  - Pods       │       │  - Pods       │
└───────────────┘       └───────────────┘
```

**Decisão**: 3 nós (1 master + 2 workers)

**Justificativa**:
- Permite distribuição real de carga
- Simula ambiente de produção
- Valida comportamento de scheduling
- Testa network overhead entre nós

#### 3.3.2 Horizontal Pod Autoscaler (HPA)

**Configuração**:
```yaml
minReplicas: 1
maxReplicas: 10
targetCPUUtilizationPercentage: 50
```

**Algoritmo do HPA** (simplificado):
```
desiredReplicas = ceil[currentReplicas × (currentMetric / targetMetric)]
```

**Comportamento**:
- **Scale Up**: Quando CPU > 50%, adiciona pods
- **Scale Down**: Quando CPU < 50% por 5 minutos, remove pods
- **Cooldown**: Previne flapping (oscilação rápida)

**Decisões de Configuração**:

1. **Target CPU: 50%**
   - **Justificativa**: Margem de segurança para spikes
   - Alternativas consideradas: 70% (menos margem), 30% (muito agressivo)
   - Trade-off: Custo vs Resiliência

2. **Min Replicas: 1**
   - **Justificativa**: Reduz custo em idle
   - **Risco**: Cold start em spike súbito
   - **Mitigação**: Spike tests validam comportamento

3. **Max Replicas: 10**
   - **Justificativa**: Limita consumo de recursos
   - Baseado em: Capacidade do cluster (2 workers)
   - Previne: Resource starvation

---

## 4. Decisões de Design

### 4.1 Escolha de Ferramentas

#### 4.1.1 K6

**Características**:
- Escrito em Go (alta performance)
- Scripts em JavaScript (familiaridade)
- Métricas detalhadas por padrão
- CLI-first (fácil automação)
- Open-source

**Por que escolhemos K6?**

| Critério | K6 | Alternativas (JMeter, Gatling) |
|----------|-----|-------------------------------|
| Performance | Alta (Go) | Média (Java) |
| Facilidade | JavaScript | Java/Scala |
| Métricas | Nativas e detalhadas | Necessita plugins |
| CI/CD | Excelente | Boa |
| Curva de aprendizado | Baixa | Média/Alta |

**Decisão**: K6 para testes automatizados e CI/CD

#### 4.1.2 Locust

**Características**:
- Escrito em Python
- Interface web interativa
- Distribuição de carga (master/worker)
- Fácil extensão e customização
- Open-source

**Por que escolhemos Locust?**

| Critério | Locust | Razão |
|----------|--------|-------|
| Interface Visual | Sim | Útil para exploração |
| Flexibilidade | Alta | Python permite customização |
| Curva de aprendizado | Baixa | Python é acessível |
| Testes distribuídos | Sim | Escala para cargas massivas |

**Decisão**: Locust para testes exploratórios e com visualização

#### 4.1.3 Estratégia Combinada

**Decisão arquitetural**: Usar ambas as ferramentas de forma complementar.

```
                   Casos de Uso
                        |
        ┌───────────────┼───────────────┐
        |                               |
    Automação                      Exploração
    CI/CD                          Debug
    Regressão                      Ad-hoc
        |                               |
       K6                           Locust
```

**Vantagens**:
- Validação cruzada (mesmos endpoints, ferramentas diferentes)
- Flexibilidade (escolher ferramenta apropriada para cada cenário)
- Redundância (se uma ferramenta falha, outra está disponível)

### 4.2 Distribuição de Carga entre Endpoints

**Análise de uso esperado**:
- `/url` (Link Shortener): 60% do tráfego
- `/qr` (QR Code): 40% do tráfego

**Justificativa**:
- Link shortening é operação mais comum e rápida
- QR generation é menos frequente mas mais pesada

**Implementação** (K6):
```javascript
@task(3)  // 60% (3 de 5)
shorten_url() { ... }

@task(2)  // 40% (2 de 5)
generate_qr() { ... }
```

### 4.3 Padrões de Ramp-up e Ramp-down

**Por que Ramp-up gradual?**

Evitar "Thundering Herd Problem":
- Todos os usuários chegam simultaneamente
- Sistema não tem tempo para warm-up
- Conexões, thread pools, caches não estão preparados
- Resultados não representam produção

**Padrão implementado**:
```
Carga
  ^
  |     ┌─────────┐
  |    /           \
  |   /             \
  |  /               \
  | /                 \
  └──────────────────────> Tempo
    ↑       ↑        ↑
  Ramp-up  Plateau  Ramp-down
```

**Decisões**:
- Ramp-up: 20-30% da duração total
- Plateau: 40-60% da duração total
- Ramp-down: 10-20% da duração total

### 4.4 Thresholds (Limites) de Aceitação

**Decisão**: Definir thresholds explícitos em todos os testes.

```javascript
thresholds: {
  http_req_failed: ['rate<0.01'],     // < 1% de erros
  http_req_duration: ['p(95)<2000'],  // P95 < 2s
}
```

**Justificativa**:
- **Objetividade**: Critérios claros de sucesso/falha
- **Automação**: CI/CD pode falhar automaticamente
- **SLAs**: Alinha com acordos de nível de serviço

**Como definimos os valores?**

1. **Taxa de erro < 1%**:
   - Baseado em: Industry standard (Google SRE book)
   - Permite: 99% de disponibilidade
   - Trade-off: Não é 100%, mas 100% é impossível (Teorema CAP)

2. **P95 < 2s**:
   - Baseado em: Estudos de UX (usuários abandonam após 3s)
   - Permite: 95% dos usuários têm boa experiência
   - Margem: 1s de buffer antes de abandono

### 4.5 Sleep Time entre Requisições

**Decisão**: Sleep aleatório entre 1-3 segundos.

```javascript
sleep(Math.random() * 2 + 1);
```

**Justificativa**:
- **Realismo**: Usuários reais não fazem requisições imediatamente
- **Variabilidade**: Evita padrões artificiais
- **Pressão controlada**: Permite ajustar carga via número de VUs

**Think Time** na literatura:
- Tempo que usuário "pensa" entre ações
- Crucial para realismo
- Afeta: Throughput, concorrência, padrões de acesso

### 4.6 Arquitetura de Monitoramento

**Decisão**: Monitoramento em 3 camadas.

```
┌──────────────────────────────────────┐
│   Camada 1: Testes de Carga          │
│   - K6 / Locust                      │
│   - Métricas de cliente (latência)   │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│   Camada 2: Kubernetes                │
│   - HPA (autoscaling)                │
│   - Pods (status, count)             │
└──────────────────────────────────────┘
              ↓
┌──────────────────────────────────────┐
│   Camada 3: Recursos                  │
│   - Metrics Server (CPU/Mem)         │
│   - Nodes (disponibilidade)          │
└──────────────────────────────────────┘
```

**Justificativa**:
- **Visibilidade completa**: Da requisição aos recursos
- **Correlação**: Conectar latência com uso de CPU
- **Debugging**: Identificar causa raiz de problemas

---

## 5. Implementação dos Testes

### 5.1 Configuração Compartilhada (DRY Principle)

**Decisão**: Arquivo `config.js` centralizado.

```javascript
// config.js
export const BASE_URL = __ENV.BASE_URL || 'http://192.168.49.2:30000';
export const endpoints = { ... };
export const headers = { ... };
```

**Princípio**: Don't Repeat Yourself

**Vantagens**:
- Mudanças em um único lugar
- Consistência entre testes
- Facilita manutenção

### 5.2 Estrutura dos Testes K6

**Padrão implementado**:

```javascript
// 1. Imports
import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';

// 2. Configuração
export const options = {
  stages: [...],
  thresholds: {...}
};

// 3. Lógica do teste
export default function() {
  // Request
  let response = http.post(...);

  // Validation
  check(response, {...});

  // Think time
  sleep(...);
}
```

**Decisão**: Estrutura consistente em todos os scripts.

**Justificativa**:
- Legibilidade
- Manutenibilidade
- Fácil onboarding

### 5.3 Validação com Checks

**Decisão**: Validar não apenas status code, mas também payload.

```javascript
check(response, {
  'status 200': (r) => r.status === 200,
  'has shortened_url': (r) => JSON.parse(r.body).shortened_url !== undefined,
});
```

**Por quê?**

Status 200 pode retornar payload vazio ou incorreto. Checks garantem:
- **Corretude funcional**: Dados esperados estão presentes
- **Detecção de regressão**: Mudanças na API quebram checks

### 5.4 Locust: Classes de Usuários

**Decisão**: Múltiplas classes de usuários para diferentes cenários.

```python
class MicroserviceUser(HttpUser):
    # Usuário padrão - distribuição realista
    wait_time = between(1, 3)

class QuickLoadUser(HttpUser):
    # Usuário agressivo - stress máximo
    wait_time = between(0.5, 1.5)

class MixedWorkloadUser(HttpUser):
    # Workflow realista - operações sequenciais
    wait_time = between(2, 5)
```

**Justificativa**:
- **Flexibilidade**: Escolher perfil de usuário apropriado
- **Cenários diversos**: Simular diferentes padrões de uso
- **Composição**: Combinar múltiplos perfis em um teste

### 5.5 Locust Shapes: Padrões de Carga

**Decisão**: Implementar LoadTestShape para padrões customizados.

```python
class SpikeTestShape(LoadTestShape):
    stages = [
        {"duration": 60, "users": 5, "spawn_rate": 1},
        {"duration": 30, "users": 100, "spawn_rate": 50},  # SPIKE
        ...
    ]
```

**Vantagens**:
- **Repetibilidade**: Mesmo padrão de carga toda vez
- **Documentação**: Shape documenta o teste
- **Headless mode**: Testes automatizados sem UI

### 5.6 Scripts de Automação

**Decisão**: Shell scripts com menus interativos.

**Características implementadas**:
1. **Menus**: Escolhas numeradas para facilitar uso
2. **Cores**: Output colorido para melhor UX
3. **Validações**: Verificar pré-requisitos antes de executar
4. **Help text**: Instruções claras em caso de erro

**Exemplo**:
```bash
if ! command -v k6 &> /dev/null; then
    print_error "K6 não está instalado!"
    print_info "Instale com: ./install-tools.sh"
    exit 1
fi
```

**Justificativa**:
- **Acessibilidade**: Não requer expertise em comandos
- **Robustez**: Menos erro humano
- **Documentação viva**: Scripts documentam o processo

---

## 6. Métricas e Avaliação

### 6.1 Métricas do K6

**Métricas coletadas automaticamente**:

```
http_req_duration.........: avg, min, med, max, p(90), p(95), p(99)
http_req_failed...........: rate (%)
http_reqs.................: count, rate (/s)
iteration_duration........: avg, min, med, max
iterations................: count, rate (/s)
vus.......................: min, max
```

**Interpretação**:

| Métrica | Boa | Aceitável | Problema |
|---------|-----|-----------|----------|
| http_req_failed | < 0.1% | < 1% | > 5% |
| p(95) duration | < 500ms | < 2s | > 5s |
| http_reqs (RPS) | Crescente | Estável | Decrescente |

### 6.2 Métricas do HPA

**Fórmula do HPA**:
```
desiredReplicas = ceil[currentReplicas × (currentMetric / targetMetric)]
```

**Exemplo prático**:
```
currentReplicas = 2
currentCPU = 75%
targetCPU = 50%

desiredReplicas = ceil[2 × (75 / 50)] = ceil[3] = 3
```

**Análise de comportamento**:

```
Tempo  | CPU% | Réplicas | Ação
-------|------|----------|------------------
0min   | 20%  | 1        | -
5min   | 55%  | 1        | Trigger scale up
6min   | 80%  | 2        | Scaling
10min  | 45%  | 3        | Estável
20min  | 30%  | 3        | -
25min  | 25%  | 3        | Cooldown (5min)
30min  | 25%  | 2        | Scale down
```

### 6.3 Correlação entre Métricas

**Análise multidimensional**:

```
Alta latência + Baixo throughput + Alta CPU = Bottleneck de CPU
Alta latência + Alto throughput + Baixa CPU = Bottleneck de rede/I/O
Alta taxa erro + CPU normal = Problema de aplicação
```

### 6.4 Golden Signals (Google SRE)

**Decisão**: Focar nas 4 métricas fundamentais.

1. **Latency**: http_req_duration
2. **Traffic**: http_reqs (RPS)
3. **Errors**: http_req_failed
4. **Saturation**: CPU/Memory usage

**Justificativa**: Framework comprovado pela Google para SRE.

---

## 7. Considerações sobre Autoscaling

### 7.1 Comportamento Esperado do HPA

#### Cenário 1: Load Test (Carga Gradual)

**Expectativa**:
```
Carga:    ↗️ → → → ↘️
Pods:     1 → 2 → 3 → 3 → 2 → 1
CPU:      ~~~50%~~~ (oscila em torno do target)
Latência: Estável
Erros:    Mínimos
```

**Validação**:
- HPA deve reagir em ~1-2 minutos
- Não deve haver oscilação (flapping)
- Latência não deve degradar

#### Cenário 2: Spike Test (Pico Súbito)

**Expectativa**:
```
Carga:    → ↑↑ → ↓↓ →
Pods:     1 → (delay) → 5 → 5 → 2 → 1
CPU:      →  ↑↑↑  →  ↓↓  →
Latência: →  ↑↑  →  ↓  →
Erros:    Possíveis durante spike inicial
```

**Validação**:
- Sistema sobrevive ao spike
- Recupera após ramp-down
- Taxa de erro temporária é aceitável (< 15%)

#### Cenário 3: Stress Test (Além dos Limites)

**Expectativa**:
```
Carga:    ↗️ ↗️ ↗️ ↗️ (continua subindo)
Pods:     1 → 2 → 4 → 8 → 10 (MAX)
CPU:      50% → 70% → 90% → 100%
Latência: → → ↑ ↑↑ ↑↑↑
Erros:    → → → ↑ ↑↑
```

**Ponto de quebra**: Quando MAX_PODS é atingido e CPU continua 100%.

**Validação**:
- Identificar ponto de quebra
- Sistema degrada graciosamente (não crash)
- Recupera após redução de carga

### 7.2 Problemas Comuns do HPA

#### 7.2.1 Flapping (Oscilação)

**Problema**: Pods sobem e descem constantemente.

**Causa**:
- Target muito baixo
- Métricas oscilantes
- Cooldown insuficiente

**Solução**:
- Aumentar cooldown period
- Ajustar target (margem maior)
- Smooth metrics (average over time)

#### 7.2.2 Scaling Lag (Atraso)

**Problema**: HPA demora muito para reagir.

**Causa**:
- Metrics scraping interval (padrão: 15s)
- HPA evaluation interval (padrão: 15s)
- Pod startup time

**Tempo total**:
```
Total Lag = Metrics Scraping + HPA Evaluation + Pod Startup
          ≈ 15s + 15s + 30s = 60s
```

**Mitigação**:
- Reduzir intervals (trade-off: mais carga no API server)
- Usar cluster autoscaler para nodes
- Pre-warming (manter min replicas > 1)

#### 7.2.3 Resource Limits

**Problema**: Pods não podem escalar além de limites de recursos.

**Causa**:
- Resource requests/limits mal configurados
- Nodes sem capacidade

**Validação**:
- Monitorar `kubectl get events`
- Verificar `kubectl describe node`

### 7.3 Testes Específicos para HPA

**Decisão**: Criar testes focados em validar HPA.

1. **Scale Up Test**: Validar tempo e comportamento de scale up
2. **Scale Down Test**: Validar cooldown e scale down gradual
3. **Oscillation Test**: Carga oscilante para detectar flapping
4. **Max Capacity Test**: Atingir MAX_PODS e validar comportamento

---

## 8. Melhores Práticas Aplicadas

### 8.1 Princípios de Engenharia de Software

#### 8.1.1 DRY (Don't Repeat Yourself)

**Aplicação**:
- Configuração centralizada (config.js)
- Funções reutilizáveis nos scripts
- Scripts de automação genéricos

#### 8.1.2 KISS (Keep It Simple, Stupid)

**Aplicação**:
- Scripts shell com menus simples
- Testes focados (um objetivo por script)
- Documentação clara e objetiva

#### 8.1.3 Separation of Concerns

**Aplicação**:
- K6 para automação, Locust para exploração
- Scripts de teste separados de monitoramento
- Configuração separada de lógica

### 8.2 Automação

**Decisão**: Automatizar tudo que for repetitivo.

**Implementado**:
- Instalação de ferramentas
- Execução de testes
- Geração de relatórios
- Monitoramento

**Benefícios**:
- Reduz erro humano
- Economiza tempo
- Facilita CI/CD

### 8.3 Documentação

**Estratégia de documentação em camadas**:

1. **README.md**: Documentação completa e técnica
2. **QUICK_START.md**: Guia prático para começar rápido
3. **TECHNICAL_DOCUMENT.md**: Teoria e decisões (este documento)
4. **Comentários no código**: Explicações inline

**Justificativa**: Diferentes audiências, diferentes necessidades.

### 8.4 Versionamento

**Decisão**: Git + Branches + Tags.

**Estrutura**:
```
main                    - Código estável
├── feat/*              - Novas funcionalidades
├── fix/*               - Correções
└── test/*              - Experimentos
```

### 8.5 Reprodutibilidade

**Princípio**: Testes devem ser reproduzíveis.

**Garantias**:
- Seeds fixas para aleatoriedade
- Configuração versionada
- Ambiente dockerizado (Kubernetes)
- Documentação completa

---

## 9. Conclusão

### 9.1 Contribuições

Este trabalho contribui com:

1. **Suite completa de testes** para sistemas distribuídos
2. **Metodologia documentada** para validação de autoscaling
3. **Ferramentas automatizadas** para execução e monitoramento
4. **Base teórica** para decisões de design
5. **Código reutilizável** para projetos similares

### 9.2 Lições Aprendidas

1. **Testes de carga são essenciais** para validar sistemas distribuídos
2. **Múltiplas ferramentas** oferecem perspectivas complementares
3. **Automação** reduz significativamente tempo e erros
4. **Documentação** é tão importante quanto código
5. **HPA funciona bem** quando configurado corretamente

### 9.3 Trabalhos Futuros

Possíveis extensões:

1. **Testes de Caos**: Introduzir falhas deliberadas (Chaos Engineering)
2. **Observabilidade**: Integrar Prometheus + Grafana
3. **Distributed Tracing**: OpenTelemetry para rastreamento
4. **Load Balancing**: Testar diferentes algoritmos
5. **Multi-região**: Simular latência geográfica

### 9.4 Aplicabilidade

Este trabalho pode ser aplicado em:

- Validação de sistemas de produção
- Planejamento de capacidade
- Detecção de regressões de performance
- Educação em sistemas distribuídos
- Pesquisa em autoscaling e elasticidade

---

## 10. Referências

### 10.1 Livros

1. **"Site Reliability Engineering"** - Google, 2016
   - Capítulos sobre performance testing e SLAs

2. **"Release It! Design and Deploy Production-Ready Software"** - Michael Nygard, 2018
   - Stability patterns e capacity planning

3. **"Designing Data-Intensive Applications"** - Martin Kleppmann, 2017
   - Sistemas distribuídos e trade-offs

### 10.2 Papers Acadêmicos

1. **Brewer, E.** (2000). "Towards Robust Distributed Systems" (CAP Theorem)
   - PODC Keynote

2. **Dean, J., & Barroso, L. A.** (2013). "The Tail at Scale"
   - Communications of the ACM, 56(2), 74-80

3. **Jogalekar, P., & Woodside, M.** (2000). "Evaluating the Scalability of Distributed Systems"
   - IEEE Transactions on Parallel and Distributed Systems

### 10.3 Documentação Técnica

1. **Kubernetes Documentation** - https://kubernetes.io/docs/
   - Horizontal Pod Autoscaler
   - Metrics Server

2. **K6 Documentation** - https://k6.io/docs/
   - Test types
   - Metrics

3. **Locust Documentation** - https://docs.locust.io/
   - Writing locustfiles
   - Distributed load testing

### 10.4 Especificações

1. **gRPC** - https://grpc.io/
2. **HTTP/2** - RFC 7540
3. **Protobuf** - Protocol Buffers v3

### 10.5 Blog Posts e Artigos

1. **"How We Test at Netflix"** - Netflix Tech Blog
2. **"Performance Testing Best Practices"** - Martin Fowler
3. **"Understanding Latency vs Throughput"** - High Scalability Blog

---

## Apêndice A: Glossário

| Termo | Definição |
|-------|-----------|
| **HPA** | Horizontal Pod Autoscaler - escala pods horizontalmente |
| **VU** | Virtual User - usuário virtual em testes de carga |
| **RPS** | Requests Per Second - requisições por segundo |
| **P95** | Percentil 95 - 95% das requisições são mais rápidas |
| **Throughput** | Taxa de transferência - requisições processadas/tempo |
| **Latency** | Tempo entre requisição e resposta |
| **Flapping** | Oscilação rápida entre estados (scale up/down) |
| **Ramp-up** | Aumento gradual de carga |
| **Ramp-down** | Redução gradual de carga |
| **Spike** | Aumento súbito de carga |
| **Soak Test** | Teste de longa duração com carga constante |
| **Golden Signals** | 4 métricas fundamentais (Latency, Traffic, Errors, Saturation) |

---

## Apêndice B: Fórmulas e Cálculos

### B.1 Lei de Little
```
L = λ × W

L = Número médio de itens no sistema
λ = Taxa média de chegada
W = Tempo médio no sistema
```

### B.2 Utilização do Sistema
```
ρ = λ / μ

ρ = Utilização (0 < ρ < 1 para estabilidade)
λ = Taxa de chegada
μ = Taxa de serviço
```

### B.3 Tempo de Resposta (M/M/1 Queue)
```
R = 1 / (μ - λ)

R = Tempo de resposta médio
μ = Taxa de serviço
λ = Taxa de chegada
```

### B.4 Speedup (Lei de Amdahl)
```
S = 1 / [(1 - P) + (P / N)]

S = Speedup
P = Fração paralelizável
N = Número de processadores
```

### B.5 HPA Desired Replicas
```
desiredReplicas = ceil[currentReplicas × (currentMetric / targetMetric)]
```

---

## Apêndice C: Comandos Úteis

### C.1 Kubernetes

```bash
# Ver HPA em tempo real
kubectl get hpa -w

# Ver pods em tempo real
kubectl get pods -w

# Métricas de CPU/Memória
kubectl top pods
kubectl top nodes

# Logs de um pod
kubectl logs -f <pod-name>

# Descrever HPA (detalhes)
kubectl describe hpa <hpa-name>

# Events do cluster
kubectl get events --sort-by='.lastTimestamp'
```

### C.2 K6

```bash
# Executar teste
k6 run script.js

# Com variável de ambiente
k6 run -e BASE_URL=http://example.com script.js

# Com export de resultados
k6 run --out json=results.json script.js

# Ver sumário
k6 run --summary-export=summary.json script.js
```

### C.3 Locust

```bash
# Modo web
locust -f locustfile.py --host=http://example.com

# Modo headless
locust -f locustfile.py --host=http://example.com --headless -u 100 -r 10 --run-time 5m

# Com export HTML
locust ... --html=report.html
```

---

**Fim do Documento Técnico**

*Universidade de Brasília - PSPD - 2025*
