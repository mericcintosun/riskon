"use client";

import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const howItWorksSteps = [
    {
      step: "01",
      title: "Connect Wallet",
      description: "Securely connect your Stellar wallet",
      icon: "🔗",
      color: "from-blue-500 to-cyan-500"
    },
    {
      step: "02", 
      title: "Enter Data",
      description: "Input your blockchain transaction details",
      icon: "📊",
      color: "from-emerald-500 to-green-500"
    },
    {
      step: "03",
      title: "Get Risk Score",
      description: "AI calculates your personalized risk score",
      icon: "🎯",
      color: "from-violet-500 to-purple-500"
    },
    {
      step: "04",
      title: "Use DeFi",
      description: "Access Blend protocol DeFi features",
      icon: "💡",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="section-modern container-modern text-center">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {/* Hero Badge */}
          <div className="inline-flex items-center space-x-3 mb-8">
            <span className="status-success">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Stellar Hackathon Project
            </span>
          </div>

          {/* Hero Title */}
          <h1 className="text-hero mb-8 animate-slide-up">
            Riskon
            <br />
            <span className="text-gradient-accent">Blockchain Risk Scoring</span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-body max-w-3xl mx-auto mb-12 animate-slide-up">
            Analyze your blockchain transaction history to calculate personalized risk scores 
            and access <span className="text-gradient-modern font-semibold">Blend DeFi</span> features 
            tailored to your profile.
          </p>

          {/* Hero CTA */}
          <div className="mb-16 animate-scale-in">
            <Link href="/wallet">
              <button className="btn-primary text-lg px-10 py-4 shadow-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Started
              </button>
            </Link>
          </div>

          {/* Hero Stats */}
          <div className="grid-modern-3 max-w-2xl mx-auto animate-fade-in">
            <div className="card-modern card-hover text-center p-6">
              <div className="text-3xl font-bold text-gradient-modern font-montserrat mb-2">AI</div>
              <div className="text-caption">Risk Analysis</div>
            </div>
            <div className="card-modern card-hover text-center p-6">
              <div className="text-3xl font-bold text-gradient-modern font-montserrat mb-2">DeFi</div>
              <div className="text-caption">Blend Integration</div>
            </div>
            <div className="card-modern card-hover text-center p-6">
              <div className="text-3xl font-bold text-gradient-modern font-montserrat mb-2">3</div>
              <div className="text-caption">Wallet Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section-compact container-modern bg-section">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">
            How It Works
          </h2>
          <p className="text-white/70 text-lg">
            Four simple steps to analyze your blockchain risk profile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {howItWorksSteps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="card-modern card-hover relative overflow-hidden">
                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {step.step}
                </div>
                
                {/* Icon */}
                <div className="text-5xl mb-4">
                  {step.icon}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-white/70 text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-compact container-modern">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">
            Platform Features
          </h2>
          <p className="text-white/70 text-lg">
            Advanced blockchain technology meets AI-powered risk analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="card-modern card-hover group">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🧠</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">
                  AI Risk Analysis
                </h3>
                <p className="text-white/70">
                  6-factor machine learning model for personalized risk scoring
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern card-hover group">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🌊</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">
                  Blend DeFi
                </h3>
                <p className="text-white/70">
                  Supply, borrow, withdraw and repay operations
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern card-hover group">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">💼</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">
                  Multi-Wallet Support
                </h3>
                <p className="text-white/70">
                  Albedo, xBull, and Freighter wallet integration
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern card-hover group">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">⚡</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">
                  Stellar Blockchain
                </h3>
                <p className="text-white/70">
                  Secure and fast blockchain transactions
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern card-hover group">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">📈</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">
                  Portfolio Optimization
                </h3>
                <p className="text-white/70">
                  Get personalized recommendations for your DeFi portfolio
                </p>
              </div>
            </div>
          </div>

          <div className="card-modern card-hover group">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-3xl">🔒</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-3">
                  Smart Security
                </h3>
                <p className="text-white/70">
                  Audited smart contracts for maximum security
                </p>
              </div>
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
                Ready to Start?
              </h2>
              <p className="text-body mb-8">
                Calculate your risk score and step into the world of DeFi
              </p>
              <Link href="/wallet">
                <button className="btn-primary text-lg px-10 py-4 shadow-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch App
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 