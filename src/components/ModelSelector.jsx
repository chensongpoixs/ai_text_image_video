import React, { useState, useEffect } from 'react';
import { ChevronDown, Loader2, Check, RefreshCw } from 'lucide-react';
import unifiedAPI from '../api';

const ModelSelector = ({ provider, type = 'image', value, onChange, onError }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(value || '');

  useEffect(() => {
    loadModels();
  }, [provider, type]);

  useEffect(() => {
    if (value !== selectedModel) {
      setSelectedModel(value || '');
    }
  }, [value]);

  const loadModels = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const modelList = await unifiedAPI.getModels(provider, type);
      setModels(modelList);
      
      // 如果没有选中模型且列表不为空，自动选择第一个
      if (!selectedModel && modelList.length > 0) {
        const firstModel = modelList[0].id;
        setSelectedModel(firstModel);
        if (onChange) {
          onChange(firstModel);
        }
      }
    } catch (error) {
      console.error('加载模型列表失败:', error);
      if (onError) {
        onError(error.message || '加载模型列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (modelId) => {
    setSelectedModel(modelId);
    if (onChange) {
      onChange(modelId);
    }
    setIsOpen(false);
  };

  const selectedModelInfo = models.find(m => m.id === selectedModel);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        选择模型
        <button
          onClick={loadModels}
          disabled={loading}
          className="ml-2 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
          title="刷新模型列表"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 inline animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 inline" />
          )}
        </button>
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading || models.length === 0}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2 flex-1 text-left">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">加载模型中...</span>
              </>
            ) : models.length === 0 ? (
              <span className="text-sm text-gray-400">暂无可用模型</span>
            ) : (
              <>
                <span className="font-medium text-sm">
                  {selectedModelInfo?.name || selectedModel || '选择模型'}
                </span>
                {selectedModelInfo?.description && (
                  <span className="text-xs text-gray-400 truncate">
                    {selectedModelInfo.description}
                  </span>
                )}
              </>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isOpen && models.length > 0 && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-slate-800/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {models.map((model) => {
                const isSelected = model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white text-sm truncate">
                          {model.name}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        )}
                      </div>
                      {model.description && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {model.description}
                        </p>
                      )}
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

export default ModelSelector;

