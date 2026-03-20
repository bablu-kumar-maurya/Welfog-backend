import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import {
    MdArrowBack,
    MdPlayArrow,
    MdVisibility,
    MdThumbUp,
    MdComment
} from "react-icons/md";
import toast from "react-hot-toast";

const LIMIT = 12;

const UserPosts = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [reels, setReels] = useState([]);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [confirmReel, setConfirmReel] = useState(null);
    const [confirmDeleteReel, setConfirmDeleteReel] = useState(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const loadMoreRef = useRef(null);

    // ================= VIDEO HANDLERS =================

    const handleMouseEnter = (video, reelId) => {
        if (!video) return;
        if (activeVideoId !== reelId) {
            video.currentTime = 0;
            video.muted = true;
            video.play().catch(() => { });
        }
    };

    const handleMouseLeave = (video, reelId) => {
        if (!video) return;
        if (activeVideoId !== reelId) {
            video.pause();
            video.currentTime = 0;
        }
    };

    const handleClickActivate = (video, reelId) => {
        if (!video || activeVideoId === reelId) return;
        setActiveVideoId(reelId);
        video.muted = false;
        video.controls = true;
        video.play().catch(() => { });
    };

    // ================= ADMIN ACTIONS =================

    const handleBlockReel = async (reel) => {
        try {
            const action = reel.status === "Blocked" ? "unblock" : "block";
            
            await axios.put(`http://localhost:4000/api/reels/admin_block/${reel._id}`, {
                action,
                reason: action === "block" ? "Admin blocked this reel" : null,
            }, {
               withCredentials: true
            });

            toast.success(
                action === "block"
                    ? "Reel blocked successfully"
                    : "Reel unblocked successfully"
            );

            setReels((prev) =>
                prev.map((r) =>
                    r._id === reel._id
                        ? {
                            ...r,
                            status: action === "block" ? "Blocked" : "Published",
                        }
                        : r
                )
            );
        } catch (err) {
            console.error(err);
            toast.error("Failed to update reel status");
        }
    };

    const handleDeleteReel = async (reelId) => {
        try {
            
            await axios.delete(`http://localhost:4000/api/reels/admin_delete/${reelId}`, {
             withCredentials: true
            });
            toast.success("Reel deleted");
            setReels((prev) => prev.filter((r) => r._id !== reelId));
        } catch {
            toast.error("Failed to delete reel");
        }
    };


    // ================= FETCH =================

    useEffect(() => {
        setReels([]);
        setSkip(0);
        setHasMore(true);
        fetchPosts(0);
        // eslint-disable-next-line
    }, [id, startDate, endDate]);

    const fetchPosts = async (skipValue) => {
        try {
            setLoading(true);
            const res = await axios.get(`http://localhost:4000/api/users/admin_userpost/${id}`, {
                params: { limit: LIMIT, skip: skipValue, startDate, endDate },
            } , {
         withCredentials: true
            });

            if (skipValue === 0) {
                setReels(res.data.reels);
            } else {
                setReels((prev) => [...prev, ...res.data.reels]);
            }

            setUser(res.data.user);
            setHasMore(res.data.hasMore);
            setSkip(skipValue + LIMIT);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load user posts");
        } finally {
            setLoading(false);
        }
    };

    // ================= INFINITE SCROLL =================

    useEffect(() => {
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchPosts(skip);
                }
            },
            { threshold: 0.3 }
        );

        const el = loadMoreRef.current;
        if (el) observer.observe(el);

        return () => {
            if (el) observer.unobserve(el);
        };
    }, [hasMore, skip, loading]);

    // ================= UI =================

    return (
        <div className="space-y-6 bg-white min-h-screen p-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                    <MdArrowBack className="text-black text-xl" />
                </button>
                <h1 className="text-2xl font-bold text-black">
                    {"User Posts"}
                </h1>
            </div>
            {/* 📅 Date Filter */}
            <div className="flex gap-3 flex-wrap items-center">
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                />

                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                />

                <button
                    onClick={() => {
                        setStartDate("");
                        setEndDate("");
                    }}
                    className="text-xs font-bold text-red-500 hover:underline"
                >
                    Reset
                </button>
            </div>
            {/* Spinner (first load only) */}
            {reels.length === 0 && loading && <div className="spinner" />}

            {/* Grid */}
            {reels.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {reels.map((reel) => (
                        <div
                            key={reel._id}
                            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition overflow-hidden"
                        >
                            {/* THUMBNAIL */}
                            <div className="relative aspect-[9/10] bg-black overflow-hidden rounded-t-xl">
                                {activeVideoId !== reel._id &&
                                    reel.thumbnailUrl && (
                                        <img
                                            src={reel.thumbnailUrl}
                                            alt="thumbnail"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}

                                <video
                                    src={reel.videoUrl}
                                    preload="none"
                                    playsInline
                                    muted={activeVideoId !== reel._id}
                                    controls={activeVideoId === reel._id}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    onMouseEnter={(e) =>
                                        handleMouseEnter(e.currentTarget, reel._id)
                                    }
                                    onMouseLeave={(e) =>
                                        handleMouseLeave(e.currentTarget, reel._id)
                                    }
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClickActivate(
                                            e.currentTarget,
                                            reel._id
                                        );
                                    }}
                                />

                                {activeVideoId !== reel._id && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/60 p-3 rounded-full">
                                            <MdPlayArrow className="text-white text-4xl" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ✅ FOOTER (STATS + ACTIONS) */}
                            <div className="px-3 py-3 bg-white border-t border-gray-100 rounded-b-xl space-y-2">
                                {/* Caption */}
                                <p className="text-sm text-black truncate font-medium">
                                    {reel.caption || "No caption"}
                                </p>

                                {/* ✅ STATS IN FOOTER */}
                                <div className="flex gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <MdVisibility />
                                        <span>{reel.views || 0}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <MdThumbUp />
                                        <span>
                                            {Array.isArray(reel.likes)
                                                ? reel.likes.length
                                                : reel.likes || 0}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <MdComment />
                                        <span>
                                            {Array.isArray(reel.comments)
                                                ? reel.comments.length
                                                : reel.comments || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-xs font-bold uppercase ${reel.status === "Blocked"
                                            ? "text-red-500"
                                            : "text-green-600"
                                            }`}
                                    >
                                        {reel.status || "Active"}
                                    </span>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setConfirmReel(reel)}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md font-medium"
                                        >
                                            {reel.status === "Blocked"
                                                ? "Unblock"
                                                : "Block"}
                                        </button>

                                        <button
                                            onClick={() =>
                                                setConfirmDeleteReel(reel._id)
                                            }
                                            className="px-3 py-1.5 bg-white hover:bg-gray-50 text-black text-xs rounded-md border border-gray-300 font-medium"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Infinite scroll trigger */}
            {hasMore && (
                <div
                    ref={loadMoreRef}
                    className="h-12 flex items-center justify-center"
                >
                    {loading && (
                        <span className="text-gray-500 text-sm">
                            Loading more...
                        </span>
                    )}
                </div>
            )}


            {confirmReel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-[320px] shadow-xl">

                        <h3 className="text-black text-lg font-bold mb-2">
                            {confirmReel.status === "Blocked"
                                ? "Unblock Reel?"
                                : "Block Reel?"}
                        </h3>

                        <p className="text-gray-600 text-sm mb-4">
                            {confirmReel.status === "Blocked"
                                ? "This reel will be visible to users again."
                                : "This reel will be hidden from user feed."}
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmReel(null)}
                                className="px-4 py-2 bg-gray-100 text-black rounded font-medium hover:bg-gray-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    handleBlockReel(confirmReel);
                                    setConfirmReel(null);
                                }}
                                className={`px-4 py-2 text-white rounded font-bold ${confirmReel.status === "Blocked"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                                    }`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {confirmDeleteReel && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-[320px] shadow-xl">

                        <h3 className="text-black text-lg font-bold mb-2">
                            Delete Reel?
                        </h3>

                        <p className="text-gray-600 text-sm mb-4">
                            This action is permanent. This reel will be deleted forever.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDeleteReel(null)}
                                className="px-4 py-2 bg-gray-100 text-black rounded font-medium hover:bg-gray-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    handleDeleteReel(confirmDeleteReel);
                                    setConfirmDeleteReel(null);
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UserPosts;