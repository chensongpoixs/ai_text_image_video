import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.BAIDU];

/**
 * 百度文心 API 适配器
 */
class BaiduAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.BAIDU);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey || import.meta.env.VITE_BAIDU_API_KEY;

      this.client = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 请求拦截器 - 添加 Bearer Token
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
            console.error('百度 API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.error?.message || error.response.data?.error_msg || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化百度客户端失败:', error);
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
        { id: 'irag-1.0', name: '文心一格 irag-1.0', description: '百度文心一格图片生成模型' },
      ];
    } else if (type === 'video') {
      return [
        { id: 'musesteamer-2.0-turbo-i2v-audio', name: 'Musesteamer 2.0 Turbo', description: '百度文心视频生成模型' },
      ];
    }
    return [];
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    if (!this.client) {
      this.initClient();
    }

    const {
      model = 'irag-1.0',
    } = options;

    const response = await this.client.post('/v2/images/generations', {
      model,
      prompt,
    });

    // 解析返回结果
    if (response.data.data && response.data.data[0]) {
      // 百度返回的可能是 URL 或 base64
      const imageData = response.data.data[0];
      
      // 优先返回base64格式（避免CORS问题）
      if (imageData.b64_image) {
        return `data:image/png;base64,${imageData.b64_image}`;
      }
      if (imageData.image) {
        if (imageData.image.startsWith('data:')) {
          return imageData.image;
        }
        // 如果是base64字符串，添加前缀
        if (imageData.image.match(/^[A-Za-z0-9+/=]+$/)) {
          return `data:image/png;base64,${imageData.image}`;
        }
      }
      
      // 如果没有base64，返回URL（可能需要处理CORS）
      if (imageData.url) {
        return imageData.url;
      }
    }

    throw new Error('无法解析百度返回的图片数据');
  }

  /**
   * 轮询视频生成任务
   */
  async pollVideoTask(taskId, maxAttempts = 60, interval = 10000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this.client.get('/video/generations', {
          params: {
            task_id: taskId,
          },
        });

        const taskData = response.data;

        if (taskData.status === 'succeeded') {
          // 任务完成，返回视频URL
          if (taskData.content?.video_url) {
            return taskData.content.video_url;
          }
          if (taskData.video_url) {
            return taskData.video_url;
          }
          throw new Error('任务完成但未找到视频URL');
        } else if (taskData.status === 'failed' || taskData.status === 'error') {
          throw new Error(taskData.error?.message || '视频生成失败');
        } else if (taskData.status === 'processing' || taskData.status === 'pending') {
          // 任务处理中，继续等待
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        } else {
          // 未知状态，继续等待
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
      } catch (error) {
        if (error.response?.status === 404) {
          // 任务不存在，等待后重试
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        throw error;
      }
    }

    throw new Error('视频生成超时，请稍后重试');
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    if (!this.client) {
      this.initClient();
    }

    const {
      model = 'musesteamer-2.0-turbo-i2v-audio',
      duration = 10,
    } = options;

    // 确保duration是有效的数字，且在合理范围内（1-300秒）
    const validDuration = Math.max(1, Math.min(300, parseInt(duration) || 10));

    // 提交视频生成任务
    const response = await this.client.post('/video/generations', {
      model,
      content: [
        {
          type: 'text',
          text: prompt,
        },
      ],
      duration: validDuration,
    });

    // 检查是否返回了task_id
    if (response.data.task_id) {
      // 需要轮询查询任务状态
      return await this.pollVideoTask(response.data.task_id);
    }

    // 如果直接返回了视频URL（同步响应）
    if (response.data.content?.video_url) {
      return response.data.content.video_url;
    }
    if (response.data.video_url) {
      return response.data.video_url;
    }
    if (response.data.data && response.data.data[0]) {
      const videoData = response.data.data[0];
      if (videoData.video_url) {
        return videoData.video_url;
      }
      if (videoData.url) {
        return videoData.url;
      }
    }

    throw new Error('无法解析百度返回的视频数据');
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    if (!this.client) {
      this.initClient();
    }

    const {
      model = 'musesteamer-2.0-turbo-i2v-audio',
      duration = 10,
    } = options;

    // 确保duration是有效的数字，且在合理范围内（1-300秒）
    const validDuration = Math.max(1, Math.min(300, parseInt(duration) || 10));

    // 构建图片URL（如果是base64，需要转换为data URL）
    const imageUrl = imageBase64.startsWith('http') 
      ? imageBase64 
      : imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    // 提交视频生成任务
    const response = await this.client.post('/video/generations', {
      model,
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
      duration: validDuration,
    });

    // 检查是否返回了task_id
    if (response.data.task_id) {
      // 需要轮询查询任务状态
      return await this.pollVideoTask(response.data.task_id);
    }

    // 如果直接返回了视频URL（同步响应）
    if (response.data.content?.video_url) {
      return response.data.content.video_url;
    }
    if (response.data.video_url) {
      return response.data.video_url;
    }
    if (response.data.data && response.data.data[0]) {
      const videoData = response.data.data[0];
      if (videoData.video_url) {
        return videoData.video_url;
      }
      if (videoData.url) {
        return videoData.url;
      }
    }

    throw new Error('无法解析百度返回的视频数据');
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    if (!this.client) {
      this.initClient();
    }

    const {
      model = 'musesteamer-2.0-turbo-i2v-audio',
      duration = 10,
    } = options;

    // 确保duration是有效的数字，且在合理范围内（1-300秒）
    const validDuration = Math.max(1, Math.min(300, parseInt(duration) || 10));

    // 构建content数组
    const content = [];
    
    // 如果有文本提示词，添加到content
    if (prompt && prompt.trim()) {
      content.push({
        type: 'text',
        text: prompt,
      });
    }

    // 如果有图片，添加到content
    if (imageBase64) {
      const imageUrl = imageBase64.startsWith('http') 
        ? imageBase64 
        : imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`;

      content.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
        },
      });
    }

    if (content.length === 0) {
      throw new Error('至少需要提供文本提示词或图片');
    }

    // 提交视频生成任务
    const response = await this.client.post('/video/generations', {
      model,
      content,
      duration: validDuration,
    });

    // 检查是否返回了task_id
    if (response.data.task_id) {
      // 需要轮询查询任务状态
      return await this.pollVideoTask(response.data.task_id);
    }

    // 如果直接返回了视频URL（同步响应）
    if (response.data.content?.video_url) {
      return response.data.content.video_url;
    }
    if (response.data.video_url) {
      return response.data.video_url;
    }
    if (response.data.data && response.data.data[0]) {
      const videoData = response.data.data[0];
      if (videoData.video_url) {
        return videoData.video_url;
      }
      if (videoData.url) {
        return videoData.url;
      }
    }

    throw new Error('无法解析百度返回的视频数据');
  }
}

export default new BaiduAdapter();

