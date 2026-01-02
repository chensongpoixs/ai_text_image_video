import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.SILICONFLOW];

/**
 * 硅基流动 API 适配器
 */
class SiliconFlowAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.SILICONFLOW);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_SILICONFLOW_API_KEY;

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
          console.error('硅基流动API错误:', error.response.data);
          return Promise.reject(
            new Error(error.response.data?.error?.message || '请求失败')
          );
        }
        return Promise.reject(error);
      }
    );
    } catch (error) {
      console.error('初始化硅基流动客户端失败:', error);
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
      
      // 硅基流动获取模型列表
      const response = await this.client.get('/models');
      
      if (response.data && response.data.data) {
        const allModels = response.data.data;
        
        // 根据类型过滤模型
        if (type === 'image') {
          // 过滤图片生成模型（通常包含 stable-diffusion, flux 等关键词）
          return allModels
            .filter(model => 
              model.id && (
                model.id.includes('stable-diffusion') ||
                model.id.includes('flux') ||
                model.id.includes('sd') ||
                model.id.includes('image')
              )
            )
            .map(model => ({
              id: model.id,
              name: model.name || model.id,
              description: model.description || '',
            }));
        } else if (type === 'video') {
          // 过滤视频生成模型
          return allModels
            .filter(model => 
              model.id && (
                model.id.includes('video') ||
                model.id.includes('svd') ||
                model.id.includes('stable-video')
              )
            )
            .map(model => ({
              id: model.id,
              name: model.name || model.id,
              description: model.description || '',
            }));
        }
        
        return allModels.map(model => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
        }));
      }
      
      // 如果API不支持，返回默认模型列表
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
        { id: 'stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL', description: '高质量图片生成模型' },
        { id: 'flux-1.1-pro', name: 'Flux 1.1 Pro', description: '先进的图片生成模型' },
        { id: 'flux-1.1-schnell', name: 'Flux 1.1 Schnell', description: '快速图片生成模型' },
        { id: 'stable-diffusion-v1-5', name: 'Stable Diffusion v1.5', description: '经典图片生成模型' },
      ];
    } else {
      return [
        { id: 'stable-video-diffusion', name: 'Stable Video Diffusion', description: '视频生成模型' },
      ];
    }
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const {
      negative_prompt = '',
      width = 1024,
      height = 1024,
      num_inference_steps = 20,
      guidance_scale = 7.5,
      model = 'stable-diffusion-xl-base-1.0',
    } = options;

    const response = await this.client.post('/images/generations', {
      model,
      prompt,
      negative_prompt,
      width,
      height,
      num_inference_steps,
      guidance_scale,
      response_format: 'url',
    });

    return response.data.data[0]?.url || response.data.data[0]?.b64_json;
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    const {
      negative_prompt = '',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model = 'stable-video-diffusion',
    } = options;

    const response = await this.client.post('/videos/generations', {
      model,
      prompt,
      negative_prompt,
      width,
      height,
      num_frames,
      fps,
    });

    if (response.data.task_id) {
      return await this.pollVideoTask(response.data.task_id);
    }

    return response.data.data[0]?.url || response.data.video_url;
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      negative_prompt = '',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model = 'stable-video-diffusion',
    } = options;

    const response = await this.client.post('/videos/generations', {
      model,
      image: imageBase64,
      negative_prompt,
      width,
      height,
      num_frames,
      fps,
    });

    if (response.data.task_id) {
      return await this.pollVideoTask(response.data.task_id);
    }

    return response.data.data[0]?.url || response.data.video_url;
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      negative_prompt = '',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model = 'stable-video-diffusion',
    } = options;

    const response = await this.client.post('/videos/generations', {
      model,
      prompt,
      image: imageBase64,
      negative_prompt,
      width,
      height,
      num_frames,
      fps,
    });

    if (response.data.task_id) {
      return await this.pollVideoTask(response.data.task_id);
    }

    return response.data.data[0]?.url || response.data.video_url;
  }

  /**
   * 轮询视频生成任务
   */
  async pollVideoTask(taskId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.client.get(`/tasks/${taskId}`);
        const status = response.data.status;

        if (status === 'completed') {
          return response.data.result?.video_url || response.data.video_url;
        } else if (status === 'failed') {
          throw new Error('视频生成失败');
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        if (i === maxAttempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    throw new Error('视频生成超时');
  }
}

export default new SiliconFlowAdapter();

