// Debug script to test wallet account status
// Run with: node src/debug-account.js YOUR_WALLET_ADDRESS

const fetch = require("node-fetch");

async function checkAccount(address) {

  if (!address || address.length !== 56 || !address.startsWith("G")) {
    console.error("❌ Invalid Stellar address format");
    return;
  }

  try {
    // Check testnet
    const testnetResponse = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${address}`
    );

    if (testnetResponse.ok) {
      const testnetData = await testnetResponse.json();
      testnetData.balances.forEach((balance) => {
     
      });
    } else {

      // Try to create account
      const friendbotResponse = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`
      );

      if (friendbotResponse.ok) {

        // Wait and check again
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const retryResponse = await fetch(
          `https://horizon-testnet.stellar.org/accounts/${address}`
        );
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          retryData.balances.forEach((balance) => {
        
          });
        } else {
        }
      } else {
      }
    }

    // Check mainnet for comparison
    const mainnetResponse = await fetch(
      `https://horizon.stellar.org/accounts/${address}`
    );

  } catch (error) {
    console.error("❌ Error checking account:", error.message);
  }
}

// Get address from command line argument
const address = process.argv[2];

if (!address) {
} else {
  checkAccount(address);
}
