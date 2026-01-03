/**
 * AI 服务提供商配置
 */

export const PROVIDERS = {
  OPENAI: 'openai',
  COMFYUI: 'comfyui',
  STABILITY_AI: 'stability_ai',
  REPLICATE: 'replicate',
  HUGGINGFACE: 'huggingface',
  BAIDU: 'baidu',
  ALIBABA: 'alibaba',
  TENCENT: 'tencent',
  SILICONFLOW: 'siliconflow',
  DIFY: 'dify',
  OLLAMA: 'ollama',
  LLAMA_CPP: 'llama_cpp',
};

export const PROVIDER_CONFIG = {
  [PROVIDERS.OPENAI]: {
    name: 'OpenAI',
    nameEn: 'OpenAI',
    description: 'DALL-E 图片生成 / Sora 视频生成',
    baseUrl: 'https://api.openai.com/v1',
    supports: {
      image: true,
      video: true, // Sora 视频生成
    },
    authType: 'bearer',
    website: 'https://openai.com',
  },
  [PROVIDERS.COMFYUI]: {
    name: 'ComfyUI',
    nameEn: 'ComfyUI',
    description: '强大的节点式 AI 工作流平台',
    baseUrl: 'http://localhost:8188', // 默认本地地址
    supports: {
      image: true,
      video: true, // 支持视频生成工作流
    },
    authType: 'none',
    website: 'https://github.com/comfyanonymous/ComfyUI',
  },
  [PROVIDERS.STABILITY_AI]: {
    name: 'Stability AI',
    nameEn: 'Stability AI',
    description: 'Stable Diffusion API 服务',
    baseUrl: 'https://api.stability.ai/v1',
    supports: {
      image: true,
      video: true, // Stable Video Diffusion
    },
    authType: 'bearer',
    website: 'https://stability.ai',
  },
  [PROVIDERS.REPLICATE]: {
    name: 'Replicate',
    nameEn: 'Replicate',
    description: '云端运行 AI 模型',
    baseUrl: 'https://api.replicate.com/v1',
    supports: {
      image: true,
      video: true,
    },
    authType: 'bearer',
    website: 'https://replicate.com',
  },
  [PROVIDERS.HUGGINGFACE]: {
    name: 'Hugging Face',
    nameEn: 'Hugging Face',
    description: 'Hugging Face Inference API',
    baseUrl: 'https://api-inference.huggingface.co',
    supports: {
      image: true,
      video: true,
    },
    authType: 'bearer',
    website: 'https://huggingface.co',
  },
  [PROVIDERS.BAIDU]: {
    name: '百度文心',
    nameEn: 'Baidu ERNIE',
    description: '百度文心一格图片生成',
    baseUrl: 'https://qianfan.baidubce.com',
    supports: {
      image: true,
      video: true, // 支持视频生成
    },
    authType: 'bearer',
    website: 'https://cloud.baidu.com',
  },
  [PROVIDERS.ALIBABA]: {
    name: '阿里通义',
    nameEn: 'Alibaba Tongyi',
    description: '通义万相图片生成',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    supports: {
      image: true,
      video: true, // 通义万相视频生成
    },
    authType: 'bearer',
    website: 'https://www.aliyun.com',
  },
  [PROVIDERS.TENCENT]: {
    name: '腾讯混元',
    nameEn: 'Tencent Hunyuan',
    description: '腾讯混元图片生成',
    baseUrl: 'https://hunyuan.tencentcloudapi.com',
    supports: {
      image: true,
      video: false, // 暂不支持视频
    },
    authType: 'bearer',
    website: 'https://cloud.tencent.com',
  },
  [PROVIDERS.SILICONFLOW]: {
    name: '硅基流动',
    nameEn: 'SiliconFlow',
    description: '专业的AI模型服务平台',
    baseUrl: 'https://api.siliconflow.cn/v1',
    supports: {
      image: true,
      video: true,
    },
    authType: 'bearer',
    website: 'https://siliconflow.cn',
  },
  [PROVIDERS.DIFY]: {
    name: 'Dify',
    nameEn: 'Dify',
    description: '开源的LLM应用开发平台',
    baseUrl: '', // 需要用户配置
    supports: {
      image: true,
      video: true, // 通过工作流支持
    },
    authType: 'bearer',
    website: 'https://dify.ai',
  },
  [PROVIDERS.OLLAMA]: {
    name: 'Ollama',
    nameEn: 'Ollama',
    description: '本地运行大型语言模型',
    baseUrl: 'http://localhost:11434', // 默认本地地址
    supports: {
      image: true,
      video: true, // 支持视频生成模型
    },
    authType: 'none',
    website: 'https://ollama.ai',
  },
  [PROVIDERS.LLAMA_CPP]: {
    name: 'llama.cpp',
    nameEn: 'llama.cpp',
    description: 'C++实现的LLM推理引擎',
    baseUrl: 'http://localhost:8080', // 默认本地地址
    supports: {
      image: true,
      video: true, // 支持视频生成
    },
    authType: 'none',
    website: 'https://github.com/ggerganov/llama.cpp',
  },
};

// 默认服务提供商
export const DEFAULT_PROVIDER = PROVIDERS.SILICONFLOW;

