"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="py-16 border-t border-white/10 bg-black/20 mt-auto">
      <div className="container-modern">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-5 mb-6">
              <img 
                src="/logo.png" 
                alt="Riskon Logo" 
                className="w-12 h-12 object-contain rounded-xl"
              />
              <span className="text-2xl font-bold font-montserrat text-gradient-modern">
                Riskon
              </span>
            </div>
            <p className="text-white/70 mb-4 max-w-md">
              Bringing transparent, personal risk signals to DeFi through AI-powered blockchain analytics.
            </p>
          
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/features" className="block text-white/70 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/how-it-works" className="block text-white/70 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="/about" className="block text-white/70 hover:text-white transition-colors">
                About
              </Link>
              <Link href="/wallet" className="block text-white/70 hover:text-white transition-colors">
                Connect Wallet
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-bold mb-4">Resources</h3>
            <div className="space-y-2">
              <a href="#" className="block text-white/70 hover:text-white transition-colors">
                GitHub
              </a>
              <a href="#" className="block text-white/70 hover:text-white transition-colors">
                Documentation
              </a>
              <a href="#" className="block text-white/70 hover:text-white transition-colors">
                Stellar Explorer
              </a>
              <a href="#" className="block text-white/70 hover:text-white transition-colors">
                MIT License
              </a>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10">
          <div className="flex items-center space-x-6 mb-4 md:mb-0">
            <a href="#" className="text-white/70 hover:text-white transition-colors">
              <span className="sr-only">X (Twitter)</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="#" className="text-white/70 hover:text-white transition-colors">
              <span className="sr-only">Discord</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
            <a href="#" className="text-white/70 hover:text-white transition-colors">
              <span className="sr-only">Medium</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
              </svg>
            </a>
          </div>
          
          <p className="text-white/60 text-sm">
            Riskon © 2025 • MIT License
          </p>
        </div>
      </div>
    </footer>
  );
} 