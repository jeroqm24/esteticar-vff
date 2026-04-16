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
import BotChat from "./BotChat";
import BotFloatButton from "./BotFloatButton";
import Navigation from "./Navigation";

// (WhatsApp float removed — contacto via bot integrado)

// Scroll to Top Button
function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed z-[55] bottom-24 left-4 sm:bottom-[104px] sm:left-6 w-10 h-10 rounded-full bg-white/90 border border-black/[0.06] backdrop-blur-sm text-ec-gold flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:bg-ec-gold hover:text-white transition-all duration-300"
          aria-label="Volver arriba"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function LandingPage() {
  const [selectedServices, setSelectedServices] = useState([]);
  const [vehicleType, setVehicleType] = useState("car");
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const addService = (service) => {
    setSelectedServices((prev) => {
      if (prev.some((s) => s.id === service.id)) return prev;
      return [...prev, service];
    });
  };

  const removeService = (id) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== id));
  };

  useEffect(() => {
    const handlePrefill = () => setIsChatOpen(true);
    window.addEventListener('prefill-bot', handlePrefill);
    return () => window.removeEventListener('prefill-bot', handlePrefill);
  }, []);

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
        <FinalCTA onOpenChat={() => setIsChatOpen(true)} />
      </main>

      {/* Booking Panel */}
      <BookingPanel
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        services={selectedServices}
        onRemoveService={removeService}
        vehicleType={vehicleType}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* Bot Chat */}
      <BotChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* Floating buttons */}
      <BookingFAB count={selectedServices.length} onClick={openBooking} />
      <BotFloatButton
        isOpen={isChatOpen}
        onClick={() => setIsChatOpen(!isChatOpen)}
        hasUnread={false}
      />
      <ScrollToTop />
    </div>
  );
}
