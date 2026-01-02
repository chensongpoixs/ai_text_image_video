# AI 创意工坊

> AI 助力创意落地，从构想到实现，轻松开启！！！

一个现代化的 AI 创意生成平台，支持文本生成图片和文本/图片生成视频功能。集成多个主流 AI 服务提供商，提供统一的界面和 API 接口。
 
![](/img/文生成视频.gif)

## ✨ 功能特性



### 🎨 文生图 (Text-to-Image)
- 支持多种 AI 模型生成高质量图片
- 可自定义图片尺寸、推理步数、引导强度等参数
- 支持负面提示词优化生成效果
- 一键下载图片，支持选择保存位置

### 🎬 视频生成 (Video Generation)
支持三种视频生成模式：
- **文生视频** - 使用文本提示词生成视频
- **图生视频** - 上传图片生成视频
- **文+图生视频** - 结合文本和图片生成视频

功能特点：
- 可自定义视频时长（1秒 - 5分钟）
- 可调整视频分辨率、帧数、帧率
- 实时显示生成进度
- 支持选择保存位置下载视频

### 🎯 高级界面
- 现代化的玻璃态（Glassmorphism）设计
- 流畅的动画效果和渐变背景
- 响应式布局，支持各种屏幕尺寸
- 直观的用户界面，操作简单

### ⚙️ 灵活配置
- 统一的 API 配置界面
- 支持多个服务提供商切换
- 动态模型列表加载
- 本地安全存储 API Key

## 🔌 支持的服务提供商

### 国际服务
- ✅ **OpenAI** - DALL-E 图片生成 / Sora 视频生成
- ✅ **Stability AI** - Stable Diffusion / Stable Video Diffusion
- ✅ **Replicate** - 云端运行 AI 模型
- ✅ **Hugging Face** - 开源模型推理 API

### 国内服务
- ✅ **百度文心** - 文心一格图片生成 / Musesteamer 视频生成
- ✅ **阿里通义** - 通义万相图片和视频生成
- ✅ **腾讯混元** - 混元图片生成（配置中）

### 专业平台
- ✅ **硅基流动** (SiliconFlow) - 专业的 AI 模型服务平台
- ✅ **Dify** - 开源的 LLM 应用开发平台

### 本地部署
- ✅ **Ollama** - 本地运行大型语言模型
- ✅ **llama.cpp** - C++ 实现的 LLM 推理引擎

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 查看应用。

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录。

### 预览生产构建

```bash
npm run preview
```

## ⚙️ 配置说明

### API Key 配置

1. 点击右上角的 **API 配置** 按钮
2. 选择要配置的服务提供商
3. 输入对应的 API Key 和 Base URL（如需要）
4. 配置会自动保存到本地浏览器存储

### 环境变量（可选）

可以在项目根目录创建 `.env` 文件：

```env
# OpenAI
VITE_OPENAI_API_KEY=sk-...

# Stability AI
VITE_STABILITY_AI_API_KEY=sk-...

# 百度文心
VITE_BAIDU_API_KEY=bce-v3/...

# 其他服务商的 API Key
```

### 各服务商配置说明

#### OpenAI
- **API Key**: 从 [OpenAI Platform](https://platform.openai.com) 获取
- **Base URL**: 默认 `https://api.openai.com/v1`，可自定义

#### Stability AI
- **API Key**: 从 [Stability AI](https://platform.stability.ai) 获取
- **Base URL**: 默认 `https://api.stability.ai/v1`

#### 百度文心
- **API Key**: Bearer Token 格式，从 [百度智能云](https://cloud.baidu.com) 获取
- **Base URL**: 默认 `https://qianfan.baidubce.com`

#### 阿里通义
- **API Key**: 从 [阿里云](https://www.aliyun.com) 获取
- **Base URL**: 默认 `https://dashscope.aliyuncs.com/api/v1`

#### Dify
- **API Key**: 从 Dify 工作空间获取
- **Base URL**: 你的 Dify 实例地址，如 `https://api.dify.ai/v1`

#### Ollama
- **Base URL**: 默认 `http://localhost:11434`
- 无需 API Key（本地服务）

#### llama.cpp
- **Base URL**: 你的 llama.cpp 服务地址
- 无需 API Key（本地服务）

## 📖 使用说明

### 文生图

1. 选择服务提供商和模型
2. 输入提示词（必填）
3. 可选：输入负面提示词
4. 调整图片参数（宽度、高度、推理步数、引导强度）
5. 点击 **生成图片**
6. 生成完成后可预览和下载

### 文生视频

1. 选择服务提供商和模型
2. 选择生成模式：
   - **文生视频** - 仅使用文本
   - **图生视频** - 上传图片（必填）
   - **文+图生视频** - 文本和图片结合
3. 输入提示词（根据模式要求）
4. 上传图片（图生视频或文+图生视频模式）
5. 调整视频参数：
   - 视频时长（1秒 - 5分钟）
   - 分辨率（宽度、高度）
   - 帧数、帧率
6. 点击 **生成视频**
7. 等待生成完成（显示进度条）
8. 生成完成后可预览和下载

### 下载文件

- **支持浏览器**: Chrome 86+, Edge 86+, Opera 72+
- 点击下载按钮会弹出文件保存对话框
- 可以选择保存位置和文件名
- 不支持 File System API 的浏览器会使用传统下载方式

## 📁 项目结构

```
ai-text-image-video/
├── src/
│   ├── api/                    # API 接口层
│   │   ├── index.js           # 统一 API 接口
│   │   └── providers/          # 各服务商适配器
│   │       ├── openai.js
│   │       ├── stability_ai.js
│   │       ├── baidu.js
│   │       ├── alibaba.js
│   │       ├── siliconflow.js
│   │       ├── dify.js
│   │       ├── ollama.js
│   │       ├── llama_cpp.js
│   │       ├── replicate.js
│   │       └── huggingface.js
│   ├── components/             # React 组件
│   │   ├── TextToImage.jsx    # 文生图组件
│   │   ├── TextToVideo.jsx    # 视频生成组件
│   │   ├── ProviderSelector.jsx # 服务商选择器
│   │   ├── ModelSelector.jsx  # 模型选择器
│   │   └── ApiConfig.jsx      # API 配置组件
│   ├── constants/              # 常量配置
│   │   ├── providers.js       # 服务商配置
│   │   └── api.js             # API 常量
│   ├── utils/                  # 工具函数
│   │   └── storage.js         # 本地存储工具
│   ├── styles/                 # 样式文件
│   │   └── index.css          # 全局样式
│   ├── App.jsx                 # 主应用组件
│   └── main.jsx                # 应用入口
├── public/                     # 静态资源
├── index.html                  # HTML 模板
├── package.json               # 项目配置
├── vite.config.js             # Vite 配置
├── tailwind.config.js         # Tailwind 配置
└── README.md                  # 项目文档
```

## 🛠️ 技术栈

- **前端框架**: React 18
- **构建工具**: Vite 5
- **样式框架**: Tailwind CSS 3
- **HTTP 客户端**: Axios
- **图标库**: Lucide React
- **状态管理**: React Hooks

## 🌐 浏览器支持

- Chrome 86+
- Edge 86+
- Firefox 最新版
- Safari 最新版
- Opera 72+

**注意**: File System Access API（文件保存对话框）仅在 Chrome、Edge、Opera 中支持。

## 📝 开发说明

### 添加新的服务提供商

1. 在 `src/constants/providers.js` 中添加提供商配置
2. 在 `src/api/providers/` 目录创建适配器文件
3. 在 `src/api/index.js` 中注册新适配器
4. 实现必要的方法：
   - `getModels(type)` - 获取模型列表
   - `textToImage(prompt, options)` - 文生图
   - `textToVideo(prompt, options)` - 文生视频
   - `imageToVideo(imageBase64, options)` - 图生视频（可选）
   - `imageAndTextToVideo(prompt, imageBase64, options)` - 文+图生视频（可选）

### 代码规范

- 使用 ES6+ 语法
- 组件使用函数式组件和 Hooks
- 遵循 React 最佳实践
- 使用 Tailwind CSS 进行样式设计

## ⚠️ 注意事项

1. **API 费用**: 部分服务商（如 OpenAI、Stability AI、百度、阿里等）的 API 调用可能产生费用，请注意使用量
2. **API Key 安全**: API Key 存储在浏览器本地存储中，请勿分享给他人
3. **网络要求**: 需要稳定的网络连接访问各服务商的 API
4. **视频生成时间**: 视频生成可能需要较长时间，请耐心等待
5. **浏览器兼容性**: 文件保存对话框功能需要现代浏览器支持

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有 AI 服务提供商提供的优秀 API 服务。

---

**一句话、创建一切** - 让 AI 助力你的创意无限可能！

