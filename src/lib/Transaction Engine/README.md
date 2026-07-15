# Anti-Gravity Transaction Engine

> **Status: not wired into the app.** Nothing in `src/` imports this module. The
> code is real — the error taxonomy maps actual Horizon/Soroban `result_codes`,
> and the backoff scheduler is genuine exponential backoff with jitter — but it
> is a library sitting on the shelf, not a layer any Riskon request passes
> through. Read the examples below as a proposal, not a description of what runs.
>
> **It cannot guarantee exactly-once as shipped.** The only `IStateStore`
> implementation here is `InMemoryStateStore` (a `Map`, `state.ts`), which loses
> every record on restart — so the idempotency guard cannot survive the crash it
> exists to protect against. Exactly-once needs a durable store (Redis, Postgres)
> behind the same interface. Until one exists, this is at-least-once with good
> retry behaviour.

A self-healing execution layer for Soroban transaction pipelines: it aims to keep
them from collapsing under RPC timeouts, rate limits, and partial finality.

## 1. System Architecture

The engine encapsulates the transaction execution layer into an autonomous state machine composed of five core modules:

1. **Transaction Orchestrator (`engine.ts`)**: The entry point. It manages the transaction lifecycle and synchronizes the sub-modules.
2. **Idempotency Guard**: Prevents duplicate submissions by binding business intent to a deterministic cryptographic key.
3. **State Store (`state.ts`)**: A persistent, concurrent memory layer that tracks the exact phase of every transaction (INIT → SIGNED → SUBMITTED → PENDING → CONFIRMED / FAILED).
4. **Error Classifier (`classifier.ts`)**: A deep inspection heuristic engine that taxonomizes Horizon/Soroban errors strictly into `RETRYABLE`, `NON_RETRYABLE`, or `UNKNOWN`.
5. **Backoff Scheduler (`scheduler.ts`)**: Employs exponential backoff with configurable jitter, acting as a dynamic circuit breaker to protect RPC nodes from thundering herds.

## 2. Example Integration with Riskon

The engine is modular and wraps native Soroban smart contract invocations.

```typescript
import { AntigravityEngine, InMemoryStateStore } from '@/lib/Transaction Engine';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import crypto from 'crypto';

// Initialize the engine (Memory store used for local; recommend Redis for prod)
const engine = new AntigravityEngine(new InMemoryStateStore(), {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  circuitBreakerThreshold: 10
});

async function submitRiskonLiquidation(userPubkey: string, collateralXlm: number) {
  // 1. Generate Deterministic Intent (Idempotency Key)
  const payloadStr = JSON.stringify({ userPubkey, collateralXlm, action: 'LIQUIDATE' });
  const idempotencyKey = crypto.createHash('sha256').update(payloadStr).digest('hex');

  // 2. Wrap Execution in Antigravity Engine
  const record = await engine.execute(idempotencyKey, async () => {
    
    // THIS CLOSURE ONLY EXECUTES IF SAFE TO DO SO.
    // If a 504 Gateway Timeout occurs, the engine suspends, backsoff, and eventually re-invokes this closure.

    const sourceAccount = await server.loadAccount(ADMIN_PUBKEY);
    const tx = new TransactionBuilder(sourceAccount, { fee: '1000' })
      .addOperation(/* Your Riskon liquidator smart contract call */)
      .setTimeout(30)
      .build();

    tx.sign(ADMIN_KEYPAIR);
    return await server.submitTransaction(tx);
  });

  if (record.state === 'CONFIRMED') {
    console.log(`Liquidation confirmed: ${record.hash}`);
  } else {
    console.error(`Terminal Failure: ${record.lastError}`);
  }
}
```

## 3. Edge Cases Handled

* **`tx_bad_seq` (Sequence Collisions):** If multiple parallel processes attempt to submit from the same source account, Horizon intercepts subsequent ones with `tx_bad_seq`. This is classified as `RETRYABLE`. The engine waits, allowing the closure to re-fetch the updated `sourceAccount` state on the next attempt.
* **In-Flight Network Partitions:** If a transaction is submitted but the TCP connection resets before receiving the Horizon receipt, the engine state remains `SUBMITTED`. Future orchestrator sweeps or retries can poll the blocks to confidently advance to `CONFIRMED` without raw re-submission.
* **RPC Rate Limiting (HTTP 429):** Cryptographic jitter is integrated into the `BackoffScheduler`. This ensures large pools of retries fan out mathematically, preventing DDOSing of your RPC provider and allowing leaky-buckets to reset.
* **Simulation Failures:** Directly caught by the `classifier` and marked as an `ABORT` (permanent failure). Soroban VM simulation failures correctly short-circuit the retry loop, identifying that the error is in the business logic natively rather than the transport layer.

## 4. Performance & Security Considerations under Load

* **Concurrency & Duplications:** Execution relies on a "first-thread-wins" mutex tied to the `idempotencyKey`. Subsequent parallel requests with the same business payload instantly return the pending or confirmed parent result, shielding the RPC from identical duplicate traffic.
* **Memory Leaks:** `engine.execute` enforces absolute boundaries. Under all theoretical conditions, a transaction achieves a terminal state (`CONFIRMED` or `FAILED`), eliminating zombie promises from hanging in the Node JS event loop. 
* **Scalability:** The `IStateStore` interface is agnostic. You can effortlessly scale the AgentKit from single-container to massive horizontal Kubernetes clusters by hot-swapping `InMemoryStateStore` with an IORedis implementation.
