import React from "react";
import Navigation from "./Navigation";
import PortfolioSection from "./PortfolioSection";

export default function PortfolioPage() {
  return (
    <div className="bg-[#0A0A0A] min-h-screen">
      <Navigation onBookingClick={() => window.location.href = "/"} cartCount={0} />

      {/* Botón volver */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-0">
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-ec-dark font-ui text-[10px] tracking-[0.2em] uppercase shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:bg-ec-gold hover:text-white transition-all duration-[450ms]"
          style={{ transition: "all 0.45s cubic-bezier(0.32,0.72,0,1)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver al inicio
        </a>
      </div>

      <PortfolioSection />
    </div>
  );
}
