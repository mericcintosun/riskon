"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      router.push("/");
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center border border-white/20">
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-500/20 rounded-2xl flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 110-2.828"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            You&apos;re Offline
          </h1>

          <p className="text-white/70 mb-6">
            It looks like you&apos;ve lost your internet connection. Some
            features may be unavailable until you&apos;re back online.
          </p>

          <p className="text-white/50 text-sm mb-6">
            This page will automatically redirect when your connection is
            restored.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
