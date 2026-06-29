/* ─────────────────────────────────────────────
 *  App — auth gate + routing
 *
 *  AuthProvider forces Keycloak login before anything
 *  renders. Routes:
 *    /                  → instance list
 *    /instance/:id      → editor for one instance
 * ───────────────────────────────────────────── */

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import { Footer } from "./Footer";
import InstanceList from "../pages/InstanceList";
import InstanceEditor from "../pages/InstanceEditor";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<InstanceList />} />
        <Route path="/instance/:publicId" element={<InstanceEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </AuthProvider>
  );
}
