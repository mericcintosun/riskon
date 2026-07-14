import { IStateStore, TxRecord, TxState } from './types';

export class InMemoryStateStore implements IStateStore {
    private store: Map<string, TxRecord> = new Map();

    async get(key: string): Promise<TxRecord | null> {
        return this.store.get(key) || null;
    }

    async create(key: string, state: TxState): Promise<TxRecord> {
        const record: TxRecord = {
            idempotencyKey: key,
            state,
            attempts: 0,
            updatedAt: Date.now()
        };
        this.store.set(key, record);
        return record;
    }

    async update(key: string, data: Partial<TxRecord>): Promise<TxRecord> {
        const existing = this.store.get(key);
        if (!existing) {
            throw new Error(`Record not found for key: ${key}`);
        }

        const updated = {
            ...existing,
            ...data,
            updatedAt: Date.now()
        };

        this.store.set(key, updated);
        return updated;
    }
}
