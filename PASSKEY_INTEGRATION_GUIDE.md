# Passkey-Kit Integration Guide

This document outlines the implementation of Passkey-Kit smart wallet integration in the Stellar Risk Analyzer project.

## Overview

The Passkey-Kit integration provides users with a biometric authentication-based smart wallet solution, eliminating the need for seed phrases while maintaining full security through WebAuthn standards.

## Features Implemented

### ✅ Client-Side Integration

- **PasskeyKit Client**: Proper client-side initialization following official documentation
- **WebAuthn Support Detection**: Automatic detection of device passkey capabilities
- **Wallet Creation**: Biometric-authenticated smart wallet creation
- **Local Storage**: Secure local storage of wallet metadata
- **Device Support**: iOS Face ID, Android fingerprint, Windows Hello, etc.

### ✅ UI Components

- **Wallet Selection**: Integrated passkey option in wallet connection modal
- **Device Detection**: Smart UI that shows/hides passkey option based on support
- **Status Messages**: Clear feedback for connection states and errors
- **Modern Design**: Consistent with existing UI/UX patterns

### ✅ Context Integration

- **WalletContext**: Extended existing wallet context with passkey methods
- **State Management**: Proper state synchronization with other wallet types
- **Error Handling**: Comprehensive error categorization and user feedback

## Architecture

```
src/
├── lib/
│   └── passkeyWallet.js      # Core Passkey-Kit integration
├── contexts/
│   └── WalletContext.js      # Extended wallet context
├── app/wallet/
│   └── page.js               # Updated wallet selection UI
└── next.config.mjs           # TypeScript transpilation config
```

## Configuration

### Environment Variables

```bash
# Required for Passkey-Kit
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_FACTORY_CONTRACT_ID=your_factory_contract_id

# Server-side only (for full implementation)
LAUNCHTUBE_JWT=your_launchtube_jwt
MERCURY_URL=https://test.mercurydata.app
MERCURY_JWT=your_mercury_jwt
```

### Next.js Configuration

The project includes required TypeScript transpilation packages:

```javascript
// next.config.mjs
const nextConfig = {
  transpilePackages: [
    "passkey-kit",
    "passkey-factory-sdk",
    "passkey-kit-sdk",
    "sac-sdk",
  ],
};
```

## Implementation Details

### 1. PasskeyKit Initialization

```javascript
import { PasskeyKit } from "passkey-kit";

const passkeyKit = new PasskeyKit({
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
  factoryContractId: process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID,
});
```

### 2. Wallet Creation

```javascript
const walletResult = await kit.createWallet({
  keyId: keyId,
  // Additional options can be passed here
});
```

### 3. Device Support Detection

```javascript
const passkeyStatus = await checkPasskeySupport();
// Returns: { isSupported, isConditionalMediationSupported, deviceInfo }
```

### 4. Context Integration

```javascript
const { connectPasskey, getStoredPasskeys, passkeySupport } = useWallet();
```

## User Experience

### Wallet Selection Flow

1. User visits `/wallet` page
2. System automatically detects passkey support
3. Passkey option appears if supported, shows "Not Supported" if not
4. User clicks "Create Passkey" button
5. Biometric authentication prompt appears
6. Smart wallet is created and user is connected
7. Automatic redirect to dashboard

### Device Support

- **iOS**: Face ID / Touch ID
- **Android**: Fingerprint / Face unlock
- **macOS**: Touch ID
- **Windows**: Windows Hello
- **Linux**: Platform authenticators (if available)

## Security Features

### Client-Side Security

- **Non-Custodial**: Private keys never leave the device
- **WebAuthn Standard**: Industry-standard biometric authentication
- **Local Storage**: Encrypted wallet metadata storage
- **Device Binding**: Wallets are bound to specific devices

### Smart Contract Security

- **Factory Pattern**: Standardized smart wallet deployment
- **Passkey Verification**: On-chain passkey signature verification
- **Account Abstraction**: Simplified transaction experience

## Error Handling

The implementation includes comprehensive error handling:

```javascript
// WebAuthn-specific errors
if (error.name === "NotSupportedError") {
  throw new Error("Passkey not supported on this device");
} else if (error.name === "NotAllowedError") {
  throw new Error("Biometric authentication was cancelled");
} else if (error.name === "InvalidStateError") {
  throw new Error("A passkey already exists for this device");
}
```

## Server-Side Requirements (Future Enhancement)

For full production implementation, server-side components are needed:

### PasskeyServer Setup

```javascript
import { PasskeyServer } from "passkey-kit";

const server = new PasskeyServer({
  rpcUrl: env.PUBLIC_rpcUrl,
  launchtubeUrl: env.PUBLIC_launchtubeUrl,
  launchtubeJwt: env.PRIVATE_launchtubeJwt,
  mercuryUrl: env.PUBLIC_mercuryUrl,
  mercuryJwt: env.PRIVATE_mercuryJwt,
});
```

### Mercury Zephyr Indexer

```bash
cd ./zephyr
cargo install mercury-cli
export MERCURY_JWT="<YOUR.MERCURY.JWT>"
mercury-cli --jwt $MERCURY_JWT --local false --mainnet false deploy
```

## Testing

### Manual Testing Steps

1. Open `/wallet` page in supported browser
2. Verify passkey option appears on supported devices
3. Test wallet creation flow with biometric authentication
4. Verify wallet connection state persistence
5. Test error handling with cancelled authentication
6. Verify device compatibility across platforms

### Browser Compatibility

- ✅ Chrome 67+ (all platforms)
- ✅ Firefox 60+ (all platforms)
- ✅ Safari 14+ (macOS/iOS)
- ✅ Edge 18+ (Windows)

## Deployment Considerations

### Environment Setup

1. Deploy smart wallet factory contract
2. Configure Launchtube sponsorship (optional)
3. Set up Mercury indexing (optional)
4. Configure environment variables
5. Test on target deployment platform

### Production Checklist

- [ ] Factory contract deployed and verified
- [ ] Environment variables configured securely
- [ ] HTTPS enabled (required for WebAuthn)
- [ ] Domain allowlist configured
- [ ] Server-side PasskeyServer implemented (optional)
- [ ] Mercury indexer deployed (optional)

## Integration with Existing Features

The passkey wallet integrates seamlessly with existing features:

- **Risk Analysis**: Works with all risk calculation methods
- **Blend Protocol**: Compatible with lending/borrowing operations
- **Transaction Signing**: Supports all transaction types
- **State Management**: Unified with existing wallet context

## Future Enhancements

### Planned Features

- **Multi-Device Support**: Sync wallets across devices
- **Backup & Recovery**: Secure backup mechanisms
- **Advanced Signing**: Batch transactions and complex operations
- **Social Recovery**: Multi-signature recovery options

### Server-Side Integration

- **Launchtube Sponsorship**: Zero gas fees for new users
- **Mercury Indexing**: Advanced wallet analytics
- **Transaction Monitoring**: Real-time transaction tracking

## Troubleshooting

### Common Issues

**"Passkey not supported"**

- Ensure HTTPS is enabled
- Check browser compatibility
- Verify device has biometric authentication

**"Factory contract not configured"**

- Set `NEXT_PUBLIC_FACTORY_CONTRACT_ID` environment variable
- Deploy factory contract if needed

**"Network error"**

- Verify RPC URL is accessible
- Check network passphrase matches

**TypeScript errors**

- Ensure `transpilePackages` is configured in `next.config.mjs`
- Verify passkey-kit package is installed

## Support

For questions or issues:

- Check the [Passkey-Kit documentation](https://passkey-kit-demo.pages.dev)
- Join the #passkeys channel on Stellar Discord
- Review the [Super Peach example repo](https://github.com/stellar/super-peach)

## License

This implementation follows the same license as the main project and Passkey-Kit library.
