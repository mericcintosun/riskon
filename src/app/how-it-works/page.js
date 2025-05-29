"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Connect Your Wallet",
      description: "Securely connect your Stellar wallet using Albedo, xBull, or Freighter.",
      details: [
        "Choose your preferred Stellar wallet",
        "Authorize secure connection",
        "Your private keys never leave your device",
        "All transactions are signed locally"
      ],
      icon: "🔗",
      color: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10"
    },
    {
      step: "02", 
      title: "Enter Transaction Data",
      description: "Input your blockchain transaction history for AI analysis.",
      details: [
        "Transaction count in last 30 days",
        "Average time between transactions",
        "Number of different asset types",
        "All data is processed locally"
      ],
      icon: "📊",
      color: "from-emerald-500 to-green-500",
      bgGradient: "from-emerald-500/10 to-green-500/10"
    },
    {
      step: "03",
      title: "AI Risk Assessment",
      description: "Our advanced AI models calculate your personalized risk score.",
      details: [
        "6-factor machine learning analysis",
        "Transaction pattern recognition",
        "Portfolio diversification assessment",
        "Real-time risk calibration"
      ],
      icon: "🧠",
      color: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-500/10 to-purple-500/10"
    },
    {
      step: "04",
      title: "Access DeFi Features",
      description: "Use Blend Protocol with personalized recommendations.",
      details: [
        "Supply assets to earn yield",
        "Borrow against your collateral",
        "Withdraw and repay operations",
        "Risk-adjusted strategies"
      ],
      icon: "🌊",
      color: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/10"
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
              How <span className="text-gradient-accent">Riskon</span> Works
            </h1>
            <p className="text-body max-w-2xl mx-auto mb-12">
              Discover how our AI-powered platform transforms your blockchain data 
              into actionable DeFi insights through four simple steps.
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="section-compact container-modern">
          <div className="max-w-6xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="mb-20 last:mb-0">
                <div className={`grid-modern-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                }`}>
                  {/* Content */}
                  <div className={`animate-slide-up ${
                    index % 2 === 1 ? 'lg:col-start-2' : ''
                  }`}>
                    <div className="flex items-center space-x-4 mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {step.step}
                      </div>
                      <div className="text-6xl">{step.icon}</div>
                    </div>
                    
                    <h2 className="text-heading mb-4">
                      {step.title}
                    </h2>
                    
                    <p className="text-body mb-8">
                      {step.description}
                    </p>
                    
                    <div className="space-y-3">
                      {step.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`}></div>
                          <span className="text-white/80 font-montserrat">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual */}
                  <div className={`animate-scale-in ${
                    index % 2 === 1 ? 'lg:col-start-1' : ''
                  }`}>
                    <div className={`card-modern relative overflow-hidden bg-gradient-to-br ${step.bgGradient}`}>
                      <div className="relative z-10 p-8 text-center">
                        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-5 rounded-3xl`}></div>
                        <div className="relative">
                          <div className="text-8xl mb-6">{step.icon}</div>
                          <h3 className="text-subheading mb-4">{step.title}</h3>
                          <div className={`w-24 h-1 rounded-full bg-gradient-to-r ${step.color} mx-auto`}></div>
                        </div>
                      </div>
                      
                      {/* Decorative Elements */}
                      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${step.color} opacity-10 blur-2xl`}></div>
                      <div className={`absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-gradient-to-br ${step.color} opacity-20 blur-xl`}></div>
                    </div>
                  </div>
                </div>

                {/* Connection Arrow */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center mt-12 mb-8">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${step.color}`}></div>
                      <div className={`w-16 h-px bg-gradient-to-r ${step.color} opacity-50`}></div>
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color} opacity-75`}></div>
                      <div className={`w-16 h-px bg-gradient-to-r ${step.color} opacity-50`}></div>
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${step.color}`}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-compact container-modern text-center">
          <div className="card-glass max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-3xl"></div>
              <div className="relative">
                <h2 className="text-heading mb-6">
                  Ready to Get Started?
                </h2>
                <p className="text-body mb-8">
                  Connect your wallet and begin your DeFi journey with personalized risk insights
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/wallet">
                    <button className="btn-primary text-lg px-10 py-4 shadow-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Connect Wallet
                    </button>
                  </Link>
                  <Link href="/features">
                    <button className="btn-secondary text-lg px-10 py-4">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Learn More
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