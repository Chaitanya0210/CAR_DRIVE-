# GroupDrive — Production Incident Response Runbook

> **Document Version:** 1.0.0  
> **Classification:** SRE & On-Call Engineering Runbook  
> **Escalation SLA:** P0/P1 incidents within 15 minutes; P2/P3 incidents within 1 hour.

---

## 1. On-Call Severity Classification & Escalation Matrix

| Severity | Definition | Examples | Response Target |
| :--- | :--- | :--- | :--- |
| **P0 (Critical)** | Core revenue or booking path broken; data corruption risk. | Database down; reverse auction bids exposed; ledger balance mismatch. | **Immediate (≤ 15 mins)** |
| **P1 (High)** | Major feature degraded; workarounds available. | Redis down (degraded caching); payment webhooks failing; AI RAG down. | **≤ 30 mins** |
| **P2 (Medium)** | Non-critical admin or analytics issue. | CSV inventory import failing; notification delivery delayed. | **≤ 2 hours** |
| **P3 (Low)** | Minor cosmetic or non-blocking bug. | Copy typo in Hindi translation; slow benchmark export. | **Next business day** |

---

## 2. Playbook 1: PostgreSQL Database Down or Connection Pool Exhausted

### Symptoms
- NestJS API `/health/ready` returns `HTTP 503 Service Unavailable` with `database: DOWN`.
- Application logs report `PrismaClientInitializationError: Can't reach database server` or `Timed out fetching a new connection from the connection pool`.
- Error spikes in Sentry with `code: 57P01` (admin shutdown) or `code: 53300` (too many connections).

### Diagnostic Steps
1. **Check Postgres container / RDS status:**
   ```bash
   # Single-VM Docker:
   docker compose -f docker-compose.prod.yml ps postgres
   docker compose -f docker-compose.prod.yml logs --tail 100 postgres

   # AWS RDS:
   aws rds describe-db-instances --db-instance-identifier groupdrive-production-postgres --query "DBInstances[0].DBInstanceStatus"
   ```

2. **Inspect active connections and long-running queries:**
   ```sql
   SELECT pid, usename, client_addr, state, age(clock_timestamp(), query_start) AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;
   ```

### Resolution & Mitigation Steps
1. **Terminate blocking / zombie connections:**
   ```sql
   -- Terminate queries running longer than 60 seconds
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state != 'idle'
     AND age(clock_timestamp(), query_start) > interval '60 seconds'
     AND pid <> pg_backend_pid();
   ```

2. **If connection pool exhausted (too many clients):**
   - In AWS RDS: Temporarily increase `max_connections` in parameter group or scale instance class.
   - In container API: Ensure `DATABASE_URL` contains `connection_limit=25&pool_timeout=10` to avoid connection spikes.

3. **If database is unrecoverable (Corrupt data or hardware failure):**
   - Restore immediately using the verified checksum restore tool:
     ```bash
     pnpm db:restore
     # Or specify exact snapshot:
     tsx scripts/db-restore.ts --file ./backups/groupdrive_backup_xxx.sql
     ```
   - Run financial reconciliation to verify zero discrepancies:
     ```bash
     pnpm reconcile
     ```

---

## 3. Playbook 2: Redis Down or Cache Eviction Failure

### Symptoms
- BullMQ background jobs (notification retries, quote unsealing timers) stop processing.
- Rate limiting middleware blocks valid requests or allows excessive bursts.
- Logs show `ECONNREFUSED 127.0.0.1:6379` or `OOM command not allowed when used memory > 'maxmemory'`.

### Diagnostic Steps
1. **Ping Redis:**
   ```bash
   # Single-VM:
   docker exec -it groupdrive-redis redis-cli ping
   # Expected output: PONG
   ```

2. **Check memory utilization and policy:**
   ```bash
   docker exec -it groupdrive-redis redis-cli INFO memory
   ```

### Resolution & Mitigation Steps
1. **Restart Redis container:**
   ```bash
   docker compose -f docker-compose.prod.yml restart redis
   ```

2. **If out-of-memory (OOM):**
   - Enforce LRU eviction policy so active locks and sessions aren't dropped:
     ```bash
     docker exec -it groupdrive-redis redis-cli CONFIG SET maxmemory-policy volatile-lru
     ```
   - Flush transient rate-limit keys:
     ```bash
     docker exec -it groupdrive-redis redis-cli --scan --pattern "rate_limit:*" | xargs -r docker exec -i groupdrive-redis redis-cli del
     ```

3. **Automated API Degradation:**
   - The GroupDrive NestJS API is architected with graceful fallback: if Redis fails, rate limiting degrades to an in-memory sliding window cache without dropping customer requests.

---

## 4. Playbook 3: Payment Webhook Failures (Razorpay / Gateway)

### Symptoms
- Buyers report payment deduction on UPI/NetBanking, but booking status remains `PENDING_DEPOSIT`.
- Seller onboarding fee paid, but KYB gate remains locked.
- API logs show `RazorpaySignatureVerificationError` or `HTTP 400 Invalid Webhook Signature`.

### Diagnostic Steps
1. **Check dead-letter queue in database / logs:**
   ```sql
   SELECT id, "paymentType", status, "referenceId", "failureReason", "createdAt"
   FROM "Payment"
   WHERE status = 'FAILED'
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```

2. **Verify Webhook Secret Configuration:**
   Ensure `RAZORPAY_WEBHOOK_SECRET` in production secrets matches the webhook endpoint configured in Razorpay Dashboard.

### Resolution & Mitigation Steps
1. **Idempotent Webhook Replay:**
   - GroupDrive webhook handler is strictly idempotent using `payment.paymentGatewayRef`. Replay the webhook payload directly from the Razorpay Dashboard → **Settings** → **Webhooks** → **Retry**.

2. **Manual Reconciliation via CLI:**
   - If automated webhook was dropped due to network timeout:
     ```bash
     # Re-audit and sync all subledgers
     pnpm reconcile
     ```
   - If manual credit was confirmed by the bank, capture payment via admin API:
     ```bash
     curl -X POST https://api.groupdrive.in/api/v1/payments/webhook \
       -H "Content-Type: application/json" \
       -H "X-Razorpay-Signature: <signature>" \
       -d @payload.json
     ```

---

## 5. Playbook 4: AI Provider Outage (Gemini / OpenAI API Down)

### Symptoms
- Rural buyer Car Advisor widget shows fallback responses or latency spikes (> 8 seconds).
- AI service returns `HTTP 504 Gateway Timeout` or `HTTP 429 Resource Exhausted`.

### Diagnostic Steps
1. **Check AI Service health:**
   ```bash
   curl -f http://127.0.0.1:8000/health
   # Inspect "provider" and "status"
   ```

2. **Check provider status:**
   - Google AI Studio / Vertex AI status dashboard.
   - OpenAI API status page.

### Resolution & Mitigation Steps
1. **Automated Fallback Gateway:**
   - The GroupDrive AI Service includes a provider-agnostic fallback interface. If Gemini times out, it switches automatically to local rule-based intent parsing and fallback advice.

2. **Force Fallback Heuristic Mode:**
   - If external APIs are completely down, switch the primary provider to `fallback` without restarting:
     ```bash
     # In .env or container environment:
     DEFAULT_PROVIDER="fallback"
     ```
   - In fallback mode, the Car Advisor responds with local pgvector retrieval and pre-cached FAQ matrices with zero external API calls.

3. **Circuit Breaker Reset:**
   - Once Google AI Studio recovers, reset the gateway:
     ```bash
     docker compose -f docker-compose.prod.yml restart ai-service
     ```

---

## 6. Disaster Recovery & Rollback Procedures

### Instant Frontend Rollback (Vercel)
1. Go to Vercel Dashboard → **Project** → **Deployments**.
2. Locate the last known good deployment tag (e.g. `v1.0.4`).
3. Click the **...** menu → **Instant Rollback**.
4. Traffic routes to the previous build within 5 seconds.

### Backend Rollback (Docker / ECS)
```bash
# 1. Rollback container image tag to previous release
docker compose -f docker-compose.prod.yml down api
# Edit docker-compose.prod.yml to point to previous tag: ghcr.io/groupdrive/api:prod-previous-sha
docker compose -f docker-compose.prod.yml up -d api

# 2. On AWS ECS:
aws ecs update-service \
  --cluster groupdrive-production-cluster \
  --service groupdrive-production-api-service \
  --task-definition groupdrive-production-api:14 \
  --force-new-deployment
```

### Database Migration Rollback Rules
- All GroupDrive schema changes adhere to the **Expand and Contract** pattern (additive columns first, deprecated columns marked nullable).
- If a migration must be reverted, apply an explicit forward rollback migration file rather than executing `migrate down` to protect ledger audit records.
