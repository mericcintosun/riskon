import { TxState, ErrorAction, EngineConfig, TxRecord, IStateStore } from './types';
import { ErrorClassifier } from './classifier';
import { BackoffScheduler } from './scheduler';

export class AntigravityEngine {
    constructor(
        private stateStore: IStateStore,
        private config: EngineConfig
    ) { }

    public async execute(
        idempotencyKey: string,
        txFactory: () => Promise<any>
    ): Promise<TxRecord> {
        let record = await this.stateStore.get(idempotencyKey);

        // Idempotency execution check
        if (record?.state === TxState.CONFIRMED) return record;
        if (!record) record = await this.stateStore.create(idempotencyKey, TxState.INIT);

        while (record.attempts < this.config.maxAttempts) {
            try {
                record = await this.stateStore.update(idempotencyKey, { state: TxState.SUBMITTED });

                // Critical Execution Boundary
                const result = await txFactory();

                return await this.stateStore.update(idempotencyKey, {
                    state: TxState.CONFIRMED,
                    hash: result?.hash || result?.id || 'unknown'
                });
            } catch (error: any) {
                const attemptCount = record.attempts + 1;
                const action = ErrorClassifier.classify(error);

                if (action === ErrorAction.ABORT) {
                    return await this.stateStore.update(idempotencyKey, {
                        state: TxState.FAILED, lastError: error.message, attempts: attemptCount
                    });
                }

                if (attemptCount >= this.config.maxAttempts) {
                    return await this.stateStore.update(idempotencyKey, {
                        state: TxState.FAILED, lastError: 'Max attempts: ' + error.message, attempts: attemptCount
                    });
                }

                // Retry Flow
                record = await this.stateStore.update(idempotencyKey, { state: TxState.PENDING, attempts: attemptCount });
                await BackoffScheduler.delay(attemptCount, this.config.baseDelayMs, this.config.maxDelayMs);
            }
        }
        throw new Error('Unreachable state');
    }
}
