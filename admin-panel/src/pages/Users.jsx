import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import {
  MdSearch,
  MdVisibility,
  MdBlock,
  MdCheckCircle,
  MdPerson,
  MdDelete, // Imported Delete Icon
} from 'react-icons/md';
import toast from 'react-hot-toast';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null); // State for delete confirmation
  const topRef = useRef(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    startDate: "",
    endDate: ""
  });

  const limit = 15;



  useEffect(() => {
    fetchUsers();
  }, [page, filters]);

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { search, status, startDate, endDate } = filters;

      const response = await axios.get(`http://localhost:4000/api/users/admin_users`, {
        params: {
          page,
          limit,
          search,
          status,
          startDate,
          endDate
        },
           withCredentials: true 
      });

      setUsers(response.data.data);
      setTotalUsers(response.data.total);
    } catch (error) {
      toast.error('Permission denied');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendToggle = async (userId, currentStatus) => {
    try {
      await axios.put(`http://localhost:4000/api/users/admin_users/${userId}`, {
        isSuspended: !currentStatus,
           withCredentials: true 
      });

      toast.success(
        `User ${!currentStatus ? 'suspended' : 'activated'} successfully`
      );

      // ✅ Just call without params
      fetchUsers();

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Permission denied');
    }
  };

  // NEW: Delete User Function
  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`http://localhost:4000/api/users/admin_users/${userId}` , {
           withCredentials: true 
      });

      toast.success('User and all related data deleted successfully');

      setConfirmDelete(null);

      // ✅ Correct call (no params)
      fetchUsers();

    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
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

  const openModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const viewActivityDetails = (user) => {
    navigate(`/users/${user._id}/activity`);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setShowModal(false);
  };

  return (
    <div
      ref={topRef}
      className="space-y-6 animate-fadeIn bg-white text-gray-900 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Users
          </h1>
          <p className="text-gray-500">
            Manage all registered users ({totalUsers})
          </p>
        </div>
      </div>

      {/* Search Bar */}
      {/* FILTER BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 items-end">

        {/* Search */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">Search</label>
          <input
            type="text"
            name="search"
            placeholder="userId , Username, name or email..."
            value={filters.search}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* From */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            setFilters({
              search: "",
              status: "",
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

      {/* Loader */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="spinner"></div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  User ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  Stats
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  Seller ID
                </th>

                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  User Seller ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  Joined
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <MdPerson className="text-white text-xl" />
                        </div>
                      )}
                      <div>
                        <p className="text-gray-900 font-medium">
                          {user.name || 'No name'}
                        </p>
                        <p className="text-gray-500 text-sm">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {user.userid || "N/A"}
                  </td>

                  <td className="px-6 py-4">
                    <p className="text-gray-700 text-sm">{user.mobile}</p>
                    {user.email && (
                      <p className="text-gray-500 text-xs">
                        {user.email}
                      </p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-gray-700">
                        <span className="text-blue-600">
                          {user.followers?.length || 0}
                        </span>{' '}
                        followers
                      </p>
                      <p className="text-gray-500">
                        {user.following?.length || 0} following
                      </p>
                    </div>
                  </td>
                  {/* 🔥 Seller ID */}
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {user.seller_id || "N/A"}
                  </td>

                  {/* 🔥 User Seller ID */}
                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {user.userseller_id || "N/A"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${user.isSuspended
                        ? 'bg-red-600/20 text-red-600'
                        : 'bg-green-600/20 text-green-600'
                        }`}
                    >
                      {user.isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-gray-700 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => viewActivityDetails(user)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="View Activity"
                      >
                        <MdVisibility />
                      </button>
                      <button
                        onClick={() =>
                          handleSuspendToggle(user._id, user.isSuspended)
                        }
                        className={`p-2 rounded-lg transition-colors ${user.isSuspended
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          }`}
                        title={user.isSuspended ? 'Activate' : 'Suspend'}
                      >
                        {user.isSuspended ? <MdCheckCircle /> : <MdBlock />}
                      </button>
                      {/* NEW: Delete Button */}
                      <button
                        onClick={() => setConfirmDelete(user)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded disabled:opacity-40"
        >
          &lt; Previous
        </button>

        <span className="text-sm text-gray-600">
          Page <span className="text-gray-900">{page}</span> of{' '}
          <span className="text-gray-900">
            {Math.ceil(totalUsers / limit)}
          </span>
        </span>

        <button
          disabled={page >= Math.ceil(totalUsers / limit)}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-100 text-gray-800 rounded disabled:opacity-40"
        >
          Next &gt;
        </button>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                User Details
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                {selectedUser.profilePicture ? (
                  <img
                    src={selectedUser.profilePicture}
                    alt={selectedUser.username}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                    <MdPerson className="text-white text-3xl" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedUser.name || 'No name'}
                  </h3>
                  <p className="text-gray-500">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Mobile</p>
                  <p className="text-gray-900">{selectedUser.mobile}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Email</p>
                  <p className="text-gray-900">
                    {selectedUser.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Followers</p>
                  <p className="text-gray-900">
                    {selectedUser.followers?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Following</p>
                  <p className="text-gray-900">
                    {selectedUser.following?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Status</p>
                  <p className="text-gray-900">
                    {selectedUser.isSuspended ? 'Suspended' : 'Active'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Joined</p>
                  <p className="text-gray-900">
                    {new Date(
                      selectedUser.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedUser.bio && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Bio</p>
                  <p className="text-gray-900">
                    {selectedUser.bio}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MdDelete size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete User?</h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete <span className="font-semibold">@{confirmDelete.username}</span>?
                This will permanently remove their profile, reels, comments, and all related data. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(confirmDelete._id)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;