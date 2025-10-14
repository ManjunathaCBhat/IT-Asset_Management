import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Typography, Modal, Button, Space, Form, Input, message, Dropdown, Popconfirm, Menu, DatePicker, Row, Col, Select } from 'antd';
import axios from 'axios';

import {
  EyeOutlined,
  MoreOutlined,
  EditOutlined,
  WarningOutlined as DamagedIcon,
  DeleteOutlined as EWasteIcon,
  RollbackOutlined,
  InfoCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './styles.css';
import config, { getEndpointUrl } from './config/config';

const { Title } = Typography;
const { Option } = Select;

const getStatusColor = (status) => ({
  'In Use': '#7ED321',
  'In Stock': '#FA8C16',
  Damaged: '#D0021B',
  'E-Waste': '#8B572A',
  Removed: '#555555'
}[status] || 'default');

const renderWarrantyTag = (date) => {
  if (!date) return 'N/A';
  const warrantyDate = moment(date);
  if (!warrantyDate.isValid()) return 'Invalid Date';
  const today = moment();
  const thirtyDays = today.clone().add(30, 'days');
  if (warrantyDate.isBefore(today, 'day')) {
    return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  if (warrantyDate.isBefore(thirtyDays, 'day')) {
    return <Tag color="warning">Soon: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  return warrantyDate.format('DD MMM YYYY');
};

const groupAssetsByEmail = (assets) => {
  const grouped = assets.reduce((acc, asset) => {
    const emailKey = asset.employeeEmail || 'unknown';
    if (!acc[emailKey]) {
      acc[emailKey] = {
        employeeEmail: emailKey,
        assigneeName: asset.assigneeName || '',
        phoneNumber: asset.phoneNumber || '',
        department: asset.department || '',
        assets: [],
      };
    }
    acc[emailKey].assets.push(asset);
    return acc;
  }, {});
  return Object.values(grouped);
};

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const locationOptions = ['Bangalore', 'Mangalore', 'Hyderabad', 'USA', 'Canada'];
const categoryOptions = ['Laptop', 'Headset', 'Keyboard', 'Mouse', 'Monitor', 'Other'];
const statusOptions = ['In Use', 'In Stock', 'Damaged', 'Removed', 'E-Waste'];

const assetTableRows = asset => [
  ['Model', asset.model || 'N/A'],
  ['Category', asset.category || 'N/A'],
  ['Serial Number', asset.serialNumber || 'N/A'],
  ['Status', asset.status || 'N/A'],
  ['Location', asset.location || 'N/A'],
  ['Purchase Price', asset.purchasePrice || 'N/A'],
  ['Purchase Date', asset.purchaseDate ? moment(asset.purchaseDate).format('YYYY-MM-DD') : 'N/A'],
  ['Warranty Expiry', asset.warrantyInfo ? moment(asset.warrantyInfo).format('DD MMM YYYY') : 'N/A'],
];

const assigneeRows = asset => [
  ['Assignee Name', asset.assigneeName || 'N/A'],
  ['Employee Email', asset.employeeEmail || 'N/A'],
  ['Position', asset.position || 'N/A'],
  ['Phone Number', asset.phoneNumber || 'N/A'],
  ['Department', asset.department || 'N/A'],
];

const InUse = ({ user }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ['10', '20', '50'],
    showSizeChanger: true,
  });

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [editForm] = Form.useForm();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployeeAssets, setSelectedEmployeeAssets] = useState(null);

  const [returnPopupVisible, setReturnPopupVisible] = useState('');
  const [returningAsset, setReturningAsset] = useState(null);

  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  // Main table columns for the grouped by employeeEmail table
  const columns = [
    {
      title: 'Sl No',
      key: 'slno',
      fixed: 'left',
      render: (_, __, i) => (pagination.current - 1) * pagination.pageSize + i + 1,
      width: 70,
    },
    { title: 'Assignee', dataIndex: 'assigneeName', key: 'assigneeName', sorter: (a, b) => (a.assigneeName || '').localeCompare(b.assigneeName || '') },
    { title: 'Email', dataIndex: 'employeeEmail', key: 'employeeEmail' },
    { title: 'Phone', dataIndex: 'phoneNumber', key: 'phoneNumber' },
    { title: 'Department', dataIndex: 'department', key: 'department', sorter: (a, b) => (a.department || '').localeCompare(b.department || '') },
    { title: 'Asset Count', key: 'assetCount', render: (_, record) => record.assets.length, sorter: (a, b) => a.assets.length - b.assets.length },
    { title: 'Actions', key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined className="icon-view" />}
          onClick={() => {
            setSelectedEmployeeAssets(record);
            setModalVisible(true);
          }}
        />
      ),
    },
  ];

  // Columns for the nested employee asset modal table
  const employeeAssetListColumns = [
    { title: 'Sl No', key: 'nestedSlNo', render: (_, __, i) => i + 1, width: 60 },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
    {
      title: 'Purchase Date',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      render: (date) => (date ? moment(date).format('YYYY-MM-DD') : 'N/A'),
    },
    {
      title: 'Warranty Expiry',
      dataIndex: 'warrantyInfo',
      key: 'warrantyInfo',
      render: renderWarrantyTag,
    },
    {
      title: 'Actions',
      key: 'individualAssetActions',
      align: 'center',
      render: (_, record) => {
        const isViewer = user?.role === "Viewer";
        return (
          <Space size="middle">
            <Button
              type="primary"
              style={{ backgroundColor: getStatusColor('In Stock'), borderColor: getStatusColor('In Stock') }}
              disabled={record.status === 'In Stock' || isViewer}
              title="Return to Stock"
              onClick={() => handleReturnClick(record)}
            >
              Return
            </Button>
            <Modal
              open={returnPopupVisible === record._id}
              onCancel={handleReturnCancel}
              footer={[
                <Button key="cancel" onClick={handleReturnCancel}>Cancel</Button>,
                <Button key="confirm" type="primary" danger onClick={handleReturnConfirm}>Confirm</Button>
              ]}
              title="Confirm Return to In Stock"
              centered
              destroyOnClose
              width={400}
            >
              <p>Are you sure you want to return this asset to stock?</p>
              <div className="asset-info-table" style={{ marginBottom: 12 }}>
                <Table
                  bordered
                  size="small"
                  pagination={false}
                  showHeader={false}
                  dataSource={[
                    ['Model', record.model || 'N/A'],
                    ['Category', record.category || 'N/A'],
                    ['Serial Number', record.serialNumber || 'N/A'],
                  ].map(([label, value], idx) => ({ key: idx, label, value }))}
                  columns={[
                    { dataIndex: 'label', key: 'label', width: 120, render: text => <strong style={{ fontSize: '13px' }}>{text}</strong> },
                    { dataIndex: 'value', key: 'value', render: text => <span style={{ fontSize: '13px' }}>{text}</span> },
                  ]}
                />
              </div>
            </Modal>
            <Button
              type="text"
              icon={<InfoCircleOutlined className="icon-info" />}
              onClick={() => handleInfoDetails(record)}
              title="View Full Details"
            />
            <Button
              type="text"
              icon={<EditOutlined className="icon-edit" />}
              onClick={() => handleEdit(record)}
              title="Edit"
              disabled={isViewer}
            />
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item key="damage" disabled={isViewer}>
                    <Popconfirm
                      title="Move asset to Damaged?"
                      onConfirm={() => handleMoveStatus(record, 'Damaged')}
                      okText="Yes"
                      cancelText="No"
                      placement="top"
                      disabled={isViewer}
                    >
                      <span className="danger-action">
                        <DamagedIcon /> Move to Damaged
                      </span>
                    </Popconfirm>
                  </Menu.Item>
                  <Menu.Item key="ewaste" disabled={isViewer}>
                    <Popconfirm
                      title="Move asset to E-Waste?"
                      onConfirm={() => handleMoveStatus(record, 'E-Waste')}
                      okText="Yes"
                      cancelText="No"
                      placement="top"
                      disabled={isViewer}
                    >
                      <span className="ewaste-action">
                        <EWasteIcon /> Move to E-Waste
                      </span>
                    </Popconfirm>
                  </Menu.Item>
                </Menu>
              }
              trigger={['click']}
              placement="bottomRight"
              disabled={isViewer}
            >
              <Button type="text" icon={<MoreOutlined className="icon-more" />} disabled={isViewer} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const fetchInUseAssets = useCallback(async () => {
    try {
  const response = await axios.get(`${getEndpointUrl('EQUIPMENT')}`, { headers: getAuthHeader() });
      const inUseAssets = response.data.filter((item) => item.status === 'In Use');
      setData(inUseAssets);
      setFilteredData(inUseAssets);
    } catch (error) {
      message.error('Failed to fetch In Use assets.');
    }
  }, []);

  useEffect(() => {
    fetchInUseAssets();
  }, [fetchInUseAssets]);

  useEffect(() => {
    setIsAnyModalOpen(isEditModalVisible || modalVisible || isInfoModalVisible || !!returnPopupVisible);
  }, [isEditModalVisible, modalVisible, isInfoModalVisible, returnPopupVisible]);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = data.filter((item) =>
      Object.values(item).some((field) => String(field).toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredData(filtered);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pag) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize,
    }));
  };

  const groupedList = groupAssetsByEmail(filteredData);

  // ===== Asset and modal logic =====

  const handleInfoDetails = (record) => {
    setSelectedAsset(record);
    setIsInfoModalVisible(true);
  };
  const handleEdit = (record) => {
    setSelectedAsset(record);
    editForm.setFieldsValue({
      ...record,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
    });
    setIsEditModalVisible(true);
  };

  const handleSaveEditView = async () => {
    try {
      const values = await editForm.validateFields();
      const updatedAsset = { ...values };
      // Only format if Moment object
      if (updatedAsset.warrantyInfo && moment.isMoment(updatedAsset.warrantyInfo)) {
        updatedAsset.warrantyInfo = updatedAsset.warrantyInfo.format('YYYY-MM-DD');
      }
      if (updatedAsset.purchaseDate && moment.isMoment(updatedAsset.purchaseDate)) {
        updatedAsset.purchaseDate = updatedAsset.purchaseDate.format('YYYY-MM-DD');
      }
      const payloadToSend = {
        category: updatedAsset.category,
        model: updatedAsset.model,
        serialNumber: updatedAsset.serialNumber,
        warrantyInfo: updatedAsset.warrantyInfo,
        location: updatedAsset.location,
        comment: updatedAsset.comment,
        assigneeName: updatedAsset.assigneeName,
        position: updatedAsset.position,
        employeeEmail: updatedAsset.employeeEmail,
        phoneNumber: updatedAsset.phoneNumber,
        department: updatedAsset.department,
        damageDescription: updatedAsset.status === 'Damaged' ? updatedAsset.damageDescription : null,
        purchaseDate: updatedAsset.purchaseDate,
        status: updatedAsset.status,  // Still included, but see below (disabled in modal)
        purchasePrice: updatedAsset.purchasePrice,
      };
      for (const k of ['assigneeName','position','employeeEmail','phoneNumber','department','comment','damageDescription'])
        if (payloadToSend[k] === "") payloadToSend[k] = null;

      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${selectedAsset._id}`,
        payloadToSend,
        { headers: getAuthHeader() }
      );
      message.success('Asset updated successfully.');
      setIsEditModalVisible(false);
      setSelectedAsset(null);
      editForm.resetFields();
      window.location.reload();
    } catch (error) {
      message.error('Failed to update asset.');
    }
  };

  // Return to stock modals
  const handleReturnClick = (record) => {
    setReturningAsset(record);
    setReturnPopupVisible(record._id);
  };
  const handleReturnCancel = () => {
    setReturnPopupVisible('');
    setReturningAsset(null);
  };
  const handleReturnConfirm = async () => {
    if (returningAsset) {
      await handleMoveStatus(returningAsset, 'In Stock');
      setReturnPopupVisible('');
      setReturningAsset(null);
    }
  };

  const handleMoveStatus = async (record, newStatus) => {
    try {
      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${record._id}`,
        { status: newStatus },
        { headers: getAuthHeader() }
      );
      message.success(`Moved to ${newStatus}`);
      setModalVisible(false);
      setIsEditModalVisible(false);
      setIsInfoModalVisible(false);
      fetchInUseAssets();
    } catch (error) {
      message.error(`Failed to update status to ${newStatus}`);
    }
  };

  // ===== Render ======
  return (
    <>
      <div className="page-header">
        <Title level={4} className="inuse-title">In Use Equipment</Title>
        <Input
          className="inuse-search-input"
          placeholder="Search all fields..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={handleSearch}
          allowClear
        />
      </div>

      <div className={isAnyModalOpen ? "instock-blur" : ""}>
        <Table
          columns={columns}
          dataSource={groupedList}
          rowKey={(record) => record.employeeEmail}
          pagination={{
            ...pagination,
            total: groupedList.length,
            showTotal: total => `Total ${total} items`
          }}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* Grouped asset modal */}
      <Modal
        title={`Assets assigned to ${selectedEmployeeAssets ? selectedEmployeeAssets.assigneeName : ''}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedEmployeeAssets(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setModalVisible(false);
              setSelectedEmployeeAssets(null);
            }}
          >Close</Button>
        ]}
        width={1000}
        centered
        destroyOnClose
      >
        {selectedEmployeeAssets ? (
          <Table
            bordered
            dataSource={selectedEmployeeAssets.assets}
            rowKey="_id"
            pagination={false}
            columns={employeeAssetListColumns}
            size="small"
            scroll={{ x: 'max-content' }}
            style={{ background: '#fff' }}
          />
        ) : (
          <p>No assets found.</p>
        )}
      </Modal>

      {/* Edit Modal */}
     {/* Edit Modal */}
     <Modal
       title="Edit Asset"
       open={isEditModalVisible}
       onCancel={() => { setIsEditModalVisible(false); setSelectedAsset(null); editForm.resetFields(); }}
       footer={[
         <Button key="cancel" onClick={() => { setIsEditModalVisible(false); setSelectedAsset(null); editForm.resetFields(); }}>Cancel</Button>,
         <Button key="submit" type="primary" onClick={handleSaveEditView}>Save</Button>
       ]}
       width={700}
       centered
       destroyOnClose
     >
       {selectedAsset && (
         <Form form={editForm} layout="vertical">
           <Row gutter={12}>
             <Col span={12}>
               <Form.Item
                 label="Model"
                 name="model"
                 rules={[
                   { required: true },
                   { min: 2, message: 'Model must be at least 2 characters' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item
                 label="Category"
                 name="category"
                 rules={[{ required: true }]}
               >
                 <Select>{categoryOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}</Select>
               </Form.Item>
             </Col>
           </Row>
           <Row gutter={12}>
             <Col span={12}>
               <Form.Item
                 label="Serial Number"
                 name="serialNumber"
                 rules={[
                   { required: true },
                   { min: 5, message: 'Serial Number must be at least 5 characters' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item
                 label="Status"
                 name="status"
                 rules={[{ required: true }]}
               >
                 <Select disabled /* Block status changing here! */>
                   {statusOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                 </Select>
               </Form.Item>
             </Col>
           </Row>
           <Row gutter={12}>
             <Col span={12}>
               <Form.Item
                 label="Location"
                 name="location"
                 rules={[{ required: true }]}
               >
                 <Select>{locationOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}</Select>
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item label="Purchase Price" name="purchasePrice">
                 <Input />
               </Form.Item>
             </Col>
           </Row>
           <Row gutter={12}>
             <Col span={12}><Form.Item label="Purchase Date" name="purchaseDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
             <Col span={12}><Form.Item label="Warranty Info" name="warrantyInfo"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
           </Row>
           <Typography.Title level={5} style={{ fontSize: '14px', marginTop: 20, marginBottom: 8 }}>Assignee Details</Typography.Title>
           <Row gutter={12}>
             <Col span={12}>
               <Form.Item
                 label="Assignee Name"
                 name="assigneeName"
                 rules={[
                   { required: true },
                   { pattern: /^[A-Za-z\s]+$/, message: 'Assignee Name must contain alphabets only' },
                   { min: 4, message: 'Assignee Name must be at least 4 characters' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item
                 label="Employee Email"
                 name="employeeEmail"
                 rules={[
                   { required: true },
                   { type: 'email', message: 'Enter a valid email' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
           </Row>
           <Row gutter={12}>
             <Col span={12}>
               <Form.Item
                 label="Position"
                 name="position"
                 rules={[
                   { required: true },
                   { pattern: /^[A-Za-z\s]+$/, message: 'Position must contain alphabets only' },
                   { min: 2, message: 'Position must be at least 2 characters' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item
                 label="Department"
                 name="department"
                 rules={[
                   { required: true },
                   { pattern: /^[A-Za-z\s]+$/, message: 'Department must contain alphabets only' },
                   { min: 2, message: 'Department must be at least 2 characters' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
           </Row>
           <Row gutter={12}>
             <Col span={12}>
               <Form.Item
                 label="Phone"
                 name="phoneNumber"
                 rules={[
                   { required: true },
                   { pattern: /^\d{10}$/, message: 'Phone number must be exactly 10 digits' }
                 ]}
               >
                 <Input />
               </Form.Item>
             </Col>
           </Row>
         </Form>
       )}
     </Modal>

      {/* Info Modal */}
      <Modal
        title="Asset Details"
        open={isInfoModalVisible}
        onCancel={() => { setIsInfoModalVisible(false); setSelectedAsset(null); }}
        footer={[
          <Button key="close" onClick={() => { setIsInfoModalVisible(false); setSelectedAsset(null); }}>Close</Button>
        ]}
        width={500}
        centered
        destroyOnClose
      >
        {selectedAsset && (
          <div>
            <Typography.Title level={5} className="asset-info-title">Asset Information</Typography.Title>
            <Table
              bordered
              size="small"
              pagination={false}
              showHeader={false}
              className="asset-info-table"
              rowClassName={() => 'small-text-row'}
              dataSource={assetTableRows(selectedAsset).map(([label, value], idx) => ({ key: idx, label, value }))}
              columns={[
                { dataIndex: 'label', key: 'label', width: 180, render: text => <strong style={{ fontSize: '13px' }}>{text}</strong> },
                { dataIndex: 'value', key: 'value', render: text => <span style={{ fontSize: '13px' }}>{text}</span> },
              ]}
              style={{ marginBottom: 18 }}
            />
            <Typography.Title level={5} className="asset-info-title">Assignee Details</Typography.Title>
            <Table
              bordered
              size="small"
              pagination={false}
              showHeader={false}
              className="asset-info-table"
              rowClassName={() => 'small-text-row'}
              dataSource={assigneeRows(selectedAsset).map(([label, value], idx) => ({ key: idx, label, value }))}
              columns={[
                { dataIndex: 'label', key: 'label', width: 180, render: text => <strong style={{ fontSize: '13px' }}>{text}</strong> },
                { dataIndex: 'value', key: 'value', render: text => <span style={{ fontSize: '13px' }}>{text}</span> },
              ]}
            />
          </div>
        )}
      </Modal>
      {/* ...return modal and other logic as you had */}
    </>
  );
};

export default InUse;