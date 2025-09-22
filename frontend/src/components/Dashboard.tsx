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
  ReloadOutlined,
  EyeOutlined
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
  const [detailUrl, setDetailUrl] = useState<UrlRecord | null>(null);
  const [tableKey, setTableKey] = useState(0);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [form] = Form.useForm();

  const baseUrl = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    loadUrls();
  }, []);

  // -------------------------
  // Data fetching handlers
  // -------------------------

  const loadUrls = async () => {
    setLoading(true);
    try {
      const response = await api.getUrls();
      setUrls(response.urls);
      setTableKey(prev => prev + 1);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isAuthError()) {
          message.error(`${error.getUserMessage()} ページを再読み込みしてください。`);
          // 認証エラーの場合、自動でサインアウト処理を実行
          setTimeout(() => signOut(), 2000);
        } else {
          message.error(error.getUserMessage());
        }
      } else {
        message.error('URL一覧の取得に失敗しました。ページを再読み込みしてください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUrl = async (values: CreateUrlRequest) => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const newUrl = await api.createUrl(values);
      setUrls(prevUrls => [newUrl, ...prevUrls]);
      setTableKey(prev => prev + 1);
      setIsModalOpen(false);
      form.resetFields();
      message.success('短縮URLを作成しました');
    } catch (error) {
      if (error instanceof ApiError) {
        const userMessage = error.getUserMessage();
        
        if (error.isConflictError()) {
          // スラグ重複エラーの場合、フィールドエラーとして表示
          form.setFields([
            {
              name: 'slug',
              errors: [userMessage],
            },
          ]);
          message.error(userMessage);
        } else if (error.isValidationError()) {
          // バリデーションエラーの場合、該当フィールドにエラーを設定
          if (error.errorResponse.error === 'INVALID_URL') {
            form.setFields([
              {
                name: 'originalUrl',
                errors: [userMessage],
              },
            ]);
          } else if (error.errorResponse.error === 'INVALID_SLUG') {
            form.setFields([
              {
                name: 'slug',
                errors: [userMessage],
              },
            ]);
          }
          message.error(userMessage);
        } else if (error.isAuthError()) {
          message.error(`${userMessage} ページを再読み込みしてください。`);
          setTimeout(() => signOut(), 2000);
        } else {
          message.error(userMessage);
        }
      } else {
        message.error('短縮URLの作成に失敗しました。再試行してください。');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUrl = async (values: { originalUrl: string; description?: string }) => {
    if (!editingUrl || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const updatedUrl = await api.updateUrl(editingUrl.slug, values);
      setUrls(prevUrls => prevUrls.map(url => url.slug === editingUrl.slug ? updatedUrl : url));
      setTableKey(prev => prev + 1);
      setEditingUrl(null);
      form.resetFields();
      message.success('短縮URLを更新しました');
    } catch (error) {
      if (error instanceof ApiError) {
        const userMessage = error.getUserMessage();
        
        if (error.isValidationError()) {
          // バリデーションエラーの場合、該当フィールドにエラーを設定
          if (error.errorResponse.error === 'INVALID_URL') {
            form.setFields([
              {
                name: 'originalUrl',
                errors: [userMessage],
              },
            ]);
          }
          message.error(userMessage);
        } else if (error.isNotFoundError()) {
          message.error(userMessage);
          // URLが見つからない場合、モーダルを閉じてリストを更新
          setEditingUrl(null);
          form.resetFields();
          loadUrls();
        } else if (error.isAuthError()) {
          message.error(`${userMessage} ページを再読み込みしてください。`);
          setTimeout(() => signOut(), 2000);
        } else {
          message.error(userMessage);
        }
      } else {
        message.error('短縮URLの更新に失敗しました。再試行してください。');
      }
    } finally {
      setIsUpdating(false);
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
    // 既に削除中の場合は処理しない
    if (deletingSlug === slug) {
      return;
    }
    
    setDeletingSlug(slug);
    try {
      await api.deleteUrl(slug);
      
      // 削除成功後、まず楽観的更新を実行
      setUrls(prevUrls => prevUrls.filter(url => url.slug !== slug));
      setTableKey(prev => prev + 1);
      
      // モーダルが開いている場合は閉じる
      if (detailUrl?.slug === slug) {
        setDetailUrl(null);
      }
      if (editingUrl?.slug === slug) {
        setEditingUrl(null);
        form.resetFields();
      }
      
      message.success('短縮URLを削除しました');
      
      // 削除成功後、サーバーから最新データを取得して確実に同期
      try {
        const response = await api.getUrls();
        setUrls(response.urls);
        setTableKey(prev => prev + 1);
      } catch (syncError) {
        // 削除後の同期に失敗しましたが、削除は成功しています: syncError;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const userMessage = error.getUserMessage();
        
        if (error.isNotFoundError()) {
          // URLが見つからない場合、リストを更新して表示を同期
          message.warning('このURLは既に削除されています');
          loadUrls();
        } else if (error.isAuthError()) {
          message.error(`${userMessage} ページを再読み込みしてください。`);
          setTimeout(() => signOut(), 2000);
        } else {
          message.error(userMessage);
        }
      } else {
        message.error('短縮URLの削除に失敗しました。再試行してください。');
      }
    } finally {
      setDeletingSlug(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('クリップボードにコピーしました');
  };

  const desktopColumns: ColumnsType<UrlRecord> = [
    {
      title: 'スラグ',
      dataIndex: 'slug',
      key: 'slug',
      width: 150,
      render: (slug: string) => (
        <Text code>{slug}</Text>
      ),
    },
    {
      title: '短縮URL',
      dataIndex: 'shortUrl',
      key: 'shortUrl',
      width: 300,
      render: (shortUrl: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a 
            href={shortUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            <LinkOutlined />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shortUrl}
            </span>
          </a>
          <Button 
            type="text" 
            size="small" 
            icon={<CopyOutlined />}
            onClick={() => copyToClipboard(shortUrl)}
            style={{ flexShrink: 0 }}
          />
        </div>
      ),
    },
    {
      title: '元のURL',
      dataIndex: 'originalUrl',
      key: 'originalUrl',
      ellipsis: true,
      render: (url: string) => (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          title={url}
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <BarChartOutlined />
          <span>{count}</span>
        </div>
      ),
    },
    {
      title: '作成日',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      align: 'center',
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
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
              loading={deletingSlug === record.slug}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const mobileColumns: ColumnsType<UrlRecord> = [
    {
      title: '短縮URL',
      key: 'mobile',
      render: (_, record) => (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <Text code style={{ fontSize: '14px', fontWeight: 'bold' }}>{record.slug}</Text>
            <Space size="small">
              <Button 
                type="text" 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => setDetailUrl(record)}
              />
              <Button 
                type="text" 
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => copyToClipboard(record.shortUrl)}
              />
            </Space>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>アクセス: {record.accessCount}回</span>
            <span>{new Date(record.createdAt).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
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
    <div style={{ 
      padding: '16px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      width: '100%'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
          {user.studentId}
        </Title>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Button type="text" size="small">
            <Space size="small">
              <Avatar src={user.picture} icon={<UserOutlined />} size="small" />
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' }}>
                {user.name}
              </span>
            </Space>
          </Button>
        </Dropdown>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12}>
          <Card size="small">
            <Statistic title="作成" value={urls.length} suffix="個" />
          </Card>
        </Col>
        <Col xs={12} sm={12}>
          <Card size="small">
            <Statistic title="アクセス" value={totalAccess} suffix="回" />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Space>
          <Button 
            icon={<ReloadOutlined />}
            onClick={loadUrls}
            loading={loading}
          >
            更新
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            新規作成
          </Button>
        </Space>
      </div>
      <div className="desktop-table" style={{ display: 'none' }}>
        <Table
          key={`desktop-${tableKey}`}
          columns={desktopColumns}
          dataSource={urls}
          rowKey="slug"
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `全 ${total} 件`,
          }}
        />
      </div>
      
      <div className="mobile-table" style={{ display: 'block' }}>
        <Table
          key={`mobile-${tableKey}`}
          columns={mobileColumns}
          dataSource={urls}
          rowKey="slug"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `全 ${total} 件`,
            simple: true,
          }}
          showHeader={false}
        />
      </div>

      <Modal
        title={editingUrl ? "短縮URLを編集" : "新しい短縮URLを作成"}
        open={isModalOpen || !!editingUrl}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingUrl(null);
          form.resetFields();
        }}
        afterClose={() => {
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
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  try {
                    new URL(value);
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('有効なURLを入力してください（例: https://example.com）'));
                  }
                },
              },
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
                {
                  min: 1,
                  max: 50,
                  message: 'スラグは1文字以上50文字以内で入力してください',
                },
              ]}
            >
              <Input 
                placeholder="my-link" 
                addonBefore={`${baseUrl}/${user.studentId}/`}
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
                addonBefore={`${baseUrl}/${user.studentId}/`}
              />
            </Form.Item>
          )}

          <Form.Item
            name="description"
            label="説明（オプション）"
          >
            <Input.TextArea rows={3} placeholder="この短縮URLの説明" />
          </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={editingUrl ? isUpdating : isCreating}
              >
                {editingUrl ? '更新' : '作成'}
              </Button>
              <Button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUrl(null);
                  form.resetFields();
                }}
                disabled={editingUrl ? isUpdating : isCreating}
              >
                キャンセル
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

        <Modal
          title="短縮URL詳細"
          open={!!detailUrl}
          onCancel={() => setDetailUrl(null)}
          afterClose={() => {
            setDetailUrl(null);
          }}
          footer={[
            <Button key="edit" type="primary" onClick={() => {
              setDetailUrl(null);
              openEditModal(detailUrl!);
            }}>
              編集
            </Button>,
            <Popconfirm
              key="delete"
              title="この短縮URLを削除しますか？"
              onConfirm={() => {
                handleDeleteUrl(detailUrl!.slug);
              }}
              okText="削除"
              cancelText="キャンセル"
            >
              <Button 
                danger
                loading={deletingSlug === detailUrl?.slug}
              >
                削除
              </Button>
            </Popconfirm>,
            <Button key="close" onClick={() => setDetailUrl(null)}>
              閉じる
            </Button>
          ]}
        >
          {detailUrl && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>スラグ:</Text>
                <div><Text code>{detailUrl.slug}</Text></div>
              </div>
              <div>
                <Text strong>短縮URL:</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a href={detailUrl.shortUrl} target="_blank" rel="noopener noreferrer">
                    {detailUrl.shortUrl}
                  </a>
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(detailUrl.shortUrl)}
                  />
                </div>
              </div>
              <div>
                <Text strong>元のURL:</Text>
                <div>
                  <a href={detailUrl.originalUrl} target="_blank" rel="noopener noreferrer">
                    {detailUrl.originalUrl}
                  </a>
                </div>
              </div>
              <div>
                <Text strong>アクセス数:</Text>
                <div>{detailUrl.accessCount}回</div>
              </div>
              <div>
                <Text strong>作成日:</Text>
                <div>{new Date(detailUrl.createdAt).toLocaleString('ja-JP')}</div>
              </div>
              {detailUrl.description && (
                <div>
                  <Text strong>説明:</Text>
                  <div>{detailUrl.description}</div>
                </div>
              )}
            </Space>
          )}
        </Modal>
      </div>
    );
  } 
