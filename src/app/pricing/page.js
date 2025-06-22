"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const plans = [
    {
      name: "Manual",
      price: { monthly: "$0" },
      description:
        "For users who prefer to provide their own data points for a baseline score.",
      features: [
        "Self-reported data entry",
        "Basic credit score generation",
        "Access to Tier-1 pools",
        "Community support",
      ],
      cta: "Get Started",
      link: "/wallet",
      isMostPopular: false,
    },
    {
      name: "Automated",
      price: { monthly: "$1" },
      description: "For active users who want automated, on-chain analysis.",
      features: [
        "Automated on-chain data analysis",
        "AI-predicted credit score",
        "Access to all eligible tiers",
        "On-chain history analysis",
        "Email support",
      ],
      cta: "Choose Plan",
      link: "/wallet",
      isMostPopular: true,
    },
    {
      name: "AI Enhanced",
      price: { monthly: "$2" },
      description:
        "For power users who need the most accurate, real-time score.",
      features: [
        "All Automated features",
        "Real-time market data integration",
        "Highest accuracy predictions",
        "Priority support",
      ],
      cta: "Choose Plan",
      link: "/wallet",
      isMostPopular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Header />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Choose the plan that fits your needs. All scores are AI-predicted
              and for informational purposes only, not financial advice.
            </p>
          </div>

          {/* Pricing Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl p-8 border transition-all duration-300 flex flex-col ${
                  plan.isMostPopular
                    ? "bg-slate-800/80 border-purple-500/50 shadow-2xl shadow-purple-500/10"
                    : "bg-slate-800/50 border-slate-700/50 hover:border-slate-500/50"
                }`}
              >
                {plan.isMostPopular && (
                  <div className="text-center mb-6">
                    <span className="bg-purple-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-center mb-4">
                  {plan.name}
                </h2>
                <p className="text-slate-400 text-center text-sm min-h-[60px]">
                  {plan.description}
                </p>

                <div className="text-5xl font-bold text-center my-8">
                  {plan.price[billingCycle]}
                  <span className="text-lg font-medium text-slate-400">
                    /analysis
                  </span>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, fIndex) => (
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

                <Link href={plan.link}>
                  <button
                    className={`w-full py-3 px-6 font-semibold rounded-lg transition-all duration-300 ${
                      plan.isMostPopular
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
