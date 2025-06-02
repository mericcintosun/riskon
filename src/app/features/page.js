"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function FeaturesPage() {
  const features = [
    {
      title: "AI-Powered Risk Analysis",
      description: "Advanced machine learning algorithms analyze your blockchain transaction patterns to calculate personalized risk scores.",
      icon: "🧠",
      color: "from-violet-500 to-purple-500"
    },
    {
      title: "Blend Protocol Integration",
      description: "Seamlessly access DeFi features with risk-adjusted strategies through the Blend Protocol.",
      icon: "🌊",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Multi-Wallet Support",
      description: "Connect with your preferred Stellar wallet for maximum flexibility and security.",
      icon: "💼",
      color: "from-emerald-500 to-green-500"
    },
    {
      title: "Stellar Blockchain",
      description: "Built on Stellar's fast, secure, and cost-effective blockchain infrastructure.",
      icon: "⚡",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Smart Contract Security",
      description: "All operations are secured by audited Soroban smart contracts on the Stellar network.",
      icon: "🔒",
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Real-Time Analytics",
      description: "Monitor your portfolio performance and risk metrics with live dashboard updates.",
      icon: "📊",
      color: "from-indigo-500 to-purple-500"
    },
    {
      title: "Portfolio Optimization",
      description: "Get personalized recommendations to optimize your DeFi portfolio based on your risk profile.",
      icon: "📈",
      color: "from-teal-500 to-cyan-500"
    }
  ];

  return (
    <>
      <Header />

      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Platform <span className="text-gradient-accent">Features</span>
            </h1>
            <p className="text-lg text-white/70 mb-16">
              Powerful features that make Riskon the leading AI-powered blockchain risk scoring platform
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="section-compact container-modern">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="card-modern card-hover group animate-slide-up">
                <div className="text-center p-6">
                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.color} opacity-20 flex items-center justify-center group-hover:opacity-30 transition-opacity duration-300`}>
                    <span className="text-3xl">{feature.icon}</span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-white/70">
                    {feature.description}
                  </p>
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
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">⚙️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Soroban Smart Contracts</h3>
                <p className="text-white/70">
                  Next-generation smart contracts with WebAssembly runtime
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🔗</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Stellar Network</h3>
                <p className="text-white/70">
                  Fast, secure blockchain with 3-5 second finality
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Models</h3>
                <p className="text-white/70">
                  Machine learning trained on blockchain transaction patterns
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
              Join thousands of users who trust Riskon for their DeFi needs
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
    </>
  );
} 