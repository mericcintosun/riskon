"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AutomatedRiskAnalyzer from "./AutomatedRiskAnalyzer.jsx";
import UserRiskProfile from "./UserRiskProfile.jsx";
import BlendDashboard from "./BlendDashboard.jsx";
import BlendHistoryPerformance from "./BlendHistoryPerformance.jsx";
import EnhancedLiquidityPools from "./EnhancedLiquidityPools.jsx";
import useAnalyzeRisk from "../hooks/useAnalyzeRisk.js";
import { useWallet } from "../contexts/WalletContext.js";

const LandingPage = () => {
  const { handleAnalyze, analysisResult, isLoading, error } = useAnalyzeRisk();
  const { walletAddress } = useWallet();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  const benefits = [
    {
      title: "Smart Analytics",
      description: "AI-powered risk analysis using your transaction history",
      color: "from-gray-600 to-gray-800",
    },
    {
      title: "Real-time Insights",
      description: "Get instant feedback on your DeFi risk profile",
      color: "from-gray-500 to-gray-700",
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-gray-900 text-white"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="container mx-auto px-4 py-16">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-5xl font-extrabold mb-4 leading-tight">
            An On-Chain Credit Scoring System
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Leveraging AI to provide transparent, real-time credit scores for
            undercollateralized lending on the Stellar network.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-12">
          <AutomatedRiskAnalyzer
            onAnalyze={() => handleAnalyze(walletAddress)}
            analysisResult={analysisResult}
            isLoading={isLoading}
            error={error}
          />
        </motion.div>

        {analysisResult && (
          <motion.div variants={itemVariants} className="mb-12">
            <UserRiskProfile
              walletAddress={walletAddress}
              riskScore={analysisResult.riskScore}
            />
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          className="grid md:grid-cols-1 gap-8 mb-12"
        >
          <BlendDashboard />
          <BlendHistoryPerformance />
        </motion.div>

        <motion.div variants={itemVariants}>
          <EnhancedLiquidityPools />
        </motion.div>

        {/* Hero Section */}
        <section className="section-modern container-modern text-center">
          <div className="max-w-4xl mx-auto">
            {/* Main Heading */}
            <h1 className="text-hero mb-8 animate-fade-in">
              On-Chain Credit Scoring <br />
              <span className="text-white">
                for Undercollateralized Lending
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-body mb-12 max-w-2xl mx-auto animate-fade-in">
              Riskon provides a transparent, privacy-first credit scoring system
              for the Stellar DeFi ecosystem, enabling possibilities for
              undercollateralized lending.
            </p>

            {/* Main CTA */}
            <div className="mb-16 animate-scale-in">
              <Link href="/wallet">
                <button className="btn-primary text-lg px-10 py-4 shadow-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                  Get Started
                </button>
              </Link>
            </div>

            {/* Hero Stats */}
            <div className="grid-modern-3 max-w-2xl mx-auto animate-fade-in">
              <div className="card-modern card-hover text-center p-6">
                <div className="text-3xl font-bold text-gradient-modern font-montserrat mb-2">
                  AI
                </div>
                <div className="text-caption">Risk Analysis</div>
              </div>
              <div className="card-modern card-hover text-center p-6">
                <div className="text-3xl font-bold text-gradient-modern font-montserrat mb-2">
                  DeFi
                </div>
                <div className="text-caption">Blend Integration</div>
              </div>
              <div className="card-modern card-hover text-center p-6">
                <div className="text-3xl font-bold text-gradient-modern font-montserrat mb-2">
                  3
                </div>
                <div className="text-caption">Wallet Support</div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="section-compact container-modern">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-heading mb-6">How It Works</h2>
              <p className="text-body">
                Three simple steps to generate your on-chain credit score
              </p>
            </div>

            <div className="grid-modern-3 gap-12">
              {/* Step 1 */}
              <div className="text-center animate-slide-up">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-600/20 to-gray-800/20 rounded-3xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <h3 className="text-subheading mb-4">Connect Wallet</h3>
                <p className="text-body">
                  Connect your Stellar wallet using Albedo, xBull, or Freighter
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center animate-slide-up">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-500/20 to-gray-700/20 rounded-3xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <h3 className="text-subheading mb-4">AI Analysis</h3>
                <p className="text-body">
                  Our AI analyzes your transaction history and patterns
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center animate-slide-up">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-3xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
                <h3 className="text-subheading mb-4">Get Score</h3>
                <p className="text-body">
                  Receive your credit score and unlock new DeFi capabilities
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-heading mb-6">Why Choose Riskon?</h2>
              <p className="text-body">
                A sophisticated alternative to traditional on-chain risk metrics
              </p>
            </div>

            <div className="grid-modern-2 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="card-modern card-hover group">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${benefit.color} opacity-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                      ></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-white/70">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Disclaimer Section */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto text-center">
            <div className="card-glass p-8">
              <h2 className="text-subheading mb-4">
                AI-Powered Predictions, Not Financial Advice
              </h2>
              <p className="text-body">
                Our system uses AI algorithms to generate a credit score based
                on historical on-chain data. This score is an informational tool
                designed to help protocols manage risk and does not constitute
                financial or investment advice. Always conduct your own research
                before making financial decisions.
              </p>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="section-compact container-modern">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-heading mb-6">Powerful Features</h2>
            <p className="text-body mb-12">
              Everything you need for a comprehensive on-chain credit assessment
            </p>

            <div className="grid-modern-3 gap-8">
              <div className="card-modern card-hover group">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-600/20 to-gray-800/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-3">
                      Privacy First
                    </h3>
                    <p className="text-white/70">
                      All analysis runs locally in your browser
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-modern card-hover group">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-700/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-3">
                      Fast & Secure
                    </h3>
                    <p className="text-white/70">
                      Powered by Stellar's lightning-fast network
                    </p>
                  </div>
                </div>
              </div>

              <div className="card-modern card-hover group">
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"></div>
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
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-compact container-modern text-center">
          <div className="card-glass max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-3xl"></div>
              <div className="relative">
                <h2 className="text-heading mb-6">Ready to Start?</h2>
                <p className="text-body mb-8">
                  Generate your on-chain credit score and explore new
                  possibilities in DeFi
                </p>
                <Link href="/wallet">
                  <button className="btn-primary text-lg px-10 py-4 shadow-accent hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                    Launch App
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default LandingPage;
