
import {
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  
  Space,
  Dropdown,
  Popconfirm,
  Tag,
  Typography,
  Table,
  Select,
  DatePicker,
} from 'antd';
import {
  WarningOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  UserAddOutlined,
  EditOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './styles.css';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { getEndpointUrl } from './config/config';

const { Text, Title } = Typography;
const { Option } = Select;


const categoryOptions = [
  'Laptop', 'Headset', 'Keyboard', 'Mouse', 'Monitor', 'Other'
];
const locationOptions = [
  'Bangalore', 'Mangalore', 'Hyderabad', 'USA', 'Canada'
];


const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};


const renderWarrantyTag = (date) => {
  if (!date) return <Text disabled>N/A</Text>;
  const warrantyDate = moment(date, 'YYYY-MM-DD');
  if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;
  const today = moment();
  const thirtyDaysFromNow = today.clone().add(30, 'days');
  if (warrantyDate.isBefore(today)) {
    return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  if (warrantyDate.isBefore(thirtyDaysFromNow)) {
    return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  return warrantyDate.format('DD MMM YYYY');
};


const groupAssetsByModel = (assets) => {
  const grouped = assets.reduce((acc, asset) => {
    const modelKey = asset.model || 'Unknown Model';
    if (!acc[modelKey]) {
      acc[modelKey] = {
        model: modelKey,
        category: asset.category || '',
        assets: [],
      };
    }
    acc[modelKey].assets.push(asset);
    return acc;
  }, {});
  return Object.values(grouped);
};


// ===== Helper functions for info table rows =====
const getHardwareRows = (asset) => [
  ['Asset ID', asset.assetId || 'N/A'],
  ['Category', asset.category || 'N/A'],
  ['Model', asset.model || 'N/A'],
  ['Serial Number', asset.serialNumber || 'N/A'],
  ['Location', asset.location || 'N/A'],
  ['Purchase Price', asset.purchasePrice != null ? asset.purchasePrice : 'N/A'],
  ['Status', asset.status || 'N/A'],
  ['Purchase Date', asset.purchaseDate ? moment(asset.purchaseDate).format('YYYY-MM-DD') : 'N/A'],
  ['Warranty Expiry', asset.warrantyInfo ? moment(asset.warrantyInfo).format('DD MMM YYYY') : 'N/A'],
  ['Client', asset.client || 'N/A'],
];
const getAssigneeRows = (asset) => [
  ['Assignee Name', asset.assigneeName || 'N/A'],
  ['Position', asset.position || 'N/A'],
  ['Employee Email', asset.employeeEmail || 'N/A'],
  ['Phone Number', asset.phoneNumber || 'N/A'],
  ['Department', asset.department || 'N/A'],
];
const getCommentsRows = (asset) => [
  asset.damageDescription ? ['Damage Description', asset.damageDescription] : null,
  ['Comment', asset.comment || 'N/A'],
  ['Created At', asset.createdAt ? moment(asset.createdAt).format('DD MMM YYYY HH:mm') : 'N/A'],
  ['Updated At', asset.updatedAt ? moment(asset.updatedAt).format('DD MMM YYYY HH:mm') : 'N/A'],
].filter(Boolean);


const InStockView = ({ user }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupedList, setGroupedList] = useState([]);
  const [assetForInfoDetails, setAssetForInfoDetails] = useState(null);


  // Modal/form states
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form] = Form.useForm();
  const [infoForm] = Form.useForm();


  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [detailsEquipment, setDetailsEquipment] = useState(null);


  const [isModelAssetsModalVisible, setIsModelAssetsModalVisible] = useState(false);
  const [selectedModelAssets, setSelectedModelAssets] = useState(null);


  const [confirmationConfig, setConfirmationConfig] = useState(null);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);


  // Edit Modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedEditAsset, setSelectedEditAsset] = useState(null);
  const [editForm] = Form.useForm();


  useEffect(() => {
    setIsAnyModalOpen(
      isAssignModalVisible ||
      isDetailsModalVisible ||
      isModelAssetsModalVisible ||
      isEditModalVisible ||
      (confirmationConfig && confirmationConfig.visible)
    );
  }, [isAssignModalVisible, isDetailsModalVisible, isModelAssetsModalVisible, isEditModalVisible, confirmationConfig]);


  // Fetch in-stock assets from API
  const fetchInStockAssets = useCallback(async () => {
    try {
  const response = await axios.get(`${getEndpointUrl('EQUIPMENT')}`, {
        headers: getAuthHeader(),
      });
      const inStockAssets = response.data.filter((item) => item.status === 'In Stock');
      setData(inStockAssets);
      setFilteredData(inStockAssets);
    } catch (error) {
      message.error('Failed to fetch In Stock assets.');
      console.error(error);
    }
  }, []);


  useEffect(() => { fetchInStockAssets(); }, [fetchInStockAssets]);


  // Filter assets based on search input
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    const filtered = data.filter((asset) =>
      Object.values(asset).some((val) =>
        val ? String(val).toLowerCase().includes(value.toLowerCase()) : false
      )
    );
    setFilteredData(filtered);
  };


  useEffect(() => {
    setGroupedList(groupAssetsByModel(filteredData));
  }, [filteredData]);


  const handleViewModelAssets = (record) => {
    setSelectedModelAssets(record);
    setIsModelAssetsModalVisible(true);
  };


  const handleAssignClick = (record) => {
    setSelectedEquipment(record);
    form.resetFields();
    setIsAssignModalVisible(true);
    setConfirmationConfig(null);
  };


  const handleAssignSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updatedData = { ...values, status: 'In Use' };
      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${selectedEquipment._id}`,
        updatedData,
        { headers: getAuthHeader() }
      );
      message.success('Asset assigned successfully!');
      setIsAssignModalVisible(false);
      window.location.reload();
    } catch (error) {
      message.error('Assignment failed. Please check the details.');
      console.error(error);
    }
  };


  const handleViewDetails = (record) => {
    setAssetForInfoDetails(record);
    setDetailsEquipment(record);
    setIsDetailsModalVisible(true);
  };


  const handleMoveStatus = async (record, newStatus) => {
    try {
      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${record._id}`,
        { status: newStatus },
        { headers: getAuthHeader() }
      );
      message.success(`Moved to ${newStatus}`);
      window.location.reload();
    } catch (error) {
      message.error(`Failed to update status to ${newStatus}`);
      console.error(error);
    }
  };


  // == Edit Section ==
  const handleEditAsset = (record) => {
    setSelectedEditAsset(record);
    editForm.setFieldsValue({
      ...record,
      purchaseDate: record.purchaseDate ? moment(record.purchaseDate) : null,
      warrantyInfo: record.warrantyInfo ? moment(record.warrantyInfo) : null,
    });
    setIsEditModalVisible(true);
  };


  const handleSaveAssetEdit = async () => {
    try {
      const values = await editForm.validateFields();


      const updatedAsset = { ...values };
      // This is the key change:
      if (updatedAsset.purchaseDate && moment.isMoment(updatedAsset.purchaseDate))
        updatedAsset.purchaseDate = updatedAsset.purchaseDate.format('YYYY-MM-DD');
      if (updatedAsset.warrantyInfo && moment.isMoment(updatedAsset.warrantyInfo))
        updatedAsset.warrantyInfo = updatedAsset.warrantyInfo.format('YYYY-MM-DD');


      updatedAsset.status = "In Stock"; // Prevent editing status!


      await axios.put(
  `${getEndpointUrl('EQUIPMENT')}/${selectedEditAsset._id}`,
        updatedAsset,
        { headers: getAuthHeader() }
      );
      message.success('Asset updated successfully!');
      setIsEditModalVisible(false);
      setSelectedEditAsset(null);
      editForm.resetFields();
      window.location.reload();
    } catch (error) {
      message.error('Asset update failed. Please check details.');
    }
  };



  const renderInStockActions = (record) => {
    const isViewer = user?.role === 'Viewer';


    const menuItems = [
      {
        key: 'damage',
        label: (
          <Popconfirm
            title={`Move asset "${record.model} (${record.serialNumber})" to Damaged?`}
            onConfirm={() => handleMoveStatus(record, 'Damaged')}
            okText="Yes"
            cancelText="No"
            placement="top"
            disabled={isViewer}
          >
            <span className="danger-action">
              <WarningOutlined /> Move to Damaged
            </span>
          </Popconfirm>
        ),
        disabled: isViewer
      },
      {
        key: 'ewaste',
        label: (
          <Popconfirm
            title={`Move asset "${record.model} (${record.serialNumber})" to E-Waste?`}
            onConfirm={() => handleMoveStatus(record, 'E-Waste')}
            okText="Yes"
            cancelText="No"
            placement="top"
            disabled={isViewer}
          >
            <span className="ewaste-action">
              <DeleteOutlined /> Move to E-Waste
            </span>
          </Popconfirm>
        ),
        disabled: isViewer
      },
    ];


    return (
      <Space>
        <Button
          type="text"
          icon={<InfoCircleOutlined className="icon-info" />}
          onClick={() => handleViewDetails(record)}
          title="View Details"
        />
        <Button
          type="text"
          icon={<UserAddOutlined className="icon-assign" />}
          onClick={() => handleAssignClick(record)}
          title="Assign"
          disabled={isViewer}
        />
        <Button
          type="text"
          icon={<EditOutlined className="icon-edit" />}
          onClick={() => handleEditAsset(record)}
          title="Edit"
          disabled={isViewer}
        />
        <Dropdown menu={{ items: menuItems }} trigger={['click']} disabled={isViewer}>
          <Button type="text" icon={<MoreOutlined className="icon-more" />} disabled={isViewer} />
        </Dropdown>
      </Space>
    );
  };


  const columns = [
    {
      title: 'Sl No',
      key: 'slno',
      render: (_, __, index) => index + 1,
      width: 70,
      fixed: 'left',
    },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'Asset Count',
      key: 'assetCount',
      render: (_, record) => record.assets.length,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined className="icon-view" />}
          onClick={() => handleViewModelAssets(record)}
          title="View Assets"
        />
      ),
    },
  ];


  const modelAssetListColumns = [
    {
      title: 'Sl No',
      key: 'nestedSlNo',
      render: (_, __, index) => index + 1,
      width: 70,
    },
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
      render: (_, record) => renderInStockActions(record),
    },
  ];


  return (
    <>
      <div className="page-header">
        <Typography.Title level={4} className="instock-title">
          In-Stock Equipment
        </Typography.Title>
        <Input.Search
          className="instock-search-input"
          placeholder="Search all fields..."
          value={searchTerm}
          onChange={handleSearch}
          allowClear
        />
      </div>


      {/* Table with BLUR effect if any modal/popconfirm is open */}
      <div className={isAnyModalOpen ? "instock-blur" : ""}>
        <Table
          columns={columns}
          dataSource={groupedList}
          rowKey="model"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </div>


      {/* --- Modals --- */}
      <Modal
        title={`Assets under Model: ${selectedModelAssets?.model || ''}`}
        open={isModelAssetsModalVisible}
        onCancel={() => {
          setIsModelAssetsModalVisible(false);
          setSelectedModelAssets(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsModelAssetsModalVisible(false);
              setSelectedModelAssets(null);
            }}
          >
            Close
          </Button>,
        ]}
        width={1000}
        centered
        destroyOnClose
      >
        {selectedModelAssets ? (
          <Table
            dataSource={selectedModelAssets.assets}
            rowKey="_id"
            columns={modelAssetListColumns}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <p>No assets found.</p>
        )}
      </Modal>


      {/* Assign Modal with Updated Validation */}
      <Modal
        title={`Assign: ${selectedEquipment?.model || ''}`}
        open={isAssignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setIsAssignModalVisible(false)}
        okText="Assign"
        destroyOnClose
        okButtonProps={{ disabled: user?.role === "Viewer" }}
        cancelButtonProps={{ disabled: user?.role === "Viewer" }}
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assigneeName"
                label="Assignee Name"
                rules={[
                  { required: true, message: 'Assignee name is required' },
                  {
                    pattern: /^[a-zA-Z\s]+$/,
                    message: 'Name should contain only letters and spaces'
                  },
                  {
                    min: 2,
                    message: 'Name must be at least 2 characters long'
                  }
                ]}
              >
                <Input
                  disabled={user?.role === "Viewer"}
                  placeholder="Enter assignee name"
                  onKeyPress={(e) => {
                    // Allow only letters and spaces
                    if (!/[a-zA-Z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    // Remove any numbers or special characters
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    form.setFieldsValue({ assigneeName: value });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Position" rules={[{ }]}>
                <Input disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="employeeEmail"
                label="Employee Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[
                  {
                    pattern: /^[0-9]{10,15}$/,
                    message: 'Phone number must be 10-15 digits only'
                  }
                ]}
              >
                <Input
                  disabled={user?.role === "Viewer"}
                  placeholder="Enter phone number"
                  maxLength={15}
                  onKeyPress={(e) => {
                    // Allow only digits
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    // Remove any non-digit characters
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    form.setFieldsValue({ phoneNumber: value });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="department" label="Department" rules={[{}]}>
                <Input disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>


      {/* Edit Modal */}
      <Modal
        title={`Edit: ${selectedEditAsset?.model || ''}`}
        open={isEditModalVisible}
        onOk={handleSaveAssetEdit}
        onCancel={() => { setIsEditModalVisible(false); setSelectedEditAsset(null); editForm.resetFields(); }}
        okText="Save"
        destroyOnClose
        okButtonProps={{ disabled: user?.role === "Viewer" }}
        cancelButtonProps={{ disabled: user?.role === "Viewer" }}
        width={700}
        centered
      >
        <Form layout="vertical" form={editForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="model" label="Model" rules={[{ required: true }]}>
                <Input disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select disabled={user?.role === "Viewer"}>
                  {categoryOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}>
                <Input disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status">
                <Input value="In Stock" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="Location" rules={[{ required: true }]}>
                <Select disabled={user?.role === "Viewer"}>
                  {locationOptions.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                </Select>
              </Form.Item>
            </Col>
           <Col span={12}>
             <Form.Item name="client" label="Client" rules={[{ required: true, message: 'Please select a client!' }]}>
               <Select disabled={user?.role === "Viewer"}>
                      <Option value="Deloitte">Deloitte</Option>
                      <Option value="Lionguard">Lionguard</Option>
                      <Option value="Cognizant">Cognizant</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purchasePrice" label="Purchase Price">
                <Input disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchaseDate" label="Purchase Date">
                <DatePicker style={{ width: "100%" }} disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="warrantyInfo" label="Warranty Expiry">
                <DatePicker style={{ width: "100%" }} disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="comment" label="Comment">
                <Input.TextArea rows={2} disabled={user?.role === "Viewer"} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>


      {/* =========== Details Modal: TABLE BASED =========== */}
      <Modal
        title={`Equipment Details: ${detailsEquipment?.model || ''}`}
        open={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        footer={null}
        width={800}
        centered
      >
        {assetForInfoDetails && (
          <div>
            <Title level={5} className="hardware-section-title">
              Hardware & General Information
            </Title>
            <Table
              bordered
              size="small"
              pagination={false}
              showHeader={false}
              className="asset-info-table"
              rowClassName={() => 'small-text-row'}
              style={{ marginBottom: 18 }}
              dataSource={getHardwareRows(assetForInfoDetails).map(([label, value], idx) => ({ key: idx, label, value }))}
              columns={[
                { dataIndex: 'label', key: 'label', width: 180, render: text => <strong style={{ fontSize: '13px' }}>{text}</strong> },
                { dataIndex: 'value', key: 'value', render: text => <span style={{ fontSize: '13px' }}>{text}</span> },
              ]}
            />



            <Title level={5} className="comments-section-title">
              Comments & Audit Trail
            </Title>
            <Table
              bordered
              size="small"
              pagination={false}
              showHeader={false}
              className="asset-info-table"
              rowClassName={() => 'small-text-row'}
              dataSource={getCommentsRows(assetForInfoDetails).map(([label, value], idx) => ({ key: idx, label, value }))}
              columns={[
                { dataIndex: 'label', key: 'label', width: 180, render: text => <strong style={{ fontSize: '13px' }}>{text}</strong> },
                { dataIndex: 'value', key: 'value', render: text => <span style={{ fontSize: '13px' }}>{text}</span> },
              ]}
            />
          </div>
        )}
      </Modal>


      {confirmationConfig && (
        <Popconfirm
          title={confirmationConfig.title}
          open={confirmationConfig.visible}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={confirmationConfig.onCancel}
          okText="Yes"
          cancelText="No"
          placement="top"
        >
          <span style={{ display: 'none' }} />
        </Popconfirm>
      )}
    </>
  );
};


export default InStockView;