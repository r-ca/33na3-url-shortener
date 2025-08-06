import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ConfigProvider } from 'antd'
import jaJP from 'antd/locale/ja_JP'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={jaJP}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
) 