import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Typography,
  Popconfirm,
  Space
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import './styles.css';
import config, { getEndpointUrl } from './config/config';

const { Title } = Typography;
const { Option } = Select;

const roles = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Editor', label: 'Editor' },
  { value: 'Viewer', label: 'Viewer' }
];

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [editModal, setEditModal] = useState({ visible: false, user: null });

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/api/users`, {
        headers: getAuthHeader()
      });
      setUsers(res.data);
    } catch (err) {
      message.error(
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to fetch users.'
      );
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Show add modal
  const showAddUserModal = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  // Add user handler
  const handleAddUser = async (values) => {
    try {
      await axios.post(
        `${config.API_BASE_URL}/api/users/create`,
        {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role
        },
        { headers: getAuthHeader() }
      );
      message.success('User created successfully!');
      setIsModalVisible(false);
      fetchUsers();
    } catch (err) {
      message.error(
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to create user.'
      );
    }
  };

  // Show edit modal
  const showEditModal = (user) => {
    setEditModal({ visible: true, user });
    setTimeout(() => {
      formEdit.setFieldsValue({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role
      });
    }, 0);
  };

  // Edit user handler
  const handleEditUser = async () => {
    try {
      const values = await formEdit.validateFields();
      const payload = {
        name: values.name,
        email: values.email,
        role: values.role
      };
      if (values.password && values.password.trim().length > 0) {
        payload.password = values.password;
      }
      await axios.put(
        `${config.API_BASE_URL}/api/users/${editModal.user._id}`,
        payload,
        { headers: getAuthHeader() }
      );
      message.success('User updated successfully!');
      setEditModal({ visible: false, user: null });
      fetchUsers();
      formEdit.resetFields();
    } catch (err) {
      message.error(
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to update user.'
      );
    }
  };

  // Delete user handler
  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${config.API_BASE_URL}/api/users/${userId}`, {
        headers: getAuthHeader()
      });
      message.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      message.error(
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to delete user.'
      );
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Sl.',
      key: 'sl',
      render: (_, __, index) => index + 1,
      width: 60,
      align: 'center'
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width:120
    },
    {
      title: 'Edit',
      key: 'edit',
      align: 'center',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => showEditModal(record)}
        >
          Edit
        </Button>
      )
    },
    {
      title: 'Delete',
      key: 'delete',
      align: 'center',
      width: 90,
      render: (_, record) => (
        <Popconfirm
          title="Are you sure you want to delete this user?"
          onConfirm={() => handleDeleteUser(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Popconfirm>
      )
    }
  ];

  return (
    <Card>
      <div
        className="user-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18
        }}
      >
        <Title level={4} className="user-title" style={{ margin: 0 }}>
          User Management
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddUserModal}>
          Add User
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100']
        }}
        className="user-table"
      />

      {/* Add User Modal */}
      <Modal
        title="Add New User"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddUser}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter the user's name" },
              { min: 4, message: 'Name must be at least 4 characters' }
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, type: 'email', message: "Please enter a valid email" },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  const emailExists = users.some(
                    u => u.email.toLowerCase() === value.toLowerCase()
                  );
                  return emailExists
                    ? Promise.reject(new Error('Email already exists'))
                    : Promise.resolve();
                }
              }
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, min: 6, message: "Password must be at least 6 characters" }
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select placeholder="Select a role">
              {roles.map(r => (
                <Option value={r.value} key={r.value}>
                  {r.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Create User
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      {/* Edit User Modal */}
      <Modal
        title="Edit User"
        open={editModal.visible}
        onCancel={() => {
          setEditModal({ visible: false, user: null });
          formEdit.resetFields();
        }}
        onOk={handleEditUser}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        {editModal.user && (
          <Form
            form={formEdit}
            layout="vertical"
            autoComplete="off"
            initialValues={{
              name: editModal.user.name,
              email: editModal.user.email,
              role: editModal.user.role
            }}
          >
            <Form.Item
              label="Name"
              name="name"
              rules={[
                { required: true, message: "Please enter the user's name" },
                { min: 4, message: 'Name must be at least 4 characters' }
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, type: 'email', message: "Please enter a valid email" },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    // Exclude self from uniqueness check
                    const editingId = editModal.user?._id;
                    const emailExists = users.some(
                      u => u.email.toLowerCase() === value.toLowerCase() && u._id !== editingId
                    );
                    return emailExists
                      ? Promise.reject(new Error('Email already exists'))
                      : Promise.resolve();
                  }
                }
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
            <Form.Item label="Password">
              {/* Show stars, not editable */}
              <Input.Password value="********" readOnly disabled style={{ color: '#aaa' }} />
              <div style={{ color: '#d4380d', marginTop: '6px' }}>
                You do not have rights to change the password.
              </div>
            </Form.Item>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select placeholder="Select a role">
                {roles.map(r => (
                  <Option value={r.value} key={r.value}>
                    {r.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
};

export default UserManagement;