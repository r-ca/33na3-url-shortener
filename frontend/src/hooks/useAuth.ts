import { useState, useEffect } from 'react';
import { User, CredentialResponse } from '../types';

const GOOGLE_CLIENT_ID = '150201698481-2kbgd2t2l2gvgo7gpo5ut17acvsq2qik.apps.googleusercontent.com';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    if (window.google) {
      initializeGoogleAuth();
    } else {
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
      auto_select: true,
      cancel_on_tap_outside: false,
    });
  };

  const handleCredentialResponse = (response: CredentialResponse) => {
    try {
      const parts = response.credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd((base64.length + 3) & ~3, '=');
      
      const binaryString = atob(padded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const utf8String = new TextDecoder('utf-8').decode(bytes);
      const payload = JSON.parse(utf8String);
      
      if (!payload.email) {
        throw new Error('Email missing from token');
      }
      
      const displayName = payload.name || payload.email.split('@')[0];
      
      const userData: User = {
        email: payload.email,
        name: displayName,
        picture: payload.picture || '',
        studentId: payload.email.split('@')[0],
      };

      localStorage.setItem('idToken', response.credential);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Failed to process credential:', error);
      alert('認証に失敗しました。もう一度お試しください。');
    }
  };

  const signOut = () => {
    localStorage.removeItem('idToken');
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };
} 