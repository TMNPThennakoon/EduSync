import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { attendanceAPI } from '../services/api';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Label, Legend } from 'recharts';

const StudentAttendance = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendancePercentage: 0,
    absentPercentage: 0
  });

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getAll({ 
        student_id: user?.id,
        date: selectedDate 
      });
      
      const attendanceData = response.data.attendance || response.data || [];
      setAttendance(attendanceData);
      
      // Calculate statistics
      calculateStats(attendanceData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (attendanceData) => {
    const totalClasses = attendanceData.length;
    const present = attendanceData.filter(record => record.status === 'present').length;
    const absent = attendanceData.filter(record => record.status === 'absent').length;
    const late = attendanceData.filter(record => record.status === 'late').length;
    const excused = attendanceData.filter(record => record.status === 'excused').length;
    
    const attendancePercentage = totalClasses > 0 ? ((present + late) / totalClasses) * 100 : 0;
    const absentPercentage = totalClasses > 0 ? (absent / totalClasses) * 100 : 0;

    setStats({
      totalClasses,
      present,
      absent,
      late,
      excused,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      absentPercentage: Math.round(absentPercentage * 100) / 100
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'excused':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Prepare data for charts
  const attendanceChartData = attendance.map(record => ({
    date: new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    status: record.status,
    class: record.class_name
  }));

  const pieChartData = [
    { name: 'Present', value: stats.present, color: '#10B981' },
    { name: 'Absent', value: stats.absent, color: '#EF4444' },
    { name: 'Late', value: stats.late, color: '#F59E0B' },
    { name: 'Excused', value: stats.excused, color: '#3B82F6' }
  ];

  const weeklyData = attendance.reduce((acc, record) => {
    const date = new Date(record.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!acc[weekKey]) {
      acc[weekKey] = { week: weekKey, present: 0, absent: 0, total: 0 };
    }
    
    acc[weekKey].total++;
    if (record.status === 'present' || record.status === 'late') {
      acc[weekKey].present++;
    } else if (record.status === 'absent') {
      acc[weekKey].absent++;
    }
    
    return acc;
  }, {});

  const weeklyChartData = Object.values(weeklyData).map(week => ({
    week: new Date(week.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    attendance: week.total > 0 ? Math.round((week.present / week.total) * 100) : 0,
    absence: week.total > 0 ? Math.round((week.absent / week.total) * 100) : 0
  }));

  // Custom label component for pie chart
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null; // Don't show labels for very small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="600"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
          <p className="text-gray-600">Track your personal attendance records and statistics</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-2xl font-bold text-green-600">{stats.attendancePercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Absence Rate</p>
              <p className="text-2xl font-bold text-red-600">{stats.absentPercentage}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Present</p>
              <p className="text-2xl font-bold text-blue-600">{stats.present}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-gray-600">{stats.totalClasses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Status Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Distribution</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                stroke="#fff"
                strokeWidth={2}
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                labelStyle={{
                  color: '#374151',
                  fontWeight: '600'
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Attendance Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                labelStyle={{
                  color: '#374151',
                  fontWeight: '600'
                }}
                formatter={(value, name) => [`${value}%`, name === 'attendance' ? 'Attendance Rate' : 'Absence Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="attendance" 
                stroke="#10B981" 
                strokeWidth={3}
                name="Attendance %"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="absence" 
                stroke="#EF4444" 
                strokeWidth={3}
                name="Absence %"
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#EF4444', strokeWidth: 2 }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                wrapperStyle={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Attendance Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recorded By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No attendance records found for the selected date.
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={`${record.id}-${record.date}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.class_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(record.status)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.recorded_by_first_name && record.recorded_by_last_name 
                        ? `${record.recorded_by_first_name} ${record.recorded_by_last_name}`
                        : record.recorded_by_name || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendance;
