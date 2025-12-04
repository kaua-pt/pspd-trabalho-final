import http from 'k6/http';
import { check, sleep } from 'k6';
import { endpoints, headers, payloads, defaultThresholds } from './config.js';

// Smoke Test: Teste básico para verificar se o sistema está funcionando
// Carga mínima: 1-5 usuários por 1 minuto
export const options = {
  stages: [
    { duration: '30s', target: 2 },  // ramp-up para 2 usuários
    { duration: '30s', target: 2 },  // mantém 2 usuários
    { duration: '30s', target: 0 },  // ramp-down
  ],
  thresholds: defaultThresholds,
};

export default function () {
  // Teste do endpoint de encurtamento de URL
  let urlResponse = http.post(endpoints.url, payloads.url, { headers });
  check(urlResponse, {
    'URL shortener status 200': (r) => r.status === 200,
    'URL shortener has shortened_url': (r) => JSON.parse(r.body).shortened_url !== undefined,
  });

  sleep(1);

  // Teste do endpoint de QR Code
  let qrResponse = http.post(endpoints.qr, payloads.qr, { headers });
  check(qrResponse, {
    'QR Code status 200': (r) => r.status === 200,
    'QR Code has qr_code': (r) => JSON.parse(r.body).qr_code !== undefined,
  });

  sleep(1);
}
