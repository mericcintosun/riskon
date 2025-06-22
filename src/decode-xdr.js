// XDR Decoder for Stellar transaction results
// Run with: node src/decode-xdr.js XDR_STRING

const StellarSdk = require("@stellar/stellar-sdk");

function decodeTransactionResult(xdrString) {
  try {

    const xdrResult = StellarSdk.xdr.TransactionResult.fromXDR(
      xdrString,
      "base64"
    );


    // Check if there are operation results
    if (
      xdrResult.result().switch().name === "txSuccess" ||
      xdrResult.result().switch().name === "txFailed"
    ) {
      const operationResults = xdrResult.result().results();

      if (operationResults && operationResults.length > 0) {
        operationResults.forEach((opResult, index) => {

          // Get more specific error details
          if (opResult.switch().name !== "opInner") {
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
  
} else {
  const result = decodeTransactionResult(xdrString);

  if (result.success) {
  } else {
  }
}
