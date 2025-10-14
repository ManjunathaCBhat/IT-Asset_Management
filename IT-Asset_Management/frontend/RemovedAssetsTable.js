import React, { useEffect, useState } from 'react';
import { Table, Spin, Alert, Typography, Input, Space, Tag, Button, Modal, message, Popconfirm } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

import moment from 'moment';
import './styles.css'; // Import your unified/app-wide styles
import config, { getEndpointUrl } from './config/config';


const { Title } = Typography;
const { Search } = Input;

const renderWarrantyTag = (date) => {
    if (!date) return 'N/A';
    const warrantyDate = moment(date);
    if (!warrantyDate.isValid()) return 'Invalid Date';
    const today = moment();
    const thirtyDaysFromNow = moment().add(30, 'days');
    if (warrantyDate.isBefore(today, 'day')) {
        return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    if (warrantyDate.isBefore(thirtyDaysFromNow, 'day')) {
        return <Tag color="warning">Soon: {warrantyDate.format('DD MMM YYYY')}</Tag>;
    }
    return warrantyDate.format('DD MMM YYYY');
};

const RemovedAssetsTable = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allRemovedAssets, setAllRemovedAssets] = useState([]);
    const [filteredRemovedAssets, setFilteredRemovedAssets] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '50', '100'],
        showSizeChanger: true,
    });

    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        return token ? { 'x-auth-token': token } : {};
    };

    const fetchRemovedAssets = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${getEndpointUrl('EQUIPMENT_REMOVED')}`, {
                headers: getAuthHeader(),
            });
            // Debug: See data format
            console.log("API DATA:", response.data);

            // Filter for removed assets and exclude soft-deleted items as safety check
            const receivedData = response.data.filter(
                item => (item.status && item.status.toLowerCase() === 'removed') && !item.isDeleted
            );
            setAllRemovedAssets(receivedData);
            setFilteredRemovedAssets(receivedData);
        } catch (err) {
            setError('Failed to load removed asset data. Please ensure the backend is running and you have proper access.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRemovedAssets();
    }, []);

    const handleSearch = (value) => {
        setSearchText(value);
        if (value) {
            const lowercasedValue = value.toLowerCase();
            const filtered = allRemovedAssets.filter(item =>
                (item.category && item.category.toLowerCase().includes(lowercasedValue)) ||
                (item.model && item.model.toLowerCase().includes(lowercasedValue)) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(lowercasedValue)) ||
                (item.originalStatus && item.originalStatus.toLowerCase().includes(lowercasedValue)) ||
                (item.comment && item.comment.toLowerCase().includes(lowercasedValue)) ||
                (item.assigneeName && item.assigneeName.toLowerCase().includes(lowercasedValue))
            );
            setFilteredRemovedAssets(filtered);
            setPagination(p => ({ ...p, current: 1 })); // reset to first page on search
        } else {
            setFilteredRemovedAssets(allRemovedAssets);
        }
    };

    const handleTableChange = (pag) => {
        setPagination(prev => ({
            ...prev,
            current: pag.current,
            pageSize: pag.pageSize,
        }));
    };

    const handleDelete = async (record) => {
        try {
            await axios.delete(`${getEndpointUrl('EQUIPMENT')}/${record._id}`, {
                headers: getAuthHeader(),
            });
            message.success('Asset deleted successfully');
            // Remove the deleted item from both arrays
            const updatedAssets = allRemovedAssets.filter(item => item._id !== record._id);
            const updatedFilteredAssets = filteredRemovedAssets.filter(item => item._id !== record._id);
            setAllRemovedAssets(updatedAssets);
            setFilteredRemovedAssets(updatedFilteredAssets);
        } catch (error) {
            console.error('Error deleting asset:', error);
            if (error.response?.status === 403) {
                message.error('Access denied. Admin role required.');
            } else {
                message.error('Failed to delete asset. Please try again.');
            }
        }
    };

    
    const columns = [
        {
            title: 'Sl No',
            key: 'slno',
            render: (_, __, index) => (
                (pagination.current - 1) * pagination.pageSize + index + 1
            ),
            width: 70,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            filters: [
                ...Array.from(new Set(allRemovedAssets.map(item => item.category)))
            ].filter(Boolean).map(cat => ({ text: cat, value: cat })),
            onFilter: (value, record) => record.category === value,
        },
        {
            title: 'Model',
            dataIndex: 'model',
            key: 'model',
        },
        {
            title: 'Serial Number',
            dataIndex: 'serialNumber',
            key: 'serialNumber',
        },
      
        {
            title: 'Removal Date',
            dataIndex: 'updatedAt',
            key: 'removalDate',
            render: (date) => date ? moment(date).format('DD MMM YYYY HH:mm') : 'N/A',
        },
        {
            title: 'Comment',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Popconfirm
                    title="Delete Asset"
                    description="Are you sure you want to permanently delete this asset? This action cannot be undone."
                    onConfirm={() => handleDelete(record)}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                >
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        title="Delete Asset"
                    >
                        Delete
                    </Button>
                </Popconfirm>
            ),
        }
    ];

    return (
        <Spin spinning={loading} size="large" tip="Loading removed assets...">
            <div className="removed-assets-container">
                {error && (
                    <Alert
                        message="Error"
                        description={error}
                        type="error"
                        showIcon
                        className="removed-assets-alert"
                    />
                )}

                <Space direction="vertical" size="small" style={{ width: '100%' }}>
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
            <Title level={3} className="removed-assets-title" style={{ marginBottom: '4px' }}>
                Removed Assets
            </Title>
            <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#666', marginTop: '0' }}>
                Implies the asset has left the organization's control, either through sale, donation, or disposal.
            </div>
        </div>
        <Search
            className="removed-assets-search-input"
            placeholder="Search removed assets..."
            onSearch={handleSearch}
            onChange={e => handleSearch(e.target.value)}
            value={searchText}
            allowClear
        />
    </div>
</Space>


                <Table
                    className="removed-assets-table"
                    columns={columns}
                    dataSource={filteredRemovedAssets}
                    rowKey="_id"
                    pagination={{
                        ...pagination,
                        total: filteredRemovedAssets.length,
                        showTotal: total => `Total ${total} items`,
                    }}
                    onChange={handleTableChange}
                />
            </div>
        </Spin>
    );
};

export default RemovedAssetsTable;