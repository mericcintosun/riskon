"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Connect Your Wallet",
      description: "Securely connect your Stellar wallet using Albedo, xBull, or Freighter.",
      icon: "🔗",
      color: "from-blue-500 to-cyan-500"
    },
    {
      step: "02", 
      title: "Enter Transaction Data",
      description: "Input your blockchain transaction history for AI analysis.",
      icon: "📊",
      color: "from-emerald-500 to-green-500"
    },
    {
      step: "03",
      title: "AI Risk Assessment",
      description: "Our advanced AI models calculate your personalized risk score.",
      icon: "🧠",
      color: "from-violet-500 to-purple-500"
    },
    {
      step: "04",
      title: "Access DeFi Features",
      description: "Use Blend Protocol with personalized recommendations.",
      icon: "🌊",
      color: "from-orange-500 to-red-500"
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
              How <span className="text-gradient-accent">Riskon</span> Works
            </h1>
            <p className="text-lg text-white/70 mb-16">
              Four simple steps to analyze your blockchain risk profile
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
              Connect your wallet and begin your DeFi journey
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
    </>
  );
} 