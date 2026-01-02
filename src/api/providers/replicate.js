import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.REPLICATE];

/**
 * Replicate API 适配器
 */
class ReplicateAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.REPLICATE);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_REPLICATE_API_KEY;

      this.client = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Token ${apiKey}` : '',
        },
      });

      // 响应拦截器
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response) {
            console.error('Replicate API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.detail || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化 Replicate 客户端失败:', error);
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

      // Replicate 获取模型列表
      const response = await this.client.get('/models');
      
      if (response.data && response.data.results) {
        const allModels = response.data.results;
        
        if (type === 'image') {
          return allModels
            .filter(model => 
              model.name && (
                model.name.includes('stable-diffusion') ||
                model.name.includes('flux') ||
                model.name.includes('image')
              )
            )
            .map(model => ({
              id: model.name,
              name: model.name,
              description: model.description || '',
            }));
        } else if (type === 'video') {
          return allModels
            .filter(model => 
              model.name && (
                model.name.includes('video') ||
                model.name.includes('svd')
              )
            )
            .map(model => ({
              id: model.name,
              name: model.name,
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
        { id: 'stability-ai/stable-diffusion', name: 'Stable Diffusion', description: 'Replicate Stable Diffusion' },
        { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', description: 'Flux 快速模型' },
      ];
    } else {
      return [
        { id: 'stability-ai/stable-video-diffusion', name: 'Stable Video Diffusion', description: '视频生成模型' },
      ];
    }
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const {
      model = 'stability-ai/stable-diffusion',
      width = 1024,
      height = 1024,
      num_outputs = 1,
    } = options;

    // Replicate 运行预测
    const prediction = await this.client.post('/predictions', {
      version: model.includes('/') ? model.split('/')[1] : model,
      input: {
        prompt,
        width,
        height,
        num_outputs,
        ...options,
      },
    });

    // 轮询获取结果
    let result = prediction.data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await this.client.get(`/predictions/${result.id}`);
      result = statusResponse.data;
    }

    if (result.status === 'succeeded' && result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }

    throw new Error(result.error || '生成失败');
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      model = 'stability-ai/stable-video-diffusion',
      width = 1024,
      height = 576,
    } = options;

    // Replicate 运行预测
    const prediction = await this.client.post('/predictions', {
      version: model.includes('/') ? model.split('/')[1] : model,
      input: {
        image: `data:image/png;base64,${imageBase64}`,
        width,
        height,
        ...options,
      },
    });

    // 轮询获取结果
    let result = prediction.data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await this.client.get(`/predictions/${result.id}`);
      result = statusResponse.data;
    }

    if (result.status === 'succeeded' && result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }

    throw new Error(result.error || '生成失败');
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      model = 'stability-ai/stable-video-diffusion',
      width = 1024,
      height = 576,
    } = options;

    // Replicate 运行预测
    const prediction = await this.client.post('/predictions', {
      version: model.includes('/') ? model.split('/')[1] : model,
      input: {
        prompt,
        image: imageBase64 ? `data:image/png;base64,${imageBase64}` : undefined,
        width,
        height,
        ...options,
      },
    });

    // 轮询获取结果
    let result = prediction.data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await this.client.get(`/predictions/${result.id}`);
      result = statusResponse.data;
    }

    if (result.status === 'succeeded' && result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }

    throw new Error(result.error || '生成失败');
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    const {
      model = 'stability-ai/stable-video-diffusion',
      width = 1024,
      height = 576,
    } = options;

    // Replicate 运行预测
    const prediction = await this.client.post('/predictions', {
      version: model.includes('/') ? model.split('/')[1] : model,
      input: {
        prompt,
        width,
        height,
        ...options,
      },
    });

    // 轮询获取结果
    let result = prediction.data;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await this.client.get(`/predictions/${result.id}`);
      result = statusResponse.data;
    }

    if (result.status === 'succeeded' && result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }

    throw new Error(result.error || '生成失败');
  }
}

export default new ReplicateAdapter();

