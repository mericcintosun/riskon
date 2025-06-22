"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header.jsx";
import Link from "next/link";
import {
  Target,
  Zap,
  Lock,
  Leaf,
  Rocket,
  Eye,
  Lightbulb,
  Shield,
  Handshake,
  Unlock,
  Github,
  BookOpen,
  Star,
} from "lucide-react";

export default function AboutPage() {
  const [activeAdvantage, setActiveAdvantage] = useState(0);
  const [stats, setStats] = useState({
    users: 0,
    scores: 0,
    protocols: 0,
    accuracy: 0,
  });

  const advantages = [
    {
      title: "Personalized Trust Scoring",
      shortTitle: "Personalized Trust",
      description:
        "Replace static LTV ratios with dynamic, address-level risk assessment that adapts to individual behavior patterns.",
      details: [
        "Individual wallet behavior analysis",
        "Dynamic risk adjustment based on history",
        "Replaces one-size-fits-all LTV models",
        "Continuous learning from transaction patterns",
      ],
      icon: <Target className="w-6 h-6" />,
      color: "blue",
    },
    {
      title: "Instant Settlement & Real-time Updates",
      shortTitle: "Instant Settlement",
      description:
        "Leverage Stellar's sub-second finality for immediate score publication and real-time risk assessment updates.",
      details: [
        "Sub-second transaction finality",
        "Real-time score updates",
        "Immediate protocol integration",
        "Live risk monitoring",
      ],
      icon: <Zap className="w-6 h-6" />,
      color: "amber",
      stat: "< 1 second",
      benefit: "Instant DeFi access",
    },
    {
      title: "Privacy-First Architecture",
      shortTitle: "Privacy by Design",
      description:
        "All computations happen locally in your browser using WebAssembly and TensorFlow.js - your data never leaves your device.",
      details: [
        "Client-side data processing",
        "Zero server data transmission",
        "Only compact scores stored on-chain",
        "GDPR compliant by design",
      ],
      icon: <Lock className="w-6 h-6" />,
      color: "emerald",
      stat: "0% data shared",
      benefit: "Complete privacy protection",
    },
    {
      title: "Eco-Friendly Blockchain",
      shortTitle: "Eco-Friendly",
      description:
        "Built on Stellar's energy-efficient Stellar Consensus Protocol, consuming minimal energy compared to traditional PoW chains.",
      details: [
        "Stellar Consensus Protocol efficiency",
        "Minimal energy consumption",
        "Sustainable blockchain infrastructure",
        "Carbon-neutral operations",
      ],
      icon: <Leaf className="w-6 h-6" />,
      color: "green",
      stat: "99.9% less energy",
      benefit: "Sustainable DeFi future",
    },
    {
      title: "Future-Proof Technology Stack",
      shortTitle: "Future-Proof",
      description:
        "Advanced integration with NFTs, oracle systems, and modular DeFi protocols creates a bridge to next-generation credit markets.",
      details: [
        "NFT badge achievements system",
        "Oracle integration capabilities",
        "Modular protocol architecture",
        "Next-gen DeFi credit markets",
      ],
      icon: <Rocket className="w-6 h-6" />,
      color: "purple",
      stat: "100% modular",
      benefit: "Evolves with DeFi innovation",
    },
  ];

  const teamValues = [
    {
      title: "Transparency",
      description: "Open-source codebase with full community visibility",
      icon: <Eye className="w-8 h-8" />,
    },
    {
      title: "Innovation",
      description: "Pioneering AI-powered risk assessment in DeFi",
      icon: <Lightbulb className="w-8 h-8" />,
    },
    {
      title: "Security",
      description: "Privacy-first design with rigorous audit standards",
      icon: <Shield className="w-8 h-8" />,
    },
    {
      title: "Community",
      description: "Built by and for the Stellar ecosystem",
      icon: <Handshake className="w-8 h-8" />,
    },
  ];

  const milestones = [
    {
      year: "2024",
      quarter: "Q1",
      title: "Stellar Community Fund",
      description:
        "Selected for SCF funding to develop risk scoring infrastructure",
      status: "completed",
    },
    {
      year: "2024",
      quarter: "Q2",
      title: "MVP Development",
      description: "Built core AI models and browser-based processing engine",
      status: "completed",
    },
    {
      year: "2024",
      quarter: "Q3",
      title: "Soroban Integration",
      description: "Deployed smart contracts and NFT badge system",
      status: "completed",
    },
    {
      year: "2024",
      quarter: "Q4",
      title: "Public Beta Launch",
      description: "Community testing and protocol integrations",
      status: "current",
    },
    {
      year: "2025",
      quarter: "Q1",
      title: "Full Platform Launch",
      description: "Complete feature set with institutional partnerships",
      status: "planned",
    },
  ];

  // Animate stats on mount
  useEffect(() => {
    const targets = { users: 1200, scores: 8500, protocols: 12, accuracy: 95 };
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    const intervals = Object.keys(targets).map((key) => {
      const target = targets[key];
      const increment = target / steps;
      let current = 0;

      const intervalId = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(intervalId);
        }
        setStats((prev) => ({ ...prev, [key]: Math.floor(current) }));
      }, stepDuration);

      return intervalId;
    });

    return () => intervals.forEach(clearInterval);
  }, []);

  // Auto-cycle advantages
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAdvantage((prev) => (prev + 1) % advantages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [advantages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <main className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}

          {/* Mission Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 md:p-12 border border-slate-700/50">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-6">
                  Our Mission
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-lg text-slate-300 leading-relaxed mb-6">
                    Riskon emerged from the{" "}
                    <span className="text-blue-400 font-semibold">
                      Stellar Community Fund
                    </span>{" "}
                    with a clear vision: to revolutionize DeFi by bringing
                    transparent, personalized risk signals to lending and
                    liquidity protocols.
                  </p>
                  <p className="text-lg text-slate-300 leading-relaxed mb-6">
                    We believe that traditional one-size-fits-all risk models
                    are outdated. Our AI-powered approach creates individual
                    risk profiles that reward responsible behavior while
                    maintaining complete privacy.
                  </p>
                  <p className="text-lg text-slate-300 leading-relaxed">
                    Built on{" "}
                    <span className="text-purple-400 font-semibold">
                      Soroban smart contracts
                    </span>
                    , our open-source platform is designed for transparency,
                    security, and community-driven development.
                  </p>
                </div>

                <div className="space-y-6">
                  {teamValues.map((value, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl flex items-center justify-center text-blue-400">
                        {value.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {value.title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {value.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Advantages Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Why Choose Riskon
              </h2>
              <p className="text-slate-400 text-lg mb-8">
                Five revolutionary advantages that set us apart in the DeFi
                landscape
              </p>

              {/* Advantage selector */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {advantages.map((advantage, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveAdvantage(index)}
                    className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                      activeAdvantage === index
                        ? `bg-${advantage.color}-500/20 text-${advantage.color}-400 border border-${advantage.color}-500/30`
                        : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
                    }`}
                  >
                    {advantage.icon} {advantage.shortTitle}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Advantage Cards */}
              <div className="space-y-4">
                {advantages.map((advantage, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveAdvantage(index)}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
                      activeAdvantage === index
                        ? `bg-${advantage.color}-500/10 border-${advantage.color}-500/30 shadow-lg`
                        : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          activeAdvantage === index
                            ? `bg-${advantage.color}-500/20 text-${advantage.color}-400`
                            : "bg-slate-700/50 text-slate-400"
                        }`}
                      >
                        {advantage.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">
                          {advantage.title}
                        </h3>
                        <p className="text-slate-400 text-sm mb-3">
                          {advantage.description}
                        </p>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${
                              activeAdvantage === index
                                ? `bg-${advantage.color}-500/20 text-${advantage.color}-400`
                                : "bg-slate-700/50 text-slate-400"
                            }`}
                          >
                            {advantage.stat}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Advantage Detail Panel */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
                <div className="text-center mb-6">
                  <div
                    className={`text-4xl mb-4 p-4 rounded-2xl bg-${advantages[activeAdvantage].color}-500/20 inline-flex text-${advantages[activeAdvantage].color}-400`}
                  >
                    {advantages[activeAdvantage].icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {advantages[activeAdvantage].title}
                  </h3>
                  <p className="text-slate-400 mb-4">
                    {advantages[activeAdvantage].description}
                  </p>
                  <div
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-${advantages[activeAdvantage].color}-500/20`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full bg-${advantages[activeAdvantage].color}-400`}
                    ></div>
                    <span
                      className={`text-sm text-${advantages[activeAdvantage].color}-400 font-medium`}
                    >
                      {advantages[activeAdvantage].benefit}
                    </span>
                  </div>
                </div>

                {/* Advantage Details */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">
                    Key Features
                  </h4>
                  <div className="space-y-3">
                    {advantages[activeAdvantage].details.map((detail, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full bg-${advantages[activeAdvantage].color}-400 mt-2 flex-shrink-0`}
                        ></div>
                        <span className="text-slate-300 text-sm">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Roadmap Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Development Roadmap
              </h2>
              <p className="text-slate-400 text-lg">
                Our journey from concept to the future of DeFi risk assessment
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-px h-full w-0.5 bg-gradient-to-b from-blue-500 to-purple-600"></div>

              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className={`flex items-center ${
                      index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`w-full md:w-1/2 ${
                        index % 2 === 0 ? "md:pr-8" : "md:pl-8"
                      }`}
                    >
                      <div
                        className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border ${
                          milestone.status === "completed"
                            ? "border-emerald-500/30"
                            : milestone.status === "current"
                            ? "border-blue-500/30"
                            : "border-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              milestone.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : milestone.status === "current"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-slate-700/50 text-slate-400"
                            }`}
                          >
                            {milestone.year} {milestone.quarter}
                          </span>
                          <div
                            className={`w-2 h-2 rounded-full ${
                              milestone.status === "completed"
                                ? "bg-emerald-400"
                                : milestone.status === "current"
                                ? "bg-blue-400"
                                : "bg-slate-400"
                            }`}
                          ></div>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">
                          {milestone.title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {milestone.description}
                        </p>
                      </div>
                    </div>

                    {/* Timeline dot */}
                    <div
                      className={`hidden md:flex absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
                        milestone.status === "completed"
                          ? "bg-emerald-400 border-emerald-400"
                          : milestone.status === "current"
                          ? "bg-blue-400 border-blue-400"
                          : "bg-slate-700 border-slate-700"
                      }`}
                    ></div>

                    <div className="w-full md:w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Open Source Section */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 bg-slate-700/50 rounded-2xl text-slate-300 mb-4">
                  <Unlock className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Open Source & Auditable
                </h2>
                <p className="text-lg text-slate-300 mb-8">
                  Complete transparency through open-source development and
                  community-driven security audits
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">
                        MIT Licensed
                      </h4>
                      <p className="text-slate-400 text-sm">
                        Free to use, modify, and distribute
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">
                        Community Audited
                      </h4>
                      <p className="text-slate-400 text-sm">
                        Regular security reviews and audits
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">
                        Full Documentation
                      </h4>
                      <p className="text-slate-400 text-sm">
                        Comprehensive guides and API docs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-400 text-sm">✓</span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">
                        Active Development
                      </h4>
                      <p className="text-slate-400 text-sm">
                        Regular updates and improvements
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://github.com/riskon-stellar"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="btn-primary text-lg px-8 py-4 transform hover:scale-105 transition-all duration-200 inline-flex items-center">
                    <Github className="mr-2 h-5 w-5" />
                    View on GitHub
                  </button>
                </a>
                <Link href="/features">
                  <button className="btn-secondary text-lg px-8 py-4 inline-flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Read Documentation
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-2xl p-8 border border-blue-500/20">
              <h2 className="text-3xl font-bold text-white mb-4">
                Join the Future of DeFi Risk Assessment
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                Be part of the revolution that's transforming how we think about
                trust and risk in decentralized finance
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/wallet">
                  <button className="btn-primary text-lg px-8 py-4 transform hover:scale-105 transition-all duration-200 inline-flex items-center">
                    <Rocket className="mr-2 h-5 w-5" />
                    Get Your Risk Score
                  </button>
                </Link>
                <Link href="/how-it-works">
                  <button className="btn-secondary text-lg px-8 py-4 inline-flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    Learn How It Works
                  </button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center gap-6 text-slate-400 text-sm">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span>Privacy Protected</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Unlock className="h-4 w-4 text-blue-400" />
                  <span>Open Source</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span>Instant Results</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span>Community Driven</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
