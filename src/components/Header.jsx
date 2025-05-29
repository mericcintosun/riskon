"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "../contexts/WalletContext";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { 
    walletAddress, 
    connectedWallet, 
    isLoading,
    connectWallet,
    disconnectWallet 
  } = useWallet();

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
      <div className="container-modern">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="group flex items-center space-x-3 transition-transform duration-300 hover:scale-105">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg group-hover:shadow-violet-500/25 transition-all duration-300">
              <span className="text-xl font-bold text-white">R</span>
            </div>
            <div className="text-2xl font-bold text-gradient-modern font-montserrat">
              Riskon
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/features"
              className="nav-link"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              className="nav-link"
            >
              How It Works
            </Link>
          </nav>

          {/* Wallet Connection */}
          <div className="hidden md:flex items-center space-x-4">
            {walletAddress ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <div className="font-medium text-white/90">{connectedWallet}</div>
                  <div className="text-xs text-white/60 font-mono">
                    {walletAddress.substring(0, 8)}...{walletAddress.substring(56)}
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isLoading}
                className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="loading-modern">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Connect Wallet
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-fade-in">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/features"
                className="nav-link text-left"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/how-it-works"
                className="nav-link text-left"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              
              {/* Mobile Wallet Connection */}
              <div className="pt-4 border-t border-white/10">
                {walletAddress ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium text-white/90">{connectedWallet}</div>
                      <div className="text-xs text-white/60 font-mono">
                        {walletAddress.substring(0, 8)}...{walletAddress.substring(56)}
                      </div>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="btn-secondary text-sm px-4 py-2 w-full"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    disabled={isLoading}
                    className="btn-primary px-6 py-3 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="loading-modern">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                      </div>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Connect Wallet
                      </>
                    )}
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}