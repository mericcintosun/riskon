"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "../../components/Header.jsx";
import Link from "next/link";
import {
  Link as LinkIcon,
  Bot,
  BarChart3,
  Rocket,
  Lock,
  Zap,
  Blocks,
  Palette,
  BookOpen,
  Shield,
} from "lucide-react";

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Memoized steps data for performance
  const steps = useMemo(
    () => [
      {
        step: "01",
        title: "Connect Your Wallet",
        description:
          "Connect your Stellar wallet using Albedo, xBull, or Freighter to get started.",
        details:
          "Secure connection with industry-standard protocols. Support for all major Stellar wallets including hardware wallets.",
        icon: <LinkIcon className="w-8 h-8" />,
        color: "blue",
        bgColor: "from-blue-500/10 to-purple-600/10",
        features: [
          "Non-custodial security",
          "Multi-wallet support",
          "Hardware wallet compatible",
        ],
      },
      {
        step: "02",
        title: "Analyze Your Data",
        description:
          "Our AI analyzes your transaction history and calculates your personalized risk score.",
        details:
          "Advanced machine learning algorithms process your on-chain data while maintaining complete privacy.",
        icon: <Bot className="w-8 h-8" />,
        color: "purple",
        bgColor: "from-purple-500/10 to-pink-600/10",
        features: [
          "Client-side processing",
          "Zero data collection",
          "Real-time analysis",
        ],
      },
      {
        step: "03",
        title: "Get Your Score",
        description:
          "Receive your risk score and insights to optimize your DeFi strategy.",
        details:
          "Comprehensive risk assessment with actionable recommendations and portfolio optimization tips.",
        icon: <BarChart3 className="w-8 h-8" />,
        color: "emerald",
        bgColor: "from-emerald-500/10 to-green-600/10",
        features: [
          "Personalized insights",
          "Actionable recommendations",
          "Dynamic scoring",
        ],
      },
      {
        step: "04",
        title: "Access DeFi",
        description:
          "Use your score to access better rates and opportunities in Blend and other protocols.",
        details:
          "Unlock premium DeFi features, better borrowing rates, and exclusive lending opportunities.",
        icon: <Rocket className="w-8 h-8" />,
        color: "amber",
        bgColor: "from-amber-500/10 to-orange-600/10",
        features: ["Better rates", "Premium access", "Exclusive opportunities"],
      },
    ],
    []
  );

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay) return;

    const intervalId = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [autoPlay, steps.length]);

  // Memoized benefits data
  const benefits = useMemo(
    () => [
      {
        title: "Privacy First",
        description:
          "All analysis happens in your browser. Your data never leaves your device.",
        icon: <Lock className="w-8 h-8" />,
        color: "emerald",
        features: [
          "Client-side processing",
          "Zero data collection",
          "End-to-end encryption",
        ],
        stats: "100% Private",
      },

      {
        title: "Real-time",
        description:
          "Get instant results with sub-second finality on the Stellar network.",
        icon: <Zap className="w-8 h-8" />,
        color: "purple",
        features: [
          "Instant analysis",
          "Live score updates",
          "Real-time monitoring",
        ],
        stats: "<1s Speed",
      },
    ],
    []
  );

  // Technical architecture data
  const techSpecs = useMemo(
    () => [
      {
        title: "Blockchain Infrastructure",
        specs: [
          { label: "Network", value: "Stellar Mainnet" },
          { label: "Smart Contracts", value: "Soroban WASM" },
          { label: "Consensus", value: "Stellar Consensus Protocol" },
          { label: "Finality", value: "3-5 seconds" },
        ],
        icon: <Blocks className="w-8 h-8" />,
      },
      {
        title: "AI & Analytics",
        specs: [
          { label: "ML Framework", value: "TensorFlow.js" },
          { label: "Processing", value: "Client-side" },
          { label: "Privacy", value: "Zero data collection" },
          { label: "Performance", value: "Sub-second analysis" },
        ],
        icon: <Bot className="w-8 h-8" />,
      },
      {
        title: "User Experience",
        specs: [
          { label: "Interface", value: "Progressive Web App" },
          { label: "Wallets", value: "Albedo, xBull, Freighter" },
          { label: "Mobile", value: "Native app experience" },
          { label: "Accessibility", value: "WCAG 2.1 AA" },
        ],
        icon: <Palette className="w-8 h-8" />,
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <main className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              How It{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Works
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Get your personalized risk score in four simple steps with our
              AI-powered blockchain analysis platform
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">4</div>
                <div className="text-sm text-slate-400">Simple Steps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  &lt;2min
                </div>
                <div className="text-sm text-slate-400">Setup Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-slate-400">Privacy Protected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  Instant
                </div>
                <div className="text-sm text-slate-400">Results</div>
              </div>
            </div>

            {/* Auto-play toggle */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <span className="text-sm text-slate-400">Auto-play demo</span>
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  autoPlay ? "bg-blue-600" : "bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${
                    autoPlay ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Interactive Steps Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Step-by-Step Process
              </h2>
              <p className="text-slate-400 text-lg">
                Click on any step to explore the process in detail
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Step Navigation */}
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setActiveStep(index);
                      setAutoPlay(false);
                    }}
                    className={`p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${
                      activeStep === index
                        ? `bg-${step.color}-500/10 border-${step.color}-500/30`
                        : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`p-3 rounded-xl flex items-center justify-center ${
                          activeStep === index
                            ? `bg-${step.color}-500/20 text-${step.color}-400`
                            : "bg-slate-700/50 text-slate-300"
                        }`}
                      >
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-slate-400">
                            Step {step.step}
                          </span>
                          {activeStep === index && (
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">
                          {step.title}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Step Detail Panel */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-700/50">
                <div className="text-center mb-6">
                  <div
                    className={`mb-4 p-4 rounded-2xl bg-${steps[activeStep].color}-500/20 inline-flex items-center justify-center text-${steps[activeStep].color}-400`}
                  >
                    {steps[activeStep].icon}
                  </div>
                  <div className="text-sm text-slate-400 mb-2">
                    Step {steps[activeStep].step}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {steps[activeStep].title}
                  </h3>
                  <p className="text-slate-400 mb-6">
                    {steps[activeStep].details}
                  </p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Key Features
                  </h4>
                  <div className="space-y-2">
                    {steps[activeStep].features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full bg-${steps[activeStep].color}-400`}
                        ></div>
                        <span className="text-slate-300 text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center space-x-2">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === activeStep ? "bg-blue-400" : "bg-slate-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="max-w-6xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Why Choose Riskon?
              </h2>
              <p className="text-slate-400 text-lg">
                Experience the benefits of our AI-powered risk scoring platform
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="group">
                  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 hover:transform hover:scale-105">
                    <div className="text-center mb-6">
                      <div
                        className={`mb-3 p-4 bg-${benefit.color}-500/20 rounded-2xl inline-flex items-center justify-center text-${benefit.color}-400`}
                      >
                        {benefit.icon}
                      </div>
                      <div
                        className={`text-2xl font-bold text-${benefit.color}-400 mb-2`}
                      >
                        {benefit.stats}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-slate-400 mb-4">
                        {benefit.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {benefit.features.map((feature, featureIndex) => (
                        <div
                          key={featureIndex}
                          className="flex items-center space-x-2"
                        >
                          <div
                            className={`w-1.5 h-1.5 bg-${benefit.color}-400 rounded-full`}
                          ></div>
                          <span className="text-slate-300 text-sm">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Architecture */}
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
              {techSpecs.map((spec, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
                >
                  <div className="text-center mb-6">
                    <div className="mb-3 p-4 bg-slate-700/50 rounded-2xl inline-flex items-center justify-center text-slate-300">
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

          {/* FAQ Preview */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-slate-400 text-lg">
                Common questions about our risk scoring process
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="font-semibold text-white mb-3">
                  Is my data secure?
                </h3>
                <p className="text-slate-300 text-sm">
                  Yes, all analysis happens locally in your browser. We never
                  store or transmit your personal data.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="font-semibold text-white mb-3">
                  How accurate is the risk score?
                </h3>
                <p className="text-slate-300 text-sm">
                  Our AI model achieves 95%+ accuracy using advanced machine
                  learning algorithms trained on extensive DeFi data.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="font-semibold text-white mb-3">
                  Which wallets are supported?
                </h3>
                <p className="text-slate-300 text-sm">
                  We support all major Stellar wallets including Albedo, xBull,
                  Freighter, and hardware wallets.
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h3 className="font-semibold text-white mb-3">
                  How often is my score updated?
                </h3>
                <p className="text-slate-300 text-sm">
                  Your risk score updates in real-time as new transactions are
                  processed on the Stellar network.
                </p>
              </div>
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-400 mb-2">
                    100%
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
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-2xl p-8 border border-blue-500/20">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                Join thousands of users who trust Riskon for their DeFi risk
                assessment needs
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link href="/wallet">
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg inline-flex items-center">
                    <Rocket className="mr-2 h-5 w-5" />
                    Connect Wallet Now
                  </button>
                </Link>
                <Link href="/features">
                  <button className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 font-medium px-8 py-4 rounded-xl transition-all duration-200 inline-flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    Explore Features
                  </button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex justify-center items-center space-x-8 pt-6 border-t border-slate-700/30">
                <div className="flex items-center space-x-2 text-slate-400">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">Privacy First</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Zap className="h-4 w-4 text-blue-400" />
                  <span className="text-sm">Lightning Fast</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-400">
                  <Shield className="h-4 w-4 text-purple-400" />
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
