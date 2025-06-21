// XDR Decoder for Stellar transaction results
// Run with: node src/decode-xdr.js XDR_STRING

const StellarSdk = require("@stellar/stellar-sdk");

function decodeTransactionResult(xdrString) {
  try {
    console.log(`🔍 Decoding XDR: ${xdrString}`);

    const xdrResult = StellarSdk.xdr.TransactionResult.fromXDR(
      xdrString,
      "base64"
    );

    console.log("\n📊 Transaction Result Details:");
    console.log("Result Code:", xdrResult.result().switch().name);

    // Check if there are operation results
    if (
      xdrResult.result().switch().name === "txSuccess" ||
      xdrResult.result().switch().name === "txFailed"
    ) {
      const operationResults = xdrResult.result().results();

      if (operationResults && operationResults.length > 0) {
        console.log("\n🔧 Operation Results:");
        operationResults.forEach((opResult, index) => {
          console.log(`  Operation ${index + 1}:`, opResult.switch().name);

          // Get more specific error details
          if (opResult.switch().name !== "opInner") {
            console.log(`    Error: ${opResult.switch().name}`);
          }
        });
      }
    }

    // Common error explanations
    const errorExplanations = {
      txFailed: "Transaction failed - check operation results",
      txTooEarly: "Transaction submitted too early",
      txTooLate: "Transaction submitted too late",
      txMissingOperation: "Transaction has no operations",
      txBadSeq: "Incorrect sequence number",
      txBadAuth: "Transaction not authorized",
      txInsufficientBalance: "Insufficient balance to pay fee",
      txNoAccount: "Source account does not exist",
      txInsufficientFee: "Fee is too low",
      txBadAuthExtra: "Extra authorization required",
      txInternalError: "Internal error occurred",
    };

    const resultCode = xdrResult.result().switch().name;
    if (errorExplanations[resultCode]) {
      console.log(`\n💡 Explanation: ${errorExplanations[resultCode]}`);
    }

    // Operation error explanations
    const opErrorExplanations = {
      opUnderfunded: "Account has insufficient balance",
      opNoDestination: "Destination account does not exist",
      opNotAuthorized: "Operation not authorized",
      opLineFull: "Destination account cannot receive more of this asset",
      opNoTrust: "Destination account does not trust this asset",
      opNoIssuer: "Asset issuer does not exist",
      opTooManySubentries: "Too many subentries in account",
      opInvalidLimit: "Invalid trust line limit",
      opSelfNotAllowed: "Self operations not allowed",
      opBadAuth: "Bad authorization for operation",
    };

    return {
      success: true,
      resultCode,
      explanation: errorExplanations[resultCode] || "Unknown error",
    };
  } catch (error) {
    console.error("❌ Error decoding XDR:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get XDR from command line argument
const xdrString = process.argv[2];

if (!xdrString) {
  console.log("Usage: node src/decode-xdr.js XDR_STRING");
  console.log(
    "Example: node src/decode-xdr.js AAAAAAAAAGT/////AAAAAQAAAAAAAAAB////+wAAAAA="
  );
} else {
  const result = decodeTransactionResult(xdrString);

  if (result.success) {
    console.log(`\n✅ Successfully decoded XDR result`);
  } else {
    console.log(`\n❌ Failed to decode XDR: ${result.error}`);
  }
}
