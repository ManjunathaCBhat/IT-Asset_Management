import React, { useState } from 'react';
import axios from 'axios';
import { Form, Input, Button, Select, message, Row, Col, Card, Typography, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import './styles.css';

// Import shared configuration
import config, { getEndpointUrl, debugLog } from './config/config';

debugLog('AddEquipment loaded with API URL:', config.API_BASE_URL);

const { Option } = Select;
const { Title } = Typography;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const AddEquipment = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [directAssign, setDirectAssign] = useState(false);

  const generateAssetId = async (cat = '') => {
    const prefix = cat ? cat.substring(0, 3).toUpperCase() : 'OTH';
    try {
      const response = await axios.get(
        `${config.API_BASE_URL}/api/equipment/count/${encodeURIComponent(cat)}`,
        { headers: getAuthHeader() }
      );
      const count = response.data.count || 0;
      const newIdNumber = (count + 1).toString().padStart(3, '0');
      return `${prefix}-${newIdNumber}-${Date.now().toString().slice(-5)}`;
    } catch (err) {
      debugLog('Error generating assetId', err);
      return `${prefix}-ERR-${Date.now()}`;
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    setErrors({});
    try {
      const categoryToUse = values.category === 'Other' ? values.customCategory : values.category;
      const assetId = await generateAssetId(categoryToUse);

      const finalValues = {
        ...values,
        assetId,
        category: categoryToUse,
        status: directAssign ? 'In Use' : 'In Stock',
        warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
        purchasePrice: values.purchasePrice ? parseFloat(values.purchasePrice) : 0,
        client: values.client || null,
      };

      delete finalValues.customCategory;
      delete finalValues.damageDescription;

      if (!directAssign) {
        delete finalValues.assigneeName;
        delete finalValues.position;
        delete finalValues.employeeEmail;
        delete finalValues.phoneNumber;
        delete finalValues.department;
      }

      await axios.post(getEndpointUrl('EQUIPMENT'), finalValues, { headers: getAuthHeader() });

      message.success('Equipment added successfully!');
      form.resetFields();
      setCategory('');
      setDirectAssign(false);
      navigate(directAssign ? '/in-use' : '/in-stock');
    } catch (error) {
      debugLog('Error adding equipment:', error);
      if (error.response?.status === 400) {
        // defensive: the server may return various shapes; prefer 'message' or 'detail' if available
        debugLog('AddEquipment: error.response.data =', error?.response?.data);
        const errorMessage = error?.response?.data?.message ?? error?.response?.data?.detail ?? (typeof error?.response?.data === 'string' ? error.response.data : null);
        if (errorMessage && errorMessage.includes('Serial Number already exists')) {
          setErrors({ serialNumber: errorMessage });
          message.error('Serial number already exists. Please use a unique serial number.');
          form.setFields([{ name: 'serialNumber', errors: [errorMessage] }]);
        } else if (errorMessage && errorMessage.includes('Asset ID already exists')) {
          setErrors({ assetId: errorMessage });
          message.error('Asset ID already exists. Please try again.');
        } else if (errorMessage) {
          message.error(errorMessage);
        } else {
          // fallback when no structured message is present
          message.error('Validation error. Please check your input and try again.');
        }
      } else if (error.response?.status === 500) {
        message.error('Server error. Please try again later.');
      } else {
        message.error('Failed to add equipment. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleValuesChange = (changedValues) => {
    if (changedValues.category) {
      setCategory(changedValues.category);
    }
    if (changedValues.serialNumber && errors.serialNumber) {
      setErrors(prev => ({ ...prev, serialNumber: null }));
      form.setFields([{ name: 'serialNumber', errors: [] }]);
    }
  };

  return (
    <div className="add-equipment-container">
      <Card className="add-equipment-card" variant="outlined">
        <Title level={3} className="add-equipment-title">Add New Equipment</Title>

        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button
            type={directAssign ? "primary" : "default"}
            onClick={() => setDirectAssign(val => !val)}
          >
            {directAssign ? 'Remove Direct Assign' : 'Direct Assign'}
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={handleValuesChange}
          initialValues={{ status: 'In Stock' }}
        >
        
          <Row gutter={24}>
            <Col xs={24} lg={12}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Core Information</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: 'Please select a category!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Select a category" >
                      <Option value="Laptop">Laptop</Option>
                      <Option value="Headset">Headset</Option>
                      <Option value="Keyboard">Keyboard</Option>
                      <Option value="Mouse">Mouse</Option>
                      <Option value="Monitor">Monitor</Option>
                      <Option value="Other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select defaultValue="In Stock" disabled>
                      <Option value="In Stock">In Stock</Option>
                    </Select>
                  </Form.Item>
                </Col>
                {category === 'Other' && (
                  <Col span={24}>
                    <Form.Item
                      name="customCategory"
                      label="Custom Category Name"
                      rules={[{ required: true, message: 'Please enter a custom category name!' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Input placeholder="e.g., Docking Station" />
                    </Form.Item>
                  </Col>
                )}
                <Col span={12}>
                  <Form.Item
                    name="purchasePrice"
                    label="Purchase Price (INR)"
                    style={{ marginBottom: 12 }}
                    rules={[
                      {
                        validator: (_, value) =>
                          value === undefined || value === '' || Number(value) > 0
                            ? Promise.resolve()
                            : Promise.reject(new Error('Purchase price must be a positive number'))
                      }
                    ]}
                  >
                    <Input
                      type="number"
                      placeholder="e.g., 25000.00"
                      className="hide-number-arrows"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="client"
                    label="Client"
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Select Client" allowClear>
                      <Option value="Deloitte">Deloitte</Option>
                      <Option value="Lionguard">Lionguard</Option>
                      <Option value="Cognizant">Cognizant</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="purchaseDate"
                    label="Date of Purchase"
                    rules={[{ required: true, message: 'Please select the purchase date!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>

            <Col xs={24} lg={12}>
              <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                Hardware & Warranty Details
              </Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="model"
                    label="Model / Brand"
                    rules={[
                      { required: true, message: 'Please enter the model' },
                      { min: 2, message: 'Model must be at least 5 characters' }
                    ]}
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="e.g., Dell Latitude 5420" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="serialNumber"
                    label="Serial Number"
                    rules={[
                      { required: true, message: 'Please enter the serial number' },
                      { min: 5, message: 'Serial number must be at least 5 characters' }
                    ]}
                    validateStatus={errors.serialNumber ? 'error' : ''}
                    help={errors.serialNumber}
                    style={{ marginBottom: 12 }}
                  >
                    <Input
                      placeholder="Enter serial number"
                      style={{ borderColor: errors.serialNumber ? '#ff4d4f' : undefined }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="location"
                    label="Location"
                    rules={[{ required: true, message: 'Please select a location!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select placeholder="Select Location">
                      <Option value="Bangalore">Bangalore</Option>
                      <Option value="Mangalore">Mangalore</Option>
                      <Option value="Hyderabad">Hyderabad</Option>
                      <Option value="USA">USA</Option>
                      <Option value="Canada">Canada</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="warrantyInfo"
                    label="Warranty Expiry Date"
                    rules={[{ required: true, message: 'Please select the warranty expiry date!' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

          {directAssign && (
            <Row gutter={16}>
              <Col xs={24}>
                <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                  Assign To Employee
                </Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="assigneeName"
                      label="Assignee Name"
                      rules={[
                        { required: true, message: 'Assignee name is required.' },
                        { pattern: /^[a-zA-Z\s]+$/, message: 'Name can contain only letters and spaces.' },
                        { min: 2, message: 'Name must be at least 2 characters.' }
                      ]}
                    >
                      <Input placeholder="Enter assignee name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="position"
                      label="Position"
                    >
                      <Input placeholder="Enter position" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="employeeEmail"
                      label="Employee Email"
                      rules={[
                        { required: true, message: 'Email is required.' },
                        { type: 'email', message: 'Enter a valid email.' }
                      ]}
                    >
                      <Input placeholder="Enter email" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="phoneNumber"
                      label="Phone Number"
                      rules={[
                        { pattern: /^[0-9]{10,15}$/, message: 'Phone number must be 10-15 digits.' }
                      ]}
                    >
                      <Input
                        placeholder="Enter phone number (optional)"
                        maxLength={15}
                        onKeyPress={e => {
                          if (!/[0-9]/.test(e.key)) e.preventDefault();
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="department"
                      label="Department"
                    >
                      <Input placeholder="Enter department (optional)" />
                    </Form.Item>
                  </Col>
                </Row>
              </Col>
            </Row>
          )}

          <Form.Item
            name="comment"
            label="Additional Comments"
            style={{ marginTop: 8, marginBottom: 0 }}
          >
            <Input.TextArea rows={3} placeholder="Any other relevant details..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              style={{ width: '50%' }}
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Adding Equipment...' : 'Add Equipment'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AddEquipment;
