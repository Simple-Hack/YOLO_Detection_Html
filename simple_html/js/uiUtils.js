/**
 * UI工具函数模块 - 提供通用的UI操作函数
 */

// 显示加载指示器
function showLoader() {
    const loader = document.getElementById('loader');
    const predictButton = document.getElementById('predict-button');
    
    if (loader) loader.style.display = 'block';
    if (predictButton) predictButton.disabled = true;
}

// 隐藏加载指示器
function hideLoader() {
    const loader = document.getElementById('loader');
    const predictButton = document.getElementById('predict-button');
    
    if (loader) loader.style.display = 'none';
    if (predictButton) predictButton.disabled = false;
}
// 显示成功消息
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success-notification';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除通知
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 显示错误消息
function showError(message) {
    console.error("错误:", message);
    
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // 自动消失
        setTimeout(() => {
            if (errorMessage.style.display === 'block') {
                errorMessage.style.opacity = '0';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                    errorMessage.style.opacity = '1';
                }, 500);
            }
        }, 5000);
    }
}

// 隐藏错误消息
function hideError() {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// 隐藏结果区域
function hideResults() {
    const resultsContainer = document.getElementById('results-container');
    const imageResultContainer = document.getElementById('image-result-container');
    const videoResultContainer = document.getElementById('video-result-container');
    
    if (resultsContainer) resultsContainer.style.display = 'none';
    if (imageResultContainer) imageResultContainer.style.display = 'none';
    if (videoResultContainer) videoResultContainer.style.display = 'none';
}

// 获取API基础URL
function getAPIBaseUrl() {
    // 从config.js中获取端口
    let port = API_PORT || 8000;
    return `http://localhost:${port}`;
}

// 格式化时间 (秒 -> 00:00 格式)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 生成随机ID
function generateId(prefix = 'id_') {
    return prefix + Math.random().toString(36).substr(2, 9);
}

// 开始检查进度
let progressCheckInterval = null;

function startProgressCheck(fileName) {
    // 清除已有的计时器
    stopProgressCheck();
    
    const progressBarProcessing = document.getElementById('progress-bar-processing');
    
    // 创建新的计时器，每秒检查一次进度
    progressCheckInterval = setInterval(async () => {
        try {
            const API_BASE_URL = getAPIBaseUrl();
            const response = await fetch(`${API_BASE_URL}/progress?filename=${encodeURIComponent(fileName)}`);
            
            if (!response.ok) {
                console.warn("检查进度时收到非200响应:", response.status);
                return;
            }
            
            const data = await response.json();
            
            if (data.progress !== undefined) {
                const progressPercent = Math.round(data.progress * 100);
                
                if (progressBarProcessing) {
                    progressBarProcessing.style.width = `${progressPercent}%`;
                    progressBarProcessing.setAttribute('data-progress', `${progressPercent}%`);
                }
                
                // 如果进度已完成，停止检查
                if (progressPercent >= 100) {
                    stopProgressCheck();
                }
            }
        } catch (error) {
            console.error('检查进度时出错:', error);
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

// 显示工具提示
function showToast(message, duration = 3000) {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 创建新toast
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 添加进入动画
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 设置自动消失
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}