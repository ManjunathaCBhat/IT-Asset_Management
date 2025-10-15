import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, message, Alert } from 'antd';

import axios from 'axios';


// --- Component and Layout Imports ---
import AppLayout from './AppLayout';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import AddEquipment from './AddEquipment';
import UserManagement from './UserManagement';
import InStockView from './InStockView';
import InUse from './InUse';
import DamagedProducts from './DamagedProducts';
import EWaste from './EWaste';
import WelcomePage from './WelcomePage';
import ResetPasswordPage from './ResetPasswordPage';
import RemovedAssetsTable from './RemovedAssetsTable';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://it-asset-management-804186663775.europe-west1.run.app';

// --- Role Banner Component ---
const RoleBanner = ({ userRole }) => {
    if (userRole !== 'Viewer') return null;
    
    return (
        <div style={{
            background: '#fff7e6',
            borderLeft: '4px solid #faad14',
            margin: '0',
            padding: '10px 16px',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            width: '100%'
        }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '600', color: '#d46b08', fontSize: '13px' }}>
                    Limited Access
                </div>
                <div style={{ fontSize: '11px', color: '#ad6800' }}>
                    Viewer permissions only
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expiringItems, setExpiringItems] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);

    // --- Auth and Logout Logic ---
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        delete axios.defaults.headers.common['x-auth-token'];
        message.info('Logged out successfully!');
    };

    // --- Enhanced fetch expiring items with better error handling ---
    const fetchExpiringItems = async (token) => {
        if (!token) return;
        try {
            const response = await axios.get(`${API_BASE_URL}/api/equipment/expiring-warranty`, {
                headers: { 'x-auth-token': token }
            });
            console.log('Fetched expiring items:', response.data.length);
            setExpiringItems(response.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching expiring items:', error.response ? error.response.data : error.message);
            // Only show error message if it's not a 401 (unauthorized)
            if (error.response?.status !== 401) {
                message.warning('Unable to fetch warranty notifications');
            }
        }
    };

    // Create a refresh function that can be called from AppLayout
    const refreshExpiringItems = async () => {
        const token = localStorage.getItem('token');
        await fetchExpiringItems(token);
    };

    // Clear all notifications function - FIXED
    const clearAllNotifications = async () => {
        try {
            console.log('Clearing notifications - Before:', expiringItems.length);
            
            // Clear the notifications by creating a new empty array (immutable update)
            setExpiringItems([]); // This should trigger re-render
            setLastUpdated(new Date()); // Update last updated time
            
            console.log('Clearing notifications - After: 0');
            return Promise.resolve();
        } catch (error) {
            console.error('Error clearing notifications:', error);
            return Promise.reject(error);
        }
    };

    // Initial load effect
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                axios.defaults.headers.common['x-auth-token'] = token;
                fetchExpiringItems(token);
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    // Periodic refresh effect
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !user) return;

        // Initial fetch
        fetchExpiringItems(token);

        // Set up periodic refresh every 10 minutes
        const interval = setInterval(() => {
            fetchExpiringItems(token);
        }, 10 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user]);

    const handleLogin = (data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        axios.defaults.headers.common['x-auth-token'] = data.token;
        fetchExpiringItems(data.token);
    };

    // --- Render Logic ---
    if (loading) {
        return (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
            }}>
                <Spin size="large" />
                <div style={{ marginTop: 12, color: '#666' }}>Loading...</div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                {/* Conditional routing based on user authentication */}
                {!user ? (
                    // --- Routes for UN-AUTHENTICATED users ---
                    <>
                        <Route path="/" element={<WelcomePage />} />
                        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                ) : (
                    // --- Routes for AUTHENTICATED users ---
                    <Route
                        path="/"
                        element={
                            <div>
                                <RoleBanner userRole={user.role} />
                                <AppLayout
                                    user={user}
                                    handleLogout={handleLogout}
                                    expiringItems={expiringItems}
                                    refreshExpiringItems={refreshExpiringItems}
                                    lastUpdated={lastUpdated}
                                    clearAllNotifications={clearAllNotifications}
                                />
                            </div>
                        }
                    >
                        {/* Dashboard is the default child route for authenticated users */}
                        <Route index element={<Dashboard />} />
                        <Route path="in-stock" element={<InStockView user={user} />} />
                        <Route path="in-use" element={<InUse user={user} />} />
                        <Route path="damaged" element={<DamagedProducts user={user} />} />
                        <Route path="e-waste" element={<EWaste user={user} />} />
                        <Route path="removed" element={<RemovedAssetsTable user={user} />} />
                        <Route
                            path="add"
                            element={
                                (user.role === 'Admin' || user.role === 'Editor')
                                ? <AddEquipment />
                                : <Navigate to="/" />
                            }
                        />
                        <Route
                            path="users"
                            element={
                                user.role === 'Admin'
                                ? <UserManagement user={user} />
                                : <Navigate to="/" />
                            }
                        />
                        {/* Fallback to Dashboard for any unknown paths for authenticated users */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                )}
            </Routes>
        </Router>
    );
};

export default App;