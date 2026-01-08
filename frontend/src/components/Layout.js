import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
  QrCode,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/api';
import logo from '../logo.png';
// import { io } from 'socket.io-client'; // Disabled - Vercel doesn't support WebSockets
import toast from 'react-hot-toast';
import { useQuery } from 'react-query';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { user, logout, isAdmin, isStudent } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch admin stats for badge
  const { data: adminStats } = useQuery(
    'admin-stats-badge',
    () => adminAPI.getStats(),
    {
      enabled: !!isAdmin,
      refetchInterval: 30000 // Refresh every 30s
    }
  );

  const pendingApprovals = adminStats?.data?.stats?.pending_approvals || 0;

  // Fetch active announcements on load
  React.useEffect(() => {
    if (user && user.role === 'student') {
      // Use the new endpoint for students
      fetch(`${process.env.REACT_APP_API_URL}/announcements/my`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.announcements && data.announcements.length > 0) {
            setNotifications(data.announcements);
            setHasNotification(true);
          }
        })
        .catch(err => console.error('Failed to fetch notifications:', err));
    }
  }, [user]);

  /* Socket.io DISABLED - Vercel serverless doesn't support WebSockets
  // Socket.io for real-time announcements
  React.useEffect(() => {
    if (!user) return;

    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001');

    socket.on('connect', () => {
      // console.log('Layout Socket Connected:', socket.id);
      socket.emit('join_room', String(user.id));
    });

    socket.on('exam_grade_released', (data) => {
      // Unique sound for exam results (Major Triad "Ding-Dong")
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();

          const playNote = (freq, time, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

            gain.gain.setValueAtTime(0.1, ctx.currentTime + time);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + duration);

            osc.start(ctx.currentTime + time);
            osc.stop(ctx.currentTime + time + duration);
          };

          // Play C5 - E5 - G5 (Victory/Success sound)
          playNote(523.25, 0, 0.2);   // C
          playNote(659.25, 0.1, 0.2); // E
          playNote(783.99, 0.2, 0.4); // G
        }
      } catch (e) {
        console.error('Sound play failed', e);
      }

      const notification = {
        ...data,
        type: 'exam_grade', // Mark as exam grade for navigation
        content: data.content || data.message,
        created_at: data.created_at || new Date().toISOString()
      };

      setNotifications(prev => [notification, ...prev]);
      setHasNotification(true);

      // Toast with click handler
      toast.success((t) => (
        <div onClick={() => {
          navigate('/grades');
          toast.dismiss(t.id);
        }}
          className="cursor-pointer"
        >
          {notification.message}
          <div className="text-xs text-green-600 mt-1 font-medium">Click to view grades</div>
        </div>
      ), {
        duration: 5000,
        icon: '🎉',
        style: {
          border: '1px solid #10B981',
          padding: '16px',
          color: '#065F46',
        },
      });
    });

    return () => {
      socket.disconnect();
      socket.off('exam_grade_released');
    };
  }, [user]);
  */ // End Socket.IO disabled block

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: location.pathname === '/dashboard' },
    { name: 'Classes', href: '/classes', icon: BookOpen, current: location.pathname.startsWith('/classes') },
    ...(isStudent ? [
      { name: 'My Attendance', href: '/my-attendance', icon: Calendar, current: location.pathname === '/my-attendance' }
    ] : [
      { name: 'Attendance', href: '/attendance', icon: Calendar, current: location.pathname === '/attendance' }
    ]),
    { name: 'Assignments', href: '/assignments', icon: FileText, current: location.pathname.startsWith('/assignments') },
    ...(isStudent ? [
      { name: 'My Submissions', href: '/my-submissions', icon: FileText, current: location.pathname === '/my-submissions' }
    ] : []),
    { name: 'Grades', href: '/grades', icon: BarChart3, current: location.pathname === '/grades' },
    { name: 'Reports', href: '/reports', icon: BarChart3, current: location.pathname === '/reports' },
    ...(isStudent ? [{ name: 'My QR Code', href: '/my-qr-code', icon: QrCode, current: location.pathname === '/my-qr-code' }] : []),
    ...(isAdmin ? [
      { name: 'Users', href: '/users', icon: Users, current: location.pathname === '/users' },
      {
        name: 'Approvals',
        href: '/approvals',
        icon: CheckCircle,
        current: location.pathname === '/approvals',
        badge: pendingApprovals > 0 ? pendingApprovals : null
      }
    ] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'lecturer': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-20 items-center justify-between px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="EduSync" className="h-14 w-14 object-contain flex-shrink-0" />
              <h1 className="text-2xl font-bold text-gray-900">EduSync</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors ${item.current
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon className="mr-4 h-6 w-6 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {user?.profile_image_url ? (
                    <img
                      src={user.profile_image_url.startsWith('/') ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.profile_image_url}` : user.profile_image_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-white">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-20 items-center px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img src={logo} alt="EduSync" className="h-14 w-14 object-contain flex-shrink-0" />
              <h1 className="text-2xl font-bold text-gray-900">EduSync</h1>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-base font-medium rounded-md transition-colors ${item.current
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon className="mr-4 h-6 w-6 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                  {user?.profile_image_url ? (
                    <img
                      src={user.profile_image_url.startsWith('/') ? `${process.env.REACT_APP_API_URL.replace('/api', '')}${user.profile_image_url}` : user.profile_image_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-white">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(user?.role)}`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6 relative">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  className={`relative -m-2.5 p-2.5 text-gray-400 hover:text-gray-500 transition-colors ${hasNotification ? 'text-blue-500' : ''}`}
                  onClick={() => {
                    setHasNotification(false);
                    setShowNotifications(!showNotifications);
                  }}
                >
                  <Bell className={`h-6 w-6 ${hasNotification ? 'animate-bounce text-red-500' : ''}`} />
                  {hasNotification && (
                    <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">
                          No notifications
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((ann, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                if (ann.type === 'exam_grade') {
                                  navigate('/grades');
                                  setShowNotifications(false);
                                }
                              }}
                              className={`p-4 hover:bg-gray-50 transition-colors relative cursor-pointer ${ann.priority === 'urgent' ? 'bg-red-50/50' : ''
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${ann.priority === 'urgent' ? 'bg-red-500' :
                                  ann.type === 'important' ? 'bg-purple-500' :
                                    ann.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                  }`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${ann.priority === 'urgent' ? 'text-red-900' : 'text-gray-900'
                                    }`}>
                                    {ann.title}
                                  </p>
                                  {ann.class_name && (
                                    <p className="text-xs text-primary-600 font-medium mb-1">
                                      {ann.class_name}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-600 line-clamp-2">{ann.content}</p>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                      {new Date(ann.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/profile"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <Settings className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div >
  );
};

export default Layout;
