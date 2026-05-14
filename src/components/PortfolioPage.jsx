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
          className="inline-flex items-center gap-2 font-ui text-[10px] tracking-[0.2em] uppercase text-white/50 hover:text-ec-gold transition-colors duration-300"
          style={{ transition: "color 0.4s cubic-bezier(0.32,0.72,0,1)" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver al inicio
        </a>
      </div>

      <PortfolioSection />
    </div>
  );
}
