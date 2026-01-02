# 项目结构说明

## 📂 目录结构

```
ai_text_image_video/
│
├── public/                      # 静态资源目录
│   └── .gitkeep                # Git 占位文件
│
├── src/                        # 源代码目录
│   ├── api/                    # API 接口层
│   │   └── siliconflow.js      # 硅基流动 API 封装
│   │                           # - 文生图接口
│   │                           # - 文生视频接口
│   │                           # - 请求拦截器
│   │                           # - 错误处理
│   │
│   ├── assets/                 # 静态资源文件
│   │   └── .gitkeep            # 图片、字体等资源文件
│   │
│   ├── components/             # React 组件
│   │   ├── ApiConfig.jsx       # API 配置弹窗组件
│   │   ├── TextToImage.jsx     # 文生图功能组件
│   │   └── TextToVideo.jsx     # 文生视频功能组件
│   │
│   ├── constants/              # 常量定义
│   │   └── api.js              # API 相关常量
│   │                           # - API 端点
│   │                           # - 默认模型配置
│   │                           # - 参数限制
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   └── .gitkeep            # 可复用的 React Hooks
│   │
│   ├── styles/                 # 样式文件
│   │   └── index.css           # 全局样式
│   │                           # - Tailwind 导入
│   │                           # - 自定义工具类
│   │
│   ├── utils/                  # 工具函数
│   │   └── storage.js          # 本地存储工具
│   │                           # - API Key 管理
│   │
│   ├── App.jsx                 # 主应用组件
│   │                           # - 路由管理
│   │                           # - 全局状态
│   │                           # - 布局结构
│   │
│   └── main.jsx                # 应用入口文件
│                               # - React 渲染
│                               # - 样式导入
│
├── index.html                  # HTML 模板
├── package.json                # 项目依赖配置
├── vite.config.js              # Vite 构建配置
├── tailwind.config.js          # Tailwind CSS 配置
├── postcss.config.js           # PostCSS 配置
├── .env.example                # 环境变量示例
├── .gitignore                  # Git 忽略文件
├── README.md                   # 项目说明文档
└── PROJECT_STRUCTURE.md        # 项目结构说明（本文件）
```

## 📋 目录说明

### `/public`
存放静态资源文件，如 favicon.ico、图片等。这些文件会被直接复制到构建输出目录。

### `/src/api`
API 接口封装层，负责与后端服务通信。所有 API 调用都通过此目录下的文件进行。

### `/src/assets`
项目资源文件，如图片、字体、JSON 数据等。这些文件会被 Vite 处理并优化。

### `/src/components`
React 组件目录，按功能模块组织。每个组件应该是独立的、可复用的。

### `/src/constants`
常量定义目录，集中管理项目中的常量配置，便于维护和修改。

### `/src/hooks`
自定义 React Hooks，封装可复用的逻辑。例如：`useApi`、`useLocalStorage` 等。

### `/src/styles`
样式文件目录，包含全局样式、主题配置等。

### `/src/utils`
工具函数目录，包含通用的辅助函数，如格式化、验证、存储等。

## 🔄 数据流向

```
用户操作
  ↓
组件 (components/)
  ↓
API 服务 (api/)
  ↓
硅基流动 API
  ↓
返回结果
  ↓
组件更新 UI
```

## 📝 代码规范

1. **组件命名**：使用 PascalCase，如 `TextToImage.jsx`
2. **工具函数**：使用 camelCase，如 `getApiKey()`
3. **常量**：使用 UPPER_SNAKE_CASE，如 `API_BASE_URL`
4. **文件组织**：按功能模块划分，保持单一职责原则

## 🚀 扩展指南

### 添加新功能
1. 在 `components/` 创建新组件
2. 如需 API 调用，在 `api/` 添加接口
3. 在 `constants/` 添加相关配置
4. 在 `App.jsx` 中引入新组件

### 添加新工具函数
1. 在 `utils/` 创建新文件
2. 导出函数供其他模块使用

### 添加新常量
1. 在 `constants/` 相应文件中添加
2. 或创建新的常量文件

## 📚 相关文档

- [React 文档](https://react.dev)
- [Vite 文档](https://vitejs.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [硅基流动 API 文档](https://siliconflow.cn)

