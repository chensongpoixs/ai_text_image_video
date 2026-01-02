import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.LLAMA_CPP];

/**
 * llama.cpp API 适配器
 */
class LlamaCppAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.LLAMA_CPP);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5分钟超时
    });

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('llama.cpp API错误:', error.response.data);
          return Promise.reject(
            new Error(error.response.data?.error?.message || '请求失败')
          );
        }
        return Promise.reject(error);
      }
    );
    } catch (error) {
      console.error('初始化 llama.cpp 客户端失败:', error);
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
      
      // llama.cpp 可能支持模型列表端点
      try {
        const response = await this.client.get('/v1/models');
        
        if (response.data && response.data.data) {
          return response.data.data.map(model => ({
            id: model.id,
            name: model.id,
            description: model.owned_by || '',
          }));
        }
      } catch (e) {
        // 如果标准端点不存在，尝试其他端点
        try {
          const response = await this.client.get('/api/tags');
          if (response.data && response.data.models) {
            return response.data.models.map(model => ({
              id: model.name,
              name: model.name,
              description: '',
            }));
          }
        } catch (e2) {
          // 忽略
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
    if (type === 'video') {
      return [
        { id: 'svd', name: 'Stable Video Diffusion', description: '视频生成模型' },
        { id: 'default', name: '默认模型', description: '使用默认配置的视频生成模型' },
      ];
    }
    return [
      { id: 'default', name: '默认模型', description: '使用默认配置的模型' },
    ];
  }

  /**
   * 文生图 - llama.cpp 通常需要配合其他服务
   * 这里假设使用兼容 OpenAI 格式的接口
   */
  async textToImage(prompt, options = {}) {
    const {
      width = 1024,
      height = 1024,
      model,
    } = options;

    try {
      // llama.cpp 通常通过兼容接口调用
      // 假设有图片生成端点
      const response = await this.client.post('/v1/images/generations', {
        prompt,
        n: 1,
        size: `${width}x${height}`,
        model,
        response_format: 'b64_json',
      });

      if (response.data.data && response.data.data[0]) {
        const imageData = response.data.data[0];
        if (imageData.b64_json) {
          return `data:image/png;base64,${imageData.b64_json}`;
        }
        if (imageData.url) {
          return imageData.url;
        }
      }

      throw new Error('无法解析 llama.cpp 返回的图片数据');
    } catch (error) {
      // 如果标准端点不存在，尝试其他格式
      try {
        const response = await this.client.post('/api/generate', {
          prompt,
          width,
          height,
        });

        if (response.data.image) {
          return response.data.image.startsWith('data:')
            ? response.data.image
            : `data:image/png;base64,${response.data.image}`;
        }
      } catch (e) {
        // 忽略
      }

      throw new Error(
        `llama.cpp 图片生成失败: ${error.message}。请确保已配置正确的图片生成端点。`
      );
    }
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    const {
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model,
    } = options;

    try {
      const response = await this.client.post('/v1/videos/generations', {
        image: imageBase64,
        n: 1,
        size: `${width}x${height}`,
        num_frames,
        fps,
        model,
        response_format: 'b64_json',
      });

      if (response.data.data && response.data.data[0]) {
        const videoData = response.data.data[0];
        if (videoData.b64_json) {
          return `data:video/mp4;base64,${videoData.b64_json}`;
        }
        if (videoData.url) {
          return videoData.url;
        }
      }

      throw new Error('无法解析 llama.cpp 返回的视频数据');
    } catch (error) {
      try {
        const response = await this.client.post('/api/generate', {
          image: imageBase64,
          width,
          height,
          num_frames,
          fps,
          type: 'video',
        });

        if (response.data.video) {
          return response.data.video.startsWith('data:')
            ? response.data.video
            : `data:video/mp4;base64,${response.data.video}`;
        }
      } catch (e) {
        // 忽略
      }

      throw new Error(
        `llama.cpp 视频生成失败: ${error.message}。请确保已配置正确的视频生成端点。`
      );
    }
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    const {
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model,
    } = options;

    try {
      const response = await this.client.post('/v1/videos/generations', {
        prompt,
        image: imageBase64,
        n: 1,
        size: `${width}x${height}`,
        num_frames,
        fps,
        model,
        response_format: 'b64_json',
      });

      if (response.data.data && response.data.data[0]) {
        const videoData = response.data.data[0];
        if (videoData.b64_json) {
          return `data:video/mp4;base64,${videoData.b64_json}`;
        }
        if (videoData.url) {
          return videoData.url;
        }
      }

      throw new Error('无法解析 llama.cpp 返回的视频数据');
    } catch (error) {
      try {
        const response = await this.client.post('/api/generate', {
          prompt,
          image: imageBase64,
          width,
          height,
          num_frames,
          fps,
          type: 'video',
        });

        if (response.data.video) {
          return response.data.video.startsWith('data:')
            ? response.data.video
            : `data:video/mp4;base64,${response.data.video}`;
        }
      } catch (e) {
        // 忽略
      }

      throw new Error(
        `llama.cpp 视频生成失败: ${error.message}。请确保已配置正确的视频生成端点。`
      );
    }
  }

  /**
   * 文生视频 - llama.cpp 视频生成
   */
  async textToVideo(prompt, options = {}) {
    const {
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model,
    } = options;

    try {
      // llama.cpp 通常通过兼容接口调用
      // 假设有视频生成端点
      const response = await this.client.post('/v1/videos/generations', {
        prompt,
        n: 1,
        size: `${width}x${height}`,
        num_frames,
        fps,
        model,
        response_format: 'b64_json',
      });

      if (response.data.data && response.data.data[0]) {
        const videoData = response.data.data[0];
        if (videoData.b64_json) {
          return `data:video/mp4;base64,${videoData.b64_json}`;
        }
        if (videoData.url) {
          return videoData.url;
        }
      }

      throw new Error('无法解析 llama.cpp 返回的视频数据');
    } catch (error) {
      // 如果标准端点不存在，尝试其他格式
      try {
        const response = await this.client.post('/api/generate', {
          prompt,
          width,
          height,
          num_frames,
          fps,
          type: 'video',
        });

        if (response.data.video) {
          return response.data.video.startsWith('data:')
            ? response.data.video
            : `data:video/mp4;base64,${response.data.video}`;
        }

        if (response.data.file_path) {
          return response.data.file_path;
        }
      } catch (e) {
        // 忽略
      }

      throw new Error(
        `llama.cpp 视频生成失败: ${error.message}。请确保已配置正确的视频生成端点。`
      );
    }
  }
}

export default new LlamaCppAdapter();

