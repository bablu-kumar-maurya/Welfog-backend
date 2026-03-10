// import { useAuth } from '../context/AuthContext';
// import { MdLogout, MdAccountCircle } from 'react-icons/md';
// import toast from 'react-hot-toast';
// import { useNavigate } from 'react-router-dom';

// const Navbar = () => {
//   const { user, userType, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     toast.success('Logged out successfully');
//     navigate('/login');
//   };

//   return (
//     <nav className="bg-dark-900 border-b border-dark-700 px-6 py-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-xl font-semibold text-white">
//             Welcome back, {user?.username || user?.name || 'Admin'}
//           </h2>
//           <p className="text-sm text-dark-400">
//             Manage your platform efficiently
//           </p>
//         </div>

//         <div className="flex items-center gap-4">
//           <div className="flex items-center gap-3 px-4 py-2 bg-dark-800 rounded-lg border border-dark-700">
//             <MdAccountCircle className="text-2xl text-primary-500" />
//             <div>
//               <p className="text-sm font-medium text-white">
//                 {user?.username || user?.name || 'Admin'}
//               </p>
//               <p className="text-xs text-dark-400">
//                 {userType === 'staff' ? 'Staff' : 'Administrator'}
//               </p>
//             </div>
//           </div>

//           <button
//             onClick={handleLogout}
//             className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
//           >
//             <MdLogout className="text-lg" />
//             <span className="font-medium">Logout</span>
//           </button>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;


// import { useAuth } from '../context/AuthContext';
// import { MdLogout, MdAccountCircle } from 'react-icons/md';
// import toast from 'react-hot-toast';
// import { useNavigate } from 'react-router-dom';

// const Navbar = () => {
//   const { user, userType, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     toast.success('Logged out successfully');
//     navigate('/login');
//   };

//   return (
//     <nav className="bg-white border-b border-gray-300 px-4 md:px-6 py-4 md:py-6">
//       <div className="flex items-center justify-between gap-4">
//         {/* Left Side: Welcome Text */}
//         <div className="min-w-0">
//           <h2 className="text-lg md:text-xl font-semibold text-black truncate">
//             Welcome Back, {user?.username || user?.name || 'Admin'}
//           </h2>
//           <p className="text-xs md:text-sm text-gray-600 truncate hidden sm:block">
//             Manage your platform efficiently
//           </p>
//         </div>

//         {/* Right Side: Profile & Logout */}
//         <div className="flex items-center gap-2 md:gap-4 shrink-0">
//           {/* Profile Box - Hidden on very small screens, visible from 'sm' up */}
//           <div className="hidden sm:flex items-center gap-3 px-3 md:px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
//             <MdAccountCircle className="text-xl md:text-2xl text-blue-600" />
//             <div className="text-left">
//               <p className="text-xs md:text-sm font-medium text-black truncate max-w-[100px]">
//                 {user?.username || user?.name || 'Admin'}
//               </p>
//               <p className="text-[10px] md:text-xs text-gray-600">
//                 {userType === 'staff' ? 'Staff' : 'Admin'}
//               </p>
//             </div>
//           </div>

//           {/* Simple Icon for Profile on extra small screens */}
//           <div className="sm:hidden p-2 bg-gray-100 rounded-lg border border-gray-300">
//             <MdAccountCircle className="text-xl text-blue-600" />
//           </div>

//           {/* Logout Button - Icon only on mobile, Text + Icon on desktop */}
//           <button
//             onClick={handleLogout}
//             className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 shadow-sm"
//             title="Logout"
//           >
//             <MdLogout className="text-lg md:text-xl" />
//             <span className="font-medium hidden md:inline">Logout</span>
//           </button>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;


import { useAuth } from "../context/AuthContext";
import { MdLogout, MdAccountCircle } from "react-icons/md";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = "http://localhost:4000";

const Navbar = () => {
  const { user, userType, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    image: null,
  });
  const [preview, setPreview] = useState(null);

  /* ================= DISPLAY NAME FIX ================= */
  const displayName = user?.name || user?.username || "Admin";

  /* ================= SYNC USER ================= */
  useEffect(() => {
    if (user) {
      setFormData({
        name: user?.name || user?.username || "",
        email: user?.email || "",
        image: null,
      });
      setPreview(user?.profileImage || null);
    }
  }, [user]);

  /* ================= LOGOUT ================= */
  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  /* ================= SAVE PROFILE ================= */
  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("email", formData.email);

      if (formData.image) {
        data.append("image", formData.image);
      }

      const token = localStorage.getItem("token");

      const res = await axios.put(
        "/api/admin/update-profile",
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        setUser(res.data.user);
        toast.success("Profile updated successfully");
        setIsEditOpen(false);
      } else {
        toast.error(res.data.message || "Update failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  /* ================= REMOVE IMAGE ================= */
  const handleRemoveImage = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        "/api/admin/remove-profile-image",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPreview(null);
      setUser({ ...user, profileImage: null });

      toast.success("Profile image removed");
    } catch (err) {
      toast.error("Failed to remove image");
    }
  };

  /* ================= IMAGE URL HANDLER ================= */
  const getImageUrl = (img) => {
    if (!img) return null;
    if (img.startsWith("blob:")) return img;
    return `${BACKEND_URL}${img}`;
  };

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <nav className="bg-white border-b border-gray-300 px-4 md:px-6 py-4 md:py-6">
        <div className="flex items-center justify-between gap-4">

          {/* LEFT */}
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-semibold text-black truncate">
              Welcome Back, {displayName}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 hidden sm:block">
              Manage your platform efficiently
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">

            {/* Desktop Profile */}
            <div
              onClick={() => setIsEditOpen(true)}
              className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-200 transition"
            >
              {user?.profileImage ? (
                <img
                  src={getImageUrl(user.profileImage)}
                  alt="profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <MdAccountCircle className="text-2xl text-blue-600" />
              )}

              <div>
                <p className="text-sm font-medium text-black">
                  {displayName}
                </p>
                <p className="text-xs text-gray-600">
                  {userType === "staff" ? "Staff" : "Admin"}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <MdLogout />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ================= EDIT MODAL ================= */}
      {isEditOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>

            {/* Image Preview */}
            <div className="flex flex-col items-center mb-4">
              {preview ? (
                <img
                  src={getImageUrl(preview)}
                  className="w-24 h-24 rounded-full object-cover mb-2"
                  alt="preview"
                />
              ) : (
                <MdAccountCircle className="text-6xl text-gray-400 mb-2" />
              )}

              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setFormData({ ...formData, image: file });
                    setPreview(URL.createObjectURL(file));
                  }
                }}
              />

              {preview && (
                <button
                  onClick={handleRemoveImage}
                  className="text-red-500 text-sm mt-1"
                >
                  Remove Image
                </button>
              )}
            </div>

            {/* Name */}
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border px-3 py-2 rounded-md mb-3"
            />

            {/* Email */}
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full border px-3 py-2 rounded-md mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-3 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;