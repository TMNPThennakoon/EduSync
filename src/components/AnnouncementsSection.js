import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Bell, Plus, Trash2, Calendar, User } from 'lucide-react';
import { announcementsAPI, classesAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const AnnouncementsSection = ({ classCode, isLecturer }) => {
    const [showModal, setShowModal] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
    const [selectedClasses, setSelectedClasses] = useState([]);
    const queryClient = useQueryClient();

    // Fetch announcements
    const { data: announcementsData, isLoading } = useQuery(
        ['announcements', classCode],
        () => announcementsAPI.getByClass(classCode),
        { enabled: !!classCode }
    );

    // Fetch all classes for lecturer to populate bulk select
    const { data: classesData } = useQuery(
        ['lecturer-classes'],
        () => classesAPI.getAll({ limit: 100 }), // Fetch enough classes
        {
            enabled: !!isLecturer && showModal,
            onSuccess: (data) => {
                // Initialize selected classes with current class if not already set
                if (selectedClasses.length === 0 && classCode) {
                    setSelectedClasses([classCode]);
                }
            }
        }
    );

    const announcements = announcementsData?.data?.announcements || [];
    const lecturerClasses = classesData?.data?.classes || [];

    // Create mutation
    const createMutation = useMutation(
        (data) => announcementsAPI.create({
            ...data,
            class_code: selectedClasses.length > 0 ? selectedClasses : [classCode]
        }),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['announcements', classCode]);
                toast.success('Announcement posted successfully');
                setShowModal(false);
                setNewAnnouncement({ title: '', content: '' });
                setSelectedClasses([classCode]); // Reset to current class
            },
            onError: (error) => {
                toast.error(error.response?.data?.error || 'Failed to post announcement');
            }
        }
    );

    // Delete mutation
    const deleteMutation = useMutation(
        (id) => announcementsAPI.delete(id),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['announcements', classCode]);
                toast.success('Announcement deleted successfully');
            },
            onError: (error) => {
                toast.error(error.response?.data?.error || 'Failed to delete announcement');
            }
        }
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newAnnouncement.title || !newAnnouncement.content) {
            toast.error('Please fill in all fields');
            return;
        }
        createMutation.mutate(newAnnouncement);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this announcement?')) {
            deleteMutation.mutate(id);
        }
    };

    const toggleClassSelection = (code) => {
        setSelectedClasses(prev => {
            if (prev.includes(code)) {
                // Don't allow unselecting the current class if it's the only one (optional, but safer context)
                // But user might want to post to others ONLY? No, we are in this class page.
                // Let's allow unselect but ensure at least one is selected logic if we wanted.
                // However, logic says: "Post to..."
                return prev.filter(c => c !== code);
            } else {
                return [...prev, code];
            }
        });
    };

    if (isLoading) return <LoadingSpinner size="sm" />;

    return (
        <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-primary-600" />
                    Announcements
                </h2>
                {isLecturer && (
                    <button
                        onClick={() => {
                            setShowModal(true);
                            if (selectedClasses.length === 0) setSelectedClasses([classCode]);
                        }}
                        className="btn btn-primary btn-sm flex items-center"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        New Announcement
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Bell className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No announcements yet</p>
                    </div>
                ) : (
                    announcements.map((announcement) => (
                        <div key={announcement.id} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                            {isLecturer && (
                                <button
                                    onClick={() => handleDelete(announcement.id)}
                                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Announcement"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-md font-medium text-gray-900 pr-8">{announcement.title}</h3>
                                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                        <span className="flex items-center">
                                            <User className="h-3 w-3 mr-1" />
                                            {announcement.first_name} {announcement.last_name}
                                        </span>
                                        <span className="flex items-center">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(announcement.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Create Announcement Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Post Announcement</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="label">Title</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Exam Schedule Change"
                                    value={newAnnouncement.title}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Class Selection for Bulk Post */}
                            {isLecturer && lecturerClasses.length > 0 && (
                                <div>
                                    <label className="label mb-2">Post to Classes</label>
                                    <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto p-2 space-y-2 bg-gray-50">
                                        {lecturerClasses.map(paramsClass => (
                                            <label key={paramsClass.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClasses.includes(paramsClass.id)}
                                                    onChange={() => toggleClassSelection(paramsClass.id)}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="flex-1 truncate">
                                                    <span className="font-medium">{paramsClass.class_name || paramsClass.name}</span>
                                                    <span className="text-gray-500 text-xs ml-1">({paramsClass.subject || paramsClass.id})</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Selected: {selectedClasses.length} {selectedClasses.length === 1 ? 'class' : 'classes'}
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="label">Content</label>
                                <textarea
                                    className="input h-32 resize-none"
                                    placeholder="Type your announcement here..."
                                    value={newAnnouncement.content}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isLoading}
                                    className="btn btn-primary"
                                >
                                    {createMutation.isLoading ? 'Posting...' : 'Post Announcement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementsSection;
