import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AnnouncementDisplay = () => {
    const [announcements, setAnnouncements] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        fetchAnnouncements();

        const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001');

        socket.on('new_announcement', (newAnnouncement) => {
            // Simply refetch to ensure we respect all backend filtering (classes, depts, etc.)
            // and to get the latest data including details not in the socket payload if any.
            fetchAnnouncements();
        });

        socket.on('delete_announcement', (deletedId) => {
            fetchAnnouncements();
        });

        return () => socket.disconnect();
    }, [user]);

    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.REACT_APP_API_URL}/announcements/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnnouncements(res.data.announcements);
        } catch (error) {
            console.error('Failed to fetch announcements:', error);
        }
    };

    if (announcements.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-600" />
                    Announcements
                </h3>
                <p className="text-gray-500 text-sm">No active announcements.</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-600" />
                Announcements
            </h3>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {announcements.map((ann) => (
                    <div
                        key={ann.id}
                        className={`p-4 rounded-lg border-l-4 ${ann.priority === 'urgent' ? 'bg-red-50 border-red-500' :
                            ann.type === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                'bg-blue-50 border-blue-500'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-semibold text-gray-900">{ann.title}</h4>
                            <span className="text-xs text-gray-500">
                                {new Date(ann.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ann.message}</p>
                        {ann.priority === 'urgent' && (
                            <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Urgent
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnouncementDisplay;
