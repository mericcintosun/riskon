"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "../contexts/WalletContext";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const {
    walletAddress,
    isLoading,
    connectWallet: connectWalletContext,
    disconnectWallet: disconnectWalletContext,
    walletName,
  } = useWallet();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on navigation or outside click
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen, closeMobileMenu]);

  const handleConnectWallet = async () => {
    try {
      await connectWalletContext();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      // Don't show error for cancelled operations
      if (
        !error.message.includes("cancelled") &&
        error.message !== "WALLET_SELECTION_CANCELLED"
      ) {
        // You could add a toast notification here for real errors
        console.error("Wallet connection error:", error.message);
      }
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnectWalletContext();
      closeMobileMenu();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "Technologies", href: "/technologies" },
    { name: "Pricing", href: "/pricing" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "About", href: "/about" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-slate-900/95 backdrop-blur-lg border-b border-slate-800/50"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 z-10"
              onClick={closeMobileMenu}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-bold text-white">Riskon</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-slate-300 hover:text-white transition-colors duration-200 text-sm font-medium relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-200 group-hover:w-full"></span>
                </Link>
              ))}
            </nav>

            {/* Desktop Wallet Section */}
            <div className="hidden lg:flex items-center space-x-4">
              {walletAddress ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-slate-300">{walletName}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatAddress(walletAddress)}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnectWallet}
                    className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200 hover:bg-slate-800/50"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    "Connect Wallet"
                  )}
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 transition-colors duration-200 hover:bg-slate-700/50"
              aria-label="Toggle mobile menu"
            >
              <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                <span
                  className={`block w-full h-0.5 bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? "rotate-45 translate-y-1.5" : ""
                  }`}
                />
                <span
                  className={`block w-full h-0.5 bg-white transition-opacity duration-300 ${
                    isMobileMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block w-full h-0.5 bg-white transition-all duration-300 ${
                    isMobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden fixed inset-0 top-16 bg-slate-900/98 backdrop-blur-lg transition-all duration-300 ${
            isMobileMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="px-4 py-8 space-y-8">
              {/* Mobile Navigation */}
              <nav className="space-y-4">
                {navigation.map((item, index) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`block py-3 px-4 text-lg font-medium text-slate-300 hover:text-white transition-all duration-200 rounded-lg hover:bg-slate-800/50 transform hover:translate-x-2`}
                    style={{
                      animationDelay: isMobileMenuOpen
                        ? `${index * 100}ms`
                        : "0ms",
                    }}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Mobile Wallet Section */}
              <div className="pt-8 border-t border-slate-800">
                {walletAddress ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-slate-300">
                          Connected Wallet
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">{walletName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-1">
                        {formatAddress(walletAddress)}
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="w-full py-3 px-4 text-center text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200 hover:bg-slate-800/50"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      "Connect Wallet"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content overlap */}
      <div className="h-16 lg:h-20"></div>
    </>
  );
}
