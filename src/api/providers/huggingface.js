import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.HUGGINGFACE];

/**
 * Hugging Face API 适配器
 */
class HuggingFaceAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.HUGGINGFACE);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_HUGGINGFACE_API_KEY;

      this.client = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
        timeout: 300000, // 5分钟超时
      });

      // 响应拦截器
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response) {
            console.error('Hugging Face API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.error || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化 Hugging Face 客户端失败:', error);
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(type = 'image') {
    // Hugging Face 需要指定模型名称，这里返回常用模型
    return this.getDefaultModels(type);
  }

  /**
   * 获取默认模型列表
   */
  getDefaultModels(type = 'image') {
    if (type === 'image') {
      return [
        { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'Stable Diffusion XL', description: 'Hugging Face SDXL' },
        { id: 'runwayml/stable-diffusion-v1-5', name: 'Stable Diffusion v1.5', description: 'Hugging Face SD 1.5' },
      ];
    } else {
      return [
        { id: 'stabilityai/stable-video-diffusion-img2vid', name: 'Stable Video Diffusion', description: '视频生成模型' },
      ];
    }
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const {
      model = 'stabilityai/stable-diffusion-xl-base-1.0',
    } = options;

    const response = await this.client.post(`/models/${model}`, {
      inputs: prompt,
    });

    if (response.data) {
      // Hugging Face 返回 base64 图片
      if (typeof response.data === 'string') {
        return `data:image/png;base64,${response.data}`;
      }
      if (response.data.image) {
        return response.data.image.startsWith('data:')
          ? response.data.image
          : `data:image/png;base64,${response.data.image}`;
      }
    }

    throw new Error('无法解析 Hugging Face 返回的图片数据');
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      model = 'stabilityai/stable-video-diffusion-img2vid',
    } = options;

    const response = await this.client.post(`/models/${model}`, {
      inputs: imageBase64,
    });

    if (response.data) {
      if (typeof response.data === 'string') {
        return `data:video/mp4;base64,${response.data}`;
      }
      if (response.data.video) {
        return response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      }
    }

    throw new Error('无法解析 Hugging Face 返回的视频数据');
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      model = 'stabilityai/stable-video-diffusion-img2vid',
    } = options;

    const response = await this.client.post(`/models/${model}`, {
      inputs: {
        image: imageBase64,
        prompt: prompt || undefined,
      },
    });

    if (response.data) {
      if (typeof response.data === 'string') {
        return `data:video/mp4;base64,${response.data}`;
      }
      if (response.data.video) {
        return response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      }
    }

    throw new Error('无法解析 Hugging Face 返回的视频数据');
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    const {
      model = 'stabilityai/stable-video-diffusion-img2vid',
    } = options;

    const response = await this.client.post(`/models/${model}`, {
      inputs: prompt,
    });

    if (response.data) {
      if (typeof response.data === 'string') {
        return `data:video/mp4;base64,${response.data}`;
      }
      if (response.data.video) {
        return response.data.video.startsWith('data:')
          ? response.data.video
          : `data:video/mp4;base64,${response.data.video}`;
      }
    }

    throw new Error('无法解析 Hugging Face 返回的视频数据');
  }
}

export default new HuggingFaceAdapter();

