import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
    FileText,
    Search,
    Filter,
    Clock,
    User,
    Monitor,
    Globe
} from 'lucide-react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminLogs = () => {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data, isLoading } = useQuery(
        ['admin-logs', { page, action: debouncedSearch }],
        () => adminAPI.getLogs({ page, limit: 20, action: debouncedSearch }),
        { keepPreviousData: true }
    );

    const logs = data?.data?.logs || [];
    const pagination = data?.data?.pagination || {};

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    if (isLoading && page === 1) {
        return <LoadingSpinner size="lg" className="py-12" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
                <p className="text-gray-600">Audit trail of all system activities</p>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by action name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input pl-10"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Details
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Metadata
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {log.first_name ? `${log.first_name} ${log.last_name}` : 'System / Unknown'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{log.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={JSON.stringify(log.details, null, 2)}>
                                            {JSON.stringify(log.details)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center" title={log.ip_address}>
                                                    <Globe className="h-3 w-3 mr-1" /> {log.ip_address || 'N/A'}
                                                </div>
                                                <div className="flex items-center max-w-[150px] truncate" title={log.device_info}>
                                                    <Monitor className="h-3 w-3 mr-1" /> {log.device_info || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={logs.length < 20}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing page <span className="font-medium">{page}</span>
                                {pagination.total && (
                                    <> of about <span className="font-medium">{pagination.total}</span> results</>
                                )}
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <div className="relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-700">
                                    {page}
                                </div>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={logs.length < 20}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogs;
