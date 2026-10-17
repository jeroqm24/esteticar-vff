import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";

const PortfolioPage = lazy(() => import("./components/PortfolioPage"));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard"));

function App() {
  const [adminMode, setAdminMode] = useState(false);

  useEffect(() => {
    const openAdmin = () => setAdminMode(true);
    window.addEventListener('open-admin', openAdmin);
    return () => window.removeEventListener('open-admin', openAdmin);
  }, []);

  return (
    <Router>
      {adminMode && (
        <div className="fixed inset-0 z-[200] bg-ec-cream overflow-hidden">
          <Suspense fallback={null}>
            <AdminDashboard onClose={() => setAdminMode(false)} />
          </Suspense>
        </div>
      )}
      <Suspense fallback={<div className="fixed inset-0 bg-ec-cream" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/portafolio" element={<PortfolioPage />} />
        <Route path="/admin" element={
          <div className="fixed inset-0 bg-ec-cream overflow-hidden">
            <AdminDashboard onClose={() => { }} />
          </div>
        } />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;