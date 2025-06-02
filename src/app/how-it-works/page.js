"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Connect Wallet",
      description: "Authenticate in one click with Albedo, xBull or Freighter.",
      icon: "🔗",
      color: "from-blue-500 to-cyan-500"
    },
    {
      step: "02", 
      title: "Local Analytics",
      description: "Six on-chain factors from your last-30-day activity are processed entirely in the browser.",
      icon: "📊",
      color: "from-emerald-500 to-green-500"
    },
    {
      step: "03",
      title: "Risk Score",
      description: "A TensorFlow.js model outputs a personal score between 0 and 100.",
      icon: "🧠",
      color: "from-violet-500 to-purple-500"
    },
    {
      step: "04",
      title: "On-Chain Record",
      description: "The score is written immutably to a Soroban smart contract on Stellar Testnet.",
      icon: "⛓️",
      color: "from-orange-500 to-red-500"
    },
    {
      step: "05",
      title: "Badge NFT",
      description: "An NFT matching your tier appears in your wallet.",
      icon: "🏆",
      color: "from-pink-500 to-rose-500"
    },
    {
      step: "06",
      title: "Collateral Hint",
      description: "A score-driven collateral factor shows your maximum borrow limit via the Blend demo.",
      icon: "💰",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              How <span className="text-gradient-accent">Riskon</span> Works
            </h1> 
            <p className="text-lg text-white/70 mb-16">
              Six simple steps to calculate your blockchain risk profile and access DeFi features
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-16">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-8 animate-slide-up">
                  {/* Step Number */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                    {step.step}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-white/70 text-lg">
                      {step.description}
                    </p>
                  </div>

                  {/* Icon */}
                  <div className="hidden md:block text-6xl opacity-60">
                    {step.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Connect your wallet and get your personalized risk score
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/wallet">
                <button className="btn-primary text-lg px-8 py-4">
                  Connect Wallet
                </button>
              </Link>
              <Link href="/features">
                <button className="btn-secondary text-lg px-8 py-4">
                  Learn More
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 