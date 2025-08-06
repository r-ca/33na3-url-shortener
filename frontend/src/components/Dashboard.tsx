import { useState, useEffect } from 'react';
import { 
  Button, 
  Table, 
  Space, 
  Modal, 
  Form, 
  Input, 
  message, 
  Popconfirm,
  Card,
  Statistic,
  Row,
  Col,
  Avatar,
  Dropdown,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  CopyOutlined,
  LinkOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  EditOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { User, UrlRecord, CreateUrlRequest } from '../types';
import { api, ApiError } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { generateSimpleSlug } from '../utils/slugGenerator';

const { Text, Title } = Typography;

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const { signOut } = useAuth();
  const [urls, setUrls] = useState<UrlRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUrl, setEditingUrl] = useState<UrlRecord | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUrls();
  }, []);

  const loadUrls = async () => {
    setLoading(true);
    try {
      const response = await api.getUrls();
      setUrls(response.urls);
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('URL一覧の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUrl = async (values: CreateUrlRequest) => {
    try {
      const newUrl = await api.createUrl(values);
      setUrls([newUrl, ...urls]);
      setIsModalOpen(false);
      form.resetFields();
      message.success('短縮URLを作成しました');
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('短縮URLの作成に失敗しました');
      }
    }
  };

  const handleUpdateUrl = async (values: { originalUrl: string; description?: string }) => {
    if (!editingUrl) return;
    
    try {
      const updatedUrl = await api.updateUrl(editingUrl.slug, values);
      setUrls(urls.map(url => url.slug === editingUrl.slug ? updatedUrl : url));
      setEditingUrl(null);
      form.resetFields();
      message.success('短縮URLを更新しました');
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('短縮URLの更新に失敗しました');
      }
    }
  };

  const openEditModal = (url: UrlRecord) => {
    setEditingUrl(url);
    form.setFieldsValue({
      originalUrl: url.originalUrl,
      description: url.description,
    });
  };

  const handleDeleteUrl = async (slug: string) => {
    try {
      await api.deleteUrl(slug);
      setUrls(urls.filter(url => url.slug !== slug));
      message.success('短縮URLを削除しました');
    } catch (error) {
      if (error instanceof ApiError) {
        message.error(error.message);
      } else {
        message.error('短縮URLの削除に失敗しました');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('クリップボードにコピーしました');
  };

  const columns: ColumnsType<UrlRecord> = [
    {
      title: 'スラグ',
      dataIndex: 'slug',
      key: 'slug',
      width: 120,
      render: (slug: string) => (
        <Text code>{slug}</Text>
      ),
    },
    {
      title: '短縮URL',
      dataIndex: 'shortUrl',
      key: 'shortUrl',
      render: (shortUrl: string) => (
        <Space>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer">
            <LinkOutlined /> {shortUrl}
          </a>
          <Button 
            type="text" 
            size="small" 
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(shortUrl)}
          />
        </Space>
      ),
    },
    {
      title: '元のURL',
      dataIndex: 'originalUrl',
      key: 'originalUrl',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" title={url}>
          {url}
        </a>
      ),
    },
    {
      title: 'アクセス数',
      dataIndex: 'accessCount',
      key: 'accessCount',
      width: 100,
      align: 'center',
      render: (count: number) => (
        <Space>
          <BarChartOutlined />
          {count}
        </Space>
      ),
    },
    {
      title: '作成日',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            title="編集"
          />
          <Popconfirm
            title="この短縮URLを削除しますか？"
            onConfirm={() => handleDeleteUrl(record.slug)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button 
              type="text" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
              title="削除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <Space>
          <UserOutlined />
          <div>
            <div>{user.name}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {user.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          ログアウト
        </Space>
      ),
      onClick: signOut,
    },
  ];

  const totalAccess = urls.reduce((sum, url) => sum + url.accessCount, 0);

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <Title level={2} style={{ margin: 0 }}>URL管理 - {user.studentId}</Title>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button type="text">
            <Space>
              <Avatar src={user.picture} icon={<UserOutlined />} size="small" />
              <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </span>
            </Space>
          </Button>
        </Dropdown>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic title="作成した短縮URL" value={urls.length} suffix="個" />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic title="総アクセス数" value={totalAccess} suffix="回" />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          新しい短縮URLを作成
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={urls}
        rowKey="slug"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `全 ${total} 件`,
        }}
      />

      <Modal
        title={editingUrl ? "短縮URLを編集" : "新しい短縮URLを作成"}
        open={isModalOpen || !!editingUrl}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingUrl(null);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingUrl ? handleUpdateUrl : handleCreateUrl}
        >
          <Form.Item
            name="originalUrl"
            label="元のURL"
            rules={[
              { required: true, message: 'URLを入力してください' },
              { type: 'url', message: '有効なURLを入力してください' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          {!editingUrl && (
            <Form.Item
              name="slug"
              label="スラグ（短縮URLの一部）"
              rules={[
                { required: true, message: 'スラグを入力してください' },
                { 
                  pattern: /^[a-zA-Z0-9_-]+$/, 
                  message: '英数字、ハイフン、アンダースコアのみ使用可能です' 
                },
              ]}
            >
              <Input 
                placeholder="my-link" 
                addonBefore={`url.33na3.work/${user.studentId}/`}
                addonAfter={
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      const randomSlug = generateSimpleSlug(6);
                      form.setFieldValue('slug', randomSlug);
                    }}
                    title="ランダム生成"
                  />
                }
              />
            </Form.Item>
          )}

          {editingUrl && (
            <Form.Item label="スラグ（変更不可）">
              <Input 
                value={editingUrl.slug}
                disabled
                addonBefore={`url.33na3.work/${user.studentId}/`}
              />
            </Form.Item>
          )}

          <Form.Item
            name="description"
            label="説明（オプション）"
          >
            <Input.TextArea rows={3} placeholder="この短縮URLの説明" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingUrl ? '更新' : '作成'}
              </Button>
              <Button onClick={() => {
                setIsModalOpen(false);
                setEditingUrl(null);
                form.resetFields();
              }}>
                キャンセル
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 