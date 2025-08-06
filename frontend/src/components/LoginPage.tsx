import { useEffect, useRef } from 'react';
import { Card, Typography, Space } from 'antd';

const { Title, Text } = Typography;

export function LoginPage() {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeGoogleButton = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: '320',
        });
      }
    };

    if (window.google) {
      initializeGoogleButton();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          initializeGoogleButton();
          clearInterval(checkGoogle);
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkGoogle), 10000);
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 64px)',
      padding: '16px'
    }}>
      <Card 
        style={{ 
          width: '100%',
          maxWidth: '400px', 
          textAlign: 'center'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              33na3 URL Shortener
            </Title>
            <Text type="secondary">
              学内アカウントでログインしてください
            </Text>
          </div>

          <div 
            ref={googleButtonRef} 
            id="google-signin-button"
            style={{ 
              display: 'flex', 
              justifyContent: 'center',
              minHeight: '44px',
              alignItems: 'center'
            }} 
          />
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            学校ドメインのアカウントのみ利用可能
          </Text>
        </Space>
      </Card>
    </div>
  );
} 
