import http from 'k6/http';
import { check, sleep } from 'k6';
import { endpoints, headers, payloads, defaultThresholds } from './config.js';

// Soak Test (Endurance Test): Testa a confiabilidade do sistema por período prolongado
// Detecta problemas como memory leaks, degradação gradual, etc.
export const options = {
  stages: [
    { duration: '5m', target: 20 },   // ramp-up para carga moderada
    { duration: '30m', target: 20 },  // mantém por 30 minutos
    { duration: '5m', target: 0 },    // ramp-down
  ],
  thresholds: {
    ...defaultThresholds,
    'http_req_duration': ['p(95)<3000'], // deve manter performance ao longo do tempo
  },
};

export default function () {
  // Distribuição 50/50 entre os endpoints
  if (Math.random() < 0.5) {
    let response = http.post(endpoints.url, payloads.url, { headers });
    check(response, {
      'URL shortener OK': (r) => r.status === 200,
      'no degradation': (r) => r.timings.duration < 3000,
    });
  } else {
    let response = http.post(endpoints.qr, payloads.qr, { headers });
    check(response, {
      'QR Code OK': (r) => r.status === 200,
      'no degradation': (r) => r.timings.duration < 3000,
    });
  }

  sleep(Math.random() * 3 + 1); // 1-4 segundos de intervalo
}
