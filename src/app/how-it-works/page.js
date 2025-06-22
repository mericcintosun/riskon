"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Connect Your Wallet",
      description:
        "Connect your Stellar wallet using Albedo, xBull, or Freighter to get started.",
      color: "from-gray-600 to-gray-800",
    },
    {
      step: "02",
      title: "Analyze Your Data",
      description:
        "Our AI analyzes your transaction history and calculates your personalized risk score.",
      color: "from-gray-500 to-gray-700",
    },
    {
      step: "03",
      title: "Get Your Score",
      description:
        "Receive your risk score and insights to optimize your DeFi strategy.",
      color: "from-gray-400 to-gray-600",
    },
    {
      step: "04",
      title: "Access DeFi",
      description:
        "Use your score to access better rates and opportunities in Blend and other protocols.",
      color: "from-gray-600 to-gray-900",
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
              How It <span className="text-white">Works</span>
            </h1>
            <p className="text-lg text-white/70 mb-16">
              Get your personalized risk score in four simple steps
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="card-modern card-hover animate-slide-up"
                >
                  <div className="p-8">
                    <div className="flex items-start space-x-6">
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} opacity-20 flex items-center justify-center`}
                      >
                        <span className="text-lg font-bold text-white">
                          {step.step}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">
                          {step.title}
                        </h3>
                        <p className="text-white/70">{step.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Why Use Riskon?
            </h2>
            <p className="text-white/70 mb-12 text-lg">
              Benefits of using our AI-powered risk scoring platform
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card-modern p-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Privacy First
                </h3>
                <p className="text-white/70">
                  All analysis happens in your browser. Your data never leaves
                  your device.
                </p>
              </div>
              <div className="card-modern p-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Better Rates
                </h3>
                <p className="text-white/70">
                  Lower risk scores unlock better borrowing rates and lending
                  opportunities.
                </p>
              </div>
              <div className="card-modern p-6">
                <h3 className="text-lg font-bold text-white mb-3">Real-time</h3>
                <p className="text-white/70">
                  Get instant results with sub-second finality on the Stellar
                  network.
                </p>
              </div>
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
