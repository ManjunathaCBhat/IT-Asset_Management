import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    Layout, Popover, Badge, List, Typography,
    Avatar, Dropdown, Space, Button, Spin, message, Tooltip, Tag
} from 'antd';
import {
    PlusOutlined, DatabaseOutlined, BellOutlined, UserOutlined,
    LogoutOutlined, TeamOutlined, CheckCircleOutlined,
    WarningOutlined, DeleteOutlined, SettingOutlined, MinusCircleOutlined, 
    AppstoreOutlined, ReloadOutlined, ClockCircleOutlined, ClearOutlined
} from '@ant-design/icons';
import moment from 'moment';


const { Header, Content } = Layout;
const { Text } = Typography;


// --- Helper for status colors (consistent across the app) ---
const getStatusColor = (status) => {
    const colors = {
        'Dashboard': '#4A90E2',
        'In Use': '#7ED321',
        'In Stock': '#FA8C16',
        'Damaged': '#D0021B',
        'E-Waste': '#8B572A',
        'Add Equipment': '#1890ff',
        'Removed': '#555555'
    };
    return colors[status] || 'default';
};


// --- Helper function to get status tag color ---
const getStatusTagColor = (status) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
        case 'in use':
            return 'green';
        case 'in stock':
            return 'orange';
        case 'damaged':
            return 'red';
        case 'e-waste':
            return 'brown';
        case 'removed':
            return 'default';
        default:
            return 'blue';
    }
};


// --- Helper function to determine the correct route based on asset status ---
const getAssetRoute = (item) => {
    const status = item.status?.toLowerCase();
    const searchParams = `search=${encodeURIComponent(item.serialNumber)}&highlight=true`;
    
    switch (status) {
        case 'in use':
            return `/in-use?${searchParams}`;
        case 'in stock':
            return `/in-stock?${searchParams}`;
        case 'damaged':
            return `/damaged?${searchParams}`;
        case 'e-waste':
            return `/e-waste?${searchParams}`;
        case 'removed':
            return `/removed?${searchParams}`;
        default:
            return `/in-stock?${searchParams}`;
    }
};


// --- Logo Component ---
const Logo = () => {
    const logoStyle = {
        height: '32px',
        marginRight: '24px',
        display: 'flex',
        alignItems: 'center',
        fontSize: '20px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
    };
    const cirrusStyle = { color: '#4A90E2' };
    const labsStyle = { color: '#D0021B' };
    return (
        <div style={logoStyle}>
            <span style={cirrusStyle}>cirrus</span>
            <span style={labsStyle}>labs</span>
        </div>
    );
};


const AppLayout = ({ user, handleLogout, expiringItems, refreshExpiringItems, lastUpdated, clearAllNotifications }) => {
    const location = useLocation();
    const [refreshing, setRefreshing] = useState(false);
    const [popoverVisible, setPopoverVisible] = useState(false);
    const [clearing, setClearing] = useState(false);

    // Add persistent cleared notifications state
    const [clearedNotifications, setClearedNotifications] = useState(() => {
        const key = getClearedNotificationsKey(user);
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    });


    // Manual refresh function
    const handleRefreshNotifications = async (e) => {
        e.stopPropagation();
        setRefreshing(true);
        try {
            await refreshExpiringItems();
            message.success('Notifications refreshed successfully');
        } catch (error) {
            message.error('Failed to refresh notifications');
        } finally {
            setRefreshing(false);
        }
    };


    // Updated clear all notifications function with persistence
    const handleClearAllNotifications = async (e) => {
        e.stopPropagation();
        setClearing(true);
        try {
            if (clearAllNotifications) {
                await clearAllNotifications();
            }
            const notificationIds = expiringItems.map(item => item.serialNumber || item.id);
            const updatedCleared = [...clearedNotifications, ...notificationIds];
            setClearedNotifications(updatedCleared);
            localStorage.setItem(getClearedNotificationsKey(user), JSON.stringify(updatedCleared));
            message.success('All notifications cleared');
        } catch (error) {
            message.error('Failed to clear notifications');
        } finally {
            setClearing(false);
        }
    };


    // Update cleared notifications when user changes
    React.useEffect(() => {
        const key = getClearedNotificationsKey(user);
        const saved = localStorage.getItem(key);
        setClearedNotifications(saved ? JSON.parse(saved) : []);
    }, [user]);


    // Define main navigation items for the top bar
    const mainNavItems = [
        { key: '/', icon: <AppstoreOutlined />, label: 'Dashboard', statusKey: 'Dashboard' },
        { key: '/in-stock', icon: <DatabaseOutlined/>, label: 'In Stock', statusKey: 'In Stock' },
        { key: '/in-use', icon: <CheckCircleOutlined  />, label: 'In Use', statusKey: 'In Use' },
        { key: '/damaged', icon: <WarningOutlined />, label: 'Damaged', statusKey: 'Damaged' },
        { key: '/e-waste', icon: <DeleteOutlined />, label: 'E-Waste', statusKey: 'E-Waste' },
        { key: '/removed', icon: <MinusCircleOutlined />, label: 'Removed', statusKey: 'Removed' },
    ];

    // Filter out cleared notifications
    const filteredExpiringItems = expiringItems.filter(item => 
        !clearedNotifications.includes(item.serialNumber || item.id)
    );


    // Enhanced notification content with status display and improved navigation
    const notificationContent = (
        <div style={{ width: 450 }}>
            {/* Header with refresh button */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 0 8px 0',
                borderBottom: '1px solid #f0f0f0',
                marginBottom: '8px',
                position: 'sticky',
                top: 0,
                backgroundColor: '#fff',
                zIndex: 1
            }}>
                <div>
                    <Text strong style={{ fontSize: '14px' }}>
                        Warranty Alerts
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        Expires within 30 days
                    </Text>
                </div>
                <Tooltip title="Refresh notifications">
                    <Button 
                        type="text" 
                        size="small" 
                        icon={<ReloadOutlined />}
                        onClick={handleRefreshNotifications}
                        loading={refreshing}
                        style={{ 
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    />
                </Tooltip>
            </div>


            {/* Scrollable Notifications List */}
            <div style={{ 
                maxHeight: '280px',
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: '4px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#d9d9d9 #f0f0f0'
            }}>
                <style>
                    {`
                        .notification-scroll::-webkit-scrollbar {
                            width: 6px;
                        }
                        .notification-scroll::-webkit-scrollbar-track {
                            background: #f0f0f0;
                            border-radius: 3px;
                        }
                        .notification-scroll::-webkit-scrollbar-thumb {
                            background: #d9d9d9;
                            border-radius: 3px;
                        }
                        .notification-scroll::-webkit-scrollbar-thumb:hover {
                            background: #bfbfbf;
                        }
                    `}
                </style>
                <div className="notification-scroll" style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredExpiringItems.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '40px 20px',
                            color: '#666'
                        }}>
                            <CheckCircleOutlined style={{ fontSize: '32px', marginBottom: '12px', color: '#52c41a' }} />
                            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                No warranty alerts
                            </div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                All equipment warranties are up to date
                            </Text>
                        </div>
                    ) : (
                        <List
                            dataSource={filteredExpiringItems}
                            split={false}
                            renderItem={(item, index) => {
                                const isExpired = moment(item.warrantyInfo).isBefore(moment());
                                const daysUntilExpiry = moment(item.warrantyInfo).diff(moment(), 'days');
                                const assetRoute = getAssetRoute(item);
                                
                                return (
                                    <List.Item 
                                        style={{ 
                                            padding: '12px 8px', 
                                            borderBottom: index === filteredExpiringItems.length - 1 ? 'none' : '1px solid #f5f5f5',
                                            margin: '0',
                                            transition: 'background-color 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ width: '100%' }}>
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                gap: '12px'
                                            }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {/* Model name and Status on same line */}
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '8px',
                                                        marginBottom: '4px',
                                                        flexWrap: 'wrap'
                                                    }}>
                                                        <Link 
                                                            to={assetRoute}
                                                            style={{ 
                                                                fontSize: '13px',
                                                                fontWeight: '500',
                                                                color: '#1890ff',
                                                                textDecoration: 'none',
                                                                lineHeight: '1.4'
                                                            }}
                                                            onClick={() => {
                                                                console.log('Navigating to:', assetRoute);
                                                                console.log('Item:', item);
                                                                setPopoverVisible(false);
                                                            }}
                                                        >
                                                            {item.model}
                                                        </Link>
                                                        {item.status && (
                                                            <Tag 
                                                                color={getStatusTagColor(item.status)}
                                                                style={{ 
                                                                    fontSize: '9px',
                                                                    padding: '2px 6px',
                                                                    margin: 0,
                                                                    lineHeight: '14px',
                                                                    borderRadius: '8px',
                                                                    fontWeight: '500'
                                                                }}
                                                            >
                                                                {item.status.toUpperCase()}
                                                            </Tag>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Serial Number */}
                                                    <div style={{ 
                                                        fontSize: '12px', 
                                                        color: '#666', 
                                                        marginTop: '3px',
                                                        lineHeight: '1.3'
                                                    }}>
                                                        SN: {item.serialNumber}
                                                    </div>
                                                    
                                                    {/* Warranty expiration date */}
                                                    <div style={{ 
                                                        fontSize: '11px', 
                                                        color: '#999', 
                                                        marginTop: '3px',
                                                        lineHeight: '1.3'
                                                    }}>
                                                        Expires: {moment(item.warrantyInfo).format('DD MMM YYYY')}
                                                    </div>
                                                </div>
                                                
                                                {/* Expiry status badge */}
                                                <div style={{ 
                                                    marginLeft: '8px', 
                                                    textAlign: 'right',
                                                    flexShrink: 0
                                                }}>
                                                    {isExpired ? (
                                                        <Text 
                                                            type="danger" 
                                                            style={{ 
                                                                fontSize: '10px', 
                                                                fontWeight: '600',
                                                                backgroundColor: '#fff2f0',
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                border: '1px solid #ffccc7'
                                                            }}
                                                        >
                                                            EXPIRED
                                                        </Text>
                                                    ) : (
                                                        <Text 
                                                            type="warning" 
                                                            style={{ 
                                                                fontSize: '10px',
                                                                fontWeight: '600',
                                                                backgroundColor: '#fffbe6',
                                                                padding: '3px 8px',
                                                                borderRadius: '12px',
                                                                border: '1px solid #ffe58f'
                                                            }}
                                                        >
                                                            {daysUntilExpiry <= 0 ? 'TODAY' : `${daysUntilExpiry}D LEFT`}
                                                        </Text>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </List.Item>
                                );
                            }}
                        />
                    )}
                </div>
            </div>


            {/* Clear All Button Section */}
            {filteredExpiringItems.length > 0 && (
                <div style={{ 
                    padding: '8px 0',
                    borderTop: '1px solid #f0f0f0',
                    borderBottom: '1px solid #f0f0f0',
                    textAlign: 'center'
                }}>
                    <Button 
                        type="text"
                        size="small"
                        icon={<ClearOutlined />}
                        onClick={handleClearAllNotifications}
                        loading={clearing}
                        style={{
                            color: '#ff4d4f',
                            fontSize: '12px',
                            fontWeight: '500'
                        }}
                        disabled={clearing}
                    >
                        {clearing ? 'Clearing...' : 'Clear All'}
                    </Button>
                </div>
            )}


            {/* Footer with last updated time */}
            <div style={{ 
                textAlign: 'center', 
                padding: '10px 0 8px 0',
                backgroundColor: '#fafafa',
                position: 'sticky',
                bottom: 0,
                zIndex: 1
            }}>
                <Text style={{ fontSize: '10px', color: '#999' }}>
                    <ClockCircleOutlined style={{ marginRight: '4px' }} />
                    Last updated: {lastUpdated ? moment(lastUpdated).format('HH:mm:ss') : 'Never'}
                </Text>
            </div>
        </div>
    );


    // Dynamic User Menu Items
    const getUserMenuItems = () => {
        const items = [
            { 
                key: 'user-info', 
                label: <Text strong>{user?.name || user?.email}</Text>, 
                disabled: true 
            },
            { 
                key: 'role', 
                label: <Text type="secondary">Role: {user?.role}</Text>, 
                disabled: true 
            },
            { key: 'divider-1', type: 'divider' },
        ];


        if (user?.role === 'Admin') {
            items.push({
                key: 'user-management',
                label: <Link to="/users">User Management</Link>,
                icon: <TeamOutlined />
            });
        }


        items.push(
            { key: 'divider-2', type: 'divider' },
            { 
                key: 'logout', 
                label: 'Logout', 
                icon: <LogoutOutlined />, 
                onClick: handleLogout 
            }
        );
        return items;
    };


    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header
                style={{
                    padding: '0 24px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 2px 8px #f0f1f2',
                    height: '64px'
                }}
            >
                {/* Left Section: Logo */}
                <div>
                    <Logo />
                </div>


                {/* Middle Section: Main Navigation Buttons & Add Equipment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                    <Space size="middle">
                        {mainNavItems.map(item => {
                            const isActive = location.pathname === item.key;
                            const buttonColor = getStatusColor(item.statusKey);


                            return (
                                <Link to={item.key} key={item.key}>
                                    <Button
                                        type={isActive ? 'primary' : 'default'}
                                        icon={item.icon}
                                        style={{
                                            backgroundColor: isActive ? buttonColor : 'transparent',
                                            borderColor: isActive ? buttonColor : '#d9d9d9',
                                            color: isActive ? '#fff' : 'rgba(0, 0, 0, 0.85)',
                                            fontWeight: isActive ? 'bold' : 'normal',
                                            height: '40px',
                                            padding: '0 15px',
                                            fontSize: '14px',
                                        }}
                                    >
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}
                        {/* Add Equipment Button - Conditionally Rendered */}
                        {(user?.role === 'Admin' || user?.role === 'Editor') && (
                            <Link to="/add">
                                <Button
                                    type={location.pathname === '/add' ? 'primary' : 'default'}
                                    icon={<PlusOutlined />}
                                    style={{
                                        backgroundColor: location.pathname === '/add' ? getStatusColor('Add Equipment') : 'transparent',
                                        borderColor: location.pathname === '/add' ? getStatusColor('Add Equipment') : '#d9d9d9',
                                        color: location.pathname === '/add' ? '#fff' : 'rgba(0, 0, 0, 0.85)',
                                        fontWeight: location.pathname === '/add' ? 'bold' : 'normal',
                                        height: '40px',
                                        padding: '0 15px',
                                        fontSize: '14px',
                                    }}
                                >
                                    Add Equipment
                                </Button>
                            </Link>
                        )}
                    </Space>
                </div>


                {/* Right Section: Notifications and User Profile with Role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Popover 
                        content={notificationContent} 
                        title={null}
                        trigger="click" 
                        placement="bottomRight"
                        overlayStyle={{ 
                            maxWidth: '480px',
                            boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        open={popoverVisible}
                        onOpenChange={setPopoverVisible}
                    >
                        <Tooltip 
                            title="Warranty Notifications" 
                            placement="bottom"
                            overlayInnerStyle={{ fontSize: '12px' }}
                        >
                            <div style={{ position: 'relative', cursor: 'pointer' }}>
                                <Badge 
                                    count={filteredExpiringItems.length} 
                                    size="small"
                                >
                                    <BellOutlined 
                                        style={{ 
                                            fontSize: '20px', 
                                            cursor: 'pointer'
                                        }} 
                                    />
                                </Badge>
                                {refreshing && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '-2px',
                                        right: '-2px',
                                        width: '12px',
                                        height: '12px'
                                    }}>
                                        <Spin size="small" />
                                    </div>
                                )}
                            </div>
                        </Tooltip>
                    </Popover>


                    {/* Avatar with Role Below */}
                    <Dropdown menu={{ items: getUserMenuItems() }} placement="bottomRight">
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}>
                            <Avatar
                                style={{ backgroundColor: '#1890ff' }}
                                icon={user?.name ? null : <UserOutlined />}
                            >
                                {user?.name ? user.name.charAt(0).toUpperCase() : null}
                            </Avatar>
                            <Text style={{
                                fontSize: '11px',
                                color: '#666',
                                marginTop: '2px',
                                textAlign: 'center'
                            }}>
                                {user?.role}
                            </Text>
                        </div>
                    </Dropdown>
                </div>
            </Header>
            <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
                <div style={{ padding: 24, background: '#fff' }}>
                    <Outlet />
                </div>
            </Content>
        </Layout>
    );
};


// Helper to get a unique localStorage key for cleared notifications per user
const getClearedNotificationsKey = (user) => 
    user?.email ? `clearedNotifications_${user.email}` : 'clearedNotifications';


export default AppLayout;
