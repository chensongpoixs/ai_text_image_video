/**
 * 图片合并为视频的工具函数
 */

/**
 * 通过代理加载图片（解决CORS问题）
 */
async function loadImageViaProxy(url) {
  try {
    // 尝试直接fetch图片
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    // 如果直接fetch失败，尝试使用代理
    // 注意：这里需要后端代理服务，或者使用公共代理
    console.warn('直接加载图片失败，尝试其他方法:', error);
    throw error;
  }
}

/**
 * 将图片URL转换为Image对象（优先通过fetch解决CORS问题）
 */
function loadImage(url) {
  return new Promise(async (resolve, reject) => {
    try {
      // 如果是data URL或blob URL，直接加载
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('无法加载图片'));
        img.src = url;
        return;
      }

      // 对于外部URL，优先通过fetch加载（解决CORS问题）
      let imageUrl = url;
      try {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'image/*',
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          imageUrl = URL.createObjectURL(blob);
        } else {
          console.warn('Fetch图片返回非200状态:', response.status);
        }
      } catch (fetchError) {
        // fetch失败，可能是CORS限制，尝试直接加载
        console.warn('通过fetch加载图片失败，尝试直接加载:', fetchError);
      }

      // 使用处理后的URL创建Image对象
      const img = new Image();
      let resolved = false;
      
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          resolve(img);
        }
      };
      
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('无法加载图片，可能是CORS限制或网络问题'));
        }
      };
      
      // 不设置crossOrigin，避免额外的CORS检查
      img.src = imageUrl;
      
      // 设置超时
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('图片加载超时'));
        }
      }, 30000); // 30秒超时
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 将多张图片合并为视频
 * @param {string[]} imageUrls - 图片URL数组
 * @param {Object} options - 选项
 * @param {number} options.fps - 帧率，默认8
 * @param {number} options.duration - 每张图片显示时长（秒），默认1
 * @param {number} options.width - 视频宽度，默认1024
 * @param {number} options.height - 视频高度，默认1024
 * @returns {Promise<Blob>} 视频Blob
 */
export async function imagesToVideo(imageUrls, options = {}) {
  const {
    fps = 8,
    duration = 1.5, // 每张图片显示1.5秒
    width = 1024,
    height = 1024,
  } = options;

  if (!imageUrls || imageUrls.length === 0) {
    throw new Error('至少需要一张图片');
  }

  // 创建canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 加载所有图片
  const images = await Promise.all(imageUrls.map(url => loadImage(url)));

  // 计算总帧数
  const framesPerImage = Math.ceil(fps * duration);
  const totalFrames = framesPerImage * images.length;

  // 检查MediaRecorder支持
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  
  let selectedMimeType = 'video/webm';
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      selectedMimeType = mimeType;
      break;
    }
  }

  // 使用MediaRecorder API录制视频
  const stream = canvas.captureStream(fps);
  
  // 检查MediaRecorder是否支持
  if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
    throw new Error(`浏览器不支持 ${selectedMimeType} 格式`);
  }
  
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 2500000, // 设置比特率
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    let animationId = null;
    let isResolved = false;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
        console.log('收到视频数据块:', event.data.size, '字节');
      }
    };

    mediaRecorder.onstop = () => {
      if (isResolved) return;
      isResolved = true;
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      stream.getTracks().forEach(track => track.stop());
      
      if (chunks.length === 0) {
        reject(new Error('视频录制失败：没有收集到任何数据'));
        return;
      }
      
      const blob = new Blob(chunks, { type: selectedMimeType });
      
      // 验证Blob
      if (!blob || blob.size === 0) {
        reject(new Error('视频录制失败：生成的Blob为空'));
        return;
      }
      
      console.log('视频Blob生成成功:', {
        size: blob.size,
        type: blob.type,
        chunks: chunks.length,
      });
      
      resolve(blob);
    };

    mediaRecorder.onerror = (event) => {
      if (isResolved) return;
      isResolved = true;
      
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      stream.getTracks().forEach(track => track.stop());
      
      const error = event.error || new Error('录制视频时出错');
      console.error('MediaRecorder错误:', error);
      reject(error);
    };

    // 检查MediaRecorder状态
    if (mediaRecorder.state !== 'inactive') {
      reject(new Error('MediaRecorder状态异常'));
      return;
    }

    // 开始录制
    try {
      mediaRecorder.start(100); // 每100ms收集一次数据
      console.log('MediaRecorder开始录制，MIME类型:', selectedMimeType, '状态:', mediaRecorder.state);
    } catch (error) {
      reject(new Error(`启动录制失败: ${error.message}`));
      return;
    }

    // 绘制每一帧
    let currentFrame = 0;
    const frameTime = 1000 / fps; // 每帧的时间（毫秒）
    let lastTime = performance.now();
    let startTime = performance.now();

    const drawFrame = (currentTime) => {
      // 控制帧率
      if (currentTime - lastTime < frameTime) {
        animationId = requestAnimationFrame(drawFrame);
        return;
      }
      lastTime = currentTime;

      if (currentFrame >= totalFrames) {
        // 等待一小段时间确保最后一帧被录制
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 200);
        return;
      }

      const imageIndex = Math.floor(currentFrame / framesPerImage);
      const image = images[imageIndex];

      if (!image) {
        console.error('图片不存在，索引:', imageIndex);
        animationId = requestAnimationFrame(drawFrame);
        return;
      }

      // 清空画布
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // 计算图片缩放以适配画布（保持宽高比）
      const imgAspect = image.width / image.height;
      const canvasAspect = width / height;

      let drawWidth, drawHeight, drawX, drawY;

      if (imgAspect > canvasAspect) {
        // 图片更宽，以宽度为准
        drawWidth = width;
        drawHeight = width / imgAspect;
        drawX = 0;
        drawY = (height - drawHeight) / 2;
      } else {
        // 图片更高，以高度为准
        drawHeight = height;
        drawWidth = height * imgAspect;
        drawX = (width - drawWidth) / 2;
        drawY = 0;
      }

      // 绘制图片
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      currentFrame++;
      
      // 检查超时（最多30秒）
      if (currentTime - startTime > 30000) {
        console.warn('视频生成超时，强制停止');
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
        return;
      }
      
      animationId = requestAnimationFrame(drawFrame);
    };

    // 开始绘制
    animationId = requestAnimationFrame(drawFrame);
  });
}

/**
 * 将Blob转换为URL
 */
export function blobToUrl(blob) {
  return URL.createObjectURL(blob);
}

