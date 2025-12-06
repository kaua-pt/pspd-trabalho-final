// Configurações compartilhadas para testes K6
export const BASE_URL = __ENV.BASE_URL || 'http://192.168.49.2:30000';

export const endpoints = {
  url: `${BASE_URL}/url`,
  qr: `${BASE_URL}/qr`
};

export const headers = {
  'Content-Type': 'application/json',
  'x-protocol-choice': __ENV.PROTOCOL || 'grpc'
};

// URLs de teste para encurtamento
export const testUrls = [
  'https://www.google.com',
  'https://www.github.com',
  'https://www.stackoverflow.com',
  'https://www.amazon.com',
  'https://www.wikipedia.org',
  'https://www.youtube.com',
  'https://www.linkedin.com',
  'https://www.twitter.com',
  'https://www.facebook.com',
  'https://www.reddit.com',
];

// Textos de teste para QR Code
export const testTexts = [
  'StressTestAutoscaling',
  'https://www.example.com',
  'TesteGrupoPSPD',
  'Hello World from k6',
  'QR Code Test 12345',
  'https://github.com/grafana/k6',
  'Production stress test',
  'Microservices architecture',
  'contact@example.com',
  'Phone: +55 11 98765-4321',
];

// Payloads dinâmicos
export function getUrlPayload() {
  const url = testUrls[Math.floor(Math.random() * testUrls.length)];
  return JSON.stringify({ url });
}

export function getQrPayload() {
  const text = testTexts[Math.floor(Math.random() * testTexts.length)];
  return JSON.stringify({ text });
}

// Payloads fixos (para testes simples)
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
  http_req_duration: ['p(95)<2000', 'p(99)<3000'], // 95% < 2s, 99% < 3s
};

export const stressThresholds = {
  http_req_failed: ['rate<0.1'], // permite até 10% de falhas em stress test
  http_req_duration: ['p(95)<5000'], // relaxa os limites de tempo
};
