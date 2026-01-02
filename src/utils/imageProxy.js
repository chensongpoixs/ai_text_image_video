/**
 * 图片代理工具 - 解决CORS问题
 */

/**
 * 通过fetch加载图片并转换为blob URL
 * @param {string} url - 图片URL
 * @returns {Promise<string>} blob URL
 */
export async function loadImageAsBlob(url) {
  try {
    // 尝试直接fetch
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('加载图片失败:', error);
    throw error;
  }
}

/**
 * 创建可用的图片URL（处理CORS）
 * @param {string} url - 原始图片URL
 * @returns {Promise<string>} 可用的图片URL（可能是blob URL）
 */
export async function getImageUrl(url) {
  // 如果是data URL或blob URL，直接返回
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  try {
    // 尝试通过fetch加载
    return await loadImageAsBlob(url);
  } catch (error) {
    // 如果失败，返回原URL（让浏览器尝试加载，某些情况下可能可以）
    console.warn('无法通过代理加载图片，使用原URL:', error);
    return url;
  }
}

