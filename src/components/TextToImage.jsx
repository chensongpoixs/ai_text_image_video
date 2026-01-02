import React, { useState, useEffect } from 'react';
import { Image, Loader2, Download, Sparkles } from 'lucide-react';
import unifiedAPI from '../api';
import { DEFAULT_IMAGE_OPTIONS, PARAM_LIMITS } from '../constants/api';
import { PROVIDERS, DEFAULT_PROVIDER } from '../constants/providers';
import { getCurrentProvider } from '../utils/storage';
import ProviderSelector from './ProviderSelector';
import ModelSelector from './ModelSelector';

const TextToImage = () => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [options, setOptions] = useState(DEFAULT_IMAGE_OPTIONS);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [selectedModel, setSelectedModel] = useState('');
  
  const limits = PARAM_LIMITS.IMAGE;

  useEffect(() => {
    const saved = getCurrentProvider();
    if (saved) {
      setProvider(saved);
    }
  }, []);

  useEffect(() => {
    // 切换提供商时重置模型选择
    setSelectedModel('');
  }, [provider]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入提示词');
      return;
    }

    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const result = await unifiedAPI.textToImage(provider, prompt, {
        negative_prompt: negativePrompt,
        model: selectedModel || undefined,
        ...options,
      });
      setImageUrl(result);
    } catch (err) {
      setError(err.message || '生成图片失败，请检查API配置');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // 检查浏览器是否支持 File System Access API
      if ('showSaveFilePicker' in window) {
        // 获取图片数据
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // 弹出文件保存对话框
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `generated-image-${Date.now()}.png`,
          types: [
            {
              description: 'PNG 图片',
              accept: {
                'image/png': ['.png'],
              },
            },
            {
              description: 'JPEG 图片',
              accept: {
                'image/jpeg': ['.jpg', '.jpeg'],
              },
            },
          ],
        });

        // 写入文件
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // 降级方案：使用传统的下载方式
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      // 用户取消选择时，会抛出 AbortError，这是正常的
      if (error.name !== 'AbortError') {
        console.error('下载失败:', error);
        // 如果 File System API 失败，降级到传统下载方式
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="glass rounded-2xl p-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
          <Image className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">文生图</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：表单输入区域 */}
        <div className="space-y-4">
        <ProviderSelector
          onProviderChange={setProvider}
          type="image"
        />

        <ModelSelector
          provider={provider}
          type="image"
          value={selectedModel}
          onChange={setSelectedModel}
          onError={(msg) => setError(msg)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            提示词 <span className="text-red-400">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要生成的图片，例如：一只可爱的小猫坐在花园里，阳光明媚，高清，8k"
            className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-base"
            rows="4"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            负面提示词（可选）
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="描述你不想要的内容，例如：模糊，低质量，变形"
            className="w-full px-4 py-3.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-base"
            rows="3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              宽度: {options.width}px
            </label>
            <input
              type="range"
              min={limits.width.min}
              max={limits.width.max}
              step={limits.width.step}
              value={options.width}
              onChange={(e) => setOptions({ ...options, width: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              高度: {options.height}px
            </label>
            <input
              type="range"
              min={limits.height.min}
              max={limits.height.max}
              step={limits.height.step}
              value={options.height}
              onChange={(e) => setOptions({ ...options, height: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              推理步数: {options.num_inference_steps}
            </label>
            <input
              type="range"
              min={limits.num_inference_steps.min}
              max={limits.num_inference_steps.max}
              step={limits.num_inference_steps.step}
              value={options.num_inference_steps}
              onChange={(e) => setOptions({ ...options, num_inference_steps: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              引导强度: {options.guidance_scale}
            </label>
            <input
              type="range"
              min={limits.guidance_scale.min}
              max={limits.guidance_scale.max}
              step={limits.guidance_scale.step}
              value={options.guidance_scale}
              onChange={(e) => setOptions({ ...options, guidance_scale: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成图片
            </>
          )}
        </button>

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        </div>

        {/* 右侧：预览区域 */}
        <div className="space-y-4">
          {/* 图片预览 */}
          {imageUrl && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Image className="w-4 h-4" />
                生成的图片
              </h3>
              <div className="relative rounded-lg overflow-hidden border-2 border-purple-500/50 bg-black/20">
                <img
                  src={imageUrl}
                  alt="Generated"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                下载图片
              </button>
            </div>
          )}

          {/* 空状态提示 */}
          {!imageUrl && (
            <div className="flex items-center justify-center h-full min-h-[400px] bg-white/5 rounded-lg border-2 border-dashed border-white/10">
              <div className="text-center text-gray-400">
                <Image className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-sm">图片预览将显示在这里</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToImage;

