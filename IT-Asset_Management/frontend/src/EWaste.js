import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { Table, Typography, message, Input, Space, Popconfirm, Button } from 'antd';
import { DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import moment from 'moment';
import './styles.css'; // Import CSS with your layout styles
// import { validateSearchText } from './validation'; // Use if you want custom search validation
import config, { getEndpointUrl } from './config/config';

const { Title } = Typography;
const { Search } = Input;

const EWaste = ({ user }) => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
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

    const fetchEWasteAssets = async () => {
        try {
            const response = await axios.get(`${getEndpointUrl('EQUIPMENT')}`, {
                headers: getAuthHeader(),
            });
            const ewasteAssets = response.data.filter(item => item.status === 'E-Waste');
            setData(ewasteAssets);
            setFilteredData(ewasteAssets);
        } catch (error) {
            message.error('Failed to fetch E-Waste assets.');
        }
    };

    useEffect(() => {
        fetchEWasteAssets();
    }, []);

    const onSearch = (value) => {
        setSearchText(value);
        const filtered = data.filter((item) =>
            item.category?.toLowerCase().includes(value.toLowerCase()) ||
            item.model?.toLowerCase().includes(value.toLowerCase()) ||
            item.serialNumber?.toLowerCase().includes(value.toLowerCase()) ||
            item.comment?.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredData(filtered);
        setPagination((p) => ({ ...p, current: 1 }));
    };

    const handleTableChange = (pag) => {
        setPagination({
            ...pagination,
            current: pag.current,
            pageSize: pag.pageSize,
        });
    };

    const handleDelete = async (record) => {
        try {
            await axios.put(`${getEndpointUrl('EQUIPMENT')}/${record._id}`, {
                status: 'Removed',
                removalDate: moment().toISOString(),
                originalStatus: 'E-Waste',
            }, {
                headers: getAuthHeader(),
            });
            message.success(`Asset "${record.model}" (${record.serialNumber}) moved to Removed.`);
            fetchEWasteAssets();
        } catch (error) {
            message.error('Failed to move asset to Removed. Please try again.');
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
        { title: 'Category', dataIndex: 'category', key: 'category' },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
        { title: 'Comment', dataIndex: 'comment', key: 'comment',render: (text) => text || 'null' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="Are you sure to move this asset to Removed?"
                    onConfirm={() => handleDelete(record)}
                    okText="Yes"
                    cancelText="No"
                    disabled={user?.role === "Viewer"}
                >
                    <Button
                        type="link"
                        danger
                        icon={<MinusCircleOutlined />}
                        title='Move to Removed'
                        disabled={user?.role === "Viewer"}
                    >
                        Remove
                    </Button>
                </Popconfirm>
            ),
            width: 100,
            align: 'center',
        },
    ];

    return (
        <>
            <Space className="ewaste-header">
                <Title level={4}>E-Waste Assets</Title>
                <Search
                    className="ewaste-search-input"
                    placeholder="Search"
                    onSearch={onSearch}
                    onChange={(e) => onSearch(e.target.value)}
                    value={searchText}
                    allowClear
                />
            </Space>
            <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="_id"
                pagination={{
                    ...pagination,
                    total: filteredData.length,
                    showTotal: total => `Total ${total} items`,
                }}
                onChange={handleTableChange}
            />
        </>
    );
};

export default EWaste;