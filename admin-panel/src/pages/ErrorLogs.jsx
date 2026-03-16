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

            const token = localStorage.getItem("accessToken");

            let url = `http://localhost:4000/api/admin/errors?page=${page}`;

            if (startDate) {
                url += `&startDate=${startDate}`;
            }

            if (endDate) {
                url += `&endDate=${endDate}`;
            }

            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
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
        <div className="p-4 sm:p-6">

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Error Logs</h1>
                <p className="text-sm text-gray-500">
                    Monitor backend API errors and system issues
                </p>
            </div>

            {/* Date Filter */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">

                <div>
                    <label className="text-xs text-gray-500 block mb-1">
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                    />
                </div>

                <div>
                    <label className="text-xs text-gray-500 block mb-1">
                        End Date
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                    />
                </div>

                <button
                    onClick={applyFilter}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                    Apply Filter
                </button>

                <button
                    onClick={resetFilter}
                    className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                    Reset
                </button>

            </div>

            {/* Table */}
            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">

                        <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">API</th>
                                <th className="px-4 py-3">Method</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Error</th>
                                <th className="px-4 py-3">IP</th>
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y">

                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-6 text-gray-400">
                                        No error logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-gray-50">

                                        <td className="px-4 py-3 font-mono text-xs text-blue-600">
                                            {log.api}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 text-xs bg-gray-200 rounded">
                                                {log.method}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-xs">
                                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded">
                                                {log.statusCode || 500}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-red-600 font-medium">
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
                                                className="text-blue-600 text-xs hover:underline"
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
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">

                    <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        Previous
                    </button>

                    <span className="text-sm text-gray-600">Page {page}</span>

                    <button
                        onClick={() => setPage(page + 1)}
                        className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-black"
                    >
                        Next
                    </button>

                </div>
            </div>

            {/* Error Detail Modal */}

            {selectedError && (

                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white w-[700px] max-h-[80vh] overflow-auto p-6 rounded-lg shadow">

                        <h2 className="text-lg font-bold mb-4">Error Details</h2>

                        <p><b>API:</b> {selectedError.api}</p>
                        <p><b>Method:</b> {selectedError.method}</p>
                        <p><b>Status:</b> {selectedError.statusCode}</p>

                        <p className="mt-3"><b>Error Message:</b></p>
                        <pre className="bg-gray-100 p-3 text-xs rounded">
                            {selectedError.errorMessage}
                        </pre>

                        <p className="mt-3"><b>Stack Trace:</b></p>
                        <pre className="bg-gray-100 p-3 text-xs overflow-auto rounded">
                            {selectedError.stack}
                        </pre>

                        <p className="mt-3"><b>Request Body:</b></p>
                        <pre className="bg-gray-100 p-3 text-xs rounded">
                            {JSON.stringify(selectedError.requestBody, null, 2)}
                        </pre>

                        <button
                            onClick={() => setSelectedError(null)}
                            className="mt-4 px-4 py-2 bg-black text-white rounded"
                        >
                            Close
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
};

export default ErrorLogs;