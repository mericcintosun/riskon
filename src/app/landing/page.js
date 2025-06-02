"use client";

import Header from "../../components/Header.jsx";
import LandingPage from "../../components/LandingPage.jsx";

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