// import { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { MdArrowBack, MdPerson } from "react-icons/md";

// const LIMIT = 10;

// const UserFollowing = () => {
//   const { userId } = useParams(); // userid
//   const navigate = useNavigate();
//   const topRef = useRef(null);

//   const [following, setFollowing] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [totalItems, setTotalItems] = useState(0);

//   useEffect(() => {
//     if (userId) {
//       fetchFollowing();
//     }
//   }, [userId]);

//   // Swapped: use "followers" API so correct data shows in Following tab (fixes backend swap)
//   const fetchFollowing = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get(`/api/users/admin/users/${userId}/following`);
//       const list = res.data.following || [];
//       setFollowing(list);
//       setTotalItems(list.length);
//     } catch (error) {
//       console.error("Error fetching following:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const totalPages = Math.max(1, Math.ceil(totalItems / LIMIT));
//   const start = (page - 1) * LIMIT;
//   const paginatedList = following.slice(start, start + LIMIT);

//   const handlePageChange = (newPage) => {
//     if (newPage < 1 || newPage > totalPages) return;
//     setPage(newPage);
//     if (topRef.current) {
//       topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
//     }
//   };

//   if (loading) {
//     return <div className="spinner" />;
//   }

//   return (
//     <div className="space-y-6" ref={topRef}>
//       {/* Header */}
//       <div className="flex items-center gap-4">
//         <button
//           onClick={() => navigate(-1)}
//           className="p-2 bg-dark-800 rounded"
//         >
//           <MdArrowBack className="text-white text-xl"  />
//         </button>

//         <h1 className="text-2xl font-bold text-white">
//           User Following
//         </h1>
//       </div>

//       {/* Following list */}
//       {paginatedList.length === 0 ? (
//         <div className="col-span-full w-full min-h-[60vh] flex flex-col items-center justify-center text-dark-400">
//                        <MdPerson className="text-4xl mb-3 opacity-60" />
//                        <p className="text-sm">Not following anyone</p>
//                      </div>
//       ) : (
//         <div className="space-y-3">
//           {paginatedList.map((user) => (
//             <div
//               key={user._id}
//               className="flex items-center gap-3 bg-dark-900 border border-dark-700 rounded-lg p-3"
//             >
//               {user.profilePicture ? (
//                 <img
//                   src={user.profilePicture}
//                   alt={user.username}
//                   className="w-10 h-10 rounded-full object-cover"
//                 />
//               ) : (
//                 <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
//                   <MdPerson className="text-white" />
//                 </div>
//               )}

//               <div>
//                 <p className="text-white font-medium">
//                   @{user.username}
//                 </p>
//                 {user.name && (
//                   <p className="text-xs text-dark-400">
//                     {user.name}
//                   </p>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Pagination - no loading between pages (smooth jump) */}
//       {totalPages > 1 && (
//         <div className="flex items-center justify-center gap-4 mt-6">
//           <button
//             disabled={page <= 1}
//             onClick={() => handlePageChange(page - 1)}
//             className="px-4 py-2 bg-dark-800 text-white rounded disabled:opacity-30 hover:bg-dark-700 transition-all"
//           >
//             Previous
//           </button>
//           <span className="text-sm text-dark-300">
//             Page <span className="text-white font-bold">{page}</span> of {totalPages}
//           </span>
//           <button
//             disabled={page >= totalPages}
//             onClick={() => handlePageChange(page + 1)}
//             className="px-4 py-2 bg-dark-800 text-white rounded disabled:opacity-30 hover:bg-dark-700 transition-all"
//           >
//             Next
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UserFollowing;


import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { MdArrowBack, MdPerson } from "react-icons/md";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LIMIT = 10;

const UserFollowing = () => {
  const { userId } = useParams(); // userid
  const navigate = useNavigate();
  const topRef = useRef(null);

  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchFollowing();
    }
  }, [userId]);

  // Swapped: use "followers" API so correct data shows in Following tab (fixes backend swap)
  const fetchFollowing = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/users/admin/users/${userId}/following`
      );
      const list = res.data.following || [];
      setFollowing(list);
      setTotalItems(list.length);
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / LIMIT));
  const start = (page - 1) * LIMIT;
  const paginatedList = following.slice(start, start + LIMIT);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div className="space-y-6" ref={topRef}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200"
        >
          <MdArrowBack className="text-black text-xl" />
        </button>

        <h1 className="text-2xl font-bold text-black">
          User Following
        </h1>
      </div>

      {/* Following list */}
      {paginatedList.length === 0 ? (
        <div className="col-span-full w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-500">
          <MdPerson className="text-4xl mb-3 opacity-60" />
          <p className="text-sm">Not following anyone</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedList.map((user) => (
            <div
              key={user._id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3"
            >
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
                  <MdPerson className="text-white" />
                </div>
              )}

              <div>
                <p className="text-black font-medium">
                  @{user.username}
                </p>
                {user.name && (
                  <p className="text-xs text-gray-500">
                    {user.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination - no loading between pages (smooth jump) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="px-4 py-2 bg-gray-100 text-black rounded disabled:opacity-30 hover:bg-gray-200 transition-all"
          >
            Previous
          </button>

          <span className="text-sm text-gray-600">
            Page <span className="text-black font-bold">{page}</span> of {totalPages}
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="px-4 py-2 bg-gray-100 text-black rounded disabled:opacity-30 hover:bg-gray-200 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserFollowing;
