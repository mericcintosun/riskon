export class BackoffScheduler {
    static async delay(attempt: number, base: number, max: number): Promise<void> {
        let delayMs = Math.min(max, base * Math.pow(2, attempt));
        const jitter = delayMs * 0.2;
        delayMs = delayMs + (Math.random() * jitter * 2) - jitter;

        return new Promise((resolve) => setTimeout(resolve, delayMs));
    }
}
