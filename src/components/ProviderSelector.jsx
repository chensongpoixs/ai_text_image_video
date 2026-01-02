import React, { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { PROVIDERS, PROVIDER_CONFIG, DEFAULT_PROVIDER } from '../constants/providers';
import { getCurrentProvider, setCurrentProvider } from '../utils/storage';

const ProviderSelector = ({ onProviderChange, type = 'image' }) => {
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = getCurrentProvider();
    if (saved && PROVIDER_CONFIG[saved]) {
      setSelectedProvider(saved);
    }
  }, []);

  useEffect(() => {
    if (onProviderChange) {
      onProviderChange(selectedProvider);
    }
  }, [selectedProvider, onProviderChange]);

  const handleSelect = (provider) => {
    setSelectedProvider(provider);
    setCurrentProvider(provider);
    setIsOpen(false);
  };

  // 过滤支持当前功能的提供商
  // 现在所有服务商都支持图片和视频生成
  const availableProviders = Object.values(PROVIDERS).filter(
    (provider) => PROVIDER_CONFIG[provider]?.supports[type]
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        选择服务提供商
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {PROVIDER_CONFIG[selectedProvider]?.name || '选择提供商'}
            </span>
            <span className="text-xs text-gray-400">
              {PROVIDER_CONFIG[selectedProvider]?.nameEn}
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-slate-800/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl overflow-hidden">
              {availableProviders.map((provider) => {
                const config = PROVIDER_CONFIG[provider];
                const isSelected = provider === selectedProvider;
                return (
                  <button
                    key={provider}
                    onClick={() => handleSelect(provider)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {config.name}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {config.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProviderSelector;

