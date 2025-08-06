import { Layout, Typography, Spin } from 'antd';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
          33na3 URL Shortener
        </Title>
      </Header>
      
      <Content style={{ padding: '24px' }}>
        {isAuthenticated ? (
          <Dashboard user={user!} />
        ) : (
          <LoginPage />
        )}
      </Content>
    </Layout>
  );
}

export default App; 