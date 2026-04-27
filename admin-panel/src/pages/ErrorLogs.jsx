import React, { useEffect, useState } from "react";
import axios from "axios";

const ErrorLogs = () => {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selectedError, setSelectedError] = useState(null);

    const fetchLogs = async () => {
        try {
            let url = `http://localhost:4000/api/admin/errors?page=${page}`;

            if (startDate) {
                url += `&startDate=${startDate}`;
            }

            if (endDate) {
                url += `&endDate=${endDate}`;
            }

            const res = await axios.get(url, {
               withCredentials: true 
            });

            setLogs(res.data.logs || []);

        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const applyFilter = () => {
        setPage(1);
        fetchLogs();
    };

    const resetFilter = () => {
        setStartDate("");
        setEndDate("");
        setPage(1);

        setTimeout(() => {
            fetchLogs();
        }, 0);
    };

    return (
        <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden">

            {/* Header and Filter Section - Now on the same line on larger screens */}
            <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                
                {/* Page Header */}
                <div className="shrink-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Error Logs</h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">
                        Monitor backend API errors and system issues
                    </p>
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-end w-full lg:w-auto">

                    <div className="w-full sm:w-auto flex-1 sm:flex-none">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="w-full sm:w-auto flex-1 sm:flex-none">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                            onClick={applyFilter}
                            className="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                            Apply Filter
                        </button>

                        <button
                            onClick={resetFilter}
                            className="w-full sm:w-auto px-5 py-2 bg-gray-500 text-white font-medium rounded-lg text-sm hover:bg-gray-600 transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden w-full">

                <div className="overflow-x-auto w-full">
                    <table className="min-w-full text-sm text-left whitespace-nowrap">

                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold">API</th>
                                <th className="px-4 py-3 font-semibold">Method</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Error</th>
                                <th className="px-4 py-3 font-semibold">IP</th>
                                <th className="px-4 py-3 font-semibold">Time</th>
                                <th className="px-4 py-3 font-semibold">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">

                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400 font-medium">
                                        No error logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50 transition-colors">

                                        <td className="px-4 py-3 font-mono text-xs text-blue-600 max-w-[150px] sm:max-w-[200px] truncate">
                                            {log.api}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-md">
                                                {log.method}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-xs">
                                            <span className={`px-2 py-1 font-semibold rounded-md ${log.statusCode >= 500 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {log.statusCode || 500}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-red-600 font-medium max-w-[200px] sm:max-w-[300px] truncate" title={log.errorMessage}>
                                            {log.errorMessage}
                                        </td>

                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {log.ip}
                                        </td>

                                        <td className="px-4 py-3 text-gray-500 text-xs">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>

                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => setSelectedError(log)}
                                                className="px-3 py-1 bg-blue-50 text-blue-600 font-medium text-xs rounded hover:bg-blue-100 transition-colors"
                                            >
                                                View
                                            </button>
                                        </td>

                                    </tr>
                                ))
                            )}

                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">

                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Previous
                    </button>

                    <span className="text-sm font-medium text-gray-600">Page {page}</span>

                    <button
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-black transition-colors"
                    >
                        Next
                    </button>

                </div>
            </div>

            {/* Error Detail Modal */}
            {selectedError && (

                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 sm:p-6 backdrop-blur-sm">

                    <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 rounded-xl shadow-2xl">

                        <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                            <h2 className="text-xl font-bold text-gray-900">Error Details</h2>
                            <button 
                                onClick={() => setSelectedError(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">API Endpoint</p>
                                <p className="text-sm font-mono text-blue-600 break-all">{selectedError.api}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Method</p>
                                <p className="text-sm font-semibold text-gray-800">{selectedError.method}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status Code</p>
                                <p className="text-sm font-bold text-red-600">{selectedError.statusCode || 500}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-bold text-gray-800 mb-2">Error Message:</p>
                                <div className="bg-red-50 border border-red-100 p-3 text-sm text-red-700 rounded-lg whitespace-pre-wrap break-words">
                                    {selectedError.errorMessage}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-gray-800 mb-2">Stack Trace:</p>
                                <pre className="bg-gray-900 text-gray-300 p-4 text-xs overflow-x-auto rounded-lg whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto">
                                    {selectedError.stack}
                                </pre>
                            </div>

                            {selectedError.requestBody && Object.keys(selectedError.requestBody).length > 0 && (
                                <div>
                                    <p className="text-sm font-bold text-gray-800 mb-2">Request Body:</p>
                                    <pre className="bg-gray-50 border border-gray-200 text-gray-700 p-4 text-xs rounded-lg overflow-x-auto whitespace-pre-wrap break-words">
                                        {JSON.stringify(selectedError.requestBody, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelectedError(null)}
                                className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors"
                            >
                                Close View
                            </button>
                        </div>

                    </div>

                </div>

            )}

        </div>
    );
};

export default ErrorLogs;