import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.STABILITY_AI];

/**
 * Stability AI API 适配器
 */
class StabilityAIAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.STABILITY_AI);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_STABILITY_AI_API_KEY;

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
            console.error('Stability AI API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.message || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化 Stability AI 客户端失败:', error);
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

      const response = await this.client.get('/engines/list');
      
      if (response.data) {
        const allModels = Array.isArray(response.data) ? response.data : [];
        
        if (type === 'image') {
          return allModels
            .filter(model => model.id && (
              model.id.includes('stable-diffusion') ||
              model.id.includes('flux')
            ))
            .map(model => ({
              id: model.id,
              name: model.name || model.id,
              description: model.description || '',
            }));
        } else if (type === 'video') {
          return allModels
            .filter(model => model.id && (
              model.id.includes('svd') ||
              model.id.includes('video')
            ))
            .map(model => ({
              id: model.id,
              name: model.name || model.id,
              description: model.description || '',
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
        { id: 'stable-diffusion-xl-1024-v1-0', name: 'SDXL 1.0', description: 'Stable Diffusion XL' },
        { id: 'stable-diffusion-v1-6', name: 'SD 1.6', description: 'Stable Diffusion 1.6' },
        { id: 'flux-1.1-pro', name: 'Flux 1.1 Pro', description: 'Flux Pro 模型' },
      ];
    } else {
      return [
        { id: 'stable-video-diffusion-xt-1.1', name: 'SVD XT 1.1', description: 'Stable Video Diffusion' },
      ];
    }
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const {
      model = 'stable-diffusion-xl-1024-v1-0',
      width = 1024,
      height = 1024,
      steps = 30,
      cfg_scale = 7,
      negative_prompt = '',
    } = options;

    const response = await this.client.post(`/generation/${model}/text-to-image`, {
      text_prompts: [
        { text: prompt, weight: 1 },
        ...(negative_prompt ? [{ text: negative_prompt, weight: -1 }] : []),
      ],
      cfg_scale,
      width,
      height,
      steps,
      samples: 1,
    });

    if (response.data.artifacts && response.data.artifacts[0]) {
      const imageData = response.data.artifacts[0];
      if (imageData.base64) {
        return `data:image/png;base64,${imageData.base64}`;
      }
    }

    throw new Error('无法解析 Stability AI 返回的图片数据');
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      model = 'stable-video-diffusion-xt-1.1',
      width = 1024,
      height = 576,
      frames = 25,
      fps = 6,
    } = options;

    const response = await this.client.post(`/generation/${model}/image-to-video`, {
      image: imageBase64,
      width,
      height,
      frames,
      fps,
    });

    if (response.data.artifacts && response.data.artifacts[0]) {
      const videoData = response.data.artifacts[0];
      if (videoData.base64) {
        return `data:video/mp4;base64,${videoData.base64}`;
      }
      if (videoData.url) {
        return videoData.url;
      }
    }

    throw new Error('无法解析 Stability AI 返回的视频数据');
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      model = 'stable-video-diffusion-xt-1.1',
      width = 1024,
      height = 576,
      frames = 25,
      fps = 6,
    } = options;

    const response = await this.client.post(`/generation/${model}/image-to-video`, {
      text_prompts: [{ text: prompt }],
      image: imageBase64,
      width,
      height,
      frames,
      fps,
    });

    if (response.data.artifacts && response.data.artifacts[0]) {
      const videoData = response.data.artifacts[0];
      if (videoData.base64) {
        return `data:video/mp4;base64,${videoData.base64}`;
      }
      if (videoData.url) {
        return videoData.url;
      }
    }

    throw new Error('无法解析 Stability AI 返回的视频数据');
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    const {
      model = 'stable-video-diffusion-xt-1.1',
      width = 1024,
      height = 576,
      frames = 25,
      fps = 6,
    } = options;

    const response = await this.client.post(`/generation/${model}/text-to-video`, {
      text_prompts: [{ text: prompt }],
      width,
      height,
      frames,
      fps,
    });

    if (response.data.artifacts && response.data.artifacts[0]) {
      const videoData = response.data.artifacts[0];
      if (videoData.base64) {
        return `data:video/mp4;base64,${videoData.base64}`;
      }
      if (videoData.url) {
        return videoData.url;
      }
    }

    throw new Error('无法解析 Stability AI 返回的视频数据');
  }
}

export default new StabilityAIAdapter();

