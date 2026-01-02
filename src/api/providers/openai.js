import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.OPENAI];

/**
 * OpenAI API 适配器
 */
class OpenAIAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.OPENAI);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_OPENAI_API_KEY;

      this.client = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 请求拦截器
      this.client.interceptors.request.use(
        (config) => {
          if (apiKey) {
            config.headers.Authorization = `Bearer ${apiKey}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // 响应拦截器
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response) {
            console.error('OpenAI API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.error?.message || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化 OpenAI 客户端失败:', error);
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

      const response = await this.client.get('/models');
      
      if (response.data && response.data.data) {
        const allModels = response.data.data;
        
        if (type === 'image') {
          return allModels
            .filter(model => model.id && (
              model.id.includes('dall-e') ||
              model.id.includes('image')
            ))
            .map(model => ({
              id: model.id,
              name: model.id,
              description: '',
            }));
        } else if (type === 'video') {
          return allModels
            .filter(model => model.id && (
              model.id.includes('sora') ||
              model.id.includes('video')
            ))
            .map(model => ({
              id: model.id,
              name: model.id,
              description: '',
            }));
        }
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
        { id: 'dall-e-3', name: 'DALL-E 3', description: 'OpenAI 图片生成模型' },
        { id: 'dall-e-2', name: 'DALL-E 2', description: 'OpenAI 图片生成模型' },
      ];
    } else {
      return [
        { id: 'sora', name: 'Sora', description: 'OpenAI 视频生成模型' },
      ];
    }
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const {
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
      n = 1,
    } = options;

    const response = await this.client.post('/images/generations', {
      model,
      prompt,
      size,
      quality,
      n,
      response_format: 'url',
    });

    return response.data.data[0]?.url;
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      model = 'sora',
      duration = 5,
    } = options;

    // OpenAI Sora 图生视频（注意：API 可能还在测试阶段）
    const response = await this.client.post('/videos/generations', {
      model,
      image: imageBase64,
      duration,
    });

    if (response.data.data && response.data.data[0]) {
      return response.data.data[0].url;
    }

    throw new Error('无法解析 OpenAI 返回的视频数据');
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      model = 'sora',
      duration = 5,
    } = options;

    const response = await this.client.post('/videos/generations', {
      model,
      prompt,
      image: imageBase64,
      duration,
    });

    if (response.data.data && response.data.data[0]) {
      return response.data.data[0].url;
    }

    throw new Error('无法解析 OpenAI 返回的视频数据');
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    const {
      model = 'sora',
      duration = 5,
    } = options;

    // Sora API 调用（注意：Sora API 可能还在测试阶段）
    const response = await this.client.post('/videos/generations', {
      model,
      prompt,
      duration,
    });

    if (response.data.data && response.data.data[0]) {
      return response.data.data[0].url;
    }

    throw new Error('无法解析 OpenAI 返回的视频数据');
  }
}

export default new OpenAIAdapter();

