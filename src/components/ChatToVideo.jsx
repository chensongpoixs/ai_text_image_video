import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Download, Image as ImageIcon, Video, Sparkles, Check, X, RotateCcw } from 'lucide-react';
import unifiedAPI from '../api';
import { PROVIDERS, DEFAULT_PROVIDER } from '../constants/providers';
import { getCurrentProvider } from '../utils/storage';
import ProviderSelector from './ProviderSelector';
import ModelSelector from './ModelSelector';
import { imagesToVideo, blobToUrl } from '../utils/videoUtils';

const ChatToVideo = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '你好！我是AI创意助手。告诉我你想要生成什么样的图片，我可以帮你生成多张图片并合并成视频。例如："我想看一只可爱的小猫在不同场景中的样子"',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [selectedModel, setSelectedModel] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(-1); // 当前正在生成或等待确认的图片索引
  const [pendingImage, setPendingImage] = useState(null); // 待确认的图片
  const [imagePrompts, setImagePrompts] = useState([]); // 存储所有提示词
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = getCurrentProvider();
    if (saved) {
      setProvider(saved);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 智能意图识别和提示词生成
  const extractImagePrompts = (text) => {
    const prompts = [];
    
    // 检测是否包含数量关键词
    const numberKeywords = ['几张', '多个', '几个', '一些', '若干'];
    const hasNumber = numberKeywords.some(keyword => text.includes(keyword));
    
    // 检测是否包含场景关键词
    const sceneKeywords = ['场景', '画面', '图片', '照片', '图像', '不同', '各种', '多种'];
    const hasMultipleScenes = sceneKeywords.some(keyword => text.includes(keyword));

    // 检测是否包含分隔符（逗号、句号等）
    const hasSeparators = /[，。！？、；]/.test(text);

    // 如果包含多个场景描述或分隔符，尝试拆分
    if (hasMultipleScenes || hasSeparators) {
      const sentences = text.split(/[，。！？、；]/).filter(s => s.trim().length > 2);
      if (sentences.length > 1) {
        sentences.forEach(sentence => {
          const trimmed = sentence.trim();
          if (trimmed.length > 3) {
            prompts.push(trimmed);
          }
        });
      }
    }

    // 如果没有提取到多个，使用原文本作为基础
    if (prompts.length === 0) {
      prompts.push(text);
    }

    // 如果只有一个提示词，根据内容生成多个变体
    if (prompts.length === 1) {
      const basePrompt = prompts[0];
      prompts.length = 0;
      
      // 根据提示词内容生成变体
      const variants = [
        basePrompt,
        `${basePrompt}，不同角度`,
        `${basePrompt}，不同光线效果`,
        `${basePrompt}，不同背景`,
      ];
      
      // 如果提示词较短，添加更多变体
      if (basePrompt.length < 30) {
        variants.push(`${basePrompt}，细节丰富，高清`);
      }
      
      prompts.push(...variants);
    }

    // 限制最多5张图片，避免生成时间过长
    return prompts.slice(0, 5);
  };

  // 生成单张图片
  const generateSingleImage = async (prompt, index, total) => {
    setCurrentImageIndex(index);
    setLoading(true);

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `正在生成第 ${index + 1}/${total} 张图片：${prompt}`,
        type: 'progress',
      },
    ]);

    try {
      const imageUrl = await unifiedAPI.textToImage(provider, prompt, {
        model: selectedModel || undefined,
        width: 1024,
        height: 1024,
      });
      
      setPendingImage({
        url: imageUrl,
        prompt: prompt,
        index: index,
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `第 ${index + 1} 张图片生成完成！请查看并确认是否满意。`,
        },
      ]);
    } catch (error) {
      console.error(`生成第 ${index + 1} 张图片失败:`, error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `生成第 ${index + 1} 张图片失败: ${error.message}`,
          type: 'error',
        },
      ]);
      setPendingImage(null);
    } finally {
      setLoading(false);
    }
  };

  // 确认当前图片，继续生成下一张
  const confirmImage = () => {
    if (pendingImage) {
      const newImages = [...generatedImages, pendingImage.url];
      setGeneratedImages(newImages);
      const nextIndex = pendingImage.index + 1;
      setPendingImage(null);
      setCurrentImageIndex(-1);

      // 如果还有未生成的图片，继续生成
      if (nextIndex < imagePrompts.length) {
        generateSingleImage(imagePrompts[nextIndex], nextIndex, imagePrompts.length);
      } else {
        // 所有图片生成完成，开始合并视频
        startVideoGeneration(newImages);
      }
    }
  };

  // 重新生成当前图片
  const regenerateImage = async () => {
    if (pendingImage) {
      await generateSingleImage(pendingImage.prompt, pendingImage.index, imagePrompts.length);
    }
  };

  // 跳过当前图片，继续下一张
  const skipImage = () => {
    if (pendingImage) {
      const nextIndex = pendingImage.index + 1;
      setPendingImage(null);
      setCurrentImageIndex(-1);

      // 如果还有未生成的图片，继续生成
      if (nextIndex < imagePrompts.length) {
        generateSingleImage(imagePrompts[nextIndex], nextIndex, imagePrompts.length);
      } else {
        // 所有图片生成完成，开始合并视频
        if (generatedImages.length > 0) {
          startVideoGeneration(generatedImages);
        } else {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '没有生成任何图片，无法创建视频。',
              type: 'error',
            },
          ]);
        }
      }
    }
  };

  // 开始合并视频
  const startVideoGeneration = async (images) => {
    if (images.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '没有图片可以合并为视频。',
          type: 'error',
        },
      ]);
      return;
    }

    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `成功生成了 ${images.length} 张图片！正在合并为视频...`,
      },
    ]);

    setVideoLoading(true);
    try {
      console.log('开始合并视频，图片数量:', images.length);
      
      const videoBlob = await imagesToVideo(images, {
        fps: 8,
        duration: 1.5,
        width: 1024,
        height: 1024,
      });

      // 确保videoBlob是Blob对象
      if (!(videoBlob instanceof Blob)) {
        console.error('videoBlob不是Blob对象:', typeof videoBlob, videoBlob);
        throw new Error('视频生成失败：返回的不是有效的Blob对象');
      }

      if (videoBlob.size === 0) {
        throw new Error('视频生成失败：生成的Blob为空');
      }

      const url = URL.createObjectURL(videoBlob);
      console.log('生成的视频URL:', url, 'Blob大小:', videoBlob.size, 'Blob类型:', videoBlob.type);
      
      // 验证URL
      if (!url || !url.startsWith('blob:')) {
        console.error('生成的URL格式错误:', url);
        throw new Error('视频URL生成失败');
      }
      
      setVideoUrl(url);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `视频生成完成！共 ${images.length} 张图片，视频时长约 ${(images.length * 1.5).toFixed(1)} 秒。`,
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `视频合并失败: ${error.message}`,
          type: 'error',
        },
      ]);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setGeneratedImages([]);
    setVideoUrl(null);
    setPendingImage(null);
    setCurrentImageIndex(-1);

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // 提取图片生成提示词
      const prompts = extractImagePrompts(userMessage);
      setImagePrompts(prompts);

      // 添加AI回复
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `好的！我将为你生成 ${prompts.length} 张图片，然后合并成视频。每生成一张图片后，你可以选择确认、重新生成或跳过。`,
        },
      ]);

      // 开始生成第一张图片
      await generateSingleImage(prompts[0], 0, prompts.length);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `抱歉，处理过程中出现错误：${error.message}`,
          type: 'error',
        },
      ]);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownloadVideo = async () => {
    if (!videoUrl) return;

    try {
      if ('showSaveFilePicker' in window) {
        const response = await fetch(videoUrl);
        const blob = await response.blob();

        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `chat-video-${Date.now()}.webm`,
          types: [
            {
              description: 'WebM 视频',
              accept: {
                'video/webm': ['.webm'],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = `chat-video-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('下载失败:', error);
      }
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">聊天式视频生成</h2>
      </div>

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
          onError={(msg) => {
            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: `模型加载失败: ${msg}`,
                type: 'error',
              },
            ]);
          }}
        />
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[500px] pr-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : message.type === 'error'
                  ? 'bg-red-500/20 border border-red-500/50 text-red-300'
                  : message.type === 'progress'
                  ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                  : 'bg-white/10 text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-gray-300 text-sm">正在生成...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 待确认的图片 */}
      {pendingImage && (
        <div className="space-y-3 p-4 bg-purple-500/10 border-2 border-purple-500/50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            第 {pendingImage.index + 1} 张图片 - 请确认
          </h3>
          <div className="relative">
            <img
              src={pendingImage.url}
              alt={`Pending ${pendingImage.index + 1}`}
              className="w-full h-auto max-h-[400px] object-contain rounded-lg border-2 border-purple-500/50"
              onError={async (e) => {
                try {
                  const response = await fetch(pendingImage.url, { 
                    mode: 'cors', 
                    credentials: 'omit',
                    headers: { 'Accept': 'image/*' },
                  });
                  if (response.ok) {
                    const blob = await response.blob();
                    e.target.src = URL.createObjectURL(blob);
                  }
                } catch {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';
                }
              }}
            />
          </div>
          <p className="text-xs text-gray-400">提示词: {pendingImage.prompt}</p>
          <div className="flex gap-2">
            <button
              onClick={confirmImage}
              className="flex-1 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              确认，继续下一张
            </button>
            <button
              onClick={regenerateImage}
              disabled={loading}
              className="flex-1 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-4 h-4" />
              重新生成
            </button>
            <button
              onClick={skipImage}
              className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              跳过
            </button>
          </div>
        </div>
      )}

      {/* 已确认的图片预览 */}
      {generatedImages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            已确认的图片 ({generatedImages.length} 张)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto p-2">
            {generatedImages.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Generated ${index + 1}`}
                  className="w-full h-32 sm:h-40 object-cover rounded-lg border-2 border-green-500/50 hover:border-green-500 transition-all cursor-pointer"
                  loading="lazy"
                  onError={async (e) => {
                    try {
                      const response = await fetch(url, { 
                        mode: 'cors', 
                        credentials: 'omit',
                        headers: { 'Accept': 'image/*' },
                      });
                      if (response.ok) {
                        const blob = await response.blob();
                        e.target.src = URL.createObjectURL(blob);
                      } else {
                        throw new Error('Failed to load');
                      }
                    } catch {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';
                    }
                  }}
                />
                <div className="absolute bottom-1 right-1 bg-green-600/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 视频预览 */}
      {videoLoading && (
        <div className="flex items-center justify-center p-4 bg-blue-500/20 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mr-2" />
          <span className="text-gray-300">正在合并视频...</span>
        </div>
      )}

      {videoUrl && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Video className="w-4 h-4" />
            生成的视频
          </h3>
          <div className="relative rounded-lg overflow-hidden border-2 border-cyan-500/50 bg-black/20">
            <video
              key={videoUrl} // 强制重新渲染
              src={videoUrl}
              controls
              className="w-full h-auto max-h-[500px]"
              preload="auto"
              playsInline
              onError={(e) => {
                const video = e.target;
                const error = video.error;
                console.error('视频加载失败:', {
                  error,
                  errorCode: error?.code,
                  errorMessage: error?.message,
                  videoURL: videoUrl,
                  videoSrc: video.src,
                });
                
                let errorMsg = '视频加载失败';
                if (error) {
                  switch (error.code) {
                    case 1:
                      errorMsg = '视频加载中止';
                      break;
                    case 2:
                      errorMsg = '网络错误导致视频加载失败';
                      break;
                    case 3:
                      errorMsg = '视频解码失败';
                      break;
                    case 4:
                      errorMsg = '视频格式不支持或已损坏';
                      break;
                  }
                }
                
                setMessages(prev => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: `${errorMsg}。请尝试重新生成视频。`,
                    type: 'error',
                  },
                ]);
              }}
              onLoadedMetadata={(e) => {
                const video = e.target;
                console.log('视频元数据加载成功:', {
                  duration: video.duration,
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  readyState: video.readyState,
                });
              }}
              onCanPlay={(e) => {
                console.log('视频可以播放');
              }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
          <button
            onClick={handleDownloadVideo}
            className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Download className="w-4 h-4" />
            下载视频
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="告诉我你想要生成什么样的图片..."
          className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatToVideo;

