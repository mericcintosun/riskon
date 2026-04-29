# ADR-0002: Client-Side Machine Learning Processing

## Status
**Accepted**

## Context
Our risk scoring system requires machine learning to analyze transaction data and generate credit scores. We needed to decide whether to process ML models on the server-side or client-side, considering privacy, performance, and scalability.

## Decision
We chose **client-side ML processing** using TensorFlow.js in the browser.

## Detailed Explanation

### Why Client-Side Processing?

1. **Privacy Protection**
   - Raw wallet data never leaves the user's browser
   - No sensitive financial data transmitted to servers
   - Compliance with privacy regulations
   - User control over their data

2. **Performance Benefits**
   - No network latency for model inference
   - Parallel processing across users
   - Reduced server load and costs
   - Better user experience with instant results

3. **Scalability**
   - No server-side computational limits
   - Automatic scaling with user base
   - No need for ML infrastructure management
   - Cost-effective growth

4. **Trust and Transparency**
   - Users can inspect the model (open source)
   - No black-box processing on servers
   - Verifiable computation
   - Increased user confidence

### Implementation Approach

1. **Model Selection**
   - TensorFlow.js for browser compatibility
   - Lightweight logistic regression model
   - Optimized for performance and accuracy
   - Pre-trained weights embedded in the application

2. **Data Flow**
   ```
   Browser → Horizon API → Raw Data → Local ML Model → Risk Score → Blockchain
   ```
   - Data fetched directly from Stellar Horizon API
   - All computation happens in browser
   - Only final score stored on-chain

3. **Model Architecture**
   - Simplified logistic regression
   - 4 key features: volume, counterparties, diversity, timing
   - Confidence scoring and explainability
   - Fallback to rule-based calculation

## Consequences

### Positive
- Complete privacy protection for users
- Instant results without server processing
- Automatic scalability
- Reduced infrastructure costs
- Increased user trust
- No ML infrastructure maintenance

### Negative
- Limited model complexity due to browser constraints
- Model size and performance considerations
- Cannot use large-scale ML models
- Dependency on browser capabilities
- Model updates require application updates

### Risks
- Browser compatibility issues
- Performance on low-end devices
- Model accuracy limitations
- Difficulty in model improvement
- Potential for client-side manipulation

## Alternatives Considered

### Server-Side Processing
- **Pros**: More powerful models, easier updates, centralized control
- **Cons**: Privacy concerns, server costs, scalability limits, data transmission
- **Rejected**: Privacy and scalability concerns outweigh benefits

### Hybrid Approach
- **Pros**: Balance of privacy and power, flexible processing
- **Cons**: Complexity, partial data exposure, infrastructure overhead
- **Rejected**: Added complexity without clear benefits

### Edge Computing
- **Pros**: Near-client processing, better performance than cloud
- **Cons**: Infrastructure complexity, still involves data transmission
- **Rejected**: More complex than pure client-side approach

## Implementation Notes

1. **Model Optimization**
   - Keep model under 1MB for fast loading
   - Use quantization to reduce size
   - Optimize for mobile devices
   - Implement progressive loading

2. **Performance Considerations**
   - Cache model in browser storage
   - Use Web Workers for non-blocking processing
   - Implement loading states
   - Handle computation errors gracefully

3. **Security Measures**
   - Validate all inputs
   - Sanitize model outputs
   - Implement rate limiting
   - Monitor for manipulation attempts

4. **Fallback Strategy**
   - Rule-based calculation for ML failures
   - Server-side option for critical cases
   - Progressive enhancement approach
   - Clear error messaging

## Future Considerations

1. **Model Evolution**
   - Plan for model updates
   - Consider model versioning
   - Implement A/B testing framework
   - Monitor model performance

2. **Advanced Features**
   - Federated learning possibilities
   - Ensemble models
   - Real-time model adaptation
   - Advanced explainability features

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [Web ML Best Practices](https://webmachinelearning.github.io/)
- [Privacy-Preserving ML](https://privacymlbook.org/)

## Decision Makers
- Development Team
- ML Engineer
- Privacy Officer
- Technical Lead

## Date
2024-01-16

## Review Status
Pending performance review after initial implementation
