"use client";

import React from "react";
import {
  Shield,
  Scale,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Gem,
  Info,
} from "lucide-react";

const UserRiskProfile = ({ walletAddress, riskScore }) => {

  // Risk score interpretation
  const getRiskInterpretation = (score) => {
    if (score <= 30) {
      return {
        level: "Low Risk",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: <Shield className="w-8 h-8" />,
        description:
          "This score indicates a strong on-chain history and responsible usage patterns.",
        guidance:
          "This credit score allows access to Tier-1 pools, which typically represent lower-risk assets.",
      };
    } else if (score <= 70) {
      return {
        level: "Medium Risk",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        icon: <Scale className="w-8 h-8" />,
        description:
          "This score indicates a standard on-chain history with moderate activity.",
        guidance:
          "Tier-1 and Tier-2 pools are accessible. Evaluate each pool's parameters independently.",
      };
    } else {
      return {
        level: "High Risk",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: <Rocket className="w-8 h-8" />,
        description:
          "This score may reflect a newer address or highly leveraged on-chain activities.",
        guidance:
          "All tiers are accessible. High-risk activities may offer higher rewards but come with significant potential for loss.",
      };
    }
  };

  // Tier access permissions based on credit score
  const getTierAccess = (score) => {
    return {
      TIER_1: {
        accessible: true,
        status: "Accessible",
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "High security, low-risk assets",
        icon: <CheckCircle2 className="w-6 h-6" />,
      },
      TIER_2: {
        accessible: score >= 30,
        status: score >= 30 ? "Available" : "Restricted",
        color: score >= 30 ? "text-yellow-600" : "text-gray-400",
        bgColor: score >= 30 ? "bg-yellow-100" : "bg-gray-100",
        description:
          score >= 30
            ? "Moderate risk, balanced asset pools"
            : "A higher credit score is required for access",
        icon:
          score >= 30 ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Lock className="w-6 h-6" />
          ),
      },
      TIER_3: {
        accessible: score >= 70,
        status: score >= 70 ? "High-Risk Tier" : "Restricted",
        color: score >= 70 ? "text-purple-600" : "text-gray-400",
        bgColor: score >= 70 ? "bg-purple-100" : "bg-gray-100",
        description:
          score >= 70
            ? "High-risk, high-reward potential assets"
            : "A high credit score is required (70+)",
        icon:
          score >= 70 ? (
            <Gem className="w-6 h-6" />
          ) : (
            <Lock className="w-6 h-6" />
          ),
        isOpportunity: score >= 70,
      },
    };
  };

  // The tier cards below are informational: they show which tiers this score can
  // access. They used to be clickable (handleTierSelect -> onTierSelect + a
  // Tier-3 confirmation modal), but the only mount never passed onTierSelect, so
  // every click was a no-op. Rather than dress up an inert control, the cards are
  // now plainly non-interactive. Tier-specific pools live at /pools.

  if (typeof riskScore !== "number" || riskScore < 0 || riskScore > 100) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-600 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Credit score has not been calculated. Please generate your score
          first.
        </div>
      </div>
    );
  }

  const riskInfo = getRiskInterpretation(riskScore);
  const tierAccess = getTierAccess(riskScore);

  return (
    <>
      <div className="space-y-6">
        {/* Risk Score Display */}
        <div
          className={`rounded-lg p-6 border-2 ${riskInfo.bgColor} ${riskInfo.borderColor}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Credit Score Profile
            </h2>
            <div className={`text-3xl ${riskInfo.color}`}>{riskInfo.icon}</div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-gray-900">{riskScore}</div>
            <div>
              <div className={`text-lg font-semibold ${riskInfo.color}`}>
                {riskInfo.level}
              </div>
              <div className="text-sm text-gray-600">Credit Score (0-100)</div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-700">{riskInfo.description}</p>
            <p className="text-sm font-medium text-gray-900">
              {riskInfo.guidance}
            </p>
          </div>
        </div>

        {/* Tier Access Guide */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Tier Access Status
          </h3>

          <div className="space-y-3">
            {Object.entries(tierAccess).map(([tier, access]) => (
              <div
                key={tier}
                className={`p-4 rounded-lg border-2 transition-all ${
                  access.accessible
                    ? `${access.bgColor} border-gray-200`
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl ${access.color}`}>
                      {access.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {tier.replace("_", "-")}
                        {access.isOpportunity && (
                          <span className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                            HIGH-RISK
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {access.description}
                      </div>
                    </div>
                  </div>

                  <div className={`text-sm font-medium ${access.color}`}>
                    {access.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-xl">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                General Information
              </h4>
              <p className="text-sm text-blue-800">
                This AI-predicted score is for informational purposes only and
                does not constitute financial advice.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                The analysis is based on on-chain data patterns and does not
                represent a deep, financial audit of the address.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-600">
            <strong>Disclaimer:</strong> The credit score is an AI-generated
            prediction based on your on-chain activity and is provided for
            informational purposes only. It is not financial, investment, or
            credit advice.
          </p>
        </div>
      </div>

      {/* Risk Confirmation Modal */}
    </>
  );
};

export default UserRiskProfile;
