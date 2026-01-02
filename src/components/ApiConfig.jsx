import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle2, XCircle, Globe, Link } from 'lucide-react';
import { PROVIDERS, PROVIDER_CONFIG } from '../constants/providers';
import {
  getProviderConfig,
  setProviderConfig,
  getCurrentProvider,
} from '../utils/storage';

const ApiConfig = ({ onClose }) => {
  const [currentProvider, setCurrentProvider] = useState(
    getCurrentProvider() || PROVIDERS.SILICONFLOW
  );
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    // 加载所有提供商的配置
    const loadedConfigs = {};
    Object.values(PROVIDERS).forEach((provider) => {
      const config = getProviderConfig(provider);
      if (config) {
        loadedConfigs[provider] = config;
      }
    });
    setConfigs(loadedConfigs);
  }, []);

  const handleConfigChange = (provider, field, value) => {
    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    // 保存所有配置
    Object.keys(configs).forEach((provider) => {
      if (configs[provider]) {
        setProviderConfig(provider, configs[provider]);
      }
    });
    onClose();
  };

  const currentConfig = configs[currentProvider] || {};
  const providerInfo = PROVIDER_CONFIG[currentProvider];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">API 配置</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* 提供商选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            选择服务提供商
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(PROVIDERS).map((provider) => {
              const info = PROVIDER_CONFIG[provider];
              const isSelected = provider === currentProvider;
              return (
                <button
                  key={provider}
                  onClick={() => setCurrentProvider(provider)}
                  className={`p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-white text-sm">
                      {info.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {info.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 当前提供商的配置 */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded">
              <Key className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-white">
              {providerInfo.name} 配置
            </h4>
          </div>

          {providerInfo.authType !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key
                {providerInfo.authType === 'bearer' && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              <input
                type="password"
                value={currentConfig.apiKey || ''}
                onChange={(e) =>
                  handleConfigChange(
                    currentProvider,
                    'apiKey',
                    e.target.value
                  )
                }
                placeholder={`请输入 ${providerInfo.name} API Key`}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}


          {currentProvider === PROVIDERS.DIFY && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                API 地址 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={currentConfig.baseUrl || ''}
                onChange={(e) =>
                  handleConfigChange(
                    currentProvider,
                    'baseUrl',
                    e.target.value
                  )
                }
                placeholder="https://api.dify.ai"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          {(currentProvider === PROVIDERS.OLLAMA ||
            currentProvider === PROVIDERS.LLAMA_CPP) && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Link className="w-4 h-4 inline mr-1" />
                服务地址
              </label>
              <input
                type="text"
                value={currentConfig.baseUrl || providerInfo.baseUrl}
                onChange={(e) =>
                  handleConfigChange(
                    currentProvider,
                    'baseUrl',
                    e.target.value
                  )
                }
                placeholder={providerInfo.baseUrl}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-400">
                本地服务默认地址: {providerInfo.baseUrl}
              </p>
            </div>
          )}

          {currentProvider === PROVIDERS.DIFY && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                工作流 ID (Workflow ID)
              </label>
              <input
                type="text"
                value={currentConfig.workflow_id || ''}
                onChange={(e) =>
                  handleConfigChange(
                    currentProvider,
                    'workflow_id',
                    e.target.value
                  )
                }
                placeholder="文生图工作流的 ID"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-400">
                需要在 Dify 中创建文生图工作流
              </p>
            </div>
          )}

          <div className="pt-2">
            <a
              href={providerInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <Link className="w-3 h-3" />
              访问 {providerInfo.name} 官网
            </a>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            保存配置
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all duration-200"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiConfig;
