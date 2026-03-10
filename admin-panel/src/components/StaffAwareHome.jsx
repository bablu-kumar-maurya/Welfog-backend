import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StaffAwareHome = () => {
  const { user, userType, loading } = useAuth();

  if (loading) return null;
  if (userType === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const p = user?.permissions || [];

  if (p.includes("VIEW_USERS")) {
    return <Navigate to="/users" replace />;
  }

  if (p.includes("VIEW_REELS")) {
    return <Navigate to="/reels" replace />;
  }

 if (p.includes("VIEW_MUSIC")) {
    return <Navigate to="/music" replace />;
  }

  if (p.includes("VIEW_COMMENTS")) {
    return <Navigate to="/comments" replace />;
  }

  if (p.includes("VIEW_NOTIFICATIONS")) {
    return <Navigate to="/notifications" replace />;
  }
   if (p.includes("VIEW_STAFFS")) {
    return <Navigate to="/staffs" replace />;
  }
    if (p.includes("VIEW_SETTINGS")) {
    return <Navigate to="/settings" replace />;
  }


  // ❌ kuch bhi allowed nahi
  return <Navigate to="/unauthorized" replace />;
};

export default StaffAwareHome;
