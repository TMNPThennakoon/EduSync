import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

const DashboardCalendar = () => {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await axios.get(`${process.env.REACT_APP_API_URL}/calendar/events`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setEvents(response.data);
                setError(false);
            } catch (error) {
                console.error('Error fetching calendar events:', error);
                setError(true);
            }
        };

        fetchEvents();
    }, []);

    const [selectedEvent, setSelectedEvent] = useState(null);

    const handleEventClick = (info) => {
        const { title, extendedProps, start, end } = info.event;
        setSelectedEvent({
            title,
            start,
            end,
            ...extendedProps
        });
    };

    const closeModal = () => setSelectedEvent(null);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 relative">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Academic Calendar</h3>
            <style>{`
                .fc-button {
                    font-size: 0.75rem !important;
                    padding: 0.25rem 0.5rem !important;
                    font-weight: 500 !important;
                    text-transform: capitalize !important; 
                }
                .fc-toolbar-title {
                    font-size: 1.1rem !important;
                    font-weight: 600 !important;
                }
                .fc-header-toolbar {
                    margin-bottom: 1rem !important;
                    flex-wrap: wrap; 
                    gap: 0.5rem;
                }
                @media (max-width: 640px) {
                    .fc-header-toolbar {
                        flex-direction: column;
                        align-items: center;
                    }
                    .fc-toolbar-chunk {
                        margin-bottom: 0.5rem;
                    }
                }
                
                /* Modal Animations */
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .modal-backdrop {
                    animation: fadeIn 0.2s ease-out forwards;
                }
                .modal-content {
                    animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
            <div className="calendar-widget-container" style={{ height: '500px' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    height="100%"
                    dayMaxEvents={true}
                />
            </div>

            {/* Custom Animated Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden modal-content border border-gray-100">
                        <div className={`p-6 ${selectedEvent.type === 'Assignment' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${selectedEvent.type === 'Assignment' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {selectedEvent.type || 'Event'}
                                    </span>
                                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                                        {selectedEvent.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-1 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center text-gray-700">
                                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Time</p>
                                    <p className="font-medium">
                                        {selectedEvent.start_time
                                            ? `${selectedEvent.start_time.substring(0, 5)} ${selectedEvent.end_time ? '- ' + selectedEvent.end_time.substring(0, 5) : ''}`
                                            : 'All Day'}
                                    </p>
                                </div>
                            </div>

                            {selectedEvent.class_name && (
                                <div className="flex items-center text-gray-700">
                                    <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Class</p>
                                        <p className="font-medium">{selectedEvent.class_name}</p>
                                    </div>
                                </div>
                            )}

                            {selectedEvent.description && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-sm text-gray-600 leading-relaxed">{selectedEvent.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardCalendar;
