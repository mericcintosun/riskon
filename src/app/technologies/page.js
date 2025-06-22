"use client";

import Header from "../../components/Header.jsx";
import { motion } from "framer-motion";
import { Blocks, Bot, Palette, Lock } from "lucide-react";

export default function TechnologiesPage() {
  const techCategories = [
    {
      name: "Blockchain & Smart Contracts",
      techs: [
        {
          name: "Stellar",
          description:
            "The core blockchain network, optimized for speed, low cost, and scalability.",
        },
        {
          name: "Soroban",
          description:
            "Next-gen smart contract platform on Stellar, enabling complex logic with a Rust SDK.",
        },
        {
          name: "Rust",
          description:
            "The primary language for writing secure and high-performance Soroban smart contracts.",
        },
      ],
      icon: <Blocks className="w-8 h-8" />,
      color: "blue",
    },
    {
      name: "AI & Analytics",
      techs: [
        {
          name: "TensorFlow.js",
          description:
            "Powers our client-side AI model, ensuring user data privacy by processing all information in the browser.",
        },
        {
          name: "WebAssembly (Wasm)",
          description:
            "Used to run high-performance analytics code efficiently and securely in the browser.",
        },
      ],
      icon: <Bot className="w-8 h-8" />,
      color: "purple",
    },
    {
      name: "Frontend & User Experience",
      techs: [
        {
          name: "Next.js",
          description:
            "The React framework for building our fast, responsive, and scalable user interface.",
        },
        {
          name: "React",
          description:
            "The foundational library for creating interactive UI components.",
        },
        {
          name: "Tailwind CSS",
          description:
            "A utility-first CSS framework for rapid and consistent UI development.",
        },
      ],
      icon: <Palette className="w-8 h-8" />,
      color: "emerald",
    },
    {
      name: "Authentication & Wallets",
      techs: [
        {
          name: "Passkey (WebAuthn)",
          description:
            "Provides secure, passwordless authentication using biometrics for a frictionless user experience.",
        },
        {
          name: "Stellar Wallets Kit",
          description:
            "Integrates with major Stellar wallets like Freighter, Albedo, and xBull.",
        },
      ],
      icon: <Lock className="w-8 h-8" />,
      color: "amber",
    },
  ];

  const pageVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const categoryVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <Header />

      <motion.main
        className="pt-24 pb-16"
        initial="hidden"
        animate="visible"
        variants={pageVariants}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div className="text-center mb-20" variants={categoryVariants}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Technology Stack
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              The powerful and privacy-focused technologies that power our
              on-chain credit scoring system.
            </p>
          </motion.div>

          {/* Technologies Grid */}
          <div className="space-y-16">
            {techCategories.map((category) => (
              <motion.div key={category.name} variants={categoryVariants}>
                <div className="flex items-center mb-8">
                  <motion.div
                    className={`p-3 rounded-xl mr-4 bg-${category.color}-500/20 text-${category.color}-400`}
                    variants={itemVariants}
                  >
                    {category.icon}
                  </motion.div>
                  <motion.h2
                    className="text-3xl font-bold"
                    variants={itemVariants}
                  >
                    {category.name}
                  </motion.h2>
                </div>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  variants={categoryVariants}
                >
                  {category.techs.map((tech) => (
                    <motion.div
                      key={tech.name}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-slate-500/50 hover:bg-slate-800/80"
                      variants={itemVariants}
                    >
                      <h3 className="text-xl font-bold mb-3">{tech.name}</h3>
                      <p className="text-slate-400 text-sm">
                        {tech.description}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
