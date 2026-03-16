// import { createContext, useContext, useState, useEffect, useRef } from "react";
// import axios from "axios";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// const AuthContext = createContext();

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used within AuthProvider");
//   }
//   return context;
// };

// export const AuthProvider = ({ children }) => {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   // 🔥 admin OR staff object
//   const [user, setUser] = useState(null);

//   // 🔥 "admin" | "staff"
//   const [userType, setUserType] = useState(null);

//   const [loading, setLoading] = useState(true);

//   // ⚠️ to avoid double verify after fresh login
//   const loginSuccessfulRef = useRef(false);

//   /* ======================================================
//      🔁 VERIFY TOKEN ON APP LOAD / REFRESH
//   ====================================================== */
//   useEffect(() => {
//     if (loginSuccessfulRef.current) {
//       setLoading(false);
//       return;
//     }

//     const token = localStorage.getItem("token");
//     const storedUserType = localStorage.getItem("userType");

//     if (!token || !storedUserType) {
//       setLoading(false);
//       return;
//     }

//     axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

//     verifyToken(storedUserType);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const verifyToken = async (type) => {
//     try {
//       setLoading(true);
        
//       const res = await axios.get(`${API_BASE_URL}/api/admin/verify`);

//       if (res.data.success) {
//         setIsAuthenticated(true);
//         setUser(res.data.user);
//         setUserType(res.data.userType);
//       } else {
//         logout();
//       }
//     } catch (err) {
//       console.error("Token verification failed:", err);
//       logout();
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ======================================================
//      🔐 LOGIN (ADMIN + STAFF — SAME API)
//   ====================================================== */
//   const login = async (credentials) => {
//     try {
//       setLoading(true);

//       const response = await axios.post(`${API_BASE_URL}/api/admin/login`, credentials);

//       if (!response.data.success) {
//         setLoading(false);
//         return {
//           success: false,
//           message: response.data.message || "Login failed",
//         };
//       }

//       const { token, user } = response.data;

//       // 🔥 save token + userType
//       localStorage.setItem("token", token);
//       localStorage.setItem("userType", user.userType);

//       axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

//       loginSuccessfulRef.current = true;

//       setIsAuthenticated(true);
//       setUser(user);
//       setUserType(user.userType);
//       setLoading(false);

//       return {
//         success: true,
//         user,
//       };
//     } catch (error) {
//       console.error("Login failed:", error);
//       setLoading(false);

//       return {
//         success: false,
//         message: error.response?.data?.message || "Login failed",
//       };
//     }
//   };

//   /* ======================================================
//      🚪 LOGOUT
//   ====================================================== */
//   const logout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("userType");

//     delete axios.defaults.headers.common["Authorization"];

//     setIsAuthenticated(false);
//     setUser(null);
//     setUserType(null);
//     loginSuccessfulRef.current = false;
//   };

//   /* ======================================================
//      CONTEXT PROVIDER
//   ====================================================== */
//   return (
//     <AuthContext.Provider
//       value={{
//         isAuthenticated,
//         user,       // 🔥 admin OR staff
//         userType,  
//         setUser, // 🔥 "admin" | "staff"
//         loading,
//         login,
//         logout,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };


import { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  const loginSuccessfulRef = useRef(false);
  const isRefreshing = useRef(false);

  /* ======================================================
     VERIFY TOKEN ON APP LOAD
  ====================================================== */

  useEffect(() => {

    const accessToken = localStorage.getItem("accessToken");
    const storedUserType = localStorage.getItem("userType");

    if (!accessToken || !storedUserType) {
      setLoading(false);
      return;
    }

    axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    verifyToken();

  }, []);

  const verifyToken = async () => {

    try {

      const res = await axios.get("http://localhost:4000/api/admin/verify");

      if (res.data.success) {

        setIsAuthenticated(true);
        setUser(res.data.user);
        setUserType(res.data.userType);

      } else {

        logout();

      }

    } catch (err) {

      logout();

    } finally {

      setLoading(false);

    }

  };

  /* ======================================================
     AXIOS AUTO REFRESH TOKEN
  ====================================================== */

  useEffect(() => {

    const interceptor = axios.interceptors.response.use(

      (response) => response,

      async (error) => {

        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes("/refresh")
        ) {

          originalRequest._retry = true;

          const refreshToken = localStorage.getItem("refreshToken");

          if (!refreshToken) {
            logout();
            return Promise.reject(error);
          }

          if (isRefreshing.current) {
            return Promise.reject(error);
          }

          isRefreshing.current = true;

          try {

            const res = await axios.post(
              "http://localhost:4000/api/admin/refresh",
              { refreshToken }
            );

            const { accessToken, refreshToken: newRefreshToken } = res.data;

            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", newRefreshToken);

            axios.defaults.headers.common["Authorization"] =
              `Bearer ${accessToken}`;

            originalRequest.headers["Authorization"] =
              `Bearer ${accessToken}`;

            isRefreshing.current = false;

            return axios(originalRequest);

          } catch (err) {

            isRefreshing.current = false;
            logout();
            return Promise.reject(err);

          }

        }

        return Promise.reject(error);

      }

    );

    return () => axios.interceptors.response.eject(interceptor);

  }, []);

  /* ======================================================
     LOGIN
  ====================================================== */

  const login = async (credentials) => {

    try {

      setLoading(true);

      const response = await axios.post(
        "http://localhost:4000/api/admin/login",
        credentials
      );

      if (!response.data.success) {

        setLoading(false);

        return {
          success: false,
          message: response.data.message || "Login failed",
        };

      }

      const { accessToken, refreshToken, user } = response.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userType", user.userType);

      axios.defaults.headers.common["Authorization"] =
        `Bearer ${accessToken}`;

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

      setLoading(false);

      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };

    }

  };

  /* ======================================================
     LOGOUT
  ====================================================== */

  const logout = () => {

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userType");

    delete axios.defaults.headers.common["Authorization"];

    setIsAuthenticated(false);
    setUser(null);
    setUserType(null);

    loginSuccessfulRef.current = false;

  };

  /* ======================================================
     PROVIDER
  ====================================================== */

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        userType,
        setUser,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};
