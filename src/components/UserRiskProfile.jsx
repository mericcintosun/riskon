"use client";

import React, { useState, useEffect } from "react";

const UserRiskProfile = ({ walletAddress, riskScore, onTierSelect }) => {
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  // Risk score interpretation
  const getRiskInterpretation = (score) => {
    if (score <= 30) {
      return {
        level: "Düşük Risk",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        icon: "🛡️",
        description:
          "Güvenli yatırım profili. Düşük riskli, istikrarlı havuzlar öneriliyor.",
        recommendation:
          "Tier-1 havuzlarını tercih edin. Yüksek likidite ve güvenlik sunuyorlar.",
      };
    } else if (score <= 70) {
      return {
        level: "Orta Risk",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        icon: "⚖️",
        description:
          "Dengeli yatırım profili. Orta düzeyde risk alabilirsiniz.",
        recommendation:
          "Tier-1 ve Tier-2 havuzları sizin için uygun. Risk/getiri dengesini gözetin.",
      };
    } else {
      return {
        level: "Yüksek Risk",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        icon: "🚀",
        description:
          "Agresif yatırım profili. Yüksek riskli fırsatları değerlendirebilirsiniz.",
        recommendation:
          "Tüm tier havuzlarına erişiminiz var. Tier-3 havuzlarda özel fırsatlar mevcut!",
      };
    }
  };

  // Tier access permissions based on risk score
  const getTierAccess = (score) => {
    return {
      TIER_1: {
        accessible: true,
        status: "Önerilen",
        color: "text-green-600",
        bgColor: "bg-green-100",
        description: "Yüksek güvenlik, düşük risk",
        icon: "✅",
      },
      TIER_2: {
        accessible: score >= 30,
        status: score >= 30 ? "Uygun" : "Kısıtlı",
        color: score >= 30 ? "text-yellow-600" : "text-gray-400",
        bgColor: score >= 30 ? "bg-yellow-100" : "bg-gray-100",
        description:
          score >= 30
            ? "Orta risk, potansiyel yüksek getiri"
            : "Risk skorunuz yetersiz",
        icon: score >= 30 ? "⚠️" : "🔒",
      },
      TIER_3: {
        accessible: score >= 70,
        status: score >= 70 ? "Fırsat" : "Erişim Yok",
        color: score >= 70 ? "text-purple-600" : "text-gray-400",
        bgColor: score >= 70 ? "bg-purple-100" : "bg-gray-100",
        description:
          score >= 70
            ? "Yüksek risk, maksimum fırsat potansiyeli"
            : "Yüksek risk skor gerekli (70+)",
        icon: score >= 70 ? "💎" : "🔒",
        isOpportunity: score >= 70,
      },
    };
  };

  // Handle tier selection with risk confirmation
  const handleTierSelect = (tier) => {
    const tierAccess = getTierAccess(riskScore);
    if (!tierAccess[tier].accessible) {
      return;
    }

    if (tier === "TIER_3" && riskScore >= 70) {
      setSelectedTier(tier);
      setShowRiskModal(true);
    } else {
      onTierSelect?.(tier);
    }
  };

  // Risk confirmation modal
  const RiskConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Yüksek Risk Uyarısı
          </h3>
          <div className="text-gray-600 mb-6 space-y-2">
            <p>
              Bu havuzlar düşük likiditeye sahip ve yüksek risk taşımaktadır.
            </p>
            <p className="font-semibold text-red-600">
              Potansiyel kayıplar yüksek olabilir!
            </p>
            <p>Devam etmek istediğinizden emin misiniz?</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowRiskModal(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              İptal
            </button>
            <button
              onClick={() => {
                setShowRiskModal(false);
                onTierSelect?.(selectedTier);
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Riski Kabul Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof riskScore !== "number" || riskScore < 0 || riskScore > 100) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-600">
          ⚠️ Risk skoru hesaplanamadı. Lütfen önce risk skorunuzu hesaplayın.
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
            <h2 className="text-xl font-bold text-gray-900">Risk Profili</h2>
            <div className="text-3xl">{riskInfo.icon}</div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl font-bold text-gray-900">{riskScore}</div>
            <div>
              <div className={`text-lg font-semibold ${riskInfo.color}`}>
                {riskInfo.level}
              </div>
              <div className="text-sm text-gray-600">Risk Skoru (0-100)</div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-gray-700">{riskInfo.description}</p>
            <p className="text-sm font-medium text-gray-900">
              {riskInfo.recommendation}
            </p>
          </div>
        </div>

        {/* Tier Access Guide */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Erişim Durumunuz
          </h3>

          <div className="space-y-3">
            {Object.entries(tierAccess).map(([tier, access]) => (
              <div
                key={tier}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  access.accessible
                    ? `${access.bgColor} border-gray-200 hover:shadow-md`
                    : "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                }`}
                onClick={() => handleTierSelect(tier)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{access.icon}</div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {tier.replace("_", "-")}
                        {access.isOpportunity && (
                          <span className="ml-2 px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                            FIRSAT
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
            <div className="text-blue-600 text-xl">💡</div>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">
                Yatırım Rehberi
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Risk skorunuz yatırım kararlarınızı etkilemelidir</li>
                <li>• Tier-1 havuzları en güvenli seçeneklerdir</li>
                <li>
                  • Yüksek risk havuzlarında sadece kaybetmeyi göze
                  alabileceğiniz miktarda yatırım yapın
                </li>
                <li>• Portföyünüzü diversifiye etmeyi unutmayın</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Confirmation Modal */}
      {showRiskModal && <RiskConfirmationModal />}
    </>
  );
};

export default UserRiskProfile;
