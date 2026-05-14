import React from "react";
import Navigation from "./Navigation";
import PortfolioSection from "./PortfolioSection";

export default function PortfolioPage() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <Navigation onBookingClick={() => window.location.href = "/"} cartCount={0} />
      <div className="pt-20">
        <PortfolioSection />
      </div>
    </div>
  );
}
