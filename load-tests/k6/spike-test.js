import http from 'k6/http';
import { check, sleep } from 'k6';
import { endpoints, headers, payloads } from './config.js';

// Spike Test: Testa como o sistema lida com picos súbitos de tráfego
// Simula eventos como Black Friday, lançamentos, etc.
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // carga baixa normal
    { duration: '30s', target: 5 },    // mantém carga baixa
    { duration: '30s', target: 200 },  // SPIKE! pico súbito
    { duration: '1m', target: 200 },   // mantém o pico
    { duration: '30s', target: 5 },    // volta ao normal rapidamente
    { duration: '1m', target: 5 },     // mantém baixo
    { duration: '30s', target: 0 },    // ramp-down
  ],
  thresholds: {
    'http_req_failed': ['rate<0.15'], // permite até 15% de falhas durante o spike
    'http_req_duration': ['p(95)<10000'], // 10s no spike é aceitável
  },
};

export default function () {
  const endpoints_list = [
    { url: endpoints.url, payload: payloads.url },
    { url: endpoints.qr, payload: payloads.qr }
  ];

  const selected = endpoints_list[Math.floor(Math.random() * endpoints_list.length)];
  let response = http.post(selected.url, selected.payload, { headers });

  check(response, {
    'status is not 500': (r) => r.status !== 500,
    'has response': (r) => r.body && r.body.length > 0,
  });

  sleep(0.3); 
}
