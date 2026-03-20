import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 🔍 Added startDate and endDate states
  const [filters, setFilters] = useState({
    action: "",
    targetType: "",
    search: "",
    startDate: "",
    endDate: ""
  });

  const topRef = useRef(null);

  const scrollToTop = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Instant fetch on any filter change
  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters.action, filters.targetType, filters.search, filters.startDate, filters.endDate]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { action, targetType, search, startDate, endDate } = filters;
      
      const res = await axios.get(
        `http://localhost:4000/api/admin/activity-logs?page=${currentPage}&limit=20&action=${action}&targetType=${targetType}&search=${search}&startDate=${startDate}&endDate=${endDate}`,{
         withCredentials: true
        }
      );
      
      setLogs(res.data.logs || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      scrollToTop();
    } catch (err) {
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); 
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-gray-800 font-medium">
        Loading logs...
      </div>
    );
  }

  return (
    <div ref={topRef} className="space-y-6 bg-white text-gray-900 p-4 md:p-6 animate-fadeIn">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500">Track system actions and movements</p>
        </div>

        {/* 🛠️ IMPROVED FILTER BAR */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Search</label>
            <input 
              type="text"
              placeholder="Name or Action..."
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>

          {/* Action Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Action</label>
            <select 
              name="action"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
              value={filters.action}
              onChange={handleFilterChange}
            >
              <option value="">All Actions</option>
              <option value="create_role">Add Role</option>
              <option value="edit_role">Edit Role</option>
              <option value="delete_role">Delete Role</option>
              <option value="create_staff">Add Staff</option>
              <option value="delete_staff">Delete Staff</option>
              <option value="delete_music">Delete Music</option>
              <option value="suspend_user">Suspend User</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">Category</label>
            <select 
              name="targetType"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
              value={filters.targetType}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              <option value="Role">Roles</option>
              <option value="Staff">Staffs</option>
              <option value="Music">Music</option>
              <option value="User">Users</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
            <input 
              type="date"
              name="startDate"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-400">To</label>
            <input 
              type="date"
              name="endDate"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>

          {/* Reset Filters */}
          <button 
            onClick={() => setFilters({action: "", targetType: "", search: "", startDate: "", endDate: ""})}
            className="text-xs font-bold text-red-500 hover:text-red-700 pb-3"
          >
            Reset
          </button>
        </div>
      </div>

      {/* MOBILE LIST VIEW */}
      <div className="md:hidden space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No logs found</div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">User</p>
                  <p className="font-semibold text-gray-900">{log.metadata?.userName || "Unknown"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Action</p>
                  <p className="text-blue-600 font-bold uppercase">{log.action}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</p>
                  <p className="text-sm text-gray-600">
                    {typeof log.metadata?.userRole === "string"
                      ? log.metadata.userRole
                      : log.metadata?.userRole?.name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {log.targetName ? (
                      <span className="text-blue-600 font-bold">{log.targetName}</span>
                    ) : (
                      log.targetType
                    )}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <p className="text-[10px] text-gray-500">{new Date(log.createdAt).toLocaleString()}</p>
                <p className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-700 font-medium truncate max-w-[100px]">{log.device || "N/A"}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="p-4 text-left font-semibold uppercase tracking-wider">User</th>
              <th className="p-4 text-left font-semibold uppercase tracking-wider">Role</th>
              <th className="p-4 text-left font-semibold uppercase tracking-wider">Action</th>
              <th className="p-4 text-left font-semibold uppercase tracking-wider">Target</th>
              <th className="p-4 text-left font-semibold uppercase tracking-wider">Date</th>
              <th className="p-4 text-left font-semibold uppercase tracking-wider">Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-500">No logs found</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-4 text-gray-900 font-medium">{log.metadata?.userName || "Unknown"}</td>
                  <td className="p-4 text-gray-600">{log.metadata?.userRole?.name || log.metadata?.userRole || "-"}</td>
                  <td className="p-4 text-blue-600 font-bold uppercase text-[11px]">{log.action}</td>
                  <td className="p-4">
                    {log.targetName ? (
                      <span className="text-gray-900 font-bold text-sm">{log.targetName}</span>
                    ) : (
                      <span className="text-gray-600 font-medium">{log.targetType}</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-4 text-gray-500 text-xs truncate max-w-[150px]">{log.device || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-center gap-8 px-4 py-6 bg-white mt-4 border-t border-gray-50">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1 || loading}
          className="flex items-center gap-1 text-sm font-bold text-gray-700 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-lg">‹</span> Previous
        </button>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          <span>Page</span>
          <span className="text-gray-900 font-bold">{currentPage}</span>
          <span>of</span>
          <span className="text-gray-900 font-bold">{totalPages}</span>
        </div>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || loading}
          className="flex items-center gap-1 text-sm font-bold text-gray-700 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Next <span className="text-lg">›</span>
        </button>
      </div>
    </div>
  );
};

export default ActivityLogs;