import http from 'k6/http';
import { check, sleep } from 'k6';
import { endpoints, headers, payloads, defaultThresholds } from './config.js';

// Load Test: Teste com carga normal esperada
// Simula o comportamento típico de produção
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // ramp-up para 10 usuários
    { duration: '1m', target: 10 },  // mantém 10 usuários por 5 minutos
    { duration: '1m', target: 500 },  // aumenta para 20 usuários
    { duration: '3m', target: 500 },  // mantém 20 usuários
    { duration: '1m', target: 0 },   // ramp-down
  ],
  thresholds: {
    ...defaultThresholds,
    'http_reqs': ['rate>10'], // pelo menos 10 requisições por segundo
  },
};

export default function () {
  // Alterna entre os endpoints de forma realista
  const randomEndpoint = Math.random() < 0.5 ? 'url' : 'qr';

  if (randomEndpoint === 'url') {
    let response = http.post(endpoints.url, payloads.url, { headers });
    check(response, {
      'URL shortener status 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  } else {
    let response = http.post(endpoints.qr, payloads.qr, { headers });
    check(response, {
      'QR Code status 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  }

  sleep(Math.random() * 2 + 1); // sleep aleatório entre 1-3 segundos
}
