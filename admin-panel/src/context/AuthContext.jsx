import { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🔥 admin OR staff object
  const [user, setUser] = useState(null);

  // 🔥 "admin" | "staff"
  const [userType, setUserType] = useState(null);

  const [loading, setLoading] = useState(true);

  // ⚠️ to avoid double verify after fresh login
  const loginSuccessfulRef = useRef(false);

  /* ======================================================
     🔁 VERIFY TOKEN ON APP LOAD / REFRESH
  ====================================================== */
  useEffect(() => {
    if (loginSuccessfulRef.current) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    const storedUserType = localStorage.getItem("userType");

    if (!token || !storedUserType) {
      setLoading(false);
      return;
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    verifyToken(storedUserType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyToken = async (type) => {
    try {
      setLoading(true);

      const res = await axios.get("/api/admin/verify");

      if (res.data.success) {
        setIsAuthenticated(true);
        setUser(res.data.user);
        setUserType(res.data.userType);
      } else {
        logout();
      }
    } catch (err) {
      console.error("Token verification failed:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  /* ======================================================
     🔐 LOGIN (ADMIN + STAFF — SAME API)
  ====================================================== */
  const login = async (credentials) => {
    try {
      setLoading(true);

      const response = await axios.post("/api/admin/login", credentials);

      if (!response.data.success) {
        setLoading(false);
        return {
          success: false,
          message: response.data.message || "Login failed",
        };
      }

      const { token, user } = response.data;

      // 🔥 save token + userType
      localStorage.setItem("token", token);
      localStorage.setItem("userType", user.userType);

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      loginSuccessfulRef.current = true;

      setIsAuthenticated(true);
      setUser(user);
      setUserType(user.userType);
      setLoading(false);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error("Login failed:", error);
      setLoading(false);

      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  /* ======================================================
     🚪 LOGOUT
  ====================================================== */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");

    delete axios.defaults.headers.common["Authorization"];

    setIsAuthenticated(false);
    setUser(null);
    setUserType(null);
    loginSuccessfulRef.current = false;
  };

  /* ======================================================
     CONTEXT PROVIDER
  ====================================================== */
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,       // 🔥 admin OR staff
        userType,  
        setUser, // 🔥 "admin" | "staff"
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
