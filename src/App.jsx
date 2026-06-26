import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import AdministrativeDashboard from "./pages/administrative/AdministrativeDashboard";
import AuditorDashboard from "./pages/auditor/AuditorDashboard";
import DirectorDashboard from "./pages/director/DirectorDashboard";
import ReviewDashboardPage from "./pages/review/ReviewDashboardPage";

function ProtectedRoute({ role, children }) {
  const activeRole = sessionStorage.getItem("role");
  const allowedRoles = Array.isArray(role) ? role : [role];
  const hasAccess = allowedRoles.some((allowedRole) =>
    allowedRole === activeRole || (allowedRole === "auditor" && String(activeRole || "").includes("auditor"))
  );

  if (!hasAccess) {
    return <Navigate to="/login" replace state={{ message: "Please sign in with the appropriate account to continue." }} />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/director/dashboard"
          element={<ProtectedRoute role="director"><DirectorDashboard /></ProtectedRoute>}
        />
        <Route
          path="/administrative/dashboard"
          element={<ProtectedRoute role="administrative"><AdministrativeDashboard /></ProtectedRoute>}
        />
        <Route
          path="/vice-chancellor/dashboard"
          element={<ProtectedRoute role="vice-chancellor"><ReviewDashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/iqac/dashboard"
          element={<ProtectedRoute role="iqac"><ReviewDashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/auditor/dashboard"
          element={<ProtectedRoute role="auditor"><AuditorDashboard /></ProtectedRoute>}
        />
        <Route
          path="/review/dashboard"
          element={<ProtectedRoute role={["vice-chancellor", "iqac"]}><ReviewDashboardPage /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
