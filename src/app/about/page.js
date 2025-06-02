"use client";

import Header from "../../components/Header.jsx";
import Link from "next/link";

export default function AboutPage() {
  const whyRiskOn = [
    {
      title: "Personalised trust",
      description: "Address-level scoring replaces static LTVs with dynamic risk management.",
      icon: "👤",
      color: "from-violet-500 to-purple-500"
    },
    {
      title: "Instant settlement",
      description: "Stellar's sub-second finality lets you publish and share a score in real time.",
      icon: "⚡",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Privacy by design",
      description: "All analytics run in-browser; only a compact score is stored on-chain.",
      icon: "🔒",
      color: "from-emerald-500 to-green-500"
    },
    {
      title: "Eco-friendly",
      description: "SCP consumes a fraction of the energy required by traditional PoW chains.",
      icon: "🌱",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Future-proof",
      description: "NFTs, oracle hooks and Blend modules lay a bridge toward next-gen DeFi credit markets.",
      icon: "🚀",
      color: "from-pink-500 to-rose-500"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About <span className="text-gradient-accent">Riskon</span>
            </h1>
            <p className="text-lg text-white/70 mb-16">
              Bringing transparent, personal risk signals to DeFi
            </p>
          </div>
        </section>

        {/* About Us Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="card-modern p-8 mb-16">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                Our Mission
              </h2>
              <p className="text-lg text-white/80 leading-relaxed text-center">
                Riskon is an independent builder team that emerged from the <strong>Stellar Community Fund</strong>. 
                Our mission is to bring transparent, personal risk signals to DeFi and raise trust across 
                lending and liquidity protocols. The codebase is open-source, Soroban-powered and ready 
                for third-party audits.
              </p>
            </div>
          </div>
        </section>

        <section className="section-compact container-modern">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white mb-6">
                Why Riskon?
              </h2>
              <p className="text-white/70 text-lg">
                Five key advantages that make Riskon the future of DeFi risk assessment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {whyRiskOn.map((item, index) => (
                <div key={index} className="card-modern card-hover group animate-slide-up">
                  <div className="text-center p-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${item.color} opacity-20 flex items-center justify-center group-hover:opacity-30 transition-opacity duration-300`}>
                      <span className="text-3xl">{item.icon}</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-4">
                      {item.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-white/70">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto text-center">
            <div className="card-modern p-8">
              <h2 className="text-3xl font-bold text-white mb-6">
                Open Source & Auditable
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Our commitment to transparency extends to our codebase. Every line of code is 
                open-source and available for community review and third-party audits.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="btn-primary text-lg px-8 py-4">
                  View on GitHub
                </button>
                <button className="btn-secondary text-lg px-8 py-4">
                  Read Documentation
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-compact container-modern text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">
              Join the Future of DeFi
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Be part of the revolution in decentralized finance risk assessment
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/wallet">
                <button className="btn-primary text-lg px-8 py-4">
                  Get Started
                </button>
              </Link>
              <Link href="/how-it-works">
                <button className="btn-secondary text-lg px-8 py-4">
                  Learn How
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
} 