# ADR-0003: Use Passkey Authentication for Wallet Access

## Status
**Accepted**

## Context
Traditional cryptocurrency wallets rely on seed phrases, which present significant security and usability challenges. We needed to choose an authentication method that would provide both security and user-friendliness for our Stellar-based credit scoring system.

## Decision
We chose **Passkey (WebAuthn) authentication** as the primary wallet access method.

## Detailed Explanation

### Why Passkey Authentication?

1. **Enhanced Security**
   - Hardware-isolated private keys
   - Biometric authentication (Face ID, fingerprint)
   - Resistance to phishing attacks
   - No seed phrases to steal or lose

2. **Superior User Experience**
   - One-tap authentication
   - No complex seed phrase backup process
   - Familiar authentication methods
   - Reduced onboarding friction

3. **Stellar Integration**
   - Native support for account abstraction
   - Compatible with Soroban contracts
   - Seamless blockchain integration
   - Maintains cryptographic security

4. **Cross-Platform Compatibility**
   - Works on iOS, Android, and desktop
   - Built-in browser support
   - No additional software required
   - Future-proof authentication standard

### Implementation Architecture

1. **Authentication Flow**
   ```
   User → Biometric Prompt → Passkey Kit → Stellar Transaction → Blockchain
   ```

2. **Key Management**
   - Private keys stored in secure hardware
   - Passkey handles cryptographic operations
   - No keys exposed to application
   - Automatic key rotation support

3. **Wallet Creation**
   - Generate Stellar key pair
   - Register with passkey provider
   - Store public key on-chain
   - Enable biometric signing

## Consequences

### Positive
- Eliminates seed phrase complexity
- Reduces user onboarding friction
- Improves security posture
- Modern authentication experience
- Reduces support burden
- Future-proof technology

### Negative
- Dependency on device capabilities
- Limited to supported devices/browsers
- Recovery complexity if device lost
- Less familiar to crypto users
- Potential vendor lock-in concerns

### Risks
- Device compatibility issues
- User unfamiliarity with passkeys
- Backup and recovery challenges
- Platform dependency
- Limited ecosystem adoption

## Alternatives Considered

### Traditional Seed Phrases
- **Pros**: Industry standard, widely supported, familiar to crypto users
- **Cons**: Poor UX, security risks, backup complexity, phishing vulnerability
- **Rejected**: Security and usability concerns

### Social Recovery
- **Pros**: No seed phrases, user-friendly recovery
- **Cons**: Trust requirements, complexity, centralization risks
- **Rejected**: Added complexity without clear benefits

### Hardware Wallets
- **Pros**: High security, established technology
- **Cons**: Cost barrier, complexity, limited accessibility
- **Rejected**: Accessibility and cost concerns

### Magic Links (Email Auth)
- **Pros**: Familiar, no additional hardware
- **Cons**: Centralized, less secure, email dependency
- **Rejected**: Security and decentralization concerns

## Implementation Notes

1. **Passkey Integration**
   - Use `@creit.tech/stellar-wallets-kit`
   - Implement proper error handling
   - Support multiple passkeys per user
   - Provide clear user guidance

2. **Fallback Strategy**
   - Traditional wallet support
   - Recovery mechanism design
   - Multi-device support
   - Migration path for existing users

3. **Security Considerations**
   - Validate passkey authenticity
   - Implement rate limiting
   - Monitor for suspicious activity
   - Regular security audits

4. **User Experience**
   - Clear onboarding flow
   - Educational content
   - Recovery process guidance
   - Support documentation

## Recovery Strategy

1. **Multi-Device Support**
   - Register multiple devices
   - Cloud synchronization
   - Cross-device recovery

2. **Social Recovery Option**
   - Trusted contacts
   - Threshold signatures
   - Secure recovery process

3. **Backup Methods**
   - Encrypted cloud backup
   - Paper backup option
   - Professional recovery service

## Future Considerations

1. **Technology Evolution**
   - Monitor passkey adoption
   - Support new authentication methods
   - Platform-specific optimizations
   - Standard compliance updates

2. **Ecosystem Integration**
   - DeFi protocol compatibility
   - Cross-chain support
   - Third-party wallet integration
   - Enterprise solutions

## References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn/)
- [Passkey Documentation](https://web.dev/passkey/)
- [Stellar Passkey Integration](https://github.com/creit-tech/stellar-wallets-kit)

## Decision Makers
- Development Team
- Security Lead
- UX Designer
- Product Manager

## Date
2024-01-17

## Review Status
Pending user testing feedback
