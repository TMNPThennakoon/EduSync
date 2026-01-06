import React, { useState, useEffect } from 'react';
import { Database, Cloud, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

const DatabaseStatus = () => {
    const [postgresStatus, setPostgresStatus] = useState('checking'); // checking, connected, disconnected
    const [supabaseStatus, setSupabaseStatus] = useState('checking');
    const [lastChecked, setLastChecked] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const checkStatus = async () => {
        setIsChecking(true);
        setPostgresStatus('checking');
        setSupabaseStatus('checking');

        // Check Postgres
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001'}/health`);
            if (response.ok) {
                const data = await response.json();
                setPostgresStatus(data.database === 'Connected' ? 'connected' : 'disconnected');
            } else {
                setPostgresStatus('disconnected');
            }
        } catch (error) {
            console.error('Postgres Check Failed:', error);
            setPostgresStatus('disconnected');
        }

        // Check Supabase
        try {
            const { data, error } = await supabase.storage.from('materials').list();
            if (error) {
                console.error('Supabase Check Failed:', error);
                setSupabaseStatus('disconnected');
            } else {
                setSupabaseStatus('connected');
            }
        } catch (error) {
            console.error('Supabase Error:', error);
            setSupabaseStatus('disconnected');
        }

        setLastChecked(new Date());
        setIsChecking(false);
    };

    useEffect(() => {
        checkStatus();
        // Auto refresh every 30 seconds
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const StatusItem = ({ icon: Icon, name, status }) => (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${status === 'connected' ? 'bg-green-100 text-green-600' :
                        status === 'disconnected' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                    }`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">
                        {status === 'checking' ? 'Checking connection...' :
                            status === 'connected' ? 'Operational' : 'Connection Failed'}
                    </p>
                </div>
            </div>
            <div>
                {status === 'checking' ? (
                    <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                ) : status === 'connected' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                )}
            </div>
        </div>
    );

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                <button
                    onClick={checkStatus}
                    disabled={isChecking}
                    className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100"
                    title="Refresh Status"
                >
                    <RefreshCw className={`h-5 w-5 ${isChecking ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusItem
                    icon={Database}
                    name="PostgreSQL Database"
                    status={postgresStatus}
                />
                <StatusItem
                    icon={Cloud}
                    name="Supabase Storage"
                    status={supabaseStatus}
                />
            </div>

            {lastChecked && (
                <p className="text-right text-xs text-gray-400 mt-4">
                    Last checked: {lastChecked.toLocaleTimeString()}
                </p>
            )}
        </div>
    );
};

export default DatabaseStatus;
