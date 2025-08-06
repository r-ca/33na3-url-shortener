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
      auto_select: false,
      cancel_on_tap_outside: false,
    });
  };

  const handleCredentialResponse = (response: CredentialResponse) => {
    try {
      // JWT形式の検証
      const parts = response.credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Base64URLデコード（JWT用）
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd((base64.length + 3) & ~3, '=');
      
      // UTF-8対応のBase64デコード
      const binaryString = atob(padded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const utf8String = new TextDecoder('utf-8').decode(bytes);
      const payload = JSON.parse(utf8String);
      
      // 必要なフィールドの検証
      if (!payload.email) {
        throw new Error('Email missing from token');
      }
      
      // 名前の処理（UTF-8デコード後なので文字化けは解消されているはず）
      const displayName = payload.name || payload.email.split('@')[0];
      
      const userData: User = {
        email: payload.email,
        name: displayName,
        picture: payload.picture || '',
        studentId: payload.email.split('@')[0], // メールアドレスから学籍番号を抽出
      };

      // トークンとユーザー情報を保存
      localStorage.setItem('idToken', response.credential);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      console.log('Authentication successful:', userData.email);
    } catch (error) {
      console.error('Failed to process credential:', error);
      // エラーメッセージをユーザーに表示
      alert('認証に失敗しました。もう一度お試しください。');
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
    signOut,
    isAuthenticated: !!user,
  };
} 