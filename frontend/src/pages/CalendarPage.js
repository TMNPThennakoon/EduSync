import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // needed for dayClick
import axios from 'axios';
import toast from 'react-hot-toast';

const CalendarPage = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/calendar/events`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setEvents(response.data);
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            toast.error('Failed to load calendar events');
        }
    };

    const handleEventClick = (info) => {
        // Simple alert or modal with details
        const { title, extendedProps } = info.event;
        const msg = `
            ${title}
            
            ${extendedProps.class_name ? `Class: ${extendedProps.class_name}` : ''}
            ${extendedProps.start_time ? `Time: ${extendedProps.start_time} - ${extendedProps.end_time || '?'}` : ''}
        `;
        alert(msg); // Replace with a nice modal if time permits
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md h-full">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Academic Calendar</h1>
            <div className="calendar-container" style={{ height: 'calc(100vh - 200px)' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    height="100%"
                />
            </div>
        </div>
    );
};

export default CalendarPage;
