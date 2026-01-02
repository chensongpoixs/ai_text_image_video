import React, { useState, useEffect, useRef } from 'react';
import { Video, Loader2, Download, Sparkles, Play, Upload, X, Image as ImageIcon } from 'lucide-react';
import unifiedAPI from '../api';
import { DEFAULT_VIDEO_OPTIONS, PARAM_LIMITS } from '../constants/api';
import { PROVIDERS, DEFAULT_PROVIDER, PROVIDER_CONFIG } from '../constants/providers';
import { getCurrentProvider } from '../utils/storage';
import ProviderSelector from './ProviderSelector';
import ModelSelector from './ModelSelector';

const VIDEO_MODES = {
  TEXT: 'text',
  IMAGE: 'image',
  TEXT_IMAGE: 'text_image',
};

const TextToVideo = () => {
  const [mode, setMode] = useState(VIDEO_MODES.TEXT);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [options, setOptions] = useState(DEFAULT_VIDEO_OPTIONS);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [selectedModel, setSelectedModel] = useState('');
  const fileInputRef = useRef(null);
  
  const limits = PARAM_LIMITS.VIDEO;

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

  // 处理图片上传
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('请上传图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('图片大小不能超过 10MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 移除图片
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 将图片转换为 base64
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result;
        // 移除 data:image/xxx;base64, 前缀，只保留 base64 数据
        const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    // 根据模式验证输入
    if (mode === VIDEO_MODES.TEXT && !prompt.trim()) {
      setError('请输入提示词');
      return;
    }
    if (mode === VIDEO_MODES.IMAGE && !imageFile) {
      setError('请上传图片');
      return;
    }
    if (mode === VIDEO_MODES.TEXT_IMAGE) {
      if (!prompt.trim() && !imageFile) {
        setError('请输入提示词或上传图片');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setProgress(0);

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 1000);

    try {
      let result;
      
      if (mode === VIDEO_MODES.IMAGE) {
        // 图生视频
        const imageBase64 = await imageToBase64(imageFile);
        result = await unifiedAPI.imageToVideo(provider, imageBase64, {
          negative_prompt: negativePrompt,
          model: selectedModel || undefined,
          ...options,
        });
      } else if (mode === VIDEO_MODES.TEXT_IMAGE) {
        // 文+图生视频
        const imageBase64 = imageFile ? await imageToBase64(imageFile) : null;
        result = await unifiedAPI.imageAndTextToVideo(provider, prompt, imageBase64, {
          negative_prompt: negativePrompt,
          model: selectedModel || undefined,
          ...options,
        });
      } else {
        // 文生视频
        result = await unifiedAPI.textToVideo(provider, prompt, {
          negative_prompt: negativePrompt,
          model: selectedModel || undefined,
          ...options,
        });
      }
      
      setProgress(100);
      setVideoUrl(result);
    } catch (err) {
      setError(err.message || '生成视频失败，请检查API配置');
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      // 检查浏览器是否支持 File System Access API
      if ('showSaveFilePicker' in window) {
        // 获取视频数据
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        
        // 弹出文件保存对话框
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `generated-video-${Date.now()}.mp4`,
          types: [
            {
              description: 'MP4 视频',
              accept: {
                'video/mp4': ['.mp4'],
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
        link.href = videoUrl;
        link.download = `generated-video-${Date.now()}.mp4`;
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
        link.href = videoUrl;
        link.download = `generated-video-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
          <Video className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">视频生成</h2>
      </div>

      <div className="space-y-4">
        <ProviderSelector
          onProviderChange={setProvider}
          type="video"
        />

        <ModelSelector
          provider={provider}
          type="video"
          value={selectedModel}
          onChange={setSelectedModel}
          onError={(msg) => setError(msg)}
        />

        {/* 生成模式选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            生成模式
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setMode(VIDEO_MODES.TEXT)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                mode === VIDEO_MODES.TEXT
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/20 bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              文生视频
            </button>
            <button
              onClick={() => setMode(VIDEO_MODES.IMAGE)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                mode === VIDEO_MODES.IMAGE
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/20 bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              图生视频
            </button>
            <button
              onClick={() => setMode(VIDEO_MODES.TEXT_IMAGE)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                mode === VIDEO_MODES.TEXT_IMAGE
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/20 bg-white/5 hover:bg-white/10 text-gray-300'
              }`}
            >
              文+图生视频
            </button>
          </div>
        </div>

        {/* 图片上传 */}
        {(mode === VIDEO_MODES.IMAGE || mode === VIDEO_MODES.TEXT_IMAGE) && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              上传图片
              {mode === VIDEO_MODES.IMAGE && <span className="text-red-400 ml-1">*</span>}
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto max-h-64 object-contain rounded-lg border-2 border-purple-500/50"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-full text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-400">点击上传图片</p>
                <p className="text-xs text-gray-500 mt-1">支持 JPG、PNG 格式，最大 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}

        {/* 提示词输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            提示词
            {mode === VIDEO_MODES.TEXT && <span className="text-red-400 ml-1">*</span>}
            {mode === VIDEO_MODES.TEXT_IMAGE && (
              <span className="text-gray-400 text-xs ml-1">(可选，配合图片使用)</span>
            )}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === VIDEO_MODES.IMAGE
                ? '（可选）添加视频描述'
                : mode === VIDEO_MODES.TEXT_IMAGE
                ? '描述你想要生成的视频，例如：一只小猫在花园中玩耍，阳光明媚，流畅的动画'
                : '描述你想要生成的视频，例如：一只小猫在花园中玩耍，阳光明媚，流畅的动画'
            }
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            rows="3"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            负面提示词（可选）
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="描述你不想要的内容，例如：模糊，抖动，低质量"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            rows="2"
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
              帧数: {options.num_frames}
            </label>
            <input
              type="range"
              min={limits.num_frames.min}
              max={limits.num_frames.max}
              step={limits.num_frames.step}
              value={options.num_frames}
              onChange={(e) => setOptions({ ...options, num_frames: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              帧率: {options.fps} fps
            </label>
            <input
              type="range"
              min={limits.fps.min}
              max={limits.fps.max}
              step={limits.fps.step}
              value={options.fps}
              onChange={(e) => setOptions({ ...options, fps: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            视频时长: {options.duration} 秒
            {options.duration >= 60 && (
              <span className="text-cyan-400 ml-1">
                ({Math.floor(options.duration / 60)}分{options.duration % 60}秒)
              </span>
            )}
          </label>
          <input
            type="range"
            min={limits.duration.min}
            max={limits.duration.max}
            step={limits.duration.step}
            value={options.duration}
            onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{limits.duration.min}秒</span>
            <span>{limits.duration.max}秒 (5分钟)</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中... {Math.round(progress)}%
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成视频
            </>
          )}
        </button>

        {loading && (
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {videoUrl && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border-2 border-cyan-500/50">
              <video
                src={videoUrl}
                controls
                className="w-full h-auto max-h-[600px]"
                autoPlay
                loop
              >
                您的浏览器不支持视频播放
              </video>
            </div>
            <button
              onClick={handleDownload}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载视频
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToVideo;

