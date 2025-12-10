import http from 'k6/http';
import { check, sleep } from 'k6';
import { endpoints, headers, payloads } from './config.js';

// Stress Test: Testa os limites do sistema
// Aumenta gradualmente a carga até encontrar o ponto de quebra
export const options = {
  stages: [
    { duration: '10s', target: 1 },  // mantém 150
    { duration: '1m', target: 1 },  // mantém 150
    { duration: '1m', target: 1000 },  // mantém 150
    { duration: '1m', target: 1000 },  // mantém 150
    { duration: '3m', target: 10000 },  // mantém 150
    { duration: '2m', target: 10000 },  // aumenta para 150
    { duration: '30s', target: 0 },    // recovery - ramp-down gradual
  ],
  thresholds: {
    'http_req_failed': ['rate<0.1'], // permite até 10% de falhas em stress test
    'http_req_duration': ['p(95)<5000'], // relaxa os limites de tempo
  },
};

export default function () {
  // Testa ambos os endpoints para stress completo
  // Alterna entre QR Code e URL
  const useQr = Math.random() < 0.5;

  let response;
  if (useQr) {
    response = http.post(endpoints.qr, payloads.qr, { headers });
  } else {
    response = http.post(endpoints.url, payloads.url, { headers });
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has body': (r) => r.body && r.body.length > 0,
  });

  sleep(0.5); // menos sleep para mais pressão
}
