export enum TxState {
  INIT = 'INIT',
  SIGNED = 'SIGNED',
  SUBMITTED = 'SUBMITTED',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED'
}

export enum ErrorAction {
  RETRY = 'RETRY',
  ABORT = 'ABORT',
  ESCALATE = 'ESCALATE'
}

export interface EngineConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  circuitBreakerThreshold: number;
}

export interface TxRecord {
  idempotencyKey: string;
  state: TxState;
  hash?: string;
  attempts: number;
  lastError?: string;
  updatedAt: number;
}

export interface IStateStore {
  get(key: string): Promise<TxRecord | null>;
  create(key: string, state: TxState): Promise<TxRecord>;
  update(key: string, data: Partial<TxRecord>): Promise<TxRecord>;
}
