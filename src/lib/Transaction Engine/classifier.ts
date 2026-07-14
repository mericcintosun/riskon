import { ErrorAction } from './types';

export class ErrorClassifier {
    static classify(error: any): ErrorAction {
        const status = error?.response?.status;
        const data = error?.response?.data;

        // Transport Layer Errors (Rate limits, Gateway Timeouts)
        if ([429, 503, 504].includes(status)) {
            return ErrorAction.RETRY;
        }

        // Stellar/Horizon Specific Errors
        if (data?.extras?.result_codes) {
            const txCode = data.extras.result_codes.transaction;

            switch (txCode) {
                case 'tx_bad_seq':
                case 'tx_fee_bump_inner_failed':
                    // Requires state refresh, but payload intent is still valid
                    return ErrorAction.RETRY;
                case 'tx_bad_auth':
                case 'tx_insufficient_balance':
                    // Cryptographically invalid or permanently insolvent
                    return ErrorAction.ABORT;
            }
        }

        // Soroban RPC Simulation/Execution Errors
        if (error?.message?.includes('Simulation failed')) {
            // Smart contract rejected the logic; no point in retrying
            return ErrorAction.ABORT;
        }

        // Unknown network disconnects
        if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.message?.includes('network timeout')) {
            return ErrorAction.RETRY;
        }

        return ErrorAction.ABORT;
    }
}
