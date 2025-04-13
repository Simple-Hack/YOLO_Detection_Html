/**
 * 视频处理模块 - 负责视频播放控制和交互
 */

// 视频时长相关变量
let videoDuration = 0;
let videoFps = 30;
let progressCheckInterval = null; // 进度检查计时器
let progressCheckRetryCount = 0;  // 进度检查重试次数
const MAX_RETRY_COUNT = 5;        // 最大重试次数
let lastProgressValue = 0;        // 上次的进度值，用于检测进度停滞

// 视频上传调试变量
let videoUploadDebug = {
    isUploading: false,
    lastError: null,
    uploadAttempts: 0,
    responseStatus: null,
    responseText: null
};

// 初始化视频控制 - 修改函数名为 initVideoControls 并确保全局可访问
function initVideoControls(videoElement) {
    if (!videoElement) return;
    
    // 获取相关DOM元素
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const timeDisplay = document.getElementById('time-display');
    
    // 更新播放/暂停按钮
    function updatePlayPauseBtn() {
        if (videoElement.paused) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    }
    
    // 更新时间显示
    function updateProgress() {
        const currentTime = formatTime(videoElement.currentTime);
        const duration = formatTime(videoElement.duration);
        timeDisplay.textContent = `${currentTime} / ${duration}`;
        
        const value = (videoElement.currentTime / videoElement.duration) * 100;
        progress.style.width = value + '%';
    }
    
    // 将秒数格式化为 mm:ss
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 视频事件
    // 播放/暂停按钮点击事件
    playPauseBtn.addEventListener('click', function() {
        if (videoElement.paused || videoElement.ended) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
    });
    
    // 添加视频点击事件实现播放/暂停
    videoElement.addEventListener('click', function() {
        if (videoElement.paused || videoElement.ended) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
    });
    
    // 改进进度条拖动逻辑
    let isDragging = false;
    
    // 鼠标按下开始拖动
    progressBar.addEventListener('mousedown', function(e) {
        isDragging = true;
        updateVideoProgress(e);
    });
    
    // 鼠标移动时如果正在拖动则更新进度
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            updateVideoProgress(e);
        }
    });
    
    // 鼠标松开结束拖动
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    // 更新视频进度的函数
    function updateVideoProgress(e) {
        const progressBarRect = progressBar.getBoundingClientRect();
        const percent = Math.min(Math.max(0, (e.clientX - progressBarRect.left) / progressBarRect.width), 1);
        videoElement.currentTime = percent * videoElement.duration;
    }
    
    // 进度条单击事件 - 保留原有的单击功能
    progressBar.addEventListener('click', function(e) {
        updateVideoProgress(e);
    });
    
    // 视频事件
    videoElement.addEventListener('play', updatePlayPauseBtn);
    videoElement.addEventListener('pause', updatePlayPauseBtn);
    videoElement.addEventListener('timeupdate', updateProgress);
    videoElement.addEventListener('loadedmetadata', updateProgress);
    
    // 显示视频控制器
    videoElement.controls = false;
    
    console.log("视频控制初始化成功");
}

// 确保在全局范围内能访问 initVideoControls 函数
window.initVideoControls = initVideoControls;

// 开始检查视频处理进度
function startProgressCheck(fileName) {
    const API_BASE_URL = getAPIBaseUrl(); // 从配置模块获取API基础URL
    const progressContainer = document.getElementById('progress-container');
    const progressBarProcessing = document.getElementById('progress-bar-processing');
    const errorMessage = document.getElementById('error-message');
    
    if (!progressContainer || !progressBarProcessing) return;
    
    // 重置重试计数
    progressCheckRetryCount = 0;
    lastProgressValue = 0;
    
    // 显示进度条
    progressContainer.style.display = 'block';
    progressBarProcessing.style.width = '0%';
    progressBarProcessing.setAttribute('data-progress', '0%');
    
    // 如果有错误消息，先隐藏
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    // 清除已有的计时器
    stopProgressCheck();
    
    // 创建新的计时器，每秒检查一次进度
    progressCheckInterval = setInterval(async () => {
        try {
            console.log(`检查文件 ${fileName} 的处理进度...`);
            const response = await fetch(`${API_BASE_URL}/progress?filename=${encodeURIComponent(fileName)}`);
            
            // 检查是否返回了错误状态码
            if (!response.ok) {
                throw new Error(`服务器返回状态码 ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`接收到进度数据:`, data);
            
            // 重置重试计数，因为请求成功了
            progressCheckRetryCount = 0;
            
            if (data.progress !== undefined) {
                const progressPercent = Math.round(data.progress * 100);
                progressBarProcessing.style.width = `${progressPercent}%`;
                progressBarProcessing.setAttribute('data-progress', `${progressPercent}%`);
                
                // 检查进度是否停滞
                if (progressPercent === lastProgressValue && progressPercent > 0 && progressPercent < 100) {
                    console.log(`进度停滞在 ${progressPercent}%，继续监控...`);
                } else {
                    lastProgressValue = progressPercent;
                }
                
                // 如果进度已完成，停止检查
                if (progressPercent >= 100) {
                    stopProgressCheck();
                    console.log("视频处理完成！");
                }
            }
        } catch (error) {
            console.error('检查进度时出错:', error);
            
            // 增加重试计数
            progressCheckRetryCount++;
            
            // 如果超过最大重试次数，停止检查并显示错误
            if (progressCheckRetryCount >= MAX_RETRY_COUNT) {
                stopProgressCheck();
                
                // 显示错误信息
                if (errorMessage) {
                    errorMessage.textContent = `连接服务器失败: ${error.message}。请检查服务器是否运行并确认端口配置正确。`;
                    errorMessage.style.display = 'block';
                }
                
                // 在调试信息中添加详细错误
                updateDebugInfo(`视频处理进度检查失败: ${error.message}\n请检查API端口配置和服务器状态。`);
            } else {
                console.log(`进度检查失败，尝试重试 (${progressCheckRetryCount}/${MAX_RETRY_COUNT})...`);
            }
        }
    }, 1000);
}

// 停止进度检查
function stopProgressCheck() {
    if (progressCheckInterval) {
        clearInterval(progressCheckInterval);
        progressCheckInterval = null;
    }
}

// 更新调试信息(如果调试模块存在)
function updateDebugInfo(message) {
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        
        // 保留原有信息，添加新信息到顶部
        debugInfo.innerHTML = formattedMessage + '<br>' + debugInfo.innerHTML;
    }
}

/**
 * 视频处理模块 - 处理视频上传、预测和结果显示
 */

// 视频检测相关变量
let videoStartTime = 0;

// 上传视频文件并进行检测
function uploadVideoForPrediction(videoFile) {
    if (!videoFile) {
        console.error('没有选择视频文件');
        return Promise.reject(new Error('没有选择视频文件'));
    }

    console.log(`准备上传视频: ${videoFile.name}, 大小: ${videoFile.size} 字节, 类型: ${videoFile.type}`);
    
    // 更新视频上传调试信息
    videoUploadDebug.isUploading = true;
    videoUploadDebug.uploadAttempts += 1;
    videoUploadDebug.lastError = null;
    
    const API_BASE_URL = getAPIBaseUrl();
    const formData = new FormData();
    formData.append('file', videoFile);
    
    // 记录上传开始时间
    videoStartTime = Date.now();
    
    // 显示上传进度
    updateDebugInfo(`开始上传视频 ${videoFile.name}`);
    
    return new Promise((resolve, reject) => {
        // 输出上传的完整URL以便调试
        const uploadUrl = `${API_BASE_URL}/predict_video`;
        console.log(`上传视频到 ${uploadUrl}`);
        
        fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            // 确保不使用默认的headers覆盖FormData自动设置的Content-Type
            headers: {}
        })
        .then(response => {
            videoUploadDebug.responseStatus = response.status;
            
            // 记录响应头信息以便调试
            let headerInfo = {};
            response.headers.forEach((value, name) => {
                headerInfo[name] = value;
            });
            videoUploadDebug.responseHeaders = headerInfo;
            
            // 检查响应状态
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(`服务器返回错误状态码: ${response.status}, 错误信息: ${errorData.error || '未知错误'}`);
                }).catch(error => {
                    // 如果无法解析JSON，返回通用错误
                    if (error instanceof SyntaxError) {
                        throw new Error(`服务器返回错误状态码: ${response.status}`);
                    }
                    throw error;
                });
            }
            
            return response.json();
        })
        .then(data => {
            // 处理成功的响应
            videoUploadDebug.isUploading = false;
            updateDebugInfo(`视频上传和处理成功: ${videoFile.name}`);
            
            // 返回结果
            resolve(data);
        })
        .catch(error => {
            // 处理错误
            videoUploadDebug.isUploading = false;
            videoUploadDebug.lastError = error.message;
            
            // 检查特定错误信息并提供更友好的提示
            let userMessage = error.message;
            if (userMessage.includes('moov atom not found')) {
                userMessage = `视频文件格式有问题或已损坏，无法读取视频元数据。请尝试转换视频格式后再上传。`;
            }
            
            updateDebugInfo(`视频上传失败: ${userMessage}`);
            console.error('视频上传失败:', error);
            
            // 显示用户友好的错误提示
            showErrorNotification(userMessage);
            
            reject(error);
        });
    });
}

// 显示视频检测结果
function displayMediaResults(data, isVideoFile) {
    // 隐藏所有媒体结果容器
    document.getElementById('image-result-container').style.display = 'none';
    document.getElementById('video-result-container').style.display = 'none';
    
    if (isVideoFile) {
        // 显示视频结果
        const videoResultContainer = document.getElementById('video-result-container');
        const resultVideo = document.getElementById('result-video');
        
        // 检查视频URL是否存在
        if (!data.video_url) {
            console.error('服务器返回的数据中缺少视频URL');
            showError('服务器返回的数据中缺少视频URL');
            return;
        }
        
        // 构建完整的视频URL，确保使用正确的API基础URL
        const API_BASE_URL = getAPIBaseUrl();
        const timestamp = new Date().getTime(); // 添加时间戳防止缓存
        const fullVideoUrl = `${API_BASE_URL}${data.video_url}?t=${timestamp}`;
        
        console.log(`设置视频源: ${fullVideoUrl}`);
        
        try {
            // 设置视频源
            resultVideo.src = fullVideoUrl;
            
            // 添加视频元数据加载事件
            resultVideo.onloadedmetadata = function() {
                // 获取视频的总时长
                videoDuration = resultVideo.duration;
                console.log(`视频元数据已加载，时长: ${videoDuration}秒`);
                updateTimeDisplay();
            };
            
            // 添加时间更新事件
            resultVideo.ontimeupdate = function() {
                updateVideoProgress();
            };
            
            // 添加错误处理
            resultVideo.onerror = function() {
                console.error('视频加载失败:', resultVideo.error);
                showError(`视频加载失败: ${resultVideo.error ? resultVideo.error.message : '未知错误'}`);
            };
            
            // 显示视频结果容器
            videoResultContainer.style.display = 'block';
            
            // 设置视频控制功能
            setupVideoControls();
            
        } catch (error) {
            console.error('设置视频源出错:', error);
            showError(`设置视频源出错: ${error.message}`);
        }
    } else {
        // 显示图像结果
        const imageResultContainer = document.getElementById('image-result-container');
        const resultImage = document.getElementById('result-image');
        
        // 构建完整的图像URL
        const API_BASE_URL = getAPIBaseUrl();
        const fullImageUrl = `${API_BASE_URL}${data.image_url}`;
        
        resultImage.src = fullImageUrl;
        imageResultContainer.style.display = 'block';
    }
}

// 更新视频进度条和时间显示
function updateVideoProgress() {
    const resultVideo = document.getElementById('result-video');
    const progress = document.getElementById('progress');
    
    if (!resultVideo || !progress) return;
    
    // 计算当前进度百分比
    const percentage = (resultVideo.currentTime / resultVideo.duration) * 100;
    progress.style.width = percentage + '%';
    
    // 更新时间显示
    updateTimeDisplay();
}

// 更新时间显示
function updateTimeDisplay() {
    const resultVideo = document.getElementById('result-video');
    const timeDisplay = document.getElementById('time-display');
    
    if (!resultVideo || !timeDisplay) return;
    
    // 格式化当前时间和总时间
    const currentTime = formatTime(resultVideo.currentTime);
    const duration = formatTime(resultVideo.duration);
    
    timeDisplay.textContent = `${currentTime} / ${duration}`;
}

// 设置视频控制功能
function setupVideoControls() {
    const resultVideo = document.getElementById('result-video');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    
    // 播放/暂停按钮点击事件
    playPauseBtn.addEventListener('click', function() {
        if (resultVideo.paused) {
            resultVideo.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            resultVideo.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // 点击视频也能切换播放/暂停
    resultVideo.addEventListener('click', function() {
        if (resultVideo.paused) {
            resultVideo.play();
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            resultVideo.pause();
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    });
    
    // 点击进度条跳转到对应时间点
    progressBar.addEventListener('click', function(e) {
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        resultVideo.currentTime = pos * resultVideo.duration;
    });
    
    // 视频播放结束时重置按钮图标
    resultVideo.addEventListener('ended', function() {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
}

// 格式化时间为MM:SS格式
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 检查视频处理进度
function checkVideoProcessingProgress(filename, progressBar) {
    const API_BASE_URL = getAPIBaseUrl();
    
    fetch(`${API_BASE_URL}/progress?filename=${encodeURIComponent(filename)}`)
        .then(response => response.json())
        .then(data => {
            const progress = data.progress * 100;
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('data-progress', `${Math.round(progress)}%`);
            
            // 如果进度为100%，停止检查
            if (progress >= 100) {
                stopProgressCheck();
            }
            
            // 如果处理时间超过5分钟，也停止检查
            const processingTime = (Date.now() - videoStartTime) / 1000;
            if (processingTime > 300) {
                stopProgressCheck();
            }
        })
        .catch(error => {
            console.error('获取进度时出错:', error);
        });
}

// 隐藏结果区域
function hideResults() {
    // 隐藏结果容器
    const resultsContainer = document.getElementById('results-container');
    const imageResultContainer = document.getElementById('image-result-container');
    const videoResultContainer = document.getElementById('video-result-container');
    
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (imageResultContainer) imageResultContainer.style.display = 'none';
    if (videoResultContainer) videoResultContainer.style.display = 'none';
    
    // 重置视频源以释放资源
    const resultVideo = document.getElementById('result-video');
    if (resultVideo) resultVideo.src = '';
}

// 显示错误消息
function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        console.error('错误:', message);
    } else {
        console.error('错误消息元素不存在，错误:', message);
    }
}

// 隐藏错误消息
function hideError() {
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';
}

// 初始化标签页切换
function initTabSwitching() {
    const tabs = document.querySelectorAll('.results-tab');
    const panes = document.querySelectorAll('.results-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有标签的活动状态
            tabs.forEach(t => t.classList.remove('active'));
            // 给当前标签添加活动状态
            tab.classList.add('active');
            
            // 获取目标面板
            const targetId = tab.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            
            // 隐藏所有面板
            panes.forEach(pane => pane.classList.remove('active'));
            // 显示目标面板
            targetPane.classList.add('active');
        });
    });
}