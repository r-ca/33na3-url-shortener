import { useState, useEffect } from 'react';
import { User, CredentialResponse } from '../types';

const GOOGLE_CLIENT_ID = '150201698481-2kbgd2t2l2gvgo7gpo5ut17acvsq2qik.apps.googleusercontent.com';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 保存されたトークンから復元を試行
    const savedToken = localStorage.getItem('idToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('idToken');
        localStorage.removeItem('user');
      }
    }

    // Google Identity Services初期化
    if (window.google) {
      initializeGoogleAuth();
    } else {
      // Google SDKの読み込み待ち
      const checkGoogle = setInterval(() => {
        if (window.google) {
          initializeGoogleAuth();
          clearInterval(checkGoogle);
        }
      }, 100);
    }

    setLoading(false);
  }, []);

  const initializeGoogleAuth = () => {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });
  };

  const handleCredentialResponse = (response: CredentialResponse) => {
    try {
      // JWT payloadをデコード（簡易版）
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      const userData: User = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        studentId: payload.email.split('@')[0], // メールアドレスから学籍番号を抽出
      };

      // トークンとユーザー情報を保存
      localStorage.setItem('idToken', response.credential);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Failed to process credential:', error);
    }
  };

  const signIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const signOut = () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
} 