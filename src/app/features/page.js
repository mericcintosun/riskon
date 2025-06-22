"use client";

import { useState } from "react";
import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function FeaturesPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: "AI-Powered Risk Analysis",
      description:
        "Advanced machine learning models analyze transaction patterns locally on your device for maximum privacy.",
      icon: "🧠",
      color: "blue",
      benefits: [
        "Privacy-first approach",
        "Real-time analysis",
        "No data leaves device",
      ],
      technical: "TensorFlow.js + WebAssembly",
    },
    {
      title: "Stellar & Soroban Integration",
      description:
        "Built on Stellar's fast, low-cost network with next-generation Soroban smart contracts.",
      icon: "⚡",
      color: "purple",
      benefits: ["3-5 second finality", "Ultra-low fees", "Proven security"],
      technical: "Soroban Smart Contracts",
    },
    {
      title: "Dynamic NFT Badges",
      description:
        "Mint and showcase your risk tier achievements as evolving NFTs on the blockchain.",
      icon: "🏆",
      color: "emerald",
      benefits: ["On-chain proof", "Dynamic metadata", "Transferable assets"],
      technical: "SEP-41 NFT Standard",
    },
    {
      title: "DeFi Protocol Integration",
      description:
        "Seamlessly connect with Blend and other DeFi protocols for risk-adjusted lending and borrowing.",
      icon: "🔗",
      color: "amber",
      benefits: [
        "Automated risk tiers",
        "Optimized rates",
        "Smart liquidation",
      ],
      technical: "Blend Protocol API",
    },
    {
      title: "Real-Time Leaderboard",
      description:
        "Global ranking system showcasing the most trusted addresses and risk management leaders.",
      icon: "📊",
      color: "indigo",
      benefits: ["Social proof", "Competitive gaming", "Trust metrics"],
      technical: "Horizon API + WebSockets",
    },
    {
      title: "Multi-Wallet Support",
      description:
        "Universal compatibility with all major Stellar wallets plus PWA mobile experience.",
      icon: "👛",
      color: "rose",
      benefits: ["Universal access", "Mobile-first", "Offline capable"],
      technical: "SEP-7 URI Scheme",
    },
  ];

  const technicalSpecs = [
    {
      title: "Blockchain Infrastructure",
      specs: [
        { label: "Network", value: "Stellar Mainnet" },
        { label: "Smart Contracts", value: "Soroban WASM" },
        { label: "Consensus", value: "Stellar Consensus Protocol" },
        { label: "Finality", value: "3-5 seconds" },
      ],
      icon: "⛓️",
    },
    {
      title: "AI & Analytics",
      specs: [
        { label: "ML Framework", value: "TensorFlow.js" },
        { label: "Processing", value: "Client-side" },
        { label: "Privacy", value: "Zero data collection" },
        { label: "Performance", value: "Sub-second analysis" },
      ],
      icon: "🤖",
    },
    {
      title: "User Experience",
      specs: [
        { label: "Interface", value: "Progressive Web App" },
        { label: "Wallets", value: "Albedo, xBull, Freighter" },
        { label: "Mobile", value: "Native app experience" },
        { label: "Accessibility", value: "WCAG 2.1 AA" },
      ],
      icon: "🎨",
    },
  ];

  const useCases = [
    {
      title: "Individual Traders",
      description:
        "Get personalized risk scores to optimize your DeFi strategy",
      features: [
        "Personal risk assessment",
        "Portfolio optimization",
        "Risk tier progression",
      ],
    },
    {
      title: "DeFi Protocols",
      description: "Integrate our risk scoring for better lending decisions",
      features: [
        "API integration",
        "Dynamic rate adjustment",
        "Risk-based liquidation",
      ],
    },
    {
      title: "Institutional Investors",
      description: "Enterprise-grade risk management for large portfolios",
      features: ["Bulk analysis", "Custom risk models", "Compliance reporting"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <main className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Platform{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Features
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Discover the powerful features that make Riskon the most advanced
              AI-powered blockchain risk scoring platform
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-slate-400">Privacy Protected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">&lt;1s</div>
                <div className="text-sm text-slate-400">Analysis Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">6+</div>
                <div className="text-sm text-slate-400">Wallet Support</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">24/7</div>
                <div className="text-sm text-slate-400">Availability</div>
              </div>
            </div>
          </div>

          {/* Interactive Features Showcase */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Core Features
              </h2>
              <p className="text-slate-400 text-lg">
                Click on any feature to explore its capabilities in detail
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Feature Cards */}
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveFeature(index)}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
                      activeFeature === index
                        ? `bg-${feature.color}-500/10 border-${feature.color}-500/30`
                        : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`text-2xl p-3 rounded-xl ${
                          activeFeature === index
                            ? `bg-${feature.color}-500/20`
                            : "bg-slate-700/50"
                        }`}
                      >
                        {feature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Feature Detail Panel */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
                <div className="text-center mb-6">
                  <div
                    className={`text-4xl mb-4 p-4 rounded-2xl bg-${features[activeFeature].color}-500/20 inline-block`}
                  >
                    {features[activeFeature].icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {features[activeFeature].title}
                  </h3>
                  <p className="text-slate-400">
                    {features[activeFeature].description}
                  </p>
                </div>

                {/* Benefits */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Key Benefits
                  </h4>
                  <div className="space-y-2">
                    {features[activeFeature].benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full bg-${features[activeFeature].color}-400`}
                        ></div>
                        <span className="text-slate-300 text-sm">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Info */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-sm text-slate-400 mb-1">
                    Technical Stack
                  </div>
                  <div className="text-white font-medium">
                    {features[activeFeature].technical}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Technical Architecture
              </h2>
              <p className="text-slate-400 text-lg">
                Built with cutting-edge technology for optimal performance and
                security
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {technicalSpecs.map((spec, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
                >
                  <div className="text-center mb-6">
                    <div className="text-3xl mb-3 p-4 bg-slate-700/50 rounded-2xl inline-block">
                      {spec.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {spec.title}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {spec.specs.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0"
                      >
                        <span className="text-slate-400 text-sm">
                          {item.label}
                        </span>
                        <span className="text-white text-sm font-medium">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Who Benefits
              </h2>
              <p className="text-slate-400 text-lg">
                Tailored solutions for different types of users and
                organizations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {useCases.map((useCase, index) => (
                <div
                  key={index}
                  className="group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 hover:transform hover:scale-105"
                >
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                    {useCase.title}
                  </h3>
                  <p className="text-slate-400 mb-4">{useCase.description}</p>

                  <div className="space-y-2">
                    {useCase.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        <span className="text-slate-300 text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Performance Metrics
                </h2>
                <p className="text-slate-400">
                  Real-world performance you can count on
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-400 mb-2">
                    99.9%
                  </div>
                  <div className="text-sm text-slate-400">Uptime</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-400 mb-2">
                    0.8s
                  </div>
                  <div className="text-sm text-slate-400">Avg Analysis</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    $0.001
                  </div>
                  <div className="text-sm text-slate-400">Cost per Tx</div>
                </div>
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-400 mb-2">
                    95%
                  </div>
                  <div className="text-sm text-slate-400">Accuracy</div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-2xl p-8 border border-blue-500/20">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Experience the Future?
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                Join thousands of users who trust Riskon for their DeFi risk
                assessment needs
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/wallet">
                  <button className="btn-primary text-lg px-8 py-4 transform hover:scale-105 transition-all duration-200">
                    <span className="mr-2">🚀</span>
                    Start Your Analysis
                  </button>
                </Link>
                <Link href="/how-it-works">
                  <button className="btn-secondary text-lg px-8 py-4">
                    <span className="mr-2">📖</span>
                    Learn How It Works
                  </button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex justify-center items-center space-x-8 mt-8 pt-8 border-t border-slate-700/30">
                <div className="flex items-center space-x-2 text-slate-400">
                  <span className="text-emerald-400">🔒</span>
                  <span className="text-sm">Privacy First</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <span className="text-blue-400">⚡</span>
                  <span className="text-sm">Lightning Fast</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <span className="text-purple-400">🛡️</span>
                  <span className="text-sm">Blockchain Secured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
