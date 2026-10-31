import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 10 }, // Ramp-up
    { duration: '15s', target: 30 }, // Steady load
    { duration: '5s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.01'], // HTTP errors must be < 1%
  },
};

const BASE_BUYER_URL = __ENV.BUYER_URL || 'http://localhost:3000';
const BASE_AI_URL = __ENV.AI_URL || 'http://127.0.0.1:8000';

export default function () {
  // Scenario 1: High-concurrency Group Discovery Browsing
  const groupRes = http.get(`${BASE_BUYER_URL}/`);
  check(groupRes, {
    'group discovery status is 200': (r) => r.status === 200,
    'contains GroupDrive branding': (r) => r.body && r.body.includes('GroupDrive'),
  });

  // Scenario 2: Car Advisor Reverse Auction & Landed Cost Inquiry
  const payload = JSON.stringify({
    query: 'Bhai 12 lakh ke budget me diesel SUV Baramati delivery ke liye kaunsi best rahegi?',
    user_id: `k6-user-${__VU}`,
    preferred_language: 'hinglish',
  });

  const headers = { 'Content-Type': 'application/json' };
  const aiRes = http.post(`${BASE_AI_URL}/advisor/chat`, payload, { headers });

  check(aiRes, {
    'ai advisor status is 200': (r) => r.status === 200,
    'response has citations': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.citations && body.citations.length > 0;
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}
