import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.DIFY];

/**
 * Dify API 适配器
 */
class DifyAdapter {
  constructor() {
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.DIFY);
      const baseURL = providerConfig?.baseUrl || config.baseUrl;
      const apiKey = providerConfig?.apiKey;

      if (!baseURL) {
        // 不抛出错误，允许稍后配置
        this.client = null;
        return;
      }

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
          console.error('Dify API错误:', error.response.data);
          return Promise.reject(
            new Error(error.response.data?.message || '请求失败')
          );
        }
        return Promise.reject(error);
      }
    );
    } catch (error) {
      console.error('初始化 Dify 客户端失败:', error);
      this.client = null;
    }
  }

  /**
   * 获取可用模型列表（Dify 使用工作流，返回工作流列表）
   */
  async getModels(type = 'image') {
    try {
      if (!this.client) {
        this.initClient();
        if (!this.client) {
          return this.getDefaultModels(type);
        }
      }
      
      // Dify 获取工作流列表
      const response = await this.client.get('/v1/workflows');
      
      if (response.data && response.data.data) {
        return response.data.data
          .filter(workflow => workflow.enabled)
          .map(workflow => ({
            id: workflow.id,
            name: workflow.name || workflow.id,
            description: workflow.description || `Dify ${type === 'video' ? '视频' : '图片'}生成工作流`,
          }));
      }
      
      return this.getDefaultModels(type);
    } catch (error) {
      console.warn('获取工作流列表失败:', error);
      return this.getDefaultModels(type);
    }
  }

  /**
   * 获取默认模型列表
   */
  getDefaultModels(type = 'image') {
    return [
      { id: '', name: '使用配置的工作流', description: `使用在设置中配置的${type === 'video' ? '视频' : '图片'}生成工作流 ID` },
    ];
  }

  /**
   * 文生图 - Dify 使用工作流API
   */
  async textToImage(prompt, options = {}) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('请先配置 Dify API 地址');
      }
    }

    const {
      width = 1024,
      height = 1024,
      model, // 模型ID就是workflow_id
      workflow_id,
    } = options;

    const providerConfig = getProviderConfig(PROVIDERS.DIFY);
    // 优先级：model > workflow_id > 配置中的workflow_id
    const finalWorkflowId = model || workflow_id || providerConfig?.workflow_id;

    if (!finalWorkflowId) {
      throw new Error('Dify 需要配置 workflow_id，请在模型选择中选择工作流或在设置中配置');
    }

    // Dify 工作流调用
    const response = await this.client.post(`/v1/workflows/${finalWorkflowId}/run`, {
      inputs: {
        prompt,
        width,
        height,
        negative_prompt: options.negative_prompt || '',
      },
      response_mode: 'blocking',
    });

    // 解析返回结果
    if (response.data.data?.outputs) {
      const outputs = response.data.data.outputs;
      // 查找图片输出
      for (const key in outputs) {
        if (outputs[key]?.type === 'image' || outputs[key]?.url) {
          return outputs[key].url || outputs[key];
        }
      }
    }

    // 如果返回的是base64
    if (response.data.data?.image) {
      return `data:image/png;base64,${response.data.data.image}`;
    }

    throw new Error('无法解析 Dify 返回的图片数据');
  }

  /**
   * 图生视频 - Dify 使用工作流API
   */
  async imageToVideo(imageBase64, options = {}) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('请先配置 Dify API 地址');
      }
    }

    const {
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model,
      workflow_id,
    } = options;

    const providerConfig = getProviderConfig(PROVIDERS.DIFY);
    const finalWorkflowId = model || workflow_id || providerConfig?.workflow_id;

    if (!finalWorkflowId) {
      throw new Error('Dify 需要配置视频生成工作流的 workflow_id');
    }

    const response = await this.client.post(`/v1/workflows/${finalWorkflowId}/run`, {
      inputs: {
        image: imageBase64,
        width,
        height,
        num_frames,
        fps,
        negative_prompt: options.negative_prompt || '',
      },
      response_mode: 'blocking',
    });

    if (response.data.data?.outputs) {
      const outputs = response.data.data.outputs;
      for (const key in outputs) {
        if (outputs[key]?.type === 'video' || outputs[key]?.url) {
          return outputs[key].url || outputs[key];
        }
      }
    }

    if (response.data.data?.video) {
      return `data:video/mp4;base64,${response.data.data.video}`;
    }

    if (response.data.data?.file_url) {
      return response.data.data.file_url;
    }

    throw new Error('无法解析 Dify 返回的视频数据');
  }

  /**
   * 文+图生视频 - Dify 使用工作流API
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('请先配置 Dify API 地址');
      }
    }

    const {
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model,
      workflow_id,
    } = options;

    const providerConfig = getProviderConfig(PROVIDERS.DIFY);
    const finalWorkflowId = model || workflow_id || providerConfig?.workflow_id;

    if (!finalWorkflowId) {
      throw new Error('Dify 需要配置视频生成工作流的 workflow_id');
    }

    const response = await this.client.post(`/v1/workflows/${finalWorkflowId}/run`, {
      inputs: {
        prompt,
        image: imageBase64,
        width,
        height,
        num_frames,
        fps,
        negative_prompt: options.negative_prompt || '',
      },
      response_mode: 'blocking',
    });

    if (response.data.data?.outputs) {
      const outputs = response.data.data.outputs;
      for (const key in outputs) {
        if (outputs[key]?.type === 'video' || outputs[key]?.url) {
          return outputs[key].url || outputs[key];
        }
      }
    }

    if (response.data.data?.video) {
      return `data:video/mp4;base64,${response.data.data.video}`;
    }

    if (response.data.data?.file_url) {
      return response.data.data.file_url;
    }

    throw new Error('无法解析 Dify 返回的视频数据');
  }

  /**
   * 文生视频 - Dify 使用工作流API
   */
  async textToVideo(prompt, options = {}) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('请先配置 Dify API 地址');
      }
    }

    const {
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      model, // 模型ID就是workflow_id
      workflow_id,
    } = options;

    const providerConfig = getProviderConfig(PROVIDERS.DIFY);
    // 优先级：model > workflow_id > 配置中的workflow_id
    const finalWorkflowId = model || workflow_id || providerConfig?.workflow_id;

    if (!finalWorkflowId) {
      throw new Error('Dify 需要配置视频生成工作流的 workflow_id，请在模型选择中选择工作流或在设置中配置');
    }

    // Dify 工作流调用
    const response = await this.client.post(`/v1/workflows/${finalWorkflowId}/run`, {
      inputs: {
        prompt,
        width,
        height,
        num_frames,
        fps,
        negative_prompt: options.negative_prompt || '',
      },
      response_mode: 'blocking',
    });

    // 解析返回结果
    if (response.data.data?.outputs) {
      const outputs = response.data.data.outputs;
      // 查找视频输出
      for (const key in outputs) {
        if (outputs[key]?.type === 'video' || outputs[key]?.url) {
          return outputs[key].url || outputs[key];
        }
      }
    }

    // 如果返回的是base64视频
    if (response.data.data?.video) {
      return `data:video/mp4;base64,${response.data.data.video}`;
    }

    // 如果返回的是文件URL
    if (response.data.data?.file_url) {
      return response.data.data.file_url;
    }

    throw new Error('无法解析 Dify 返回的视频数据');
  }
}

export default new DifyAdapter();

