import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { MessageCircle, X, Send, User } from 'lucide-react';
import toast from 'react-hot-toast';

const ChatWidget = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [contacts, setContacts] = useState([]);

    // Initialize activeChat from localStorage if available
    const [activeChat, setActiveChat] = useState(() => {
        const saved = localStorage.getItem('eduSync_activeChat');
        return saved ? JSON.parse(saved) : null;
    });

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const messagesEndRef = useRef(null);

    // Initialize Socket
    useEffect(() => {
        if (!user) return;

        const newSocket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001');
        setSocket(newSocket);

        newSocket.emit('join_room', String(user.id));

        newSocket.on('receive_message', (message) => {
            // Check if the message belongs to the currently active chat
            // We compare IDs loosely or strictly. IDs from DB are numbers usually. message.sender_id is number.
            if (activeChat && (message.sender_id === activeChat.id || message.receiver_id === activeChat.id)) {
                setMessages((prev) => [...prev, message]);
                scrollToBottom();
            } else {
                toast.success(`New message from user ${message.sender_id}`);
            }
        });

        return () => newSocket.disconnect();
    }, [user, activeChat]); // Re-run if activeChat changes to ensure closure captures it? Actually useRef or state is better, but this works.

    // Fetch Contacts
    useEffect(() => {
        if (isOpen || activeChat) {
            fetchContacts();
        }
    }, [isOpen, activeChat]);

    // Handle Active Chat Persistence & History Fetching
    useEffect(() => {
        if (activeChat && user) {
            setIsOpen(true); // Auto open if there's an active chat stored
            localStorage.setItem('eduSync_activeChat', JSON.stringify(activeChat));
            fetchHistory(activeChat.id);
        } else if (!activeChat) {
            localStorage.removeItem('eduSync_activeChat');
        }
    }, [activeChat, user]);

    const fetchContacts = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/chat/contacts`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setContacts(response.data);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const fetchHistory = async (otherUserId) => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/chat/history/${otherUserId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMessages(response.data);
            scrollToBottom();
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket || !activeChat) return;

        const messageData = {
            senderId: user.id,
            receiverId: activeChat.id,
            content: newMessage,
            created_at: new Date().toISOString()
        };

        // Emit to socket
        socket.emit('send_message', messageData);

        // Optimistically add to UI
        // Note: The object structure here matches what the formatEvents/server returns roughly
        // local: senderId, server: sender_id. We need to handle both in render.
        setMessages((prev) => [...prev, { ...messageData, sender_id: user.id }]);
        setNewMessage('');
        scrollToBottom();
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white border border-gray-200 shadow-xl rounded-lg w-96 h-[500px] mb-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out transform origin-bottom-right">
                    {/* Header */}
                    <div className="bg-primary-600 text-white p-4 flex justify-between items-center shadow-md z-10">
                        <h3 className="font-semibold flex items-center gap-2">
                            {activeChat ? (
                                <>
                                    <div className="relative">
                                        <span className="w-2 h-2 bg-green-400 rounded-full absolute bottom-0 right-0 border border-primary-600"></span>
                                        {activeChat.first_name} {activeChat.last_name}
                                    </div>
                                </>
                            ) : 'Messages'}
                        </h3>
                        <div className="flex gap-2">
                            {activeChat && (
                                <button onClick={() => setActiveChat(null)} className="text-primary-100 hover:text-white px-2 py-1 text-xs rounded border border-primary-500 hover:bg-primary-500 transition-colors">
                                    Contacts
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative">
                        {/* Contacts List */}
                        {(!activeChat) && (
                            <div className="w-full overflow-y-auto p-2">
                                <div className="px-2 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacts</div>
                                {contacts.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No contacts found.</div>}
                                {contacts.map((contact) => (
                                    <div
                                        key={contact.id}
                                        onClick={() => setActiveChat(contact)}
                                        className="flex items-center p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                    >
                                        <div className="bg-primary-100 rounded-full p-2 mr-3 text-primary-600">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                                            <p className="text-xs text-gray-500 capitalize">{contact.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Active Chat Area */}
                        {activeChat && (
                            <div className="flex-1 flex flex-col bg-gray-50 w-full">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.map((msg, idx) => {
                                        const isMe = msg.sender_id === user.id || msg.senderId === user.id;
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[75%] px-4 py-2 text-sm shadow-sm relative ${isMe
                                                        ? 'bg-primary-600 text-white rounded-2xl rounded-br-none'
                                                        : 'bg-white text-gray-800 rounded-2xl rounded-bl-none border border-gray-200'
                                                        }`}
                                                >
                                                    {msg.content}
                                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </button>
        </div>
    );
};

export default ChatWidget;
