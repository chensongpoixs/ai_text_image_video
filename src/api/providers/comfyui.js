import axios from 'axios';
import { PROVIDER_CONFIG, PROVIDERS } from '../../constants/providers';
import { getProviderConfig } from '../../utils/storage';

const config = PROVIDER_CONFIG[PROVIDERS.COMFYUI];

/**
 * ComfyUI API 适配器
 * ComfyUI 使用工作流（workflow）方式，通过 API 提交任务并轮询结果
 */
class ComfyUIAdapter {
  constructor() {
    this.client = null;
    this.clientId = `comfyui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.initClient();
  }

  initClient() {
    try {
      const providerConfig = getProviderConfig(PROVIDERS.COMFYUI);
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
        timeout: 300000, // 5分钟超时，因为生成可能需要较长时间
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
            console.error('ComfyUI API错误:', error.response.data);
            return Promise.reject(
              new Error(error.response.data?.error || error.response.data?.message || '请求失败')
            );
          }
          return Promise.reject(error);
        }
      );
    } catch (error) {
      console.error('初始化 ComfyUI 客户端失败:', error);
      this.client = null;
    }
  }

  /**
   * 获取可用模型列表
   * ComfyUI 通过工作流实现，这里返回默认工作流或用户配置的工作流
   */
  async getModels(type = 'image') {
    try {
      if (!this.client) {
        this.initClient();
        if (!this.client) {
          return this.getDefaultModels(type);
        }
      }

      // ComfyUI 可以通过 /object_info 获取可用节点信息
      // 但模型列表通常由工作流定义，这里返回默认模型
      return this.getDefaultModels(type);
    } catch (error) {
      console.warn('获取模型列表失败:', error);
      return this.getDefaultModels(type);
    }
  }

  /**
   * 获取默认模型列表
   */
  getDefaultModels(type = 'image') {
    if (type === 'image') {
      return [
        { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', description: '高质量图片生成' },
        { id: 'stable-diffusion-1.5', name: 'Stable Diffusion 1.5', description: '经典图片生成模型' },
        { id: 'flux', name: 'Flux', description: '先进的图片生成模型' },
      ];
    } else {
      return [
        { id: 'stable-video-diffusion', name: 'Stable Video Diffusion', description: '视频生成模型' },
        { id: 'animatediff', name: 'AnimateDiff', description: '动画视频生成' },
      ];
    }
  }

  /**
   * 创建基础文生图工作流
   * 如果用户提供了自定义工作流，则使用自定义工作流并替换 prompt
   */
  createTextToImageWorkflow(prompt, options = {}) {
    const {
      model = 'stable-diffusion-xl',
      negative_prompt = '',
      width = 1024,
      height = 1024,
      num_inference_steps = 20,
      guidance_scale = 7.5,
      workflow, // 用户自定义工作流
    } = options;

    // 如果提供了自定义工作流，使用自定义工作流
    if (workflow && typeof workflow === 'object') {
      // 尝试在工作流中查找并替换 prompt
      const workflowCopy = JSON.parse(JSON.stringify(workflow));
      for (const nodeId in workflowCopy) {
        const node = workflowCopy[nodeId];
        if (node.class_type === 'CLIPTextEncode' && node.inputs.text) {
          // 查找正提示词节点（通常第一个 CLIPTextEncode）
          if (!node.inputs.text.includes('negative') && !node.inputs.text.includes('bad')) {
            node.inputs.text = prompt;
          }
        }
        if (node.class_type === 'CLIPTextEncode' && node.inputs.text && 
            (node.inputs.text.includes('negative') || node.inputs.text.includes('bad'))) {
          // 负提示词节点
          node.inputs.text = negative_prompt || node.inputs.text;
        }
      }
      return workflowCopy;
    }

    // ComfyUI 工作流结构（简化版，实际需要根据具体工作流调整）
    return {
      '3': {
        inputs: {
          seed: Math.floor(Math.random() * 1000000000),
          steps: num_inference_steps,
          cfg: guidance_scale,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
        class_type: 'KSampler',
      },
      '4': {
        inputs: {
          ckpt_name: model,
        },
        class_type: 'CheckpointLoaderSimple',
      },
      '5': {
        inputs: {
          width: width,
          height: height,
          batch_size: 1,
        },
        class_type: 'EmptyLatentImage',
      },
      '6': {
        inputs: {
          text: prompt,
          clip: ['4', 1],
        },
        class_type: 'CLIPTextEncode',
      },
      '7': {
        inputs: {
          text: negative_prompt || 'bad quality, blurry',
          clip: ['4', 1],
        },
        class_type: 'CLIPTextEncode',
      },
      '8': {
        inputs: {
          samples: ['3', 0],
          vae: ['4', 2],
        },
        class_type: 'VAEDecode',
      },
      '9': {
        inputs: {
          filename_prefix: 'ComfyUI',
          images: ['8', 0],
        },
        class_type: 'SaveImage',
      },
    };
  }

  /**
   * 创建图生视频工作流
   * 如果用户提供了自定义工作流，则使用自定义工作流
   */
  createImageToVideoWorkflow(imageBase64, options = {}) {
    const {
      model = 'stable-video-diffusion',
      prompt = '',
      negative_prompt = '',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
      workflow, // 用户自定义工作流
    } = options;

    // 如果提供了自定义工作流，使用自定义工作流
    if (workflow && typeof workflow === 'object') {
      const workflowCopy = JSON.parse(JSON.stringify(workflow));
      // 尝试替换图片输入和提示词
      for (const nodeId in workflowCopy) {
        const node = workflowCopy[nodeId];
        if (node.class_type === 'LoadImage' && node.inputs.image) {
          node.inputs.image = imageBase64;
        }
        if (node.class_type === 'CLIPTextEncode' && node.inputs.text) {
          if (!node.inputs.text.includes('negative') && !node.inputs.text.includes('bad')) {
            node.inputs.text = prompt || node.inputs.text;
          } else {
            node.inputs.text = negative_prompt || node.inputs.text;
          }
        }
      }
      return workflowCopy;
    }

    // 简化的工作流，实际需要根据 ComfyUI 的具体节点调整
    return {
      '1': {
        inputs: {
          image: imageBase64,
        },
        class_type: 'LoadImage',
      },
      '2': {
        inputs: {
          model_name: model,
        },
        class_type: 'CheckpointLoaderSimple',
      },
      '3': {
        inputs: {
          seed: Math.floor(Math.random() * 1000000000),
          steps: 25,
          cfg: 7.5,
          sampler_name: 'euler',
          scheduler: 'normal',
          model: ['2', 0],
          positive: prompt ? ['4', 0] : undefined,
          negative: ['5', 0],
          images: ['1', 0],
          num_frames: num_frames,
          fps: fps,
        },
        class_type: 'ImageToVideo',
      },
      '4': {
        inputs: {
          text: prompt || 'high quality video',
          clip: ['2', 1],
        },
        class_type: 'CLIPTextEncode',
      },
      '5': {
        inputs: {
          text: negative_prompt || 'bad quality, blurry',
          clip: ['2', 1],
        },
        class_type: 'CLIPTextEncode',
      },
      '6': {
        inputs: {
          filename_prefix: 'ComfyUI_Video',
          images: ['3', 0],
        },
        class_type: 'SaveImage',
      },
    };
  }

  /**
   * 提交任务到 ComfyUI
   */
  async submitPrompt(workflow) {
    if (!this.client) {
      this.initClient();
      if (!this.client) {
        throw new Error('请先配置 ComfyUI API 地址');
      }
    }

    const response = await this.client.post('/prompt', {
      client_id: this.clientId,
      prompt: workflow,
    });

    return response.data.prompt_id;
  }

  /**
   * 轮询任务状态
   */
  async pollTask(promptId, maxAttempts = 120) {
    if (!this.client) {
      throw new Error('ComfyUI 客户端未初始化');
    }

    for (let i = 0; i < maxAttempts; i++) {
      try {
        // 先检查队列状态
        const queueResponse = await this.client.get('/queue');
        const queue = queueResponse.data;
        const running = queue.queue_running || [];
        const pending = queue.queue_pending || [];

        // 检查任务是否在队列中
        const isInQueue = [...running, ...pending].some(
          (item) => item[1] === promptId
        );

        // 如果不在队列中，检查历史记录
        if (!isInQueue) {
          try {
            const historyResponse = await this.client.get(`/history/${promptId}`);
            const history = historyResponse.data;

            if (history[promptId]) {
              const outputs = history[promptId].outputs;
              
              // 查找输出节点（通常是 SaveImage 节点）
              for (const nodeId in outputs) {
                const nodeOutput = outputs[nodeId];
                if (nodeOutput.images && nodeOutput.images.length > 0) {
                  // 返回图片 URL
                  const image = nodeOutput.images[0];
                  const baseURL = this.client.defaults.baseURL.replace(/\/$/, '');
                  const subfolder = image.subfolder ? `${image.subfolder}/` : '';
                  const imageUrl = `${baseURL}/view?filename=${image.filename}&subfolder=${subfolder}&type=${image.type || 'output'}`;
                  return imageUrl;
                }
                // 检查视频输出
                if (nodeOutput.videos && nodeOutput.videos.length > 0) {
                  const video = nodeOutput.videos[0];
                  const baseURL = this.client.defaults.baseURL.replace(/\/$/, '');
                  const subfolder = video.subfolder ? `${video.subfolder}/` : '';
                  const videoUrl = `${baseURL}/view?filename=${video.filename}&subfolder=${subfolder}&type=${video.type || 'output'}`;
                  return videoUrl;
                }
              }

              // 如果任务完成但没有找到输出
              throw new Error('任务已完成但未找到输出结果');
            }
          } catch (historyError) {
            // 如果历史记录查询失败，任务可能还在处理中
            if (i < maxAttempts - 1) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
            throw new Error('无法获取任务结果，请检查 ComfyUI 服务是否正常运行');
          }
        }

        // 如果任务还在队列中，等待后继续轮询
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error('任务超时，请检查 ComfyUI 服务状态');
  }

  /**
   * 文生图
   */
  async textToImage(prompt, options = {}) {
    const workflow = this.createTextToImageWorkflow(prompt, options);
    const promptId = await this.submitPrompt(workflow);
    return await this.pollTask(promptId);
  }

  /**
   * 文生视频
   */
  async textToVideo(prompt, options = {}) {
    // ComfyUI 文生视频通常需要先文生图，再图生视频
    // 或者使用专门的文生视频工作流
    const {
      model = 'stable-video-diffusion',
      width = 1024,
      height = 576,
      num_frames = 25,
      fps = 8,
    } = options;

    // 先生成图片
    const imageUrl = await this.textToImage(prompt, {
      ...options,
      width,
      height,
    });

    // 将图片转换为 base64
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const reader = new FileReader();
    const imageBase64 = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(imageBlob);
    });

    // 然后图生视频
    return await this.imageToVideo(imageBase64, {
      ...options,
      prompt,
      model,
      width,
      height,
      num_frames,
      fps,
    });
  }

  /**
   * 图生视频
   */
  async imageToVideo(imageBase64, options = {}) {
    // 处理 base64 图片
    let imageData = imageBase64;
    if (imageBase64.startsWith('data:image')) {
      imageData = imageBase64;
    } else if (imageBase64.startsWith('http')) {
      // 如果是 URL，需要先下载
      const response = await fetch(imageBase64);
      const blob = await response.blob();
      const reader = new FileReader();
      imageData = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } else {
      imageData = `data:image/png;base64,${imageBase64}`;
    }

    const workflow = this.createImageToVideoWorkflow(imageData, options);
    const promptId = await this.submitPrompt(workflow);
    return await this.pollTask(promptId);
  }

  /**
   * 文+图生视频
   */
  async imageAndTextToVideo(prompt, imageBase64, options = {}) {
    return await this.imageToVideo(imageBase64, {
      ...options,
      prompt,
    });
  }
}

export default new ComfyUIAdapter();

