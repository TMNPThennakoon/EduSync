import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
    Megaphone,
    Key,
    Trash2,
    AlertTriangle,
    Plus,
    Calendar,
    Check,
    X,
    Copy
} from 'lucide-react';
import { adminAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('announcements');
    const queryClient = useQueryClient();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600">Manage announcements, IDs, and system maintenance</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`${activeTab === 'announcements'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <Megaphone className="h-4 w-4 mr-2" />
                        Announcements
                    </button>
                    <button
                        onClick={() => setActiveTab('lecturer-ids')}
                        className={`${activeTab === 'lecturer-ids'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <Key className="h-4 w-4 mr-2" />
                        Lecturer IDs
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`${activeTab === 'security'
                            ? 'border-red-500 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                    >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Attendance Reset
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'announcements' && <AnnouncementManager />}
                {activeTab === 'lecturer-ids' && <LecturerIdManager />}
                {activeTab === 'security' && <AttendanceResetTool />}
            </div>
        </div>
    );
};

// --- Sub Components ---

const AnnouncementManager = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [priority, setPriority] = useState('normal');
    const [targetAudience, setTargetAudience] = useState('all');
    const [targetDept, setTargetDept] = useState('all');  // Added targetDept
    const [targetYear, setTargetYear] = useState('all');  // Added targetYear
    const [courseId, setCourseId] = useState('');
    const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery('active-announcements', adminAPI.getAnnouncements);
    const announcements = data?.data?.announcements || [];

    // Fetch Classes for Course Dropdown
    const { data: classesData } = useQuery('all-classes', async () => {
        // Assuming adminAPI or direct axios. Let's use direct axios for safety if adminAPI method is unknown
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_API_URL}/classes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.json();
    });
    const classes = classesData || [];

    const createMutation = useMutation(adminAPI.createAnnouncement, {
        onSuccess: () => {
            toast.success('Announcement published');
            setTitle('');
            setMessage('');
            queryClient.invalidateQueries('active-announcements');
            queryClient.invalidateQueries('admin-announcements'); // Update dashboard banner
        },
        onError: () => toast.error('Failed to publish announcement')
    });

    const deleteMutation = useMutation(adminAPI.deleteAnnouncement, {
        onSuccess: () => {
            toast.success('Announcement removed');
            queryClient.invalidateQueries('active-announcements');
            queryClient.invalidateQueries('admin-announcements');
        },
        onError: () => toast.error('Failed to remove announcement')
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !message) return toast.error('Please fill all fields');

        createMutation.mutate({
            title,
            message,
            type,
            priority,
            target_audience: targetAudience,
            target_dept: targetDept === 'all' ? null : targetDept,
            target_year: targetYear === 'all' ? null : targetYear,
            course_id: courseId || null,
            expires_at: expiryDate.toISOString()
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Create Form */}
            <div className="card h-fit">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Announcement</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Title</label>
                        <input type="text" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. System Maintenance" />
                    </div>
                    <div>
                        <label className="label">Message</label>
                        <textarea className="input" rows="3" value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter details..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Type</label>
                            <select className="input" value={type} onChange={e => setType(e.target.value)}>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="important">Important</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Target Audience</label>
                            <select className="input" value={targetAudience} onChange={e => setTargetAudience(e.target.value)}>
                                <option value="all">All Users</option>
                                <option value="student">Students Only</option>
                                <option value="lecturer">Lecturers Only</option>
                            </select>
                        </div>

                        {/* Dynamic Targeting Fields */}
                        {(targetAudience === 'student' || targetAudience === 'lecturer') && (
                            <div>
                                <label className="label">Department</label>
                                <select className="input" value={targetDept} onChange={e => setTargetDept(e.target.value)}>
                                    <option value="all">All Departments</option>
                                    <option value="IAT">IAT</option>
                                    <option value="AT">AT</option>
                                    <option value="ET">ET</option>
                                    <option value="ICT">ICT</option>
                                </select>
                            </div>
                        )}

                        {targetAudience === 'student' && (
                            <div>
                                <label className="label">Year</label>
                                <select className="input" value={targetYear} onChange={e => setTargetYear(e.target.value)}>
                                    <option value="all">All Years</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="label">Priority (Email Alert)</label>
                            <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgent (Sends Email)</option>
                            </select>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="label">Course (Optional)</label>
                            <select className="input" value={courseId} onChange={e => setCourseId(e.target.value)}>
                                <option value="">All Courses (Global)</option>
                                {Array.isArray(classes) && classes.map(cls => (
                                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Expires At</label>
                            <DatePicker
                                selected={expiryDate}
                                onChange={date => setExpiryDate(date)}
                                className="input w-full"
                                minDate={new Date()}
                                showTimeSelect
                                dateFormat="Pp"
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-full" disabled={createMutation.isLoading}>
                        {createMutation.isLoading ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                </form>
            </div>

            {/* Active List */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Announcements</h3>
                {isLoading ? <LoadingSpinner size="sm" /> : (
                    <div className="space-y-4">
                        {announcements.length === 0 ? (
                            <p className="text-gray-500 text-sm">No active announcements.</p>
                        ) : (
                            announcements.map(ann => (
                                <div key={ann.id} className={`p-4 rounded-lg border flex justify-between items-start ${ann.type === 'important' ? 'bg-red-50 border-red-200' :
                                    ann.type === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                                    }`}>
                                    <div>
                                        <h4 className="font-semibold text-sm">{ann.title}</h4>
                                        <p className="text-sm text-gray-700 mt-1">{ann.message}</p>
                                        <p className="text-xs text-gray-500 mt-2">Expires: {new Date(ann.expires_at).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(ann.id)}
                                        className="text-gray-400 hover:text-red-500"
                                        title="Deactivate"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const LecturerIdManager = () => {
    const [count, setCount] = useState(10);
    const [department, setDepartment] = useState('IAT');
    const [generatedIds, setGeneratedIds] = useState([]);

    const generateMutation = useMutation((data) => adminAPI.generateLecturerIds(data), {
        onSuccess: (data) => {
            setGeneratedIds(data.data.ids);
            toast.success(`${data.data.ids.length} IDs Generated`);
        },
        onError: () => toast.error('Generation failed')
    });

    const copyToClipboard = () => {
        const text = generatedIds.map(id => id.lecturer_id_string).join('\n');
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="card max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Lecturer IDs</h3>
            <p className="text-sm text-gray-600 mb-4">
                Create department-specific IDs for new lecturer registration (e.g., IA0001, IC0001).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="label">Department</label>
                    <select
                        className="input"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                    >
                        <option value="IAT">IAT (Instrumentation & Automation Engineering Technology)</option>
                        <option value="ICT">ICT (Info & Comm Tech)</option>
                        <option value="AT">AT (Agri Tech)</option>
                        <option value="ET">ET (Engineering Tech)</option>
                    </select>
                </div>
                <div>
                    <label className="label">Number of IDs</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={count}
                            onChange={e => setCount(parseInt(e.target.value))}
                            className="input flex-1"
                        />
                        <button
                            onClick={() => generateMutation.mutate({ count, department })}
                            className="btn btn-primary whitespace-nowrap"
                            disabled={generateMutation.isLoading}
                        >
                            {generateMutation.isLoading ? '...' : 'Generate'}
                        </button>
                    </div>
                </div>
            </div>

            {generatedIds.length > 0 && (
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-gray-900">Generated IDs</h4>
                        <button onClick={copyToClipboard} className="text-blue-600 text-sm flex items-center hover:underline">
                            <Copy className="h-3 w-3 mr-1" /> Copy All
                        </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm h-64 overflow-y-auto">
                        {generatedIds.map((id) => (
                            <div key={id.id} className="py-1 border-b border-gray-100 last:border-0 flex justify-between">
                                <span>{id.lecturer_id_string}</span>
                                <span className="text-xs text-green-600 bg-green-100 px-2 rounded-full">New</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const AttendanceResetTool = () => {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [password, setPassword] = useState('');
    const [confirming, setConfirming] = useState(false);

    const resetMutation = useMutation(adminAPI.resetAttendance, {
        onSuccess: (data) => {
            toast.success(data.data.message);
            setPassword('');
            setConfirming(false);
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Reset failed')
    });

    const handleReset = () => {
        if (!password) return toast.error('Admin password required');

        resetMutation.mutate({
            password,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
        });
    };

    return (
        <div className="max-w-2xl">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                    <h3 className="text-lg font-bold text-red-700">Danger Zone: Attendance Reset</h3>
                </div>
                <p className="text-sm text-red-600 mb-6">
                    Permanently delete attendance records within a specific date range. This action cannot be undone.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="label text-red-800">Start Date</label>
                        <DatePicker selected={startDate} onChange={date => setStartDate(date)} className="input border-red-200" />
                    </div>
                    <div>
                        <label className="label text-red-800">End Date</label>
                        <DatePicker selected={endDate} onChange={date => setEndDate(date)} className="input border-red-200" />
                    </div>
                </div>

                {!confirming ? (
                    <button onClick={() => setConfirming(true)} className="btn bg-red-600 hover:bg-red-700 text-white w-full">
                        Initiate Reset Process
                    </button>
                ) : (
                    <div className="animate-fade-in space-y-4 bg-white p-4 rounded border border-red-200">
                        <p className="text-sm font-semibold text-gray-900">Are you absolutely sure?</p>
                        <div>
                            <label className="label">Confirm Admin Password</label>
                            <input
                                type="password"
                                className="input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password to confirm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setConfirming(false)} className="btn btn-secondary flex-1">
                                Cancel
                            </button>
                            <button onClick={handleReset} className="btn bg-red-600 hover:bg-red-700 text-white flex-1" disabled={resetMutation.isLoading}>
                                {resetMutation.isLoading ? 'Deleting...' : 'Confirm & Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSettings;
