import React from 'react';
import BlendDashboard from './BlendDashboard.jsx';

/**
 * Storybook stories for the BlendDashboard component
 * 
 * These stories demonstrate different states and configurations of the
 * BlendDashboard component for documentation and testing purposes.
 */

export default {
  title: 'Components/BlendDashboard',
  component: BlendDashboard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The BlendDashboard component provides a comprehensive interface for interacting
with Blend protocol liquidity pools. It includes pool discovery, position tracking,
and risk-aware access control.

## Features
- Pool discovery and management
- User position tracking
- Supply, borrow, withdraw, and repay operations
- Risk-aware pool access based on user's credit score
- Real-time balance and position updates
- Support for multiple asset types

## Usage
\`\`\`jsx
import BlendDashboard from './components/BlendDashboard.jsx';

<BlendDashboard 
  kit={walletKit}
  walletAddress="GD5..."
  riskScore={riskAnalysis}
/>
\`\`\`

## Props
- \`kit\`: Passkey wallet kit for transaction signing
- \`walletAddress\`: User's Stellar wallet address
- \`riskScore\`: User's risk analysis results (optional)
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    kit: {
      description: 'Passkey wallet kit for transaction signing',
      control: { type: 'object' },
    },
    walletAddress: {
      description: "User's Stellar wallet address",
      control: { type: 'text' },
    },
    riskScore: {
      description: "User's risk analysis results",
      control: { type: 'object' },
    },
  },
};

/**
 * Default story showing the dashboard without risk score
 */
export const Default = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default state of the BlendDashboard without risk score information.',
      },
    },
  },
};

/**
 * Story showing dashboard with low risk score (TIER_1)
 */
export const LowRiskUser = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: {
      riskScore: 25,
      tier: 'TIER_1',
      confidence: 85,
      timestamp: Date.now(),
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard for a low-risk user with TIER_1 access to premium pools.',
      },
    },
  },
};

/**
 * Story showing dashboard with medium risk score (TIER_2)
 */
export const MediumRiskUser = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: {
      riskScore: 50,
      tier: 'TIER_2',
      confidence: 75,
      timestamp: Date.now(),
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard for a medium-risk user with TIER_2 access to standard pools.',
      },
    },
  },
};

/**
 * Story showing dashboard with high risk score (TIER_3)
 */
export const HighRiskUser = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: {
      riskScore: 85,
      tier: 'TIER_3',
      confidence: 65,
      timestamp: Date.now(),
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard for a high-risk user with TIER_3 access to opportunity pools.',
      },
    },
  },
};

/**
 * Story showing loading state
 */
export const Loading = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard in loading state while fetching pool data.',
      },
    },
  },
  render: () => {
    // Mock loading state
    React.useEffect(() => {
      console.log('Simulating loading state...');
    }, []);
    
    return <BlendDashboard 
      walletAddress="GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0"
      kit={null}
      riskScore={null}
    />;
  },
};

/**
 * Story showing error state
 */
export const Error = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard displaying error state when pool data fails to load.',
      },
    },
  },
  render: () => {
    // Mock error state
    React.useEffect(() => {
      console.log('Simulating error state...');
    }, []);
    
    return <BlendDashboard 
      walletAddress="GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0"
      kit={null}
      riskScore={null}
    />;
  },
};

/**
 * Mobile responsive story
 */
export const Mobile = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: {
      riskScore: 25,
      tier: 'TIER_1',
      confidence: 85,
      timestamp: Date.now(),
    },
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Dashboard displayed in mobile viewport for responsive testing.',
      },
    },
  },
};

/**
 * Dark theme story
 */
export const DarkTheme = {
  args: {
    walletAddress: 'GD5D2R2K2YQ6XZ5Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0Z1Z2Z3Z4Z5Z6Z7Z8Z9Z0',
    kit: null, // Mock kit
    riskScore: {
      riskScore: 25,
      tier: 'TIER_1',
      confidence: 85,
      timestamp: Date.now(),
    },
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Dashboard displayed with dark theme for accessibility testing.',
      },
    },
  },
};
