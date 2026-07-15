/**
 * POST /api/passkey/deploy
 *
 * Submits the smart-wallet deploy transaction that `PasskeyKit.createWallet()`
 * builds in the browser.
 *
 * This is the piece that was missing: createWallet runs the WebAuthn ceremony
 * and returns a *signed, ready-to-submit* deploy transaction — but nothing ever
 * submitted it, so no wallet was ever actually deployed. (The old
 * passkeyIntegration.js "solved" this by returning a fake
 * `demo_direct_hash_<timestamp>` and reporting success.)
 *
 * passkey-kit's own PasskeyServer submits through the OpenZeppelin Channels
 * relayer, which needs an API key. We don't need fee sponsorship here: the
 * transaction is already fully signed by passkey-kit's canonical deployer (which
 * pays the fee), so it can go straight to Soroban RPC.
 *
 * Body: { signedTx: string /* base64 XDR *\/, contractId?: string }
 * Returns: { success, data: { hash, contractId }, timestamp }
 */

import { NextRequest, NextResponse } from "next/server";
import { Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;

function fail(message: string, code: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, code, details, timestamp: new Date().toISOString() },
    { status }
  );
}

export async function POST(request: NextRequest) {
  let body: { signedTx?: string; contractId?: string };

  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON in request body", "INVALID_INPUT", 400);
  }

  const signedTx = body?.signedTx;
  if (typeof signedTx !== "string" || signedTx.length < 32) {
    return fail(
      "signedTx (base64 XDR from PasskeyKit.createWallet) is required.",
      "INVALID_INPUT",
      400
    );
  }

  let transaction;
  try {
    transaction = TransactionBuilder.fromXDR(signedTx, NETWORK_PASSPHRASE);
  } catch (error) {
    return fail(
      `signedTx is not a valid transaction envelope: ${
        error instanceof Error ? error.message : "parse error"
      }`,
      "INVALID_INPUT",
      400
    );
  }

  try {
    const server = new Server(RPC_URL);
    const sent = await server.sendTransaction(transaction);

    if (sent.status === "ERROR") {
      // Surface WHY. `errorResult` is an xdr.TransactionResult whose switch name
      // is the actual reason (txBadSeq, txTooLate, txSorobanInvalid, ...).
      // Returning a bare "rejected" here is what made the first failure opaque.
      let reason: string | undefined;
      let diagnostics: string[] | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reason = (sent as any).errorResult?.result?.()?.switch?.()?.name;
      } catch {
        /* keep going — the response is still useful without it */
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        diagnostics = (sent as any).diagnosticEvents?.map((e: any) =>
          e?.toXDR ? e.toXDR("base64") : String(e)
        );
      } catch {
        /* optional */
      }

      console.error("❌ Passkey deploy rejected by RPC", {
        reason,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorResultXdr: (sent as any).errorResult?.toXDR?.("base64"),
        diagnostics,
      });

      return fail(
        `Soroban RPC rejected the wallet deployment${reason ? `: ${reason}` : ""}.`,
        "SUBMIT_FAILED",
        502,
        { reason, diagnostics }
      );
    }

    // DUPLICATE means the wallet was already deployed — that is a success for us.
    if (sent.status === "DUPLICATE") {
      return NextResponse.json({
        success: true,
        data: { hash: sent.hash, contractId: body.contractId, alreadyDeployed: true },
        timestamp: new Date().toISOString(),
      });
    }

    // Poll until the ledger closes.
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1500));
      const result = await server.getTransaction(sent.hash);

      if (result.status === "SUCCESS") {
        return NextResponse.json({
          success: true,
          data: { hash: sent.hash, contractId: body.contractId },
          timestamp: new Date().toISOString(),
        });
      }
      if (result.status === "FAILED") {
        return fail(
          "The wallet deployment transaction failed on-chain.",
          "TX_FAILED",
          502,
          { hash: sent.hash }
        );
      }
      // NOT_FOUND -> still pending
    }

    return fail(
      "Timed out waiting for the wallet deployment to confirm.",
      "TX_TIMEOUT",
      504,
      { hash: sent.hash }
    );
  } catch (error) {
    console.error("❌ Passkey wallet deployment failed:", error);
    return fail(
      error instanceof Error ? error.message : "Wallet deployment failed",
      "INTERNAL_ERROR",
      500
    );
  }
}
