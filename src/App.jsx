import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AdminDashboard from "./components/admin/AdminDashboard";

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
        <div
          className="fixed inset-0 z-[200] bg-ec-cream"
          style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}
        >
          <AdminDashboard onClose={() => setAdminMode(false)} />
        </div>
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard onClose={() => { }} />} />
      </Routes>
    </Router>
  );
}

export default App;