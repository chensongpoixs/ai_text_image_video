/**
 * 本地存储工具函数
 */

const STORAGE_KEYS = {
  PROVIDER_CONFIG: 'ai_provider_config',
  CURRENT_PROVIDER: 'current_provider',
  // 向后兼容
  API_KEY: 'siliconflow_api_key',
};

/**
 * 获取所有提供商配置
 */
export const getAllProviderConfigs = () => {
  try {
    const config = localStorage.getItem(STORAGE_KEYS.PROVIDER_CONFIG);
    return config ? JSON.parse(config) : {};
  } catch {
    return {};
  }
};

/**
 * 设置提供商配置
 * @param {string} provider - 提供商ID
 * @param {object} config - 配置对象 { apiKey, baseUrl, ... }
 */
export const setProviderConfig = (provider, config) => {
  const allConfigs = getAllProviderConfigs();
  allConfigs[provider] = { ...allConfigs[provider], ...config };
  localStorage.setItem(STORAGE_KEYS.PROVIDER_CONFIG, JSON.stringify(allConfigs));
};

/**
 * 获取提供商配置
 * @param {string} provider - 提供商ID
 * @returns {object|null}
 */
export const getProviderConfig = (provider) => {
  const allConfigs = getAllProviderConfigs();
  return allConfigs[provider] || null;
};

/**
 * 设置当前使用的提供商
 * @param {string} provider - 提供商ID
 */
export const setCurrentProvider = (provider) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_PROVIDER, provider);
};

/**
 * 获取当前使用的提供商
 * @returns {string|null}
 */
export const getCurrentProvider = () => {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_PROVIDER);
};

/**
 * 清除提供商配置
 * @param {string} provider - 提供商ID
 */
export const clearProviderConfig = (provider) => {
  const allConfigs = getAllProviderConfigs();
  delete allConfigs[provider];
  localStorage.setItem(STORAGE_KEYS.PROVIDER_CONFIG, JSON.stringify(allConfigs));
};

// 向后兼容的API
/**
 * 设置API Key（硅基流动）
 * @param {string} apiKey - API密钥
 */
export const setApiKey = (apiKey) => {
  setProviderConfig('siliconflow', { apiKey });
  localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey); // 保持向后兼容
};

/**
 * 获取API Key（硅基流动）
 * @returns {string|null}
 */
export const getApiKey = () => {
  const config = getProviderConfig('siliconflow');
  return config?.apiKey || localStorage.getItem(STORAGE_KEYS.API_KEY);
};

/**
 * 清除API Key
 */
export const clearApiKey = () => {
  clearProviderConfig('siliconflow');
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
};

