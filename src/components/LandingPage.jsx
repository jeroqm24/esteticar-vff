import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroSection from "./HeroSection";
import TrustBreaker from "./TrustBreaker";
import ServicesSection from "./ServicesSection";
import ProtocoloSection from "./ProtocoloSection";
import BeforeAfterScroll from "./BeforeAfterScroll";
import TeamSection from "./TeamSection";
import ReviewsSection from "./ReviewsSection";
import VIPSection from "./VIPSection";
import CalendarSection from "./CalendarSection";
import FinalCTA from "./FinalCTA";
import BookingPanel from "./BookingPanel";
import BookingFAB from "./BookingFAB";
import BotFloatButton from "./BotFloatButton";
import Navigation from "./Navigation";

// (WhatsApp float removed — contacto via bot integrado)

// Scroll to Top Button
function ScrollToTop() {
  const [show, setShow] = useState(false);
  const blocked = React.useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (blocked.current) return;
      const y = window.scrollY;
      setShow(prev => {
        if (!prev && y > 700) return true;
        if (prev && y < 500) return false;
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    blocked.current = true;
    setShow(false);
    window.scrollTo(0, 0);
    setTimeout(() => { blocked.current = false; }, 800);
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Volver arriba"
      className="fixed z-[55] bottom-24 left-4 sm:bottom-[104px] sm:left-6 w-10 h-10 rounded-full bg-white/90 border border-black/[0.06] backdrop-blur-sm text-ec-gold flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:bg-ec-gold hover:text-white"
      style={{
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
        transform: show ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  );
}

export default function LandingPage() {
  const [selectedServices, setSelectedServices] = useState([]);
  const [vehicleType, setVehicleType] = useState("car");
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const addService = (service) => {
    setSelectedServices((prev) => {
      if (prev.some((s) => s.id === service.id)) return prev;
      return [...prev, service];
    });
  };

  const removeService = (id) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== id));
  };

  const openBooking = () => {
    if (selectedServices.length > 0) {
      setIsBookingOpen(true);
    } else {
      document.querySelector("#servicios")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-ec-white min-h-screen">
      {/* Noise overlay for cinematic texture */}
      <div className="noise-overlay" />

      <Navigation onBookingClick={openBooking} cartCount={selectedServices.length} />

      <main>
        <HeroSection />

        {/* Cinematic gradient transition: dark → light */}
        <div className="relative h-40 -mt-1"
          style={{
            background: "linear-gradient(to bottom, #000000, #0a0a08 20%, #1a1a17 40%, #3a382f 55%, #6b675a 65%, #a09a88 75%, #d2cfc4 85%, var(--color-ec-cream) 100%)"
          }}
        />

        <TrustBreaker />
        <ReviewsSection />
        <BeforeAfterScroll />
        <ServicesSection
          vehicleType={vehicleType}
          onVehicleTypeChange={setVehicleType}
          selectedServices={selectedServices}
          onAddService={addService}
          onRemoveService={removeService}
        />
        <ProtocoloSection />
        <TeamSection />
        <VIPSection />
        <FinalCTA />
      </main>

      {/* Booking Panel */}
      <BookingPanel
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        services={selectedServices}
        onRemoveService={removeService}
        vehicleType={vehicleType}
        onOpenChat={() => window.open(`https://wa.me/573181983601?text=${encodeURIComponent("Hola, acabo de hacer una reserva y quisiera confirmar los detalles")}`, "_blank")}
      />

      {/* Floating buttons */}
      <BookingFAB count={selectedServices.length} onClick={openBooking} />
      <BotFloatButton />
      <ScrollToTop />
    </div>
  );
}
