"use client";

import Header from "../../components/Header";
import LandingPage from "../../components/LandingPage";

export default function LandingPageRoute() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Landing Page Content */}
      <div className="flex-1">
        <LandingPage />
      </div>
    </div>
  );
} 