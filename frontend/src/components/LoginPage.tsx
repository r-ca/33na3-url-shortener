import { useEffect, useRef } from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Title, Text } = Typography;

export function LoginPage() {
  const { signIn } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Google Sign-In ボタンをレンダリング
    if (window.google && googleButtonRef.current) {
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: '300',
      });
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 112px)' 
    }}>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2}>ログイン</Title>
            <Text type="secondary">
              学内Google Workspaceアカウントでログインしてください
            </Text>
          </div>

          <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />
          
          {/* フォールバック用のボタン */}
          <Button 
            type="primary" 
            icon={<GoogleOutlined />} 
            size="large"
            onClick={signIn}
            style={{ width: '100%' }}
          >
            Googleでサインイン
          </Button>

          <Text type="secondary" style={{ fontSize: '12px' }}>
            ※ 学内ドメインのアカウントのみ利用可能です
          </Text>
        </Space>
      </Card>
    </div>
  );
} 