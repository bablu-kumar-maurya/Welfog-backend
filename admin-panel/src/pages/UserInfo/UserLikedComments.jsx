// import { useEffect, useState, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import axios from "axios";
// import { MdArrowBack, MdFavorite } from "react-icons/md";
// import toast from "react-hot-toast";

// const LIMIT = 10;

// const UserLikedComments = () => {
//   const { userId } = useParams(); // userid
//   const navigate = useNavigate();
//   const topRef = useRef(null);

//   const [comments, setComments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [totalItems, setTotalItems] = useState(0);

//   // 🔥 REEL MODAL STATE
//   const [selectedReel, setSelectedReel] = useState(null);
//   const [showReelModal, setShowReelModal] = useState(false);
//   const [reelLoading, setReelLoading] = useState(false);

//   // ================= FETCH LIKED COMMENTS =================
//   useEffect(() => {
//     if (userId) {
//       fetchLikedComments();
//     }
//   }, [userId]);

//   const fetchLikedComments = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get(
//         `/api/comment/admin/users/${userId}/liked-comments`
//       );

//       const list = res.data.comments || [];
//       setComments(list);
//       setTotalItems(list.length);
//     } catch (error) {
//       console.error("Error fetching liked comments:", error);
//       toast.error("Failed to load liked comments");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ================= PAGINATION =================
//   const totalPages = Math.max(1, Math.ceil(totalItems / LIMIT));
//   const start = (page - 1) * LIMIT;
//   const paginatedList = comments.slice(start, start + LIMIT);

//   const handlePageChange = (newPage) => {
//     if (newPage < 1 || newPage > totalPages) return;
//     setPage(newPage);
//   };

//   // ================= SCROLL ON PAGE CHANGE =================
//   useEffect(() => {
//     topRef.current?.scrollIntoView({
//       behavior: "smooth",
//       block: "start",
//     });
//   }, [page]);

//   // ================= VIEW REEL (NO NAVIGATE) =================
//   const handleViewReel = async (reelId) => {
//     try {
//       setReelLoading(true);

//       const res = await axios.get(`/api/reels/current/${reelId}`);

//       setSelectedReel(res.data);
//       setShowReelModal(true);
//     } catch (err) {
//       console.error(err);
//       toast.error("Reel not available");
//     } finally {
//       setReelLoading(false);
//     }
//   };

//   // ================= LOADER =================
//   if (loading) {
//     return <div className="spinner" />;
//   }

//   // ================= UI =================
//   return (
//     <div className="space-y-6" ref={topRef}>
//       {/* Header */}
//       <div className="flex items-center gap-4">
//         <button
//           onClick={() => navigate(-1)}
//           className="p-2 bg-dark-800 text-white rounded hover:bg-dark-700 transition"
//         >
//           <MdArrowBack />
//         </button>

//         <h1 className="text-2xl font-bold text-white">
//           Liked Comments
//         </h1>
//       </div>

//       {/* Comments */}
//       {paginatedList.length === 0 ? (
//         <div className="col-span-full w-full min-h-[60vh] flex flex-col items-center justify-center text-dark-400">
//                  <MdFavorite className="text-4xl mb-3 opacity-50" />
//                  <p className="text-sm">No Liked Comments</p>
//                </div>
//       ) : (
//         <div className="space-y-4">
//           {paginatedList.map((comment) => (
//             <div
//               key={comment._id}
//               className="bg-dark-900 border border-dark-700 rounded-lg p-4"
//             >
//               <div className="flex items-center gap-2 mb-2">
//                 <MdFavorite className="text-red-400" />
//                 <span className="text-sm text-dark-400">
//                   {new Date(comment.createdAt).toLocaleString()}
//                 </span>
//               </div>

//               <p className="text-white">{comment.text}</p>

//               {/* 🔥 REEL INFO + MODAL OPEN */}
//               {comment.reel && (
//                 <div className="mt-2 space-y-1">
//                   <p className="text-xs text-dark-400">
//                     On Reel: {comment.reel.caption}
//                   </p>

//                   <button
//                     onClick={() => handleViewReel(comment.reel._id)}
//                     className="text-xs text-blue-400 hover:underline"
//                   >
//                     View Reel
//                   </button>
//                 </div>
//               )}

//               {comment.user && (
//                 <p className="text-xs text-dark-400 mt-1">
//                   Comment by @{comment.user.username}
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Pagination */}
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
//             Page <span className="text-white font-bold">{page}</span> of{" "}
//             {totalPages}
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

//       {/* ================= REEL MODAL ================= */}
//       {showReelModal && selectedReel && (
//         <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
//           <div className="bg-dark-900 w-[360px] rounded-xl overflow-hidden">

//             {reelLoading ? (
//               <div className="h-[420px] flex items-center justify-center">
//                 <div className="spinner" />
//               </div>
//             ) : (
//               <>
//                 {/* VIDEO */}
//                 <video
//                   src={selectedReel.videoUrl}
//                   controls
//                   autoPlay
//                   className="w-full h-[420px] object-cover"
//                 />

//                 {/* INFO */}
//                 <div className="p-3 space-y-2">
//                   <p className="text-white text-sm">
//                     {selectedReel.caption}
//                   </p>

//                   <button
//                     onClick={() => setShowReelModal(false)}
//                     className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </>
//             )}

//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UserLikedComments;


import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { MdArrowBack, MdFavorite } from "react-icons/md";
import toast from "react-hot-toast";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LIMIT = 10;

const UserLikedComments = () => {
  const { userId } = useParams(); // userid
  const navigate = useNavigate();
  const topRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // 🔥 REEL MODAL STATE
  const [selectedReel, setSelectedReel] = useState(null);
  const [showReelModal, setShowReelModal] = useState(false);
  const [reelLoading, setReelLoading] = useState(false);

  // ================= FETCH LIKED COMMENTS =================
  useEffect(() => {
    if (userId) {
      fetchLikedComments();
    }
  }, [userId]);

  const fetchLikedComments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/comment/admin/users/${userId}/liked-comments`
      );

      const list = res.data.comments || [];
      setComments(list);
      setTotalItems(list.length);
    } catch (error) {
      console.error("Error fetching liked comments:", error);
      toast.error("Failed to load liked comments");
    } finally {
      setLoading(false);
    }
  };

  // ================= PAGINATION =================
  const totalPages = Math.max(1, Math.ceil(totalItems / LIMIT));
  const start = (page - 1) * LIMIT;
  const paginatedList = comments.slice(start, start + LIMIT);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  // ================= SCROLL ON PAGE CHANGE =================
  useEffect(() => {
    topRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [page]);

  // ================= VIEW REEL (NO NAVIGATE) =================
  const handleViewReel = async (reelId) => {
    try {
      setReelLoading(true);

      const res = await axios.get(`${API_BASE_URL}/api/reels/current/${reelId}`);

      setSelectedReel(res.data);
      setShowReelModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Reel not available");
    } finally {
      setReelLoading(false);
    }
  };

  // ================= LOADER =================
  if (loading) {
    return <div className="spinner" />;
  }

  // ================= UI =================
  return (
    <div className="space-y-6" ref={topRef}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-gray-100 text-black rounded hover:bg-gray-200 transition"
        >
          <MdArrowBack />
        </button>

        <h1 className="text-2xl font-bold text-black">
          Liked Comments
        </h1>
      </div>

      {/* Comments */}
      {paginatedList.length === 0 ? (
        <div className="col-span-full w-full min-h-[60vh] flex flex-col items-center justify-center text-gray-500">
          <MdFavorite className="text-4xl mb-3 opacity-50" />
          <p className="text-sm">No Liked Comments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedList.map((comment) => (
            <div
              key={comment._id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <MdFavorite className="text-red-500" />
                <span className="text-sm text-gray-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-black">{comment.text}</p>

              {/* 🔥 REEL INFO + MODAL OPEN */}
              {comment.reel && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    On Reel: {comment.reel.caption}
                  </p>

                  <button
                    onClick={() => handleViewReel(comment.reel._id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View Reel
                  </button>
                </div>
              )}

              {comment.user && (
                <p className="text-xs text-gray-500 mt-1">
                  Comment by @{comment.user.username}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
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
            Page <span className="text-black font-bold">{page}</span> of{" "}
            {totalPages}
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

      {/* ================= REEL MODAL ================= */}
      {showReelModal && selectedReel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-white w-[360px] rounded-xl overflow-hidden">

            {reelLoading ? (
              <div className="h-[420px] flex items-center justify-center">
                <div className="spinner" />
              </div>
            ) : (
              <>
                {/* VIDEO */}
                <video
                  src={selectedReel.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-[420px] object-cover"
                />

                {/* INFO */}
                <div className="p-3 space-y-2">
                  <p className="text-black text-sm">
                    {selectedReel.caption}
                  </p>

                  <button
                    onClick={() => setShowReelModal(false)}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white"
                  >
                    Close
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default UserLikedComments;
