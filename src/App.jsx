import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Image, Video, MessageCircle } from 'lucide-react';
import TextToImage from './components/TextToImage';
import TextToVideo from './components/TextToVideo';
import ChatToVideo from './components/ChatToVideo';
import ApiConfig from './components/ApiConfig';
import { getApiKey } from './utils/storage';

function App() {
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState('images'); // 'images', 'video', 'chat'

  useEffect(() => {
    const apiKey = getApiKey() || import.meta.env.VITE_SILICONFLOW_API_KEY;
    setHasApiKey(!!apiKey);
  }, [showApiConfig]);

  return (
    <div className="min-h-screen">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* 头部 */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 rounded-xl shadow-2xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tech-title mb-1">
                AI 助力创意落地、从构想到实现、轻松开启！！！
                </h1>
                <p className="text-gray-300 text-sm font-medium tracking-wide">
                  <span className="text-cyan-400">文生图 & 文生视频</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowApiConfig(true)}
              className="glass px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 flex items-center gap-2 text-white"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">API 配置</span>
            </button>
          </div>

          {!hasApiKey && (
            <div className="glass p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
              <p className="text-yellow-300 text-sm">
                ⚠️ 请先配置 API Key 才能使用功能。点击右上角的"API 配置"按钮进行设置。
              </p>
            </div>
          )}
        </header>

        {/* 标签页导航 */}
        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('images')}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'images'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Image className="w-5 h-5" />
            文生图
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'video'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Video className="w-5 h-5" />
            视频生成
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            聊天式视频
          </button>
        </div>

        {/* 功能区域 */}
        <div className="space-y-6">
          {activeTab === 'images' && (
            <div className="max-w-6xl mx-auto">
              <TextToImage />
            </div>
          )}
          {activeTab === 'video' && (
            <div className="max-w-6xl mx-auto">
              <TextToVideo />
            </div>
          )}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto">
              <ChatToVideo />
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <footer className="mt-12 text-center text-gray-400 text-sm">
          <p className="tracking-wide">
            <span className="text-gradient font-semibold">一句话、创建一切</span>
            <span className="text-gray-500 mx-2">·</span>
            <span className="tech-text">让创意无限可能</span>
          </p>
        </footer>
      </div>

      {/* API 配置弹窗 */}
      {showApiConfig && (
        <ApiConfig onClose={() => setShowApiConfig(false)} />
      )}
    </div>
  );
}

export default App;

