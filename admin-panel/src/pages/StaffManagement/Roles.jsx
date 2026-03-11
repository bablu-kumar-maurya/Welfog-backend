// import { useEffect, useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import { MdAdd, MdDelete, MdEdit } from "react-icons/md";
// import toast from "react-hot-toast";

// const api = axios.create({
//   baseURL: "http://localhost:4000",
//   withCredentials: true,
// });

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers = config.headers || {};
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// const PER_PAGE = 10;

// const Roles = () => {
//   const navigate = useNavigate();
//   const topRef = useRef(null);

//   const [roles, setRoles] = useState([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [page, setPage] = useState(1);

//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [roleToDelete, setRoleToDelete] = useState(null);

//   // ================= FETCH ROLES =================
//   const fetchRoles = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/api/roles");
//       setRoles(Array.isArray(res.data) ? res.data : []);
//     } catch {
//       toast.error("Permission denied");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchRoles();
//   }, []);

//   // ================= DELETE =================
//   const openDeleteModal = (id) => {
//     setRoleToDelete(id);
//     setShowDeleteModal(true);
//   };

//   const closeDeleteModal = () => {
//     setRoleToDelete(null);
//     setShowDeleteModal(false);
//   };

//   const deleteRole = async () => {
//     try {
//       await api.delete(`/api/roles/${roleToDelete}`);
//       toast.success("Role deleted successfully");
//       setRoles((prev) => prev.filter((r) => r._id !== roleToDelete));
//       closeDeleteModal();
//     } catch {
//       toast.error("Permission denied");
//     }
//   };

//   // ================= FILTER =================
//   const filteredRoles = roles.filter((r) =>
//     r.name.toLowerCase().includes(search.toLowerCase())
//   );

//   // ================= PAGINATION =================
//   const totalPages = Math.max(
//     1,
//     Math.ceil(filteredRoles.length / PER_PAGE)
//   );

//   const startIndex = (page - 1) * PER_PAGE;
//   const paginatedRoles = filteredRoles.slice(
//     startIndex,
//     startIndex + PER_PAGE
//   );

//   const goPrev = () => page > 1 && setPage((p) => p - 1);
//   const goNext = () => page < totalPages && setPage((p) => p + 1);

//   useEffect(() => {
//     if (topRef.current) {
//       topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
//     }
//   }, [page]);

//   useEffect(() => {
//     setPage(1);
//   }, [search]);

//   // ================= UI =================
//   return (
//     <>
//       <div ref={topRef} className="space-y-6 animate-fadeIn">
//         {/* HEADER */}
//         <div className="flex justify-between items-start">
//           <div>
//             <h1 className="text-2xl font-bold text-white">All Roles</h1>
//             <p className="text-sm text-dark-400 mt-1">
//               Manage all roles ({filteredRoles.length})
//             </p>
//           </div>

//           <button
//             onClick={() => navigate("/roles/create")}
//             className="bg-primary-600 hover:bg-primary-700 px-5 py-2 rounded-lg text-white flex items-center gap-2"
//           >
//             <MdAdd size={18} />
//             Add New Role
//           </button>
//         </div>

//         {/* SEARCH */}
//         <div className="bg-dark-900 p-4 rounded-xl border border-dark-700">
//           <input
//             placeholder="Search by role name..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full p-3 bg-dark-800 text-white rounded-lg border border-dark-700 outline-none"
//           />
//         </div>

//         {/* TABLE */}
//         <div className="bg-dark-900 border border-dark-700 rounded-xl">
//           {/* TABLE HEADER */}
//           <div className="grid grid-cols-12 p-4 text-sm font-semibold text-dark-400 border-b border-dark-700">
//             <div className="col-span-1">S/N</div>
//             <div className="col-span-7 text-center">Name</div>
//             <div className="col-span-4 text-right">Options</div>
//           </div>

//           {/* TABLE BODY */}
//           {loading ? (
//             <p className="text-dark-400 p-6 text-center">Loading roles...</p>
//           ) : paginatedRoles.length === 0 ? (
//             <p className="text-dark-400 p-6 text-center">No roles found</p>
//           ) : (
//             paginatedRoles.map((role, index) => (
//               <div
//                 key={role._id}
//                 className="grid grid-cols-12 items-center p-4 border-b border-dark-700 last:border-b-0"
//               >
//                 {/* S/N */}
//                 <div className="col-span-1 text-white">
//                   {(page - 1) * PER_PAGE + index + 1}
//                 </div>

//                 {/* NAME */}
//                 <div className="col-span-7 text-center">
//                   <p className="text-white font-medium">{role.name}</p>
//                   <p className="text-xs text-dark-400">
//                     {role.permissions?.length || 0} permissions
//                   </p>
//                 </div>

//                 {/* OPTIONS */}
//                 <div className="col-span-4 flex justify-end gap-4">
//                   <button
//                     onClick={() => navigate(`/roles/edit/${role._id}`)}
//                     className="text-blue-400 hover:text-blue-300"
//                   >
//                     <MdEdit size={20} />
//                   </button>

//                   <button
//                     onClick={() => openDeleteModal(role._id)}
//                     className="text-red-400 hover:text-red-300"
//                   >
//                     <MdDelete size={20} />
//                   </button>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>

//         {/* PAGINATION */}
//         <div className="flex justify-center items-center gap-6 pt-4">
//           <button
//             onClick={goPrev}
//             disabled={page === 1}
//             className="px-5 py-2 bg-dark-800 text-white rounded disabled:opacity-40"
//           >
//             Previous
//           </button>

//           <span className="text-sm text-dark-300">
//             Page {page} of {totalPages}
//           </span>

//           <button
//             onClick={goNext}
//             disabled={page === totalPages}
//             className="px-5 py-2 bg-dark-800 text-white rounded disabled:opacity-40"
//           >
//             Next
//           </button>
//         </div>
//       </div>

//       {/* DELETE MODAL */}
//       {showDeleteModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
//           <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 w-full max-w-sm">
//             <h2 className="text-lg font-semibold text-white mb-2">
//               Delete Role
//             </h2>
//             <p className="text-sm text-dark-400 mb-6">
//               Are you sure you want to delete this role?
//             </p>

//             <div className="flex justify-end gap-3">
//               <button
//                 onClick={closeDeleteModal}
//                 className="px-4 py-2 bg-dark-800 text-white rounded"
//               >
//                 No
//               </button>
//               <button
//                 onClick={deleteRole}
//                 className="px-4 py-2 bg-red-600 text-white rounded"
//               >
//                 Yes, Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default Roles;


import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MdAdd, MdDelete, MdEdit } from "react-icons/md";
import toast from "react-hot-toast";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const api = axios.create({
  baseURL: `${API_BASE_URL}`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PER_PAGE = 10;

const Roles = () => {
  const navigate = useNavigate();
  const topRef = useRef(null);

  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");

  // 🔥 NEW DATE FILTER STATES
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // ================= FETCH ROLES =================
  const fetchRoles = async () => {
  try {
    setLoading(true);
    const res = await api.get(`${API_BASE_URL}/api/roles`);

    setRoles(Array.isArray(res.data.roles) ? res.data.roles : []);

  } catch {
    toast.error("Permission denied");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRoles();
  }, []);

  // ================= DELETE =================
  const openDeleteModal = (id) => {
    setRoleToDelete(id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setRoleToDelete(null);
    setShowDeleteModal(false);
  };

  const deleteRole = async () => {
    try {
      await api.delete(`${API_BASE_URL}/api/roles/${roleToDelete}`);
      toast.success("Role deleted successfully");
      setRoles((prev) => prev.filter((r) => r._id !== roleToDelete));
      closeDeleteModal();
    } catch {
      toast.error("Permission denied");
    }
  };

  // ================= FILTER =================
 const filteredRoles = roles.filter((r) => {
  const matchesSearch = r.name
    .toLowerCase()
    .includes(search.toLowerCase());

  // If no createdAt, allow it
  if (!r.createdAt) {
    return matchesSearch;
  }

  const roleDate = new Date(r.createdAt);

  // Normalize role date (remove time)
  const roleDay = new Date(
    roleDate.getFullYear(),
    roleDate.getMonth(),
    roleDate.getDate()
  );

  let matchesStart = true;
  let matchesEnd = true;

  if (startDate) {
    const start = new Date(startDate);
    matchesStart = roleDay >= start;
  }

  if (endDate) {
    const end = new Date(endDate);
    matchesEnd = roleDay <= end;
  }

  return matchesSearch && matchesStart && matchesEnd;
});

  // ================= PAGINATION =================
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRoles.length / PER_PAGE)
  );

  const startIndex = (page - 1) * PER_PAGE;
  const paginatedRoles = filteredRoles.slice(
    startIndex,
    startIndex + PER_PAGE
  );

  const goPrev = () => page > 1 && setPage((p) => p - 1);
  const goNext = () => page < totalPages && setPage((p) => p + 1);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [page]);

  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  return (
    <>
      <div
        ref={topRef}
        className="space-y-6 animate-fadeIn bg-white text-gray-900 p-4 md:p-6"
      >
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              All Roles
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage all roles ({filteredRoles.length})
            </p>
          </div>

          <button
            onClick={() => navigate("/roles/create")}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-white flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <MdAdd size={20} />
            <span>Add New Role</span>
          </button>
        </div>

        {/* SEARCH */}
        <div className="bg-white p-2 md:p-4 rounded-xl border border-gray-200">
          <input
            placeholder="Search by role name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 bg-white text-gray-900 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* 🔥 DATE FILTER UI */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />

          <button
            onClick={() => {
              setSearch("");
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
            className="text-xs font-bold text-red-500"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="hidden md:grid grid-cols-12 p-4 text-sm font-semibold text-gray-600 border-b border-gray-200 bg-gray-50">
            <div className="col-span-1">S/N</div>
            <div className="col-span-7 text-center">Name</div>
            <div className="col-span-4 text-right">Options</div>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <p className="text-gray-500 p-10 text-center">
                Loading roles...
              </p>
            ) : paginatedRoles.length === 0 ? (
              <p className="text-gray-500 p-10 text-center">
                No roles found
              </p>
            ) : (
              paginatedRoles.map((role, index) => (
                <div
                  key={role._id}
                  className="flex flex-col md:grid md:grid-cols-12 items-start md:items-center p-4 hover:bg-gray-50 transition-colors gap-3 md:gap-0"
                >
                  <div className="md:col-span-1 text-gray-900 font-medium">
                    {(page - 1) * PER_PAGE + index + 1}
                  </div>

                  <div className="md:col-span-7 w-full md:text-center">
                    <p className="text-gray-900 font-semibold md:font-medium">
                      {role.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {role.permissions?.length || 0} permissions
                    </p>
                  </div>

                  <div className="md:col-span-4 w-full flex justify-end items-center gap-6">
                    <button
                      onClick={() => navigate(`/roles/edit/${role._id}`)}
                      className="text-blue-600"
                    >
                      <MdEdit size={22} />
                    </button>

                    <button
                      onClick={() => openDeleteModal(role._id)}
                      className="text-red-600"
                    >
                      <MdDelete size={22} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center items-center gap-4 pt-4">
          <button
            onClick={goPrev}
            disabled={page === 1}
            className="px-5 py-2 bg-gray-100 text-gray-800 rounded-lg disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm font-medium text-gray-600">
            Page {page} of {totalPages}
          </span>

          <button
            onClick={goNext}
            disabled={page === totalPages}
            className="px-5 py-2 bg-gray-100 text-gray-800 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Delete Role
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this role?
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-800 rounded-lg"
              >
                No
              </button>
              <button
                onClick={deleteRole}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Roles;