// Debug script to test wallet account status
// Run with: node src/debug-account.js YOUR_WALLET_ADDRESS

const fetch = require("node-fetch");

async function checkAccount(address) {
  console.log(`🔍 Checking account: ${address}`);

  if (!address || address.length !== 56 || !address.startsWith("G")) {
    console.error("❌ Invalid Stellar address format");
    return;
  }

  try {
    // Check testnet
    console.log("\n📡 Checking Stellar Testnet...");
    const testnetResponse = await fetch(
      `https://horizon-testnet.stellar.org/accounts/${address}`
    );

    if (testnetResponse.ok) {
      const testnetData = await testnetResponse.json();
      console.log("✅ Account found on Testnet");
      console.log(`   Sequence: ${testnetData.sequence}`);
      console.log(`   Balances:`);
      testnetData.balances.forEach((balance) => {
        console.log(
          `     ${
            balance.asset_type === "native" ? "XLM" : balance.asset_code
          }: ${balance.balance}`
        );
      });
    } else {
      console.log("❌ Account not found on Testnet");

      // Try to create account
      console.log("🔧 Attempting to create account...");
      const friendbotResponse = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`
      );

      if (friendbotResponse.ok) {
        console.log("✅ Account created successfully via friendbot");

        // Wait and check again
        console.log("⏳ Waiting for account to be available...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const retryResponse = await fetch(
          `https://horizon-testnet.stellar.org/accounts/${address}`
        );
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          console.log("✅ Account now available on Testnet");
          console.log(`   Sequence: ${retryData.sequence}`);
          console.log(`   Balances:`);
          retryData.balances.forEach((balance) => {
            console.log(
              `     ${
                balance.asset_type === "native" ? "XLM" : balance.asset_code
              }: ${balance.balance}`
            );
          });
        } else {
          console.log("❌ Account still not available after creation");
        }
      } else {
        console.log("❌ Failed to create account via friendbot");
      }
    }

    // Check mainnet for comparison
    console.log("\n📡 Checking Stellar Mainnet...");
    const mainnetResponse = await fetch(
      `https://horizon.stellar.org/accounts/${address}`
    );

    if (mainnetResponse.ok) {
      console.log("✅ Account found on Mainnet");
    } else {
      console.log("❌ Account not found on Mainnet");
    }
  } catch (error) {
    console.error("❌ Error checking account:", error.message);
  }
}

// Get address from command line argument
const address = process.argv[2];

if (!address) {
  console.log("Usage: node src/debug-account.js YOUR_WALLET_ADDRESS");
  console.log("Example: node src/debug-account.js GCKL...");
} else {
  checkAccount(address);
}
