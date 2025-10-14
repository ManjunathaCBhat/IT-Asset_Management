import React, { useEffect, useState, useCallback } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Alert, Button, Space, List } from 'antd';
import {
    DatabaseOutlined, CheckCircleOutlined, ToolOutlined, WarningOutlined, DeleteOutlined,
    LaptopOutlined, DesktopOutlined, AudioOutlined, ReloadOutlined,
    // NEW ICONS FOR KEYBOARD AND MOUSE
    AimOutlined, BorderlessTableOutlined, // Used for Mouse and Keyboard respectively
    MinusCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { message } from 'antd';
import moment from 'moment';

// Import shared configuration
import config, { getEndpointUrl, debugLog } from './config/config';

const { Title, Text } = Typography;

// Helper function for status colors (keep this consistent with AppLayout)
const getStatusColor = (status) => {
    const colors = {
        'In Use': '#7ED321',
        'In Stock': '#FA8C16', // Orange
        'Damaged': '#D0021B', // Red
        'E-Waste': '#8B572A',  // Brown
        'Removed': '#555555' // Dark gray for Removed status
    };
    return colors[status] || 'rgba(0, 0, 0, 0.85)';
};

// --- Helper function for grouping and counting by category ---
const summarizeByCategory = (assets) => {
    const categorySummary = {};

    assets.forEach(asset => {
        const category = asset.category || 'Uncategorized';
        if (!categorySummary[category]) {
            categorySummary[category] = {
                category: category,
                inUse: 0,
                inStock: 0,
                damaged: 0,
                eWaste: 0,
                removed: 0,
                total: 0
            };
        }

        switch (asset.status) {
            case 'In Use':
                categorySummary[category].inUse++;
                break;
            case 'In Stock':
                categorySummary[category].inStock++;
                break;
            case 'Damaged':
                categorySummary[category].damaged++;
                break;
            case 'E-Waste':
                categorySummary[category].eWaste++;
                break;
            case 'Removed':
                categorySummary[category].removed++;
                break;
            default:
                break;
        }
        categorySummary[category].total++;
    });

    // Explicitly add desired categories to ensure they always show up, even with 0 items
    const desiredCategories = ['Laptop', 'Headset', 'Mouse', 'Monitor', 'Keyboard'];
    desiredCategories.forEach(cat => {
        if (!categorySummary[cat]) {
            categorySummary[cat] = {
                category: cat,
                inUse: 0,
                inStock: 0,
                damaged: 0,
                eWaste: 0,
                removed: 0,
                total: 0
            };
        }
    });

    return Object.values(categorySummary).sort((a, b) => a.category.localeCompare(b.category));
};

// --- Helper function for grouping and counting by location ---
const summarizeByLocation = (assets) => {
    const locationSummary = {};

    assets.forEach(asset => {
        const location = asset.location || 'Uncategorized';
        if (!locationSummary[location]) {
            locationSummary[location] = {
                location: location,
                inUse: 0,
                inStock: 0,
                damaged: 0,
                eWaste: 0,
                removed: 0,
                total: 0
            };
        }

        switch (asset.status) {
            case 'In Use':
                locationSummary[location].inUse++;
                break;
            case 'In Stock':
                locationSummary[location].inStock++;
                break;
            case 'Damaged':
                locationSummary[location].damaged++;
                break;
            case 'E-Waste':
                locationSummary[location].eWaste++;
                break;
            case 'Removed':
                locationSummary[location].removed++;
                break;
            default:
                break;
        }
        locationSummary[location].total++;
    });

    // Explicitly add desired locations to ensure they always show up, even with 0 items
    const desiredLocations = ['Bangalore', 'Mangalore', 'Hyderabad', 'USA', 'Canada'];
    desiredLocations.forEach(loc => {
        if (!locationSummary[loc]) {
            locationSummary[loc] = {
                location: loc,
                inUse: 0,
                inStock: 0,
                damaged: 0,
                eWaste: 0,
                removed: 0,
                total: 0
            };
        }
    });

    return Object.values(locationSummary).sort((a, b) => a.location.localeCompare(b.location));
};

// Helper to get icon based on category name
const getCategoryIcon = (category) => {
    switch (category) {
        case 'Computer':
        case 'Laptop':
            return <LaptopOutlined style={{ fontSize: '32px', color: '#4A90E2' }} />;
        case 'Headset':
            return <AudioOutlined style={{ fontSize: '32px', color: '#4A90E2' }} />;
        case 'Mouse':
            return <AimOutlined style={{ fontSize: '32px', color: '#4A90E2' }} />;
        case 'Keyboard':
            return <BorderlessTableOutlined style={{ fontSize: '32px', color: '#4A90E2' }} />;
        case 'Monitor':
            return <DesktopOutlined style={{ fontSize: '32px', color: '#4A90E2' }} />;
        default:
            return <DatabaseOutlined style={{ fontSize: '32px', color: '#888' }} />;
    }
};

// Helper to get icon based on location name
const getLocationIcon = (location) => {
    switch (location) {
        case 'Bangalore':
        case 'Mangalore':
        case 'Hyderabad':
            return <DatabaseOutlined style={{ fontSize: '32px', color: '#52C41A' }} />;
        case 'USA':
        case 'Canada':
            return <DatabaseOutlined style={{ fontSize: '32px', color: '#1890FF' }} />;
        default:
            return <DatabaseOutlined style={{ fontSize: '32px', color: '#888' }} />;
    }
};

const Dashboard = () => {
    const [summaryData, setSummaryData] = useState({
        totalAssets: 0,
        inUse: 0,
        inStock: 0,
        damaged: 0,
        eWaste: 0,
        removed: 0,
    });
    const [categoryAssetSummaries, setCategoryAssetSummaries] = useState([]);
    const [locationAssetSummaries, setLocationAssetSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const allAssetsRes = await axios.get(getEndpointUrl('EQUIPMENT'), {
                headers: getAuthHeader(),
                params: { _t: Date.now() }
            });

            const allAssets = allAssetsRes.data;

            // Calculate summary data from actual assets
            const calculatedSummary = {
                totalAssets: allAssets.length,
                inUse: allAssets.filter(asset => asset.status === 'In Use').length,
                inStock: allAssets.filter(asset => asset.status === 'In Stock').length,
                damaged: allAssets.filter(asset => asset.status === 'Damaged').length,
                eWaste: allAssets.filter(asset => asset.status === 'E-Waste').length,
                removed: allAssets.filter(asset => asset.status === 'Removed').length,
            };

            setSummaryData(calculatedSummary);

            const groupedSummary = summarizeByCategory(allAssets);
            setCategoryAssetSummaries(groupedSummary);

            const locationSummary = summarizeByLocation(allAssets);
            setLocationAssetSummaries(locationSummary);

            setLastUpdated(new Date());

        } catch (err) {
            console.error('Failed to fetch dashboard data:', err.response ? err.response.data : err.message);
            setError('Failed to load dashboard data. Please check your network and backend server.');
        } finally {
            setLoading(false);
        }
    }, [getAuthHeader]);

    // Manual refresh function
    const refreshDashboard = async () => {
        try {
            await fetchDashboardData();
            message.success('Dashboard data refreshed successfully');
        } catch (error) {
            message.error('Failed to refresh dashboard data');
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    return (
        <div>
            {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: '20px' }} />}

            {/* Header with Refresh Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={4} style={{ margin: 0 }}>Dashboard Overview</Title>
                           </div>

            {/* Top Row for Overall Summary Statistics */}
            <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card variant="outlined" hoverable style={{ minHeight: '80px' }}>
                        <Statistic
                            title="Total Assets"
                            value={summaryData.totalAssets}
                            prefix={<DatabaseOutlined style={{ color: '#4A90E2', fontSize: '16px' }} />}
                            valueStyle={{ fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card variant="outlined" hoverable style={{ minHeight: '80px' }}>
                        <Statistic
                            title="In Use"
                            value={summaryData.inUse}
                            prefix={<ToolOutlined style={{ color: '#7ED321', fontSize: '16px' }} />}
                            valueStyle={{ fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card variant="outlined" hoverable style={{ minHeight: '80px' }}>
                        <Statistic
                            title="In Stock"
                            value={summaryData.inStock}
                            prefix={<CheckCircleOutlined style={{ color: '#FA8C16', fontSize: '16px' }} />}
                            valueStyle={{ fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card variant="outlined" hoverable style={{ minHeight: '80px' }}>
                        <Statistic
                            title="Damaged"
                            value={summaryData.damaged}
                            prefix={<WarningOutlined style={{ color: '#D0021B', fontSize: '16px' }} />}
                            valueStyle={{ fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card variant="outlined" hoverable style={{ minHeight: '80px' }}>
                        <Statistic
                            title="E-Waste"
                            value={summaryData.eWaste}
                            prefix={<DeleteOutlined style={{ color: '#8B572A', fontSize: '16px' }} />}
                            valueStyle={{ fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} xl={4}>
                    <Card variant="outlined" hoverable style={{ minHeight: '80px' }}>
                        <Statistic
                            title="Removed"
                            value={summaryData.removed}
                            prefix={<MinusCircleOutlined style={{ color: getStatusColor('Removed'), fontSize: '16px' }} />}
                            valueStyle={{ fontSize: '20px' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Title level={5} style={{ marginBottom: '12px', marginTop: '20px' }}>Assets by Category</Title>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" tip="Loading Categories..." />
                </div>
            ) : categoryAssetSummaries.length === 0 ? (
                <Alert
                    message="No Asset Categories Found"
                    description="It looks like there are no assets categorized yet or data is not available."
                    type="info"
                    showIcon
                />
            ) : (
                <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
                    {categoryAssetSummaries.map((categoryData) => (
                        <Col key={categoryData.category} xs={24} sm={12} md={8} lg={6} xl={4}>
                            <Card
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text strong style={{ fontSize: '14px' }}>
                                            {categoryData.category} ({categoryData.total})
                                        </Text>
                                    </div>
                                }
                                hoverable
                                styles={{ body: { padding: '12px' } }}
                                variant="outlined"
                                style={{ minHeight: '160px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ width: '35%', display: 'flex', justifyContent: 'center' }}>
                                        {getCategoryIcon(categoryData.category)}
                                    </div>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={[
                                            { label: 'In Use', count: categoryData.inUse, color: getStatusColor('In Use') },
                                            { label: 'In Stock', count: categoryData.inStock, color: getStatusColor('In Stock') },
                                            { label: 'Damaged', count: categoryData.damaged, color: getStatusColor('Damaged') },
                                            { label: 'E-Waste', count: categoryData.eWaste, color: getStatusColor('E-Waste') },
                                            { label: 'Removed', count: categoryData.removed, color: getStatusColor('Removed') },
                                        ]}
                                        renderItem={item => (
                                            <List.Item style={{ padding: '2px 0', borderBottom: 'none' }}>
                                                <List.Item.Meta
                                                    title={<Text style={{ color: item.color, fontSize: '11px' }}>{item.label}</Text>}
                                                />
                                                <div>
                                                    <Text style={{ fontWeight: 'bold', fontSize: '11px', color: item.color }}>{item.count}</Text>
                                                </div>
                                            </List.Item>
                                        )}
                                        style={{ padding: 0, width: '65%' }}
                                    />
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            <Title level={5} style={{ marginBottom: '12px', marginTop: '20px' }}>Assets by Location</Title>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" tip="Loading Locations..." />
                </div>
            ) : locationAssetSummaries.length === 0 ? (
                <Alert
                    message="No Asset Locations Found"
                    description="It looks like there are no assets with location data yet or data is not available."
                    type="info"
                    showIcon
                />
            ) : (
                <Row gutter={[8, 8]}>
                    {locationAssetSummaries.map((locationData) => (
                        <Col key={locationData.location} xs={24} sm={12} md={8} lg={6} xl={4}>
                            <Card
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text strong style={{ fontSize: '14px' }}>
                                            {locationData.location} ({locationData.total})
                                        </Text>
                                    </div>
                                }
                                hoverable
                                styles={{ body: { padding: '12px' } }}
                                variant="outlined"
                                style={{ minHeight: '160px' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ width: '35%', display: 'flex', justifyContent: 'center' }}>
                                        {getLocationIcon(locationData.location)}
                                    </div>
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={[
                                            { label: 'In Use', count: locationData.inUse, color: getStatusColor('In Use') },
                                            { label: 'In Stock', count: locationData.inStock, color: getStatusColor('In Stock') },
                                            { label: 'Damaged', count: locationData.damaged, color: getStatusColor('Damaged') },
                                            { label: 'E-Waste', count: locationData.eWaste, color: getStatusColor('E-Waste') },
                                            { label: 'Removed', count: locationData.removed, color: getStatusColor('Removed') },
                                        ]}
                                        renderItem={item => (
                                            <List.Item style={{ padding: '2px 0', borderBottom: 'none' }}>
                                                <List.Item.Meta
                                                    title={<Text style={{ color: item.color, fontSize: '11px' }}>{item.label}</Text>}
                                                />
                                                <div>
                                                    <Text style={{ fontWeight: 'bold', fontSize: '11px', color: item.color }}>{item.count}</Text>
                                                </div>
                                            </List.Item>
                                        )}
                                        style={{ padding: 0, width: '65%' }}
                                    />
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
};

export default Dashboard;