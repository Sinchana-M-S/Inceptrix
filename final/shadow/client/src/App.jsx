import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CaregiverDashboard from "./pages/caregiver/Dashboard";
import LogActivity from "./pages/caregiver/LogActivity";
import MyScore from "./pages/caregiver/MyScore";
import VerifierDashboard from "./pages/verifier/Dashboard";
import LenderDashboard from "./pages/lender/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
};

// Role-based redirect
const RoleRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const routes = {
    caregiver: "/caregiver",
    verifier: "/verifier",
    lender: "/lender",
    admin: "/admin",
  };

  return <Navigate to={routes[user.role] || "/login"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role Redirect */}
          <Route path="/dashboard" element={<RoleRedirect />} />

          {/* Caregiver Routes */}
          <Route
            path="/caregiver"
            element={
              <ProtectedRoute roles={["caregiver"]}>
                <CaregiverDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/log"
            element={
              <ProtectedRoute roles={["caregiver"]}>
                <LogActivity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver/score"
            element={
              <ProtectedRoute roles={["caregiver"]}>
                <MyScore />
              </ProtectedRoute>
            }
          />

          {/* Verifier Routes */}
          <Route
            path="/verifier"
            element={
              <ProtectedRoute roles={["verifier"]}>
                <VerifierDashboard />
              </ProtectedRoute>
            }
          />

          {/* Lender Routes */}
          <Route
            path="/lender"
            element={
              <ProtectedRoute roles={["lender"]}>
                <LenderDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
