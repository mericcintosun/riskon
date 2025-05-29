"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function FeaturesPage() {
  const features = [
    {
      title: "AI-Powered Risk Analysis",
      description: "Advanced machine learning algorithms analyze your blockchain transaction patterns to calculate personalized risk scores.",
      icon: "🧠",
      color: "from-violet-500 to-purple-500",
      benefits: [
        "6-factor risk assessment model",
        "Transaction pattern recognition",
        "Real-time risk calibration",
        "Portfolio diversification analysis",
        "Behavioral pattern detection",
        "Predictive risk modeling"
      ]
    },
    {
      title: "Blend Protocol Integration",
      description: "Seamlessly access DeFi features with risk-adjusted strategies through the Blend Protocol.",
      icon: "🌊",
      color: "from-blue-500 to-cyan-500",
      benefits: [
        "Supply assets to earn yield",
        "Borrow against collateral",
        "Automated liquidation protection",
        "Risk-based interest rates",
        "Portfolio optimization",
        "Smart contract automation"
      ]
    },
    {
      title: "Multi-Wallet Support",
      description: "Connect with your preferred Stellar wallet for maximum flexibility and security.",
      icon: "💼",
      color: "from-emerald-500 to-green-500",
      benefits: [
        "Albedo wallet integration",
        "xBull wallet support",
        "Freighter wallet compatibility",
        "Hardware wallet support",
        "Local key management",
        "Cross-platform accessibility"
      ]
    },
    {
      title: "Stellar Blockchain",
      description: "Built on Stellar's fast, secure, and cost-effective blockchain infrastructure.",
      icon: "⚡",
      color: "from-orange-500 to-red-500",
      benefits: [
        "Low transaction fees",
        "Fast confirmation times",
        "High throughput capacity",
        "Energy-efficient consensus",
        "Built-in DEX functionality",
        "Cross-border payments"
      ]
    },
    {
      title: "Smart Contract Security",
      description: "All operations are secured by audited Soroban smart contracts on the Stellar network.",
      icon: "🔒",
      color: "from-pink-500 to-rose-500",
      benefits: [
        "Audited smart contracts",
        "Non-custodial architecture",
        "Transparent code execution",
        "Immutable transaction records",
        "Decentralized governance",
        "Community-driven development"
      ]
    },
    {
      title: "Real-Time Analytics",
      description: "Monitor your portfolio performance and risk metrics with live dashboard updates.",
      icon: "📊",
      color: "from-indigo-500 to-purple-500",
      benefits: [
        "Live portfolio tracking",
        "Risk metric monitoring",
        "Performance analytics",
        "Historical data analysis",
        "Customizable dashboards",
        "Export capabilities"
      ]
    }
  ];

  return (
    <>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-hero mb-8">
              Platform <span className="text-gradient-accent">Features</span>
            </h1>
            <p className="text-body max-w-2xl mx-auto mb-12">
              Discover the powerful features that make Riskon the leading 
              AI-powered blockchain risk scoring platform for DeFi.
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="section-compact container-modern">
          <div className="grid-modern-2 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="card-modern card-hover group animate-slide-up">
                <div className="relative overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start space-x-6 mb-6">
                    <div className={`flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} opacity-20 flex items-center justify-center group-hover:opacity-30 transition-opacity duration-300`}>
                      <span className="text-3xl">{feature.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-subheading mb-3 group-hover:text-gradient-modern transition-all duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-body">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  {/* Benefits List */}
                  <div className="space-y-3">
                    {feature.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${feature.color} opacity-80`}></div>
                        <span className="text-white/80 font-montserrat text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Decorative Elements */}
                  <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${feature.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity duration-300`}></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Specifications */}
        <section className="section-compact container-modern">
          <div className="card-glass max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-heading mb-6">
                Technical Specifications
              </h2>
              <p className="text-body">
                Built with cutting-edge technology for optimal performance and security
              </p>
            </div>

            <div className="grid-modern-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">⚙️</span>
                </div>
                <h3 className="text-subheading mb-3">Soroban Smart Contracts</h3>
                <p className="text-caption">
                  Next-generation smart contracts on Stellar with WebAssembly runtime
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🔗</span>
                </div>
                <h3 className="text-subheading mb-3">Stellar Network</h3>
                <p className="text-caption">
                  Fast, secure, and cost-effective blockchain with 3-5 second finality
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🤖</span>
                </div>
                <h3 className="text-subheading mb-3">AI Models</h3>
                <p className="text-caption">
                  Machine learning algorithms trained on blockchain transaction patterns
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-compact container-modern text-center">
          <div className="card-glass max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-3xl"></div>
              <div className="relative">
                <h2 className="text-heading mb-6">
                  Experience the Power
                </h2>
                <p className="text-body mb-8">
                  Join thousands of users who trust Riskon for their DeFi risk assessment needs
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/wallet">
                    <button className="btn-primary text-lg px-10 py-4 shadow-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Get Started
                    </button>
                  </Link>
                  <Link href="/how-it-works">
                    <button className="btn-secondary text-lg px-10 py-4">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      How It Works
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
} 