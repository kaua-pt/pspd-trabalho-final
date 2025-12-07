// Configurações compartilhadas para testes K6
export const BASE_URL = 'http://192.168.0.10:30000';  // Changed from 192.168.49.2 to peixoto IP

export const endpoints = {
  url: `${BASE_URL}/url`,
  qr: `${BASE_URL}/qr`
};

export const headers = {
  'Content-Type': 'application/json',
  'x-protocol-choice': 'grpc'
};

export const payloads = {
  url: JSON.stringify({
    url: 'https://www.google.com'
  }),
  qr: JSON.stringify({
    text: 'StressTestAutoscaling'
  })
};

// Thresholds de performance esperados
export const defaultThresholds = {
  http_req_failed: ['rate<0.01'], // menos de 1% de falhas
  http_req_duration: ['p(95)<2000'], // 95% das requisições devem ser menores que 2s
  http_req_duration: ['p(99)<3000'], // 99% das requisições devem ser menores que 3s
};