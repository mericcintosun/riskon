"use client";

import { useState } from "react";

export default function Header({ 
  walletAddress, 
  connectedWallet, 
  isLoading, 
  onConnectWallet, 
  onDisconnectWallet 
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Modern Header Navigation */}
      <header className="nav-modern">
        <div className="container-modern">
          <div className="flex items-center justify-between h-20">
            {/* Modern Logo */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <span className="text-white font-bold text-xl font-montserrat">R</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl opacity-20 blur"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold font-montserrat text-gradient-modern">
                  Riskon
                </h1>
                <p className="text-xs text-white/50 font-montserrat">
                  Blockchain Risk Scoring
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              <a href="#home" className="nav-link">
                Home
              </a>
              <a href="#features" className="nav-link">
                Features
              </a>
              <a href="#how-it-works" className="nav-link">
                How It Works
              </a>
            </nav>

            {/* Wallet Connection - Desktop */}
            <div className="hidden md:block">
              {!walletAddress ? (
                <button 
                  className="btn-primary"
                  onClick={onConnectWallet}
                  disabled={isLoading}
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
              ) : (
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-white/90">
                      {connectedWallet}
                    </div>
                    <div className="text-xs text-white/50 font-mono">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                  </div>
                  <button 
                    onClick={onDisconnectWallet}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-white/70 hover:text-white transition-colors duration-300 rounded-xl hover:bg-white/10"
                aria-label="Open menu"
              >
                <svg
                  className={`w-6 h-6 transition-transform duration-300 ${
                    isMobileMenuOpen ? "rotate-45" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Mobile Menu Overlay */}
      <div
        className={`mobile-menu-modern ${
          isMobileMenuOpen ? "open" : "closed"
        } md:hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-8 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg font-montserrat">R</span>
              </div>
              <span className="text-xl font-bold font-montserrat text-gradient-modern">
                Riskon
              </span>
            </div>
            <button
              onClick={toggleMobileMenu}
              className="p-2 text-white/70 hover:text-white transition-colors duration-300 rounded-xl hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation Links */}
          <nav className="flex-1 p-8 space-y-2">
            <a
              href="#home"
              className="block p-4 text-lg font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300"
              onClick={toggleMobileMenu}
            >
              <span className="mr-3">🏠</span>
              Home
            </a>
            <a
              href="#features"
              className="block p-4 text-lg font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300"
              onClick={toggleMobileMenu}
            >
              <span className="mr-3">✨</span>
              Features
            </a>
            <a
              href="#how-it-works"
              className="block p-4 text-lg font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-2xl transition-all duration-300"
              onClick={toggleMobileMenu}
            >
              <span className="mr-3">⚙️</span>
              How It Works
            </a>
          </nav>

          {/* Mobile Wallet Connection */}
          <div className="p-8 border-t border-white/10">
            {!walletAddress ? (
              <button
                className="btn-primary w-full"
                onClick={() => {
                  onConnectWallet();
                  toggleMobileMenu();
                }}
                disabled={isLoading}
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
            ) : (
              <div className="space-y-4">
                <div className="card-modern p-4 text-center">
                  <div className="text-sm font-medium text-white/90">
                    {connectedWallet} Connected
                  </div>
                  <div className="text-xs text-white/50 font-mono mt-1">
                    {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                  </div>
                </div>
                <button
                  className="btn-secondary w-full"
                  onClick={() => {
                    onDisconnectWallet();
                    toggleMobileMenu();
                  }}
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={toggleMobileMenu}
        />
      )}
    </>
  );
}