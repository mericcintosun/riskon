"use client";

import Header from "../../components/Header.jsx";
import PoolRatings from "../../components/PoolRatings.jsx";

export default function PoolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <div className="h-16 lg:h-20" />
      <main className="px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <PoolRatings />
      </main>
    </div>
  );
}
