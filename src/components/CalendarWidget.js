import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Users,
  BarChart3
} from 'lucide-react';

const CalendarWidget = ({ 
  selectedDate, 
  onDateSelect, 
  events = [], 
  attendanceData = [],
  assignments = [],
  classes = [],
  showEventDetails = true,
  compact = false,
  className = ""
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day

  // Get current month/year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!date || date === null) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date || event.due_date || event.created_at);
      return eventDate.toISOString().split('T')[0] === dateStr;
    });
  };

  // Get upcoming events (next 7 days)
  const getUpcomingEvents = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events.filter(event => {
      const eventDate = new Date(event.date || event.due_date || event.created_at);
      return eventDate >= today && eventDate <= nextWeek;
    }).sort((a, b) => new Date(a.date || a.due_date) - new Date(b.date || b.due_date));
  };

  // Get attendance for a specific date
  const getAttendanceForDate = (date) => {
    if (!date || date === null) return null;
    
    const dateStr = date.toISOString().split('T')[0];
    return attendanceData.find(record => record.date === dateStr);
  };

  // Get assignments due on a specific date
  const getAssignmentsForDate = (date) => {
    if (!date || date === null) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(assignment => {
      const dueDate = new Date(assignment.due_date);
      return dueDate.toISOString().split('T')[0] === dateStr;
    });
  };

  // Check if date is today
  const isToday = (date) => {
    if (!date || date === null) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is selected
  const isSelected = (date) => {
    if (!date || date === null || !selectedDate) return false;
    return date.toDateString() === new Date(selectedDate).toDateString();
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (date && date instanceof Date && onDateSelect) {
      onDateSelect(date.toISOString().split('T')[0]);
    }
  };

  // Get event type icon
  const getEventIcon = (event) => {
    if (event.type === 'assignment' || event.assignment_type) {
      return <BookOpen className="h-2 w-2" />;
    }
    if (event.type === 'attendance') {
      return <CheckCircle className="h-2 w-2" />;
    }
    if (event.type === 'class') {
      return <Users className="h-2 w-2" />;
    }
    return <CalendarIcon className="h-2 w-2" />;
  };

  // Get event color
  const getEventColor = (event) => {
    if (event.type === 'assignment' || event.assignment_type) {
      if (new Date(event.due_date || event.date) < new Date()) {
        return 'bg-red-100 text-red-600';
      }
      if (new Date(event.due_date || event.date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)) {
        return 'bg-yellow-100 text-yellow-600';
      }
      return 'bg-blue-100 text-blue-600';
    }
    if (event.type === 'attendance') {
      return 'bg-green-100 text-green-600';
    }
    if (event.type === 'class') {
      return 'bg-purple-100 text-purple-600';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const DayCell = ({ date, isToday, isSelected, events, attendance, assignments }) => {
    // Handle null dates (empty calendar cells)
    if (!date || date === null || !(date instanceof Date)) {
      return (
        <div className={`min-h-[60px] p-1 border border-gray-200 ${compact ? 'min-h-[40px]' : ''}`}>
          {/* Empty cell */}
        </div>
      );
    }

    const dayEvents = getEventsForDate(date);
    const dayAttendance = getAttendanceForDate(date);
    const dayAssignments = getAssignmentsForDate(date);

    return (
      <div
        className={`
          min-h-[60px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
          ${isToday ? 'bg-blue-50 border-blue-300' : ''}
          ${isSelected ? 'bg-primary-50 border-primary-300' : ''}
          ${compact ? 'min-h-[40px]' : ''}
        `}
        onClick={() => handleDateClick(date)}
      >
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : isSelected ? 'text-primary-600' : 'text-gray-900'}`}>
            {date && typeof date.getDate === 'function' ? date.getDate() : ''}
          </span>
          {isToday && (
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
          )}
        </div>

        {/* Events/Assignments indicators */}
        <div className="space-y-0.5">
          {dayEvents.slice(0, compact ? 1 : 2).map((event, index) => (
            <div
              key={index}
              className={`flex items-center space-x-0.5 px-1 py-0.5 rounded text-xs ${getEventColor(event)}`}
            >
              {getEventIcon(event)}
              <span className="truncate text-xs">{event.title || event.name || 'Event'}</span>
            </div>
          ))}
          
          {dayAssignments.slice(0, compact ? 1 : 1).map((assignment, index) => (
            <div
              key={`assignment-${index}`}
              className={`flex items-center space-x-0.5 px-1 py-0.5 rounded text-xs ${getEventColor(assignment)}`}
            >
              <BookOpen className="h-2 w-2" />
              <span className="truncate text-xs">{assignment.title}</span>
            </div>
          ))}

          {dayAttendance && (
            <div className="flex items-center space-x-0.5 px-1 py-0.5 rounded text-xs bg-green-100 text-green-600">
              <CheckCircle className="h-2 w-2" />
              <span className="truncate text-xs">Attendance</span>
            </div>
          )}

          {(dayEvents.length > (compact ? 1 : 2) || dayAssignments.length > (compact ? 1 : 1)) && (
            <div className="text-xs text-gray-500 text-center">
              +{Math.max(0, dayEvents.length - (compact ? 1 : 2)) + Math.max(0, dayAssignments.length - (compact ? 1 : 1))} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-4 w-4 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-3 w-3 text-gray-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => (
            <DayCell
              key={index}
              date={date}
              isToday={isToday(date)}
              isSelected={isSelected(date)}
              events={events}
              attendance={attendanceData}
              assignments={assignments}
            />
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      {showEventDetails && getUpcomingEvents().length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <h4 className="text-xs font-semibold text-gray-900 mb-1">Upcoming Events</h4>
          <div className="space-y-0.5">
            {getUpcomingEvents().slice(0, 2).map((event, index) => (
              <div key={index} className="flex items-center space-x-1 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${getEventColor(event).replace('100', '500').replace('text-', 'bg-')}`}></div>
                <span className="text-gray-600 truncate">{event.title || event.name}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(event.date || event.due_date).toLocaleDateString()}
                </span>
              </div>
            ))}
            {getUpcomingEvents().length > 2 && (
              <div className="text-xs text-gray-500 text-center">
                +{getUpcomingEvents().length - 2} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      {showEventDetails && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-100 rounded"></div>
              <span className="text-gray-600">Assignments</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-100 rounded"></div>
              <span className="text-gray-600">Attendance</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-100 rounded"></div>
              <span className="text-gray-600">Classes</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-100 rounded"></div>
              <span className="text-gray-600">Due Soon</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-100 rounded"></div>
              <span className="text-gray-600">Overdue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarWidget;
