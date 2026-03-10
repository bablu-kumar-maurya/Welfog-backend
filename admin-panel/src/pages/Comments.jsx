// import { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import {
//   MdSearch,
//   MdDelete,
//   MdComment,
//   MdPlayArrow,
// } from 'react-icons/md';
// import toast from 'react-hot-toast';

// const Comments = () => {
//   const [comments, setComments] = useState([]);
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [initialLoading, setInitialLoading] = useState(true);
//   const LIMIT = 19;
//   const topRef = useRef(null);
//   const [confirmComment, setConfirmComment] = useState(null);

//   // 🔥 REEL MODAL STATE
//   const [selectedReel, setSelectedReel] = useState(null);
//   const [showReelModal, setShowReelModal] = useState(false);
//   const [reelLoading, setReelLoading] = useState(false);

//   // Reset page on search
//   useEffect(() => {
//     setPage(1);
//   }, [searchTerm]);

//   // Fetch comments
//   useEffect(() => {
//     fetchComments(page, searchTerm);
//   }, [page, searchTerm]);

//   // Scroll to top on page change
//   useEffect(() => {
//     topRef.current?.scrollIntoView({
//       behavior: 'smooth',
//       block: 'start',
//     });
//   }, [page]);

//   const fetchComments = async (pageNumber = 1, search = '') => {
//     try {
//       if (pageNumber === 1) setInitialLoading(true);

//       const res = await axios.get(
//         `/api/comment?page=${pageNumber}&limit=${LIMIT}&search=${search}`
//       );

//       setComments(res.data.comments || []);
//       setTotalPages(res.data.totalPages || 1);
//     } catch (error) {
//       console.error(error);
//       toast.error('Permission denied');
//     } finally {
//       setInitialLoading(false);
//     }
//   };

//   // Delete comment
// const handleDelete = async (comment) => {
//   try {
//     const userId = comment.user?._id; // ya logged-in userId

//     await axios.delete(
//       `/api/comment/delete/${comment._id}/${userId}`
//     );

//     toast.success("Comment deleted");
//     fetchComments(page, searchTerm);

//   } catch (error) {
//     toast.error("Permission denied");
//     console.error(error);
//   }
// };


//   // 🔥 OPEN REEL MODAL
//   const handleViewReel = async (reelId) => {
//     try {
//       setReelLoading(true);
//       const res = await axios.get(`/api/reels/current/${reelId}`);
//       setSelectedReel(res.data);
//       setShowReelModal(true);
//     } catch {
//       toast.error('Permission denied');
//     } finally {
//       setReelLoading(false);
//     }
//   };

//   return (
//     <div ref={topRef} className="space-y-6 animate-fadeIn">
//       {/* Header */}
//       <div>
//         <h1 className="text-3xl font-bold text-white mb-2">Comments</h1>
//         <p className="text-dark-400">Manage all comments</p>
//       </div>

//       {/* Search */}
//       <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
//         <div className="relative">
//           <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 text-xl" />
//           <input
//             type="text"
//             placeholder="Search comments..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white"
//           />
//         </div>
//       </div>

//       {/* Table */}
//       <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-x-auto">
//         <table className="w-full">
//           <thead className="bg-dark-800 border-b border-dark-700">
//             <tr>
//               <th className="px-6 py-4 text-left text-sm text-dark-400">Comment</th>
//               <th className="px-6 py-4 text-left text-sm text-dark-400">User</th>
//               <th className="px-6 py-4 text-left text-sm text-dark-400">Reel</th>
//               <th className="px-6 py-4 text-left text-sm text-dark-400">Likes</th>
//               <th className="px-6 py-4 text-left text-sm text-dark-400">Date</th>
//               <th className="px-6 py-4 text-left text-sm text-dark-400">Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             {comments.map((comment) => (
//               <tr key={comment._id} className="border-b border-dark-800 hover:bg-dark-800">
//                 <td className="px-6 py-4 text-white">
//                   <div className="flex gap-2">
//                     <MdComment className="text-primary-500 mt-1" />
//                     {comment.text}
//                   </div>
//                 </td>

//                 <td className="px-6 py-4 text-dark-300">
//                   {comment.user
//                     ? `@${comment.user.username || comment.user.name}`
//                     : 'Unknown'}
//                 </td>

//                 <td className="px-6 py-4">
//                   {comment.reel ? (
//                     <button
//                       onClick={() => handleViewReel(comment.reel._id)}
//                       className="flex items-center gap-1 text-blue-400 hover:underline text-sm"
//                     >
//                       <MdPlayArrow /> View Reel
//                     </button>
//                   ) : (
//                     <span className="text-dark-500">Deleted</span>
//                   )}
//                 </td>

//                 <td className="px-6 py-4 text-dark-300">
//                   {comment.likes?.length || 0}
//                 </td>

//                 <td className="px-6 py-4 text-dark-300">
//                   {new Date(comment.createdAt).toLocaleDateString()}
//                 </td>

//                 <td className="px-6 py-4">
//                   <button
//                     onClick={() => setConfirmComment(comment)}
//                     className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
//                   >
//                     <MdDelete />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         {initialLoading && (
//           <div className="flex justify-center py-10">
//             <div className="spinner" />
//           </div>
//         )}

//       {/* Empty state */}
// {!initialLoading && comments.length === 0 && (
//   <div className="flex items-center justify-center min-h-[60vh]">
//     <div className="flex flex-col items-center text-dark-400">
//       <MdComment className="text-5xl mb-3 opacity-60" />
//       <p className="text-sm">No comments found</p>
//     </div>
//   </div>
// )}

//       </div>

//       {/* Pagination */}
//       <div className="flex justify-center gap-4">
//         <button
//           disabled={page === 1}
//           onClick={() => setPage((p) => p - 1)}
//           className="px-4 py-2 bg-dark-700 text-white rounded disabled:opacity-50"
//         >
//           Previous
//         </button>

//         <span className="text-white">
//           Page {page} of {totalPages}
//         </span>

//         <button
//           disabled={page === totalPages}
//           onClick={() => setPage((p) => p + 1)}
//           className="px-4 py-2 bg-dark-700 text-white rounded disabled:opacity-50"
//         >
//           Next
//         </button>
//       </div>

//       {/* Delete Confirm */}
//       {confirmComment && (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//           <div className="bg-dark-900 border border-dark-700 rounded-lg p-5 w-[320px]">
//             <h3 className="text-white text-lg font-semibold mb-2">
//               Delete Comment?
//             </h3>
//             <p className="text-dark-400 text-sm mb-4">
//               This action cannot be undone.
//             </p>

//             <div className="flex justify-end gap-3">
//               <button
//                 onClick={() => setConfirmComment(null)}
//                 className="px-4 py-2 bg-dark-700 text-white rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => {
//                   handleDelete(confirmComment);
//                   setConfirmComment(null);
//                 }}
//                 className="px-4 py-2 bg-red-600 text-white rounded"
//               >
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* 🔥 REEL MODAL */}
//       {showReelModal && selectedReel && (
//         <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
//           <div className="bg-dark-900 w-[360px] rounded-xl overflow-hidden">
//             {reelLoading ? (
//               <div className="h-[420px] flex items-center justify-center">
//                 <div className="spinner" />
//               </div>
//             ) : (
//               <>
//                 <video
//                   src={selectedReel.videoUrl}
//                   controls
//                   autoPlay
//                   className="w-full h-[420px] object-cover"
//                 />
//                 <div className="p-3">
//                   <p className="text-white text-sm">
//                     {selectedReel.caption}
//                   </p>
//                   <button
//                     onClick={() => setShowReelModal(false)}
//                     className="mt-3 w-full py-2 bg-red-600 rounded text-white flex items-center justify-center gap-2"
//                   >
//                   Close
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

// export default Comments;



import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  MdSearch,
  MdDelete,
  MdComment,
  MdPlayArrow,
} from 'react-icons/md';
import toast from 'react-hot-toast';

const Comments = () => {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const LIMIT = 19;
  const topRef = useRef(null);
  const [confirmComment, setConfirmComment] = useState(null);
  const [selectedReel, setSelectedReel] = useState(null);
  const [showReelModal, setShowReelModal] = useState(false);
  const [reelLoading, setReelLoading] = useState(false);
  const [filters, setFilters] = useState({
  search: "",
  startDate: "",
  endDate: ""
});

useEffect(() => {
  fetchComments();
}, [page, filters]);

  useEffect(() => {
    topRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [page]);

const fetchComments = async () => {
  try {
    if (page === 1) setInitialLoading(true);

    const { search, startDate, endDate } = filters;

    const res = await axios.get(`/api/comment/admin-view`, {
      params: {
        page,
        limit: LIMIT,
        search,
        startDate,
        endDate
      }
    });

    setComments(res.data.comments || []);
    setTotalPages(res.data.totalPages || 1);
  } catch (error) {
    console.error(error);
    toast.error(error.response?.data?.message || 'Failed to fetch comments');
  } finally{
    setInitialLoading(false);
  }
};

const handleDelete = async (comment) => {
  try {
    const userId = comment.user?._id;

    await axios.delete(`/api/comment/admin_comment/delete/${comment._id}/${userId}`);

    toast.success("Comment deleted");

    // ✅ Correct call
    fetchComments();

  } catch (error) {
    console.error("Delete Error:", error);
    toast.error(error.response?.data?.message || "Failed to delete comment");
  }
};

  const handleFilterChange = (e) => {
  const { name, value } = e.target;

  setFilters(prev => ({
    ...prev,
    [name]: value
  }));

  setPage(1);
};

  const handleViewReel = async (reelId) => {
    try {
      setReelLoading(true);
      const res = await axios.get(`/api/reels/current/${reelId}`);
      setSelectedReel(res.data);
      setShowReelModal(true);
    } catch {
      toast.error('Permission denied');
    } finally {
      setReelLoading(false);
    }
  };

  return (
    <div
      ref={topRef}
      className="space-y-6 animate-fadeIn bg-white text-gray-900 p-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Comments
        </h1>
        <p className="text-gray-500">Manage all comments</p>
      </div>

      {/* Search */}
   {/* FILTER BAR */}
<div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">

  {/* Search */}
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase text-gray-400">Search</label>
    <input
      type="text"
      name="search"
      placeholder="Search comments..."
      value={filters.search}
      onChange={handleFilterChange}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48"
    />
  </div>

  {/* From */}
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
    <input
      type="date"
      name="startDate"
      value={filters.startDate}
      onChange={handleFilterChange}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
    />
  </div>

  {/* To */}
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase text-gray-400">To</label>
    <input
      type="date"
      name="endDate"
      value={filters.endDate}
      onChange={handleFilterChange}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
    />
  </div>

  {/* Reset */}
  <button
    onClick={() => {
      setFilters({
        search: "",
        startDate: "",
        endDate: ""
      });
      setPage(1);
    }}
    className="text-xs font-bold text-red-500 hover:text-red-700 pb-2"
  >
    Reset
  </button>

</div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Comment</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">User</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Reel</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Likes</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Date</th>
              <th className="px-6 py-4 text-left text-sm text-gray-600">Actions</th>
            </tr>
          </thead>

          <tbody>
            {comments.map((comment) => (
              <tr
                key={comment._id}
                className="border-b border-gray-200 hover:bg-gray-100"
              >
                <td className="px-6 py-4 text-gray-900">
                  <div className="flex gap-2">
                    <MdComment className="text-blue-500 mt-1" />
                    {comment.text}
                  </div>
                </td>

                <td className="px-6 py-4 text-gray-700">
                  {comment.user
                    ? `@${comment.user.username || comment.user.name}`
                    : 'Unknown'}
                </td>

                <td className="px-6 py-4">
                  {comment.reel ? (
                    <button
                      onClick={() => handleViewReel(comment.reel._id)}
                      className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                    >
                      <MdPlayArrow /> View Reel
                    </button>
                  ) : (
                    <span className="text-gray-400">Deleted</span>
                  )}
                </td>

                <td className="px-6 py-4 text-gray-700">
                  {comment.likes?.length || 0}
                </td>

                <td className="px-6 py-4 text-gray-700">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() => setConfirmComment(comment)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                  >
                    <MdDelete />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {initialLoading && (
          <div className="flex justify-center py-10">
            <div className="spinner" />
          </div>
        )}

        {!initialLoading && comments.length === 0 && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center text-gray-500">
              <MdComment className="text-5xl mb-3 opacity-60" />
              <p className="text-sm">No comments found</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-gray-800">
          Page {page} of {totalPages}
        </span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Delete Confirm */}
      {confirmComment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-200 rounded-lg p-5 w-[320px]">
            <h3 className="text-gray-900 text-lg font-semibold mb-2">
              Delete Comment?
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmComment(null)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete(confirmComment);
                  setConfirmComment(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 REEL MODAL */}
      {showReelModal && selectedReel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="bg-white w-[360px] rounded-xl overflow-hidden">
            {reelLoading ? (
              <div className="h-[420px] flex items-center justify-center">
                <div className="spinner" />
              </div>
            ) : (
              <>
                <video
                  src={selectedReel.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-[420px] object-cover"
                />
                <div className="p-3">
                  <p className="text-gray-900 text-sm">
                    {selectedReel.caption}
                  </p>
                  <button
                    onClick={() => setShowReelModal(false)}
                    className="mt-3 w-full py-2 bg-red-600 rounded text-white flex items-center justify-center gap-2"
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

export default Comments;
