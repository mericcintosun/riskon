"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function FeaturesPage() {
  const features = [
    {
      title: "On-browser AI scoring",
      description: "No private keys or raw data leave the user's device.",
      color: "from-gray-600 to-gray-800",
    },
    {
      title: "Soroban + Stellar backbone",
      description:
        "Fast, low-fee transactions secured by the Stellar Consensus Protocol.",
      color: "from-gray-500 to-gray-700",
    },
    {
      title: "Badge NFT minting",
      description: "Showcase your risk tier on-chain.",
      color: "from-gray-400 to-gray-600",
    },
    {
      title: "Blend integration",
      description:
        "Supply, borrow, repay and withdraw flows that adapt to your score.",
      color: "from-gray-600 to-gray-900",
    },
    {
      title: "Live leaderboard",
      description:
        "Real-time feed of the latest scores and lowest-risk addresses.",
      color: "from-gray-500 to-gray-800",
    },
    {
      title: "PWA and multi-wallet",
      description:
        "Installable mobile app; Albedo, xBull and Freighter supported out of the box.",
      color: "from-gray-700 to-gray-900",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Platform <span className="text-white">Features</span>
            </h1>
            <p className="text-lg text-white/70 mb-16">
              Powerful features that make Riskon the leading AI-powered
              blockchain risk scoring platform
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="section-compact container-modern">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card-modern card-hover group animate-slide-up"
              >
                <div className="text-center p-6">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.color} opacity-20 flex items-center justify-center group-hover:opacity-30 transition-opacity duration-300`}
                  ></div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Specs */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Technical Specifications
            </h2>
            <p className="text-white/70 mb-12 text-lg">
              Built with cutting-edge technology for optimal performance
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-600/20 to-gray-800/20 rounded-2xl flex items-center justify-center"></div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Soroban Smart Contracts
                </h3>
                <p className="text-white/70">
                  Next-generation smart contracts with WebAssembly runtime
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-500/20 to-gray-700/20 rounded-2xl flex items-center justify-center"></div>
                <h3 className="text-xl font-bold text-white mb-3">
                  Stellar Network
                </h3>
                <p className="text-white/70">
                  Fast, secure blockchain with 3-5 second finality
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-2xl flex items-center justify-center"></div>
                <h3 className="text-xl font-bold text-white mb-3">
                  TensorFlow.js
                </h3>
                <p className="text-white/70">
                  Machine learning models running entirely in the browser
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">
              Experience the Power
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Join users who trust Riskon for their DeFi risk assessment needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/wallet">
                <button className="btn-primary text-lg px-8 py-4">
                  Get Started
                </button>
              </Link>
              <Link href="/how-it-works">
                <button className="btn-secondary text-lg px-8 py-4">
                  How It Works
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
