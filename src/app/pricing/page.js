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

  const tiers = [
    {
      name: "Manual",
      price: "Free",
      description:
        "For users who prefer manual control and occasional analysis.",
      features: [
        "Manual Score Refresh",
        "Access to Tier-1 Pools",
        "Basic On-Chain Analysis",
      ],
      icon: <User className="w-8 h-8 text-gray-500" />,
      cta: "Get Started",
      bgColor: "bg-gray-100",
      textColor: "text-green-800",
      buttonColor: "bg-gray-600 hover:bg-gray-700",
    },
    {
      name: "Automated",
      price: "$1",
      priceSuffix: "/ month",
      description: "For active users who need continuous risk monitoring.",
      features: [
        "Automatic Score Updates",
        "Access to Tier-2 Pools",
        "Real-time Alerts",
        "Priority Support",
      ],
      icon: <Bot className="w-8 h-8 text-blue-500" />,
      cta: "Choose Plan",
      bgColor: "bg-blue-50",
      textColor: "text-blue-800",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "AI Enhanced",
      price: "$2",
      priceSuffix: "/ month",
      description:
        "For advanced users seeking predictive insights and optimized strategies.",
      features: [
        "All Automated Features",
        "Predictive Risk Modeling",
        "Access to All Tiers (Tier-3 included)",
        "Exclusive Market Insights",
      ],
      icon: <Sparkles className="w-8 h-8 text-purple-500" />,
      cta: "Choose Plan",
      bgColor: "bg-purple-50",
      textColor: "text-purple-800",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      isFeatured: true,
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

                <Link href="/wallet">
                  <button
                    className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-300 ${
                      tier.isFeatured
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {tier.cta}
                  </button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
