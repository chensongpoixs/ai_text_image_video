import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.OLLAMA];

/**
 * Ollama API 适配器
 */
class OllamaAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.OLLAMA);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5分钟超时，因为生成可能需要较长时间
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('Ollama API错误:', error.response.data);
          return Promise.reject(
            new Error(error.response.data?.error || '请求失败')
          );
        }
        return Promise.reject(error);
      }
    );
    } catch (error) {
      console.error('初始化 Ollama 客户端失败:', error);
      this.client = null;
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(type = 'image') {
    try {
      if (!this.client) {
        this.initClient();
      }
      
      // Ollama 获取模型列表
      const response = await this.client.get('/api/tags');
      
      if (response.data && response.data.models) {
        const allModels = response.data.models;
        
        // 过滤图片生成模型
        if (type === 'image') {
          return allModels
            .filter(model => 
              model.name && (
                model.name.includes('flux') ||
                model.name.includes('sd') ||
                model.name.includes('image')
              )
            )
            .map(model => ({
              id: model.name,
              name: model.name,
              description: model.details?.modelfile || '',
            }));
        } else if (type === 'video') {
          // 过滤视频生成模型
          return allModels
            .filter(model => 
              model.name && (
                model.name.includes('svd') ||
                model.name.includes('video') ||
                model.name.includes('stable-video')
              )
            )
            .map(model => ({
              id: model.name,
              name: model.name,
              description: model.details?.modelfile || '',
            }));
        }
        
        return allModels.map(model => ({
          id: model.name,
          name: model.name,
          description: model.details?.modelfile || '',
        }));
      }
      
      return this.getDefaultModels(type);
    } catch (error) {
      console.warn('获取模型列表失败，使用默认模型:', error);
      return this.getDefaultModels(type);
    }
  }

  /**
   * 获取默认模型列表
   */
  getDefaultModels(type = 'image') {
    if (type === 'image') {
      return [
        { id: 'flux', name: 'Flux', description: 'Ollama Flux 模型' },
        { id: 'flux:latest', name: 'Flux Latest', description: '最新 Flux 模型' },
      ];
    } else if (type === 'video') {
      return [
        { id: 'svd', name: 'Stable Video Diffusion', description: '视频生成模型' },
        { id: 'svd:latest', name: 'SVD Latest', description: '最新视频生成模型' },
      ];
    }
    return [];
  }

  /**
   * 文生图 - 使用 Ollama 的图片生成模型
   */
  async textToImage(prompt, options = {}) {
    const {
      model = 'flux',
      width = 1024,
      height = 1024,
      negative_prompt = '',
    } = options;

    try {
      // Ollama 使用 /api/generate 端点
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        system: negative_prompt || undefined,
        images: [],
        options: {
          width,
          height,
        },
        stream: false,
      });

      // Ollama 返回的可能是 base64 编码的图片
      if (response.data.response) {
        // 如果是 base64 字符串
        if (response.data.response.startsWith('data:image')) {
          return response.data.response;
        }
        // 如果是纯 base64，添加前缀
        if (response.data.response.match(/^[A-Za-z0-9+/=]+$/)) {
          return `data:image/png;base64,${response.data.response}`;
        }
      }

      // 某些模型可能返回 JSON
      if (response.data.image) {
        return response.data.image;
      }

      throw new Error('无法解析 Ollama 返回的图片数据');
    } catch (error) {
      // 如果模型不存在，尝试使用 flux 模型
      if (error.message?.includes('model') && model !== 'flux') {
        return this.textToImage(prompt, { ...options, model: 'flux' });
      }
      throw error;
    }
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      model = 'svd',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
    } = options;

    try {
      const response = await this.client.post('/api/generate', {
        model,
        images: [imageBase64],
        options: {
          width,
          height,
          num_frames,
          fps,
        },
        stream: false,
      });

      if (response.data.video) {
        return response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      }

      throw new Error('无法解析 Ollama 返回的视频数据');
    } catch (error) {
      if (error.message?.includes('model') && model !== 'svd') {
        return this.imageToVideo(imageBase64, { ...options, model: 'svd' });
      }
      throw error;
    }
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      model = 'svd',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      negative_prompt = '',
    } = options;

    try {
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        system: negative_prompt || undefined,
        images: imageBase64 ? [imageBase64] : [],
        options: {
          width,
          height,
          num_frames,
          fps,
        },
        stream: false,
      });

      if (response.data.video) {
        return response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      }

      throw new Error('无法解析 Ollama 返回的视频数据');
    } catch (error) {
      if (error.message?.includes('model') && model !== 'svd') {
        return this.imageAndTextToVideo(prompt, imageBase64, { ...options, model: 'svd' });
      }
      throw error;
    }
  }

  /**
   * 文生视频 - 使用 Ollama 的视频生成模型
   */
  async textToVideo(prompt, options = {}) {
    const {
      model = 'svd',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      negative_prompt = '',
    } = options;

    try {
      // Ollama 使用 /api/generate 端点生成视频
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        system: negative_prompt || undefined,
        images: [],
        options: {
          width,
          height,
          num_frames,
          fps,
        },
        stream: false,
      });

      // Ollama 返回的可能是 base64 编码的视频
      if (response.data.response) {
        // 如果是 base64 字符串
        if (response.data.response.startsWith('data:video')) {
          return response.data.response;
        }
        // 如果是纯 base64，添加前缀
        if (response.data.response.match(/^[A-Za-z0-9+/=]+$/)) {
          return `data:video/mp4;base64,${response.data.response}`;
        }
      }

      // 某些模型可能返回 JSON
      if (response.data.video) {
        return response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      }

      // 如果返回文件路径
      if (response.data.file_path) {
        return response.data.file_path;
      }

      throw new Error('无法解析 Ollama 返回的视频数据');
    } catch (error) {
      // 如果模型不存在，尝试使用 svd 模型
      if (error.message?.includes('model') && model !== 'svd') {
        return this.textToVideo(prompt, { ...options, model: 'svd' });
      }
      throw error;
    }
  }
}

export default new OllamaAdapter();

