/**
 * 主程序模块 - 应用入口和主要功能
 */

// 全局变量
let selectedFile = null;
let dropAreaClickHandler = null;
let isVideoFile = false;

// 页面加载完成后执行初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM加载完成，开始初始化...");
    
    // 获取DOM元素
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const predictButton = document.getElementById('predict-button');
    const resetButton = document.getElementById('reset-button');
    const fileTypeBadge = document.getElementById('file-type-badge');
    const progressContainer = document.getElementById('progress-container');
    const progressBarProcessing = document.getElementById('progress-bar-processing');
    const uploadLabel = document.getElementById('upload-label');
    
    // 保存原始样式
    const originalStyles = {
        width: getComputedStyle(dropArea).width,
        height: getComputedStyle(dropArea).height,
        aspectRatio: getComputedStyle(dropArea).aspectRatio
    };
    
    // 按顺序初始化功能模块
    try {
        console.log("开始初始化界面状态...");
        initializeUIState();
        
        console.log("初始化标签页切换...");
        initTabSwitching();
        
        console.log("初始化AI聊天功能...");
        initAiChat();
        
        console.log("初始化视图导航...");
        setupViewNavigation();
        
        console.log("初始化数据看板...");
        initDashboard();
        
        console.log("初始化历史记录视图...");
        initHistoryView();
        
        console.log("初始化文件上传功能...");
        setupFileUpload();
        
        console.log("初始化完成");
    } catch (error) {
        console.error("初始化过程中发生错误:", error);
    }
    
    // 文件上传功能初始化
    function setupFileUpload() {
        // 处理上传区域的点击事件
        dropAreaClickHandler = () => {
            fileInput.click();
        };
        
        dropArea.addEventListener('click', dropAreaClickHandler);
        
        // 阻止默认拖放行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // 添加拖拽样式
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('dragging');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('dragging');
            }, false);
        });
        
        // 处理文件拖放
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length) {
                handleFiles(files);
            }
        }
        
        // 处理文件输入变化
        fileInput.addEventListener('change', function() {
            if (this.files.length) {
                handleFiles(this.files);
            }
        });
        
        // 重置按钮点击事件
        resetButton.addEventListener('click', function() {
            resetUIState();
            sessionStorage.removeItem('hasUploadedFile');
        });
        
        // 预测按钮点击事件
        predictButton.addEventListener('click', function() {
            processSelectedFile();
        });
        
        // 检查页面是否刚刚刷新
        window.addEventListener('pageshow', function(event) {
            if (event.persisted) {
                resetUIState();
                sessionStorage.removeItem('hasUploadedFile');
            }
        });
    }
    
    // 视图切换控制
    function setupViewNavigation() {
        const navLinks = document.querySelectorAll('.main-nav li[data-view]');
        const viewSections = document.querySelectorAll('.view-section');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                const viewToShow = this.getAttribute('data-view');
                
                // 更新导航项状态
                navLinks.forEach(item => item.classList.remove('active'));
                this.classList.add('active');
                
                // 更新视图显示
                viewSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === `${viewToShow}-view`) {
                        section.classList.add('active');
                    }
                });
                
                // 特殊处理：数据看板视图激活时，刷新数据
                if (viewToShow === 'dashboard') {
                    if (typeof fetchDashboardStats === 'function') {
                        fetchDashboardStats();
                    }
                }
                
                // 特殊处理：历史记录视图激活时，加载数据
                if (viewToShow === 'history') {
                    if (typeof loadHistoryData === 'function') {
                        loadHistoryData();
                    }
                }
            });
        });
    }
});

// 处理文件上传逻辑
function handleFiles(files) {
    console.log("开始处理上传文件...");
    selectedFile = files[0];
    
    // 检查文件类型
    isVideoFile = selectedFile.type.startsWith('video/');
    const isImageFile = selectedFile.type.startsWith('image/');
    
    if (!isImageFile && !isVideoFile) {
        showError('请选择有效的图片或视频文件');
        return;
    }
    
    const dropArea = document.getElementById('drop-area');
    const fileTypeBadge = document.getElementById('file-type-badge');
    const imagePreview = document.getElementById('image-preview');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const predictButton = document.getElementById('predict-button');
    const uploadLabel = document.getElementById('upload-label');
    const resetButton = document.getElementById('reset-button');
    
    // 显示文件类型徽章
    fileTypeBadge.style.display = 'flex';
    fileTypeBadge.innerHTML = isVideoFile ? 
        '<i class="fas fa-video"></i> 视频' : 
        '<i class="fas fa-image"></i> 图片';
    
    const reader = new FileReader();
    
    if (isImageFile) {
        // 处理图片文件
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            videoPreviewContainer.style.display = 'none';
            
            imagePreview.onload = function() {
                const imgWidth = imagePreview.naturalWidth;
                const imgHeight = imagePreview.naturalHeight;
                const aspectRatio = imgWidth / imgHeight;
                
                dropArea.style.aspectRatio = aspectRatio;
                
                if (imgWidth < 300 && imgHeight < 200) {
                    dropArea.style.width = '300px';
                    dropArea.style.height = '200px';
                    dropArea.style.aspectRatio = 'auto';
                }
            };
        };
        
        reader.readAsDataURL(selectedFile);
    } else {
        // 处理视频文件
        const videoURL = URL.createObjectURL(selectedFile);
        videoPreview.src = videoURL;
        videoPreviewContainer.style.display = 'block';
        imagePreview.style.display = 'none';
        
        videoPreview.onloadedmetadata = function() {
            const aspectRatio = videoPreview.videoWidth / videoPreview.videoHeight;
            dropArea.style.aspectRatio = aspectRatio;
        };
    }
    
    // 更新界面状态
    predictButton.disabled = false;
    document.querySelector('.fas.fa-cloud-upload-alt').style.display = 'none';
    uploadLabel.style.display = 'none';
    document.querySelector('.upload-description').style.display = 'none';
    
    // 移除上传区域点击事件
    dropArea.removeEventListener('click', dropAreaClickHandler);
    
    // 显示重置按钮
    resetButton.style.display = 'inline-flex';
    
    // 隐藏错误和结果
    hideError();
    hideResults();
    
    // 将上传状态保存到会话存储中
    sessionStorage.setItem('hasUploadedFile', 'true');
    
    console.log(`文件处理完成: ${selectedFile.name}, 类型: ${selectedFile.type}, 大小: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
}

// 处理所选文件的预测逻辑
async function processSelectedFile() {
    if (!selectedFile) {
        showError('请先选择文件');
        return;
    }
    
    console.log(`开始处理预测请求，文件: ${selectedFile.name}`);
    
    showLoader();
    hideError();
    hideResults();
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // 记录上传文件信息到控制台
    console.log(`准备上传文件: ${selectedFile.name}, 类型: ${selectedFile.type}, 大小: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    // 更新全局调试状态
    if (typeof videoUploadDebug !== 'undefined') {
        videoUploadDebug.isUploading = true;
        videoUploadDebug.uploadAttempts++;
        videoUploadDebug.lastError = null;
        videoUploadDebug.responseStatus = null;
        videoUploadDebug.responseText = null;
    }
       
    // 如果是视频文件，显示进度条
    const progressContainer = document.getElementById('progress-container');
    const progressBarProcessing = document.getElementById('progress-bar-processing');
    
    if (isVideoFile) {
        console.log("检测到视频文件，启用进度条");
        progressContainer.style.display = 'block';
        progressBarProcessing.style.width = '0%';
        progressBarProcessing.setAttribute('data-progress', '0%');
        
        // 开始检查进度
        startProgressCheck(selectedFile.name);
    }
    
    try {
        const API_BASE_URL = getAPIBaseUrl();
        const endpoint = isVideoFile ? '/predict_video' : '/predict';
        const url = `${API_BASE_URL}${endpoint}`;
        
        console.log(`发送请求到: ${url}`);
        
        // 设置超时时间（3分钟）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800000);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        }).catch(fetchError => {
            console.error("Fetch错误:", fetchError);
            throw new Error(`网络请求失败: ${fetchError.message || '未知错误'}`);
        });
        
        clearTimeout(timeoutId);
        
        // 更新调试信息
        if (typeof videoUploadDebug !== 'undefined') {
            videoUploadDebug.responseStatus = response.status;
        }
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => '无法获取错误详情');
            console.error(`服务器返回错误状态码: ${response.status}`, errorText);
            
            // 更新调试信息
            if (typeof videoUploadDebug !== 'undefined') {
                videoUploadDebug.lastError = `HTTP ${response.status}: ${errorText}`;
                videoUploadDebug.responseText = errorText;
            }
            
            throw new Error(`服务器响应错误 (${response.status}): ${errorText}`);
        }
        
        // 停止进度检查
        stopProgressCheck();
        
        console.log("成功接收到服务器响应，正在处理JSON数据");
        
        const data = await response.json().catch(jsonError => {
            console.error("JSON解析错误:", jsonError);
            throw new Error("无效的服务器响应格式");
        });
        
        // 更新调试信息
        if (typeof videoUploadDebug !== 'undefined') {
            videoUploadDebug.isUploading = false;
            videoUploadDebug.responseText = "成功接收响应";
        }
        
        console.log("服务器返回数据:", data);
        
        if (!data.success) {
            throw new Error(data.error || "服务器处理失败");
        }
        
        displayResults(data);
    } catch (error) {
        console.error("处理过程中出错:", error);
        
        // 更新调试信息
        if (typeof videoUploadDebug !== 'undefined') {
            videoUploadDebug.isUploading = false;
            videoUploadDebug.lastError = error.message;
        }
        
        // 停止进度检查
        stopProgressCheck();
        
        // 显示友好的错误消息
        let errorMsg = '检测失败: ';
        
        if (error.name === 'AbortError') {
            errorMsg += '请求超时，视频可能太大或服务器繁忙';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg += '无法连接到服务器，请检查服务器是否运行及网络连接';
        } else {
            errorMsg += error.message;
        }
        
        showError(errorMsg);
    } finally {
        hideLoader();
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
}

// 初始化界面状态函数
function initializeUIState() {
    const resetButton = document.getElementById('reset-button');
    const imagePreview = document.getElementById('image-preview');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const predictButton = document.getElementById('predict-button');
    const fileTypeBadge = document.getElementById('file-type-badge');
    const progressContainer = document.getElementById('progress-container');
    
    // 确保重置按钮初始时隐藏
    if (resetButton) resetButton.style.display = 'none';
    
    // 确保上传图标和标签显示
    const uploadIcon = document.querySelector('.fas.fa-cloud-upload-alt');
    const uploadLabel = document.getElementById('upload-label');
    const uploadDescription = document.querySelector('.upload-description');
    
    if (uploadIcon) uploadIcon.style.display = 'block';
    if (uploadLabel) uploadLabel.style.display = 'block';
    if (uploadDescription) uploadDescription.style.display = 'block';
    
    // 确保预览图像和视频容器隐藏
    if (imagePreview) imagePreview.style.display = 'none';
    if (videoPreviewContainer) videoPreviewContainer.style.display = 'none';
    
    // 禁用预测按钮
    if (predictButton) predictButton.disabled = true;
    
    // 隐藏结果区域
    hideResults();
    
    // 隐藏进度条
    if (progressContainer) progressContainer.style.display = 'none';
    
    // 隐藏文件类型徽章
    if (fileTypeBadge) fileTypeBadge.style.display = 'none';
}

// 重置UI状态函数
function resetUIState() {
    console.log("重置UI状态");
    
    const dropArea = document.getElementById('drop-area');
    const imagePreview = document.getElementById('image-preview');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const fileTypeBadge = document.getElementById('file-type-badge');
    const predictButton = document.getElementById('predict-button');
    const resetButton = document.getElementById('reset-button');
    
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
    
    if (videoPreviewContainer) {
        videoPreviewContainer.style.display = 'none';
    }
    
    if (videoPreview) {
        videoPreview.src = '';
    }
    
    if (fileTypeBadge) {
        fileTypeBadge.style.display = 'none';
    }
    
    // 重置文件选择状态
    selectedFile = null;
    isVideoFile = false;
    
    // 恢复原始样式
    if (dropArea) {
        const originalStyles = {
            width: getComputedStyle(dropArea).width,
            height: getComputedStyle(dropArea).height,
            aspectRatio: getComputedStyle(dropArea).aspectRatio
        };
        
        dropArea.style.width = originalStyles.width;
        dropArea.style.height = originalStyles.height;
        dropArea.style.aspectRatio = originalStyles.aspectRatio;
    }
    
    // 禁用预测按钮
    if (predictButton) {
        predictButton.disabled = true;
    }
    
    // 恢复上传提示元素
    const uploadIcon = document.querySelector('.fas.fa-cloud-upload-alt');
    const uploadLabel = document.getElementById('upload-label');
    const uploadDescription = document.querySelector('.upload-description');
    
    if (uploadIcon) uploadIcon.style.display = 'block';
    if (uploadLabel) uploadLabel.style.display = 'block';
    if (uploadDescription) uploadDescription.style.display = 'block';
    
    // 隐藏重置按钮
    if (resetButton) {
        resetButton.style.display = 'none';
    }
    
    // 恢复上传区域点击事件
    if (dropArea && dropAreaClickHandler) {
        dropArea.addEventListener('click', dropAreaClickHandler);
    }
    
    // 隐藏结果区域
    hideResults();
}

// 初始化标签页切换功能
function initTabSwitching() {
    document.querySelectorAll('.results-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.results-pane').forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// 添加 showAiChatFullscreen 函数的定义 - 仅作为与aiChat.js的桥接函数
function showAiChatFullscreen() {
    // 直接调用aiChat.js中的函数
    if (typeof showAiChatInterface === 'function') {
        console.log("调用showAiChatInterface函数");
        showAiChatInterface();
    } else {
        console.error("showAiChatInterface函数未找到，请检查aiChat.js是否正确加载");
    }
}