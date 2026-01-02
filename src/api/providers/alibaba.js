import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.ALIBABA];

/**
 * 阿里通义 API 适配器
 */
class AlibabaAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.ALIBABA);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_ALIBABA_API_KEY;

      this.client = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey ? `Bearer ${apiKey}` : '',
        },
      });

      // 响应拦截器
      this.client.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response) {
            console.error('阿里通义 API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.message || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化阿里通义客户端失败:', error);
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(type = 'image') {
    return this.getDefaultModels(type);
  }

  /**
   * 获取默认模型列表
   */
  getDefaultModels(type = 'image') {
    if (type === 'image') {
      return [
        { id: 'wanx-v1', name: '通义万相 v1', description: '阿里通义万相图片生成' },
      ];
    } else {
      return [
        { id: 'wanx-video-v1', name: '通义万相视频 v1', description: '阿里通义万相视频生成' },
      ];
    }
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const {
      model = 'wanx-v1',
      size = '1024*1024',
      n = 1,
    } = options;

    const response = await this.client.post('/services/aigc/text-generation/generation', {
      model,
      input: {
        prompt,
      },
      parameters: {
        size,
        n,
      },
    });

    if (response.data.output && response.data.output.results) {
      const result = response.data.output.results[0];
      return result.url || result.image_url;
    }

    throw new Error('无法解析阿里通义返回的图片数据');
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      model = 'wanx-video-v1',
      duration = 5,
    } = options;

    const response = await this.client.post('/services/aigc/video-generation/generation', {
      model,
      input: {
        image: imageBase64,
      },
      parameters: {
        duration,
      },
    });

    if (response.data.output && response.data.output.video_url) {
      return response.data.output.video_url;
    }

    throw new Error('无法解析阿里通义返回的视频数据');
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      model = 'wanx-video-v1',
      duration = 5,
    } = options;

    const response = await this.client.post('/services/aigc/video-generation/generation', {
      model,
      input: {
        prompt,
        image: imageBase64,
      },
      parameters: {
        duration,
      },
    });

    if (response.data.output && response.data.output.video_url) {
      return response.data.output.video_url;
    }

    throw new Error('无法解析阿里通义返回的视频数据');
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    const {
      model = 'wanx-video-v1',
      duration = 5,
    } = options;

    const response = await this.client.post('/services/aigc/video-generation/generation', {
      model,
      input: {
        prompt,
      },
      parameters: {
        duration,
      },
    });

    if (response.data.output && response.data.output.video_url) {
      return response.data.output.video_url;
    }

    throw new Error('无法解析阿里通义返回的视频数据');
  }
}

export default new AlibabaAdapter();

