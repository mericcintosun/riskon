# User Guide - riskon Credit Scoring System

## Quick Start

### What You'll Need
- A modern web browser with biometric support (Chrome, Safari, Edge, Firefox)
- A Stellar wallet address (new or existing)
- 5-10 minutes to complete the scoring process

### Step 1: Access the Application
1. Visit [riskon.vercel.app](https://riskon.vercel.app)
2. Click **"Get Started"** to begin

### Step 2: Authenticate with Passkey
1. Click **"Login with Passkey"**
2. Choose your authentication method:
   - **Face ID** (macOS/iOS)
   - **Fingerprint** (Android/Windows)
   - **Security Key** (USB key)
3. Follow the on-screen prompts to register or use your existing passkey

### Step 3: Choose Your Scoring Mode

#### Mode 1: Manual Input (Fastest)
- **Best for**: New wallets or privacy-conscious users
- **Time**: 2-3 minutes
- **Data needed**: Basic transaction history you provide manually

**Steps:**
1. Select **"Manual Input"**
2. Answer questions about your transaction history:
   - How many transactions have you made?
   - How active are you on DeFi protocols?
   - Do you have any lending/borrowing history?
3. Click **"Calculate Score"**

#### Mode 2: Automated Credit Score (Recommended)
- **Best for**: Users with existing Stellar transaction history
- **Time**: 3-5 minutes
- **Privacy**: 100% client-side processing

**Steps:**
1. Select **"Automated Credit Score"**
2. Grant permission to analyze your public Stellar transactions
3. Wait while TensorFlow.js analyzes your on-chain behavior
4. Review your calculated score

#### Mode 3: AI-Enhanced (Most Accurate)
- **Best for**: Power users seeking the most precise assessment
- **Time**: 5-7 minutes
- **Data**: On-chain history + real-time market data

**Steps:**
1. Select **"AI-Enhanced"**
2. The system analyzes both your transaction history and current market conditions
3. Receive a comprehensive risk assessment

### Step 4: Understand Your Score

#### Score Breakdown
- **0-30**: TIER_1 (Low Risk) - Excellent on-chain reputation
- **31-70**: TIER_2 (Medium Risk) - Standard on-chain behavior
- **71-100**: TIER_3 (High Risk) - New or highly active accounts

#### What Your Score Means
Your score is calculated using:
- **Transaction History** (40%): Frequency, volume, and consistency
- **Protocol Interaction** (25%): Diversity of DeFi platforms used
- **Risk Management** (20%): Collateral ratios and liquidation history
- **Account Age** (15%): How long you've been active on Stellar

### Step 5: Store Your Score On-Chain

1. Review your calculated score and risk tier
2. Click **"Store Score on Blockchain"**
3. Confirm the transaction with your passkey
4. Wait for Stellar network confirmation (3-5 seconds)

### Step 6: Use Your Credit Score

Once stored, your score enables:
- **Access to premium DeFi protocols**
- **Reduced collateral requirements**
- **Better lending rates**
- **Priority in new protocol launches

## Troubleshooting

### Common Issues

#### Passkey Authentication Fails
**Solution:**
- Ensure your device supports biometric authentication
- Try using a different browser
- Check that your device's biometric settings are enabled

#### Score Calculation Takes Too Long
**Solution:**
- Switch to Manual Input mode for faster results
- Check your internet connection
- Try refreshing the page and restarting

#### Transaction Fails
**Solution:**
- Ensure you have sufficient XLM for network fees (minimum 0.01 XLM)
- Check that your Stellar account is funded
- Try the transaction again after a few seconds

#### Score Seems Incorrect
**Important:** The score is an AI prediction based on historical data and may not reflect your current financial situation. It's for informational purposes only.

**If you disagree with your score:**
- Try AI-Enhanced mode for more comprehensive analysis
- Wait for more transaction history to accumulate
- Remember that scores improve over time with responsible behavior

### Privacy & Security

#### Data Privacy
- **All calculations happen in your browser** - no data sent to servers
- **Only the final score (0-100) is stored on-chain**
- **Raw transaction data never leaves your device**

#### Security Best Practices
- Always use secure biometric authentication
- Keep your device's software updated
- Never share your passkey credentials
- Regularly review your on-chain transaction history

## Advanced Features

### Score Improvement Tips

1. **Maintain Healthy Collateral Ratios**
   - Keep LTV ratios below 80%
   - Avoid frequent liquidations

2. **Diversify Protocol Usage**
   - Use multiple reputable DeFi platforms
   - Avoid concentrating all activity in one protocol

3. **Consistent Activity**
   - Regular but not excessive transactions
   - Avoid long periods of inactivity

4. **Timely Repayments**
   - Always repay loans on time
   - Set up automatic repayments when possible

### Integration with Other Protocols

Your riskon score can be used by:
- **Lending protocols** for better rates
- **DEX platforms** for reduced fees
- **Yield farms** for higher APYs
- **Insurance protocols** for lower premiums

## FAQ

### How often can I update my score?
You can update your score once every 24 hours to prevent spam and ensure meaningful changes.

### Can I delete my score?
Yes, you can request score deletion through the app settings, though the blockchain record remains immutable.

### Is my score shared with third parties?
No, your score is only shared when you explicitly connect to a protocol that requests it.

### What happens if I lose access to my passkey?
You'll need to set up a new passkey and can migrate your score to the new authentication method.

### How accurate is the AI model?
The model has been trained on thousands of Stellar accounts but is not perfect. It should be used as one data point among many for financial decisions.

## Support

If you need additional help:
- Check our [GitHub Discussions](https://github.com/riskon-labs/riskon/discussions)
- Report bugs on [GitHub Issues](https://github.com/riskon-labs/riskon/issues)
- Email support at support@riskon.dev

---

**Remember:** riskon scores are for informational purposes only and do not constitute financial advice. Always conduct your own research before making financial decisions.
