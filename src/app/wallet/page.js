"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header.jsx";
import Link from "next/link";
import { useWallet } from "../../contexts/WalletContext";

export default function WalletPage() {
  const router = useRouter();
  const {
    kit,
    connectedWallet,
    walletAddress,
    isLoading,
    passkeySupport,
    connectWallet,
    disconnectWallet,
    connectPasskey,
    getStoredPasskeys,
  } = useWallet();

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const supportedWallets = [
    {
      id: "albedo",
      name: "Albedo",
      description: "Web-based Stellar wallet with advanced security features",
      icon: "💫",
      color: "from-blue-500 to-cyan-500",
    },
    {
      id: "xbull",
      name: "xBull",
      description: "Feature-rich Stellar wallet with DeFi integration",
      icon: "🐂",
      color: "from-emerald-500 to-green-500",
    },
    {
      id: "freighter",
      name: "Freighter",
      description: "Browser extension wallet for easy Stellar access",
      icon: "🚀",
      color: "from-violet-500 to-purple-500",
    },
    {
      id: "passkey",
      name: "Passkey",
      description: "Biometric authentication with smart wallet technology",
      icon: "🔐",
      color: "from-pink-500 to-rose-500",
      isPasskey: true,
    },
  ];

  // Redirect to dashboard if wallet is already connected
  useEffect(() => {
    if (walletAddress) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [walletAddress, router]);

  // Handle wallet connection
  const handleConnectWallet = async (walletId = null) => {
    try {
      setMessage("Connecting to wallet...");
      setMessageType("info");

      const result = await connectWallet(walletId);

      if (result.success) {
        setMessage(`✅ ${result.walletName} wallet connected successfully!`);
        setMessageType("success");

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Connection error:", error);

      // Handle different error types gracefully
      if (error.message === "WALLET_SELECTION_CANCELLED") {
        setMessage(
          "Wallet selection was cancelled. Please try again when you're ready to connect."
        );
        setMessageType("info");
      } else if (error.message.includes("cancelled")) {
        setMessage(
          "Connection was cancelled. No worries, you can try again anytime!"
        );
        setMessageType("info");
      } else if (error.message.includes("not installed")) {
        setMessage(
          "Wallet extension not found. Please install a Stellar wallet and refresh the page."
        );
        setMessageType("error");
      } else if (error.message.includes("network")) {
        setMessage(
          "Network error. Please check your connection and try again."
        );
        setMessageType("error");
      } else {
        setMessage(`Connection error: ${error.message}`);
        setMessageType("error");
      }
    }
  };

  // Handle passkey wallet connection
  const handleConnectPasskey = async () => {
    try {
      setMessage("Creating Passkey wallet...");
      setMessageType("info");

      const result = await connectPasskey();

      if (result.success) {
        setMessage(`✅ Passkey wallet created successfully!`);
        setMessageType("success");

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Passkey connection error:", error);
      setMessage(`Passkey error: ${error.message}`);
      setMessageType("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <main className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Connect Your{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Wallet
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-12">
              Choose your preferred Stellar wallet to start your DeFi journey
              with personalized risk assessment and Blend Protocol integration.
            </p>
          </div>

          {walletAddress ? (
            // Connected State
            <div className="max-w-6xl mx-auto mb-20">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 md:p-12 border border-slate-700/50 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-4">
                      Wallet Connected!
                    </h2>

                    <div className="mb-6">
                      <div className="text-lg font-medium text-white/90 mb-2">
                        {connectedWallet}
                      </div>
                      <div className="text-sm text-slate-400 font-mono bg-slate-800/50 rounded-xl p-3 inline-block">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                      </div>
                    </div>

                    <p className="text-lg text-slate-300 mb-8">
                      Your wallet is now connected. You'll be redirected to the
                      dashboard to start calculating your risk score.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Link href="/">
                        <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center">
                          <svg
                            className="w-6 h-6 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Continue to Dashboard
                        </button>
                      </Link>
                      <button
                        onClick={disconnectWallet}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all duration-300"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Status Messages */}
              {message && (
                <div className="max-w-6xl mx-auto mb-8">
                  <div
                    className={`bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border text-center ${
                      messageType === "success"
                        ? "border-emerald-500/30"
                        : messageType === "error"
                        ? "border-red-500/30"
                        : "border-amber-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex-shrink-0">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            messageType === "success"
                              ? "bg-emerald-500/20"
                              : messageType === "error"
                              ? "bg-red-500/20"
                              : "bg-amber-500/20"
                          }`}
                        >
                          {messageType === "success" ? (
                            <svg
                              className="w-6 h-6 text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : messageType === "error" ? (
                            <svg
                              className="w-6 h-6 text-red-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-6 h-6 text-amber-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{message}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Connect Button */}
              <div className="text-center mb-20">
                <button
                  onClick={() => handleConnectWallet()}
                  disabled={!kit || isLoading}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-6 h-6 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Connect Wallet
                    </>
                  )}
                </button>
                <p className="text-slate-400 mt-4">
                  Or choose a specific wallet below
                </p>
              </div>

              {/* Wallet Options */}
              <div className="max-w-6xl mx-auto mb-20">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Supported Wallets
                  </h2>
                  <p className="text-slate-400 text-lg">
                    Choose your preferred wallet to get started
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {supportedWallets.map((wallet, index) => (
                    <div
                      key={wallet.id}
                      className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 group"
                    >
                      <div className="text-center">
                        <div
                          className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${wallet.color} opacity-20 rounded-2xl flex items-center justify-center group-hover:opacity-30 transition-opacity duration-300`}
                        >
                          <span className="text-3xl">{wallet.icon}</span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-3">
                          {wallet.name}
                        </h3>

                        <p className="text-slate-400 text-sm mb-6">
                          {wallet.description}
                        </p>

                        <button
                          onClick={() =>
                            wallet.isPasskey
                              ? handleConnectPasskey()
                              : handleConnectWallet(wallet.id)
                          }
                          disabled={
                            !kit ||
                            isLoading ||
                            (wallet.isPasskey && !passkeySupport?.isSupported)
                          }
                          className={`w-full py-3 px-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-700/50 hover:bg-gradient-to-r hover:${wallet.color} hover:text-white text-slate-300`}
                        >
                          {wallet.isPasskey
                            ? passkeySupport?.isSupported
                              ? `Create ${wallet.name}`
                              : "Not Supported"
                            : `Connect ${wallet.name}`}
                        </button>

                        {wallet.isPasskey && !passkeySupport?.isSupported && (
                          <p className="text-xs text-red-400 mt-2">
                            Passkey not supported on this device
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Information */}
              <div className="max-w-6xl mx-auto mb-20">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-8 md:p-12 border border-slate-700/50">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">
                      🔒 Your Security is Our Priority
                    </h2>
                    <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-emerald-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Non-Custodial
                        </h3>
                        <p className="text-slate-400 text-sm">
                          Your private keys never leave your device
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Secure Transactions
                        </h3>
                        <p className="text-slate-400 text-sm">
                          All transactions are signed locally and verified
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-violet-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Privacy Protected
                        </h3>
                        <p className="text-slate-400 text-sm">
                          Your data is processed locally and encrypted
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-orange-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          Audited Smart Contracts
                        </h3>
                        <p className="text-slate-400 text-sm">
                          All contracts are audited and open source
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
