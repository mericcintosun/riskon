/**
 * Riskon - Account Longevity & Activity Analysis
 * This module calculates a reputation bonus based on the age of the Stellar account.
 */

export async function calculateAccountLongevityScore(accountData) {
    try {
      if (!accountData || !accountData.created_at) {
        return 0; // Data missing, no bonus
      }
  
      const creationDate = new Date(accountData.created_at);
      const now = new Date();
      const diffInMonths = (now.getFullYear() - creationDate.getFullYear()) * 12 + (now.getMonth() - creationDate.getMonth());
  
      let scoreBonus = 0;
  
      // Scoring Logic:
      if (diffInMonths >= 24) scoreBonus = 20; // Veteran (2+ years)
      else if (diffInMonths >= 12) scoreBonus = 15; // Established (1+ year)
      else if (diffInMonths >= 6) scoreBonus = 10; // Regular (6+ months)
      else if (diffInMonths >= 1) scoreBonus = 5; // New (1+ month)
      else scoreBonus = 0; // Fresh account (No bonus/High risk)
  
      return scoreBonus;
    } catch (error) {
      console.error("Error in account longevity calculation:", error);
      return 0;
    }
  }
