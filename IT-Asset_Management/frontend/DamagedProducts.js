import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import {
  Table, Typography, Modal, Button, Space, Popconfirm, Input, message
} from 'antd';
import {
  SearchOutlined, EyeOutlined, InfoCircleOutlined, RollbackOutlined, DeleteOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './styles.css'; // <-- Import your common styles
import config, { getEndpointUrl } from './config/config';

const { Title } = Typography;

// Info modal asset table (style removed)
const InfoTable = ({ asset }) => (
  <Table
    className="asset-info-table"
    bordered
    dataSource={[
      ['Asset ID', asset.assetId || 'N/A'],
      ['Category', asset.category || 'N/A'],
      ['Model', asset.model || 'N/A'],
      ['Serial Number', asset.serialNumber || 'N/A'],
      ['Location', asset.location || 'N/A'],
      ['Purchase Price', asset.purchasePrice || 'N/A'],
      ['Comment', asset.comment || 'N/A'],
      ['Damage Description', asset.damageDescription || 'N/A'],
      ['Created At', asset.createdAt ? moment(asset.createdAt).format('DD MMM YYYY HH:mm') : 'N/A'],
      ['Updated At', asset.updatedAt ? moment(asset.updatedAt).format('DD MMM YYYY HH:mm') : 'N/A'],
    ].map(([label, value], idx) => ({ key: idx, label, value }))}
    pagination={false}
    showHeader={false}
    columns={[
      { dataIndex: 'label', key: 'label', width: 180, render: text => <strong>{text}</strong> },
      { dataIndex: 'value', key: 'value' },
    ]}
    size="middle"
  />
);

const groupAssetsByModel = (assets) => {
  const grouped = assets.reduce((acc, asset) => {
    const key = asset.model || 'Unknown Model';
    if (!acc[key]) {
      acc[key] = {
        model: key,
        category: asset.category || '',
        assets: [],
      };
    }
    acc[key].assets.push(asset);
    return acc;
  }, {});
  return Object.values(grouped);
};

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const DamagedProducts = ({ user }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalAssetsVisible, setModalAssetsVisible] = useState(false);
  const [selectedModelAssets, setSelectedModelAssets] = useState(null);
  const [assetForInfo, setAssetForInfo] = useState(null);
  const [assetToRepair, setAssetToRepair] = useState(null);
  const [repairConfirmVisible, setRepairConfirmVisible] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ['10', '20', '50'],
    showSizeChanger: true,
  });

  // Fetch assets with status Damaged
  const fetchAssets = useCallback(async () => {
    try {
  const response = await axios.get(`${getEndpointUrl('EQUIPMENT')}`, { headers: getAuthHeader() });
      const list = response.data.filter(a => a.status === 'Damaged');
      setData(list);
      setFilteredData(list);
    } catch (err) {
      message.error('Failed to fetch Damaged assets.');
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleSearch = (e) => {
    const { value } = e.target;
    setSearchTerm(value);
    const lower = value.trim().toLowerCase();
    if (!lower) {
      setFilteredData(data);
      return;
    }
    setFilteredData(data.filter(item =>
      Object.values(item).some(field =>
        String(field || '').toLowerCase().includes(lower)
      )
    ));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const groupedList = groupAssetsByModel(filteredData);

  // Table Pagination Change Handler
  const handleTableChange = (pag) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize,
    }));
  };

  // Repairs (to 'In Stock')
  const handleStartRepair = (asset) => {
    setAssetToRepair(asset);
    setRepairConfirmVisible(true);
  };
  const handleRepairConfirm = async () => {
    if (!assetToRepair) return;
    try {
      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${assetToRepair._id}`,
        { status: 'In Stock' },
        { headers: getAuthHeader() }
      );
      message.success('Asset marked as repaired.');
      setRepairConfirmVisible(false);
      setAssetToRepair(null);
      window.location.reload();
    } catch {
      message.error('Failed to mark as repaired.');
    }
  };
  const handleRepairCancel = () => {
    setAssetToRepair(null);
    setRepairConfirmVisible(false);
  };

  // Move to E-Waste
  const handleMoveToEWaste = async (asset) => {
    try {
      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${asset._id}`,
        { status: 'E-Waste' },
        { headers: getAuthHeader() }
      );
      message.success('Asset moved to E-Waste.');
      window.location.reload();
    } catch {
      message.error('Failed to move to E-Waste.');
    }
  };

  // Remove from Damaged (to 'Removed')
  const handleRemoveFromDamaged = async (asset) => {
    try {
      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${asset._id}`,
        { status: 'Removed' },
        { headers: getAuthHeader() }
      );
      message.success('Asset removed from Damaged.');
      window.location.reload();
    } catch {
      message.error('Failed to remove from Damaged.');
    }
  };

  // Serial number by pagination
  const getSerialNumber = (i) => {
    return (pagination.current - 1) * pagination.pageSize + i + 1;
  };

  // Parent table (by model)
  const columns = [
    {
      title: 'Sl No',
      key: 'slno',
      render: (_, __, i) => getSerialNumber(i),
      width: 70,
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Asset Count',
      key: 'assetCount',
      render: (_, record) => record.assets.length,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, rec) => (
        <Button
          type="link"
          icon={<EyeOutlined style={{ color: 'blue', fontSize: '18px' }} />}
          onClick={() => { setSelectedModelAssets(rec); setModalAssetsVisible(true); }}
          title='View Damaged Assets'
        />
      ),
    }
  ];

  // Sub-table for all assets of a model
  const modelAssetColumns = [
    {
      title: 'Sl No',
      key: 'assetNo',
      render: (_, __, i) => i + 1,
      width: 60,
    },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
    {
      title: 'Damage Date',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: d => (d ? moment(d).format('DD MMM YYYY') : 'N/A'),
      width: 120,
    },
    { title: 'Comment', dataIndex: 'comment', key: 'comment' },
    {
      title: 'Actions',
      key: 'assetActions',
      render: (_, asset) => (
        <Space>
          <Button
            icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
            onClick={() => setAssetForInfo(asset)}
            title="Full Details"
          />
          <Button
            icon={<RollbackOutlined />}
            type="primary"
            onClick={() => handleStartRepair(asset)}
            title="Repaired & Return to In Stock"
            disabled={user?.role === "Viewer"}
          >
            Repaired
          </Button>
          <Popconfirm
            title="Remove this asset from Damaged?"
            description="This will move the asset to the Removed section."
            onConfirm={() => handleRemoveFromDamaged(asset)}
            okText="Remove"
            cancelText="Cancel"
            disabled={user?.role === "Viewer"}
          >
            <Button
              icon={<MinusCircleOutlined style={{ color: '#555555' }} />}
              title="Remove from Damaged"
              disabled={user?.role === "Viewer"}
            />
          </Popconfirm>
          <Popconfirm
            title="Move this asset to E-Waste?"
            description="This asset will be moved to the E-Waste section."
            onConfirm={() => handleMoveToEWaste(asset)}
            okText="Move to E-Waste"
            cancelText="Cancel"
            disabled={user?.role === "Viewer"}
          >
            <Button
              icon={<DeleteOutlined style={{ color: '#8B572A' }} />}
              title="Move to E-Waste"
              disabled={user?.role === "Viewer"}
            />
          </Popconfirm>
        </Space>
      ),
      align: 'center'
    }
  ];

  return (
    <>
      {/* Blur overlay is now in CSS */}
      <div className={modalAssetsVisible ? "instock-blur" : ""}>
        <div className="damaged-header">
          <Title level={4} style={{ margin: 0 }}>Damaged Products</Title>
          <Input
            placeholder="Search all fields..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={handleSearch}
            style={{ width: 250 }}
            allowClear
          />
        </div>
        <Table
          columns={columns}
          dataSource={groupedList}
          rowKey={(rec) => rec.model}
          pagination={{
            ...pagination,
            total: groupedList.length,
            showTotal: total => `Total ${total} items`,
            showSizeChanger: true,
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Modal: Damaged assets for a model */}
      <Modal
        title={`Damaged Assets: ${selectedModelAssets?.model || ''}`}
        open={modalAssetsVisible}
        onCancel={() => { setModalAssetsVisible(false); setSelectedModelAssets(null); }}
        width={950}
        centered
        destroyOnClose
        footer={[
          <Button key="close" onClick={() => { setModalAssetsVisible(false); setSelectedModelAssets(null); }}>Close</Button>
        ]}
      >
        {selectedModelAssets && (
          <Table
            className="damaged-modal-table"
            dataSource={selectedModelAssets.assets}
            rowKey="_id"
            pagination={false}
            columns={modelAssetColumns}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        )}
      </Modal>

      {/* Info asset modal */}
      <Modal
        open={!!assetForInfo}
        title={`Asset Details (${assetForInfo?.model || ''})`}
        onCancel={() => setAssetForInfo(null)}
        width={540}
        footer={[<Button key="close" onClick={() => setAssetForInfo(null)}>Close</Button>]}
        centered
        destroyOnClose
      >
        {assetForInfo && (
          <div className="asset-info-table">
            <InfoTable asset={assetForInfo} />
          </div>
        )}
      </Modal>

      {/* Repair confirmation modal */}
      <Modal
        open={repairConfirmVisible}
        title="Confirm Asset Repair"
        onCancel={handleRepairCancel}
        width={400}
        footer={[
          <Button key="cancel" onClick={handleRepairCancel}>Cancel</Button>,
          <Button key="confirm" type="primary" onClick={handleRepairConfirm}>Confirm</Button>,
        ]}
        centered
        destroyOnClose
      >
        {assetToRepair && (
          <Table
            dataSource={[
              { label: 'Category', value: assetToRepair.category || 'N/A' },
              { label: 'Model', value: assetToRepair.model || 'N/A' },
              { label: 'Serial Number', value: assetToRepair.serialNumber || 'N/A' },
            ]}
            columns={[
              { title: '', dataIndex: 'label', key: 'label', width: 110, render: text => <strong>{text}</strong> },
              { title: '', dataIndex: 'value', key: 'value' },
            ]}
            pagination={false}
            showHeader={false}
            bordered
            size="small"
            style={{ marginBottom: 16 }}
          />
        )}
        <div style={{ marginTop: 10 }}>
          Are you sure you want to mark this asset as repaired and move to In Stock?
        </div>
      </Modal>
    </>
  );
};

export default DamagedProducts;