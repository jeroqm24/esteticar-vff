// Sin "Mantener sesión iniciada", la sesión del admin dura hasta cerrar el navegador.
// Debe importarse antes que cualquier createClient, que lee la sesión al iniciar.
try {
  if (localStorage.getItem("ec_remember") === "false" && !sessionStorage.getItem("ec_session_alive")) {
    Object.keys(localStorage).filter(k => k.startsWith("sb-")).forEach(k => localStorage.removeItem(k));
  }
} catch { /* almacenamiento bloqueado: no hay sesión que limpiar */ }
