"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  DollarSign,
  Trophy,
  User,
  Bot,
  Sparkles,
} from "lucide-react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Everything Riskon does today is free. There is no payment integration and
  // no subscription. The previous page sold $1/$2 monthly tiers with features
  // that do not exist ("Real-time Alerts", "Predictive Risk Modeling",
  // "Priority Support") and referenced scoring modes that were removed. Those
  // were not buildable behind a "Choose Plan" button that just opened /wallet.
  const tiers = [
    {
      name: "Everything, free",
      price: "Free",
      description:
        "The whole tool. No account, no subscription, no payment — the CTA connects a wallet, nothing is charged.",
      features: [
        "Wallet activity score, written on-chain by the oracle",
        "Asset issuer risk (is this the real USDC; can it be frozen or seized)",
        "Blend pool ratings, read live from mainnet",
        "Every rating ships with its raw inputs",
      ],
      icon: <User className="w-8 h-8 text-gray-500" />,
      cta: "Get Started",
      bgColor: "bg-gray-100",
      textColor: "text-green-800",
      buttonColor: "bg-gray-600 hover:bg-gray-700",
    },
    {
      name: "Alerts & automation",
      price: "Planned",
      priceSuffix: "· not available",
      description:
        "Continuous monitoring and alerting would be a paid tier. It is not built, so it is not for sale.",
      features: [
        "Score refresh on a schedule — not built",
        "Alerts on tier changes — not built",
        "No payment system exists yet",
      ],
      icon: <Bot className="w-8 h-8 text-blue-500" />,
      cta: "Not available",
      disabled: true,
      bgColor: "bg-blue-50",
      textColor: "text-blue-800",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Predictive modeling",
      price: "Planned",
      priceSuffix: "· not available",
      description:
        "A predictive model would need an outcome label (default/liquidation) that does not exist on Stellar. Until it does, this cannot be built honestly.",
      features: [
        "Loss prediction — not possible without outcome labels",
        "Market insights — not built",
        "See the score's honest definition on the home page",
      ],
      icon: <Sparkles className="w-8 h-8 text-purple-500" />,
      cta: "Not available",
      disabled: true,
      bgColor: "bg-purple-50",
      textColor: "text-purple-800",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Header />

      <motion.main
        className="pt-24 pb-16"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div className="text-center mb-20" variants={itemVariants}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Choose the plan that fits your needs. All scores are AI-predicted
              and for informational purposes only, not financial advice.
            </p>
          </motion.div>

          {/* Pricing Table */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
            variants={containerVariants}
          >
            {tiers.map((tier, index) => (
              <motion.div
                key={index}
                className={`rounded-2xl p-8 border transition-all duration-300 flex flex-col ${
                  tier.isFeatured
                    ? "bg-slate-800/80 border-purple-500/50 shadow-2xl shadow-purple-500/10"
                    : "bg-slate-800/50 border-slate-700/50 hover:border-slate-500/50"
                }`}
                variants={itemVariants}
              >
                {tier.isFeatured && (
                  <div className="text-center mb-6">
                    <span className="bg-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-2xl font-semibold ${tier.textColor}`}>
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {tier.description}
                    </p>
                  </div>
                  {tier.icon}
                </div>
                <div className="mt-4">
                  <span className={`text-4xl font-bold ${tier.textColor}`}>
                    {tier.price}
                  </span>
                  <span className="text-lg font-medium text-slate-400">
                    {tier.priceSuffix}
                  </span>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      <span className="text-slate-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.disabled ? (
                  <button
                    disabled
                    className="w-full py-3 px-6 font-semibold rounded-lg bg-slate-800 text-slate-500 cursor-not-allowed"
                  >
                    {tier.cta}
                  </button>
                ) : (
                  <Link href="/wallet">
                    <button className="w-full py-3 px-6 font-semibold rounded-lg transition-all duration-300 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500">
                      {tier.cta}
                    </button>
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
