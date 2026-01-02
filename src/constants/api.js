/**
 * API 相关常量配置
 */

// 硅基流动 API 基础地址
export const API_BASE_URL = 'https://api.siliconflow.cn/v1';

// API 端点
export const API_ENDPOINTS = {
  IMAGES_GENERATIONS: '/images/generations',
  VIDEOS_GENERATIONS: '/videos/generations',
  TASKS: '/tasks',
};

// 默认模型配置
export const DEFAULT_MODELS = {
  IMAGE: 'stable-diffusion-xl-base-1.0',
  VIDEO: 'stable-video-diffusion',
};

// 默认生成参数
export const DEFAULT_IMAGE_OPTIONS = {
  width: 1024,
  height: 1024,
  num_inference_steps: 20,
  guidance_scale: 7.5,
};

export const DEFAULT_VIDEO_OPTIONS = {
  width: 1024,
  height: 576,
  num_frames: 25,
  fps: 8,
  duration: 5, // 视频时长（秒）
};

// 参数范围限制
export const PARAM_LIMITS = {
  IMAGE: {
    width: { min: 512, max: 2048, step: 64 },
    height: { min: 512, max: 2048, step: 64 },
    num_inference_steps: { min: 10, max: 50, step: 5 },
    guidance_scale: { min: 1, max: 20, step: 0.5 },
  },
  VIDEO: {
    width: { min: 512, max: 1920, step: 64 },
    height: { min: 512, max: 1080, step: 64 },
    num_frames: { min: 16, max: 50, step: 1 },
    fps: { min: 4, max: 24, step: 1 },
    duration: { min: 1, max: 300, step: 1 }, // 视频时长（秒），最大5分钟
  },
};

