import { PROVIDERS } from '../constants/providers';
import siliconflowAdapter from './providers/siliconflow';
import difyAdapter from './providers/dify';
import ollamaAdapter from './providers/ollama';
import llamaCppAdapter from './providers/llama_cpp';
import openaiAdapter from './providers/openai';
import stabilityAIAdapter from './providers/stability_ai';
import replicateAdapter from './providers/replicate';
import huggingfaceAdapter from './providers/huggingface';
import baiduAdapter from './providers/baidu';
import alibabaAdapter from './providers/alibaba';

/**
 * 统一 API 接口层
 */
class UnifiedAPI {
  constructor() {
    this.adapters = {
      [PROVIDERS.SILICONFLOW]: siliconflowAdapter,
      [PROVIDERS.DIFY]: difyAdapter,
      [PROVIDERS.OLLAMA]: ollamaAdapter,
      [PROVIDERS.LLAMA_CPP]: llamaCppAdapter,
      [PROVIDERS.OPENAI]: openaiAdapter,
      [PROVIDERS.STABILITY_AI]: stabilityAIAdapter,
      [PROVIDERS.REPLICATE]: replicateAdapter,
      [PROVIDERS.HUGGINGFACE]: huggingfaceAdapter,
      [PROVIDERS.BAIDU]: baiduAdapter,
      [PROVIDERS.ALIBABA]: alibabaAdapter,
    };
  }

  /**
   * 获取适配器
   */
  getAdapter(provider) {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new Error(`不支持的提供商: ${provider}`);
    }
    return adapter;
  }

  /**
   * 文生图
   */
  async textToImage(provider, prompt, options = {}) {
    const adapter = this.getAdapter(provider);
    // 重新初始化客户端（配置可能已更改）
    try {
      if (adapter.initClient) {
        adapter.initClient();
      }
      return await adapter.textToImage(prompt, options);
    } catch (error) {
      // 如果初始化失败，尝试重新初始化
      if (adapter.initClient) {
        adapter.initClient();
        return await adapter.textToImage(prompt, options);
      }
      throw error;
    }
  }

  /**
   * 文生视频
   */
  async textToVideo(provider, prompt, options = {}) {
    const adapter = this.getAdapter(provider);
    // 重新初始化客户端（配置可能已更改）
    try {
      if (adapter.initClient) {
        adapter.initClient();
      }
      return await adapter.textToVideo(prompt, options);
    } catch (error) {
      // 如果初始化失败，尝试重新初始化
      if (adapter.initClient) {
        adapter.initClient();
        return await adapter.textToVideo(prompt, options);
      }
      throw error;
    }
  }

  /**
   * 图生视频
   */
  async imageToVideo(provider, imageBase64, options = {}) {
    const adapter = this.getAdapter(provider);
    try {
      if (adapter.initClient) {
        adapter.initClient();
      }
      if (adapter.imageToVideo) {
        return await adapter.imageToVideo(imageBase64, options);
      }
      // 如果不支持，尝试使用文生视频接口
      throw new Error('当前服务提供商不支持图生视频功能');
    } catch (error) {
      if (adapter.initClient) {
        adapter.initClient();
        if (adapter.imageToVideo) {
          return await adapter.imageToVideo(imageBase64, options);
        }
      }
      throw error;
    }
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(provider, prompt, imageBase64, options = {}) {
    const adapter = this.getAdapter(provider);
    try {
      if (adapter.initClient) {
        adapter.initClient();
      }
      if (adapter.imageAndTextToVideo) {
        return await adapter.imageAndTextToVideo(prompt, imageBase64, options);
      }
      // 如果不支持，尝试使用图生视频接口
      if (adapter.imageToVideo && imageBase64) {
        return await adapter.imageToVideo(imageBase64, { ...options, prompt });
      }
      // 最后尝试文生视频
      if (prompt) {
        return await adapter.textToVideo(prompt, { ...options, image: imageBase64 });
      }
      throw new Error('当前服务提供商不支持文+图生视频功能');
    } catch (error) {
      if (adapter.initClient) {
        adapter.initClient();
        if (adapter.imageAndTextToVideo) {
          return await adapter.imageAndTextToVideo(prompt, imageBase64, options);
        }
      }
      throw error;
    }
  }

  /**
   * 检查提供商是否支持功能
   */
  supports(provider, feature) {
    const { PROVIDER_CONFIG } = require('../constants/providers');
    return PROVIDER_CONFIG[provider]?.supports[feature] || false;
  }

  /**
   * 获取模型列表
   * @param {string} provider - 服务提供商
   * @param {string} type - 模型类型 ('image' 或 'video')
   * @returns {Promise<Array>} 模型列表
   */
  async getModels(provider, type = 'image') {
    const adapter = this.getAdapter(provider);
    try {
      if (adapter.initClient) {
        adapter.initClient();
      }
      if (adapter.getModels) {
        return await adapter.getModels(type);
      }
      // 如果没有实现，返回空数组
      return [];
    } catch (error) {
      console.error(`获取 ${provider} 模型列表失败:`, error);
      // 尝试使用默认模型
      if (adapter.getDefaultModels) {
        return adapter.getDefaultModels(type);
      }
      return [];
    }
  }
}

export default new UnifiedAPI();

