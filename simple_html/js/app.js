document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const videoPreviewContainer = document.getElementById('video-preview-container');
    const videoPreview = document.getElementById('video-preview');
    const predictButton = document.getElementById('predict-button');
    const resetButton = document.getElementById('reset-button');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    const resultsList = document.getElementById('results-list');
    const uploadLabel = document.getElementById('upload-label');
    const classesSummary = document.getElementById('classes-summary');
    const paginationControls = document.getElementById('pagination-controls');
    const fileTypeBadge = document.getElementById('file-type-badge');
    const progressContainer = document.getElementById('progress-container');
    const progressBarProcessing = document.getElementById('progress-bar-processing');
    
    // 结果展示元素
    const imageResultContainer = document.getElementById('image-result-container');
    const videoResultContainer = document.getElementById('video-result-container');
    const resultImage = document.getElementById('result-image');
    const resultVideo = document.getElementById('result-video');
    
    // 视频控制元素
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const timeDisplay = document.getElementById('time-display');
    
    // 统计元素
    const totalCountElement = document.getElementById('total-count');
    const avgConfidenceElement = document.getElementById('avg-confidence');
    const maxConfidenceElement = document.getElementById('max-confidence');
    const classCountElement = document.getElementById('class-count');
    
    // Chart.js图表
    let categoryCountChart = null;
    let confidenceChart = null;
    
    // 定义API端点变量
    const API_BASE_URL = getAPIBaseUrl();
    
    // AI对话相关变量
    let chatHistory = [];
    let isVoiceRecording = false;
    
    function getAPIBaseUrl() {
        // 不再使用硬编码的端口，而是使用config.js中定义的函数
        return `http://localhost:${API_PORT}`;
    }
    
    const originalStyles = {
        width: getComputedStyle(dropArea).width,
        height: getComputedStyle(dropArea).height,
        aspectRatio: getComputedStyle(dropArea).aspectRatio
    };
    
    let selectedFile = null;
    let dropAreaClickHandler = null;
    let currentPage = 1;
    const itemsPerPage = 10;
    let allDetections = [];
    let isVideoFile = false;
    
    // 视频时长相关变量
    let videoDuration = 0;
    let videoFps = 30;
    
    // 进度检查计时器
    let progressCheckInterval = null;
    
    // 初始化界面状态
    initializeUIState();
    
    // 初始化文件类型徽章和视频控制按钮
    fileTypeBadge.style.display = 'none';
    resetButton.style.display = 'none';
    
    
    function initializeUIState() {
        // 确保重置按钮初始时隐藏
        resetButton.style.display = 'none';
        
        // 确保上传图标和标签显示
        document.querySelector('.fas.fa-cloud-upload-alt').style.display = 'block';
        uploadLabel.style.display = 'block';
        document.querySelector('.upload-description').style.display = 'block';
        
        // 确保预览图像和视频容器隐藏
        imagePreview.style.display = 'none';
        videoPreviewContainer.style.display = 'none';
        
        // 禁用预测按钮
        predictButton.disabled = true;
        
        // 隐藏结果区域
        hideResults();
        
        // 隐藏进度条
        progressContainer.style.display = 'none';
    }

    // 页面加载时加载对话历史
    document.addEventListener('DOMContentLoaded', function() {
        loadHistoryFromLocalStorage();
    });
    
    dropAreaClickHandler = () => {
        fileInput.click();
    };
    
    dropArea.addEventListener('click', dropAreaClickHandler);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
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
    
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            handleFiles(files);
        }
    }
    
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files);
        }
    });
    
    function handleFiles(files) {
        selectedFile = files[0];
        
        // 检查文件类型
        isVideoFile = selectedFile.type.startsWith('video/');
        const isImageFile = selectedFile.type.startsWith('image/');
        
        if (!isImageFile && !isVideoFile) {
            showError('请选择有效的图片或视频文件');
            return;
        }
        
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
        
        predictButton.disabled = false;
        
        document.querySelector('.fas.fa-cloud-upload-alt').style.display = 'none';
        uploadLabel.style.display = 'none';
        document.querySelector('.upload-description').style.display = 'none';
        
        dropArea.removeEventListener('click', dropAreaClickHandler);
        
        resetButton.style.display = 'inline-flex';
        
        hideError();
        hideResults();
        
        // 将上传状态保存到会话存储中
        sessionStorage.setItem('hasUploadedFile', 'true');
    }
    
    resetButton.addEventListener('click', function() {
        // 重置所有状态
        resetUIState();
        
        // 清除会话存储中的上传状态
        sessionStorage.removeItem('hasUploadedFile');
    });
    
    function resetUIState() {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
        videoPreviewContainer.style.display = 'none';
        videoPreview.src = '';
        fileTypeBadge.style.display = 'none';
        selectedFile = null;
        isVideoFile = false;
        
        dropArea.style.width = originalStyles.width;
        dropArea.style.height = originalStyles.height;
        dropArea.style.aspectRatio = originalStyles.aspectRatio;
        
        predictButton.disabled = true;
        
        document.querySelector('.fas.fa-cloud-upload-alt').style.display = 'block';
        uploadLabel.style.display = 'block';
        document.querySelector('.upload-description').style.display = 'block';
        
        resetButton.style.display = 'none';
        
        dropArea.addEventListener('click', dropAreaClickHandler);
        
        hideResults();
    }
    
    // 检查页面是否刚刚刷新，如果是，应该重置界面
    window.addEventListener('pageshow', function(event) {
        // 如果页面是从缓存加载的，可能保留了之前的状态，我们也需要重置
        if (event.persisted) {
            resetUIState();
            sessionStorage.removeItem('hasUploadedFile');
        }
    });
    
    predictButton.addEventListener('click', async () => {
        if (!selectedFile) {
            showError('请先选择文件');
            return;
        }
        
        console.log(`准备处理文件: ${selectedFile.name}, 类型: ${selectedFile.type}, 大小: ${selectedFile.size} 字节`);
        
        showLoader();
        hideError();
        hideResults();
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // 如果是视频文件，显示进度条
        if (isVideoFile) {
            console.log("检测到视频文件，将显示处理进度");
            progressContainer.style.display = 'block';
            progressBarProcessing.style.width = '0%';
            progressBarProcessing.setAttribute('data-progress', '0%');
            
            // 开始检查进度
            startProgressCheck(selectedFile.name);
        }
        
        try {
            const endpoint = isVideoFile ? '/predict_video' : '/predict';
            const API_BASE_URL = getAPIBaseUrl();
            const requestUrl = `${API_BASE_URL}${endpoint}`;
            
            console.log(`发送请求到: ${requestUrl}`);
            console.log(`使用的请求方法: POST`);
            console.log(`文件名: ${selectedFile.name}`);
            
            // 添加此处调试信息
            if (typeof videoUploadDebug !== 'undefined') {
                videoUploadDebug.isUploading = true;
                videoUploadDebug.uploadAttempts += 1;
                videoUploadDebug.lastError = null;
            }
            
            // 确保不要设置Content-Type header，让浏览器自动处理multipart/form-data
            const response = await fetch(requestUrl, {
                method: 'POST',
                body: formData,
                headers: {} // 清空headers，让浏览器自动设置
            });
            
            console.log(`收到响应，状态码: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`服务器返回错误状态码: ${response.status}`);
            }
            
            // 更新调试信息
            if (typeof videoUploadDebug !== 'undefined') {
                videoUploadDebug.isUploading = false;
                videoUploadDebug.responseStatus = response.status;
            }
            
            // 停止进度检查
            stopProgressCheck();
            
            // 解析JSON响应
            console.log("开始解析响应数据");
            const data = await response.json();
            console.log("响应数据解析成功:", data);
            
            // 显示结果
            displayResults(data);
        } catch (error) {
            // 更新调试信息
            if (typeof videoUploadDebug !== 'undefined') {
                videoUploadDebug.isUploading = false;
                videoUploadDebug.lastError = error.message;
            }
            
            // 停止进度检查
            stopProgressCheck();
            
            console.error('处理请求时出错:', error);
            showError('检测失败: ' + error.message);
            
            // 在调试模式下显示更详细的错误
            const debugInfo = document.getElementById('debug-info');
            if (debugInfo) {
                const timestamp = new Date().toLocaleTimeString();
                const errorDetails = `[${timestamp}] 请求失败: ${error.message}\n请确认服务器状态和API端口配置。`;
                debugInfo.innerHTML = errorDetails + '<br>' + debugInfo.innerHTML;
            }
        } finally {
            hideLoader();
            progressContainer.style.display = 'none';
        }
    });
    
    // 开始定期检查进度
    function startProgressCheck(fileName) {
        // 清除已有的计时器
        stopProgressCheck();
        
        // 创建新的计时器，每秒检查一次进度
        progressCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/progress?filename=${encodeURIComponent(fileName)}`);
                const data = await response.json();
                
                if (data.progress !== undefined) {
                    const progressPercent = Math.round(data.progress * 100);
                    progressBarProcessing.style.width = `${progressPercent}%`;
                    progressBarProcessing.setAttribute('data-progress', `${progressPercent}%`);
                    
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
    
    function displayResults(data) {
        allDetections = data.detections || [];
           
        if (data.statistics) {
            totalCountElement.textContent = data.statistics.total_count;
            classCountElement.textContent = data.statistics.class_count;
            avgConfidenceElement.textContent = (data.statistics.avg_confidence * 100).toFixed(2) + '%';
            maxConfidenceElement.textContent = (data.statistics.max_confidence * 100).toFixed(2) + '%';
        }
        
        // 获取视频信息
        if (data.video_info) {
            videoFps = data.video_info.fps || 30;
            videoDuration = data.video_info.total_frames / videoFps || 0;
        }
                
        // 使用从服务器直接获取的视频时长和FPS（如果有的话）
        if (data.statistics && data.statistics.video_duration) {
            videoDuration = data.statistics.video_duration;
        }
        if (data.statistics && data.statistics.fps) {
            videoFps = data.statistics.fps;
        }
        
        if (data.statistics && data.statistics.class_details) {
            generateClassesSummary(data.statistics.class_details);
            generateCharts(data.statistics.class_details);
        }
        
        currentPage = 1;
        displayDetailedResults(currentPage);
        
        // 显示图像或视频结果
        if (isVideoFile && data.video_url) {


                    // 添加这段代码处理预警
        if (data.warnings && data.warnings.length > 0) {
            displayVideoWarnings(data.warnings);
        } else {
            // 隐藏预警容器
            const warningsContainer = document.getElementById('video-warnings-container');
            if (warningsContainer) {
                warningsContainer.style.display = 'none';
            }
        }
            // 构建完整的视频URL并添加时间戳以避免缓存问题
            const timestamp = new Date().getTime();
            const fullVideoUrl = `${API_BASE_URL}${data.video_url}?t=${timestamp}`;
            console.log("加载视频：", fullVideoUrl);
            try {
                resultVideo.src = fullVideoUrl;
                
                // 显示视频结果容器
                videoResultContainer.style.display = 'block';
                imageResultContainer.style.display = 'none';
                
                // 初始化视频控制
                initVideoControls(resultVideo);
                
                // 监听视频加载错误
                resultVideo.onerror = function() {
                    console.error("视频加载失败:", resultVideo.error);
                    showError(`视频加载失败: ${resultVideo.error ? resultVideo.error.message : '未知错误'}`);
                };
                
                // 当视频加载完成后自动播放
                resultVideo.onloadeddata = function() {
                    console.log("视频加载完成，准备播放");
                    resultVideo.play().catch(e => console.error("自动播放失败:", e));
                };
            } catch (error) {
                console.error("加载视频时出错:", error);
                showError("加载视频时出错: " + error.message);
            }
        } else if (!isVideoFile && data.image_url) {
            const fullImageUrl = `${API_BASE_URL}${data.image_url}`;
            resultImage.src = fullImageUrl;
            
            // 显示图像结果容器
            imageResultContainer.style.display = 'block';
            videoResultContainer.style.display = 'none';
        }
        
        resultsContainer.style.display = 'block';
        resultsContainer.classList.add('fade-in');
    }
    
    function initVideoControls(videoElement) {
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
    }
    
    function generateClassesSummary(classDetails) {
        classesSummary.innerHTML = '';
        
        if (classDetails.length === 0) {
            classesSummary.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>未检测到任何目标</p>
                </div>
            `;
            return;
        }
        
        classDetails.forEach(classDetail => {
            const classCard = document.createElement('div');
            classCard.className = 'class-card';
            
            const avgConfidencePercent = (classDetail.avg_confidence * 100).toFixed(2);
            const maxConfidencePercent = (classDetail.max_confidence * 100).toFixed(2);
            
            let classIcon = 'fa-box';
            if (classDetail.name.toLowerCase().includes('phone') || 
               classDetail.name.toLowerCase().includes('mobile')) {
                classIcon = 'fa-mobile-alt';
            } else if (classDetail.name.toLowerCase().includes('car') || 
                       classDetail.name.toLowerCase().includes('vehicle')) {
                classIcon = 'fa-car';
            } else if (classDetail.name.toLowerCase().includes('person') || 
                       classDetail.name.toLowerCase().includes('people')) {
                classIcon = 'fa-person';
            } else if (classDetail.name.toLowerCase().includes('bag') || 
                       classDetail.name.toLowerCase().includes('luggage')) {
                classIcon = 'fa-briefcase';
            } else if (classDetail.name.toLowerCase().includes('bottle') || 
                       classDetail.name.toLowerCase().includes('drink')) {
                classIcon = 'fa-bottle-water';
            } else if (classDetail.name.toLowerCase().includes('安全')) {
                classIcon = 'fa-shield-alt';
            } else if (classDetail.name.toLowerCase().includes('疲劳')) {
                classIcon = 'fa-bed';
            } else if (classDetail.name.toLowerCase().includes('分心') || 
                       classDetail.name.toLowerCase().includes('注意力')) {
                classIcon = 'fa-exclamation-triangle';
            } else if (classDetail.name.toLowerCase().includes('抽烟')) {
                classIcon = 'fa-smoking';
            } else if (classDetail.name.toLowerCase().includes('电话')) {
                classIcon = 'fa-phone';
            } else if (classDetail.name.toLowerCase().includes('喝水')) {
                classIcon = 'fa-glass-water';
            }
            
            // 计算持续时间显示
            let durationHtml = '';
            if (isVideoFile && classDetail.duration !== undefined) {
                durationHtml = `
                    <div class="duration-badge">
                        <i class="fas fa-clock"></i>
                        <span>${classDetail.duration}秒</span>
                    </div>
                `;
            }
            
            classCard.innerHTML = `
                <div class="class-header">
                    <span class="class-name">
                        <i class="fas ${classIcon}"></i>
                        ${classDetail.name}
                    </span>
                    <span class="class-count">${classDetail.count}</span>
                </div>
                <div class="confidence-stat">
                    <div class="confidence-item">
                        <div class="confidence-label">
                            <span class="confidence-label-text">平均置信度</span>
                            <span class="confidence-label-value">${avgConfidencePercent}%</span>
                        </div>
                        <div class="confidence-progress">
                            <div class="confidence-progress-avg" style="width: ${avgConfidencePercent}%"></div>
                        </div>
                    </div>
                    <div class="confidence-item">
                        <div class="confidence-label">
                            <span class="confidence-label-text">最高置信度</span>
                            <span class="confidence-label-value">${maxConfidencePercent}%</span>
                        </div>
                        <div class="confidence-progress">
                            <div class="confidence-progress-max" style="width: ${maxConfidencePercent}%"></div>
                        </div>
                    </div>
                    ${durationHtml}
                </div>
            `;
            
            classesSummary.appendChild(classCard);
        });
    }
    
    function generateCharts(classDetails) {
        if (categoryCountChart) categoryCountChart.destroy();
        if (confidenceChart) confidenceChart.destroy();
        
        const labels = classDetails.map(detail => detail.name);
        const counts = classDetails.map(detail => detail.count);
        const avgConfidences = classDetails.map(detail => detail.avg_confidence * 100);
        const maxConfidences = classDetails.map(detail => detail.max_confidence * 100);
        
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--secondary-color').trim();
        
        const countCtx = document.getElementById('categoryCountChart').getContext('2d');
        categoryCountChart = new Chart(countCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '检测数量',
                    data: counts,
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
        
        const confCtx = document.getElementById('confidenceChart').getContext('2d');
        confidenceChart = new Chart(confCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '平均可信度',
                        data: avgConfidences,
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: '最高可信度',
                        data: maxConfidences,
                        backgroundColor: secondaryColor,
                        borderColor: secondaryColor,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw.toFixed(2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    function displayDetailedResults(page) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, allDetections.length);
        const currentPageDetections = allDetections.slice(startIndex, endIndex);
        
        resultsList.innerHTML = '';
        
        if (allDetections.length === 0) {
            resultsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>未检测到任何目标</p>
                </div>
            `;
            return;
        }
        
        currentPageDetections.forEach((item, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'detail-item';
            
            const classInitial = item.class.charAt(0).toUpperCase();
            const confidencePercent = (item.confidence * 100).toFixed(2);
            let frameInfo = '';
            
            if (isVideoFile && item.frame !== undefined) {
                frameInfo = `<span class="detail-frame">帧: ${item.frame}</span>`;
            }
            
            resultItem.innerHTML = `
                <div class="detail-info">
                    <div class="detail-icon">${classInitial}</div>
                    <div class="detail-text">
                        <span class="detail-class">${item.class}</span>
                        <span class="detail-id">#${startIndex + index + 1} ${frameInfo}</span>
                    </div>
                </div>
                <div class="detail-confidence">
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                    </div>
                    <span>${confidencePercent}%</span>
                </div>
            `;
            
            resultsList.appendChild(resultItem);
        });
        
        updatePagination(page, Math.ceil(allDetections.length / itemsPerPage));
    }
    
    function updatePagination(currentPage, totalPages) {
        paginationControls.innerHTML = '';
            
        if (totalPages <= 1) {
            return;
        }
        
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '&laquo;';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                displayDetailedResults(currentPage - 1);
            }
        });
        paginationControls.appendChild(prevButton);
        
        const maxPageButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
        
        if (endPage - startPage + 1 < maxPageButtons) {
            startPage = Math.max(1, endPage - maxPageButtons + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.toggle('active', i === currentPage);
            pageButton.addEventListener('click', () => {
                displayDetailedResults(i);
            });
            paginationControls.appendChild(pageButton);
        }
        
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '&raquo;';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                displayDetailedResults(currentPage + 1);
            }
        });
        paginationControls.appendChild(nextButton);
    }
    
    function showLoader() {
        loader.style.display = 'block';
        predictButton.disabled = true;
    }
    
    function hideLoader() {
        loader.style.display = 'none';
        predictButton.disabled = false;
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    function hideError() {
        errorMessage.style.display = 'none';
    }
    
    function hideResults() {
        resultsContainer.style.display = 'none';
        imageResultContainer.style.display = 'none';
        videoResultContainer.style.display = 'none';
    }
    
    document.querySelectorAll('.results-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.results-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.results-pane').forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 根据不同类型的预警分配相应的图标和样式类
    function getWarningTypeIcon(warningClass) {
        // 设置预警类型到图标的映射
        const warningIcons = {
            "发短信-右": { icon: "fa-mobile-alt", cssClass: "warning-type-texting-right" },
            "发短信-左": { icon: "fa-mobile-alt", cssClass: "warning-type-texting-left" },
            "打电话-右": { icon: "fa-phone", cssClass: "warning-type-calling-right" },
            "打电话-左": { icon: "fa-phone", cssClass: "warning-type-calling-left" },
            "操作无线电": { icon: "fa-broadcast-tower", cssClass: "warning-type-radio" },
            "喝酒": { icon: "fa-wine-bottle", cssClass: "warning-type-drinking" },
            "向后伸手": { icon: "fa-hand-point-up", cssClass: "warning-type-reaching-back" },
            "发型和化妆": { icon: "fa-cut", cssClass: "warning-type-grooming" }
        };
        
        // 如果映射中存在该类型，则返回对应的图标和样式类，否则使用默认图标
        return warningIcons[warningClass] || { icon: "fa-exclamation-triangle", cssClass: "" };
    }
    
    // 显示视频预警信息的函数
    function displayVideoWarnings(warnings) {
        const warningsContainer = document.getElementById('video-warnings-container');
        const warningsList = document.getElementById('warnings-list');
        const warningCount = document.getElementById('warning-count');
        
        // 如果没有预警或预警数组为空，则隐藏预警容器
        if (!warnings || warnings.length === 0) {
            warningsContainer.style.display = 'none';
            return;
        }
        
        // 显示预警容器
        warningsContainer.style.display = 'block';
        
        // 更新预警数量
        warningCount.textContent = `${warnings.length}条`;
        
        // 清空预警列表
        warningsList.innerHTML = '';
        
        // 遍历预警数组
        warnings.forEach(warning => {
            // 创建预警项元素
            const warningItem = document.createElement('div');
            warningItem.className = 'warning-item';
            
            // 获取该类型预警的图标和样式类
            const { icon, cssClass } = getWarningTypeIcon(warning.warning_class);
            
            // 创建预警类型显示部分
            const warningType = document.createElement('div');
            warningType.className = `warning-type ${cssClass}`;
            warningType.innerHTML = `<i class="fas ${icon}"></i>${warning.warning_class}`;
            
            // 创建预警时间显示部分
            const warningTime = document.createElement('div');
            warningTime.className = 'warning-time';
            warningTime.textContent = `${warning.duration.toFixed(1)}秒`;
            
            // 将预警类型和时间添加到预警项中
            warningItem.appendChild(warningType);
            warningItem.appendChild(warningTime);
            
            // 将预警项添加到预警列表中
            warningsList.appendChild(warningItem);
            
            // 添加点击事件，跳转到视频相应位置
            warningItem.addEventListener('click', () => {
                const video = document.getElementById('result-video');
                if (video) {
                    const startTime = warning.start_frame / videoFPS;
                    video.currentTime = startTime;
                    video.play();
                }
            });
        });

        // 添加语音播报功能
        playWarningAudio();
    }

    // 播放语音播报的函数
    function playWarningAudio() {
        const message = "检测到预警信息，请注意安全驾驶";
        const speech = new SpeechSynthesisUtterance(message);
        speech.lang = 'zh-CN'; // 设置语言为中文
        window.speechSynthesis.speak(speech);
        console.log("正在播放语音播报:", message);
    }
    // 在处理视频结果时调用显示预警函数
    function processVideoResult(results) {
        // ...existing code...
        
        // 提取视频预警信息
        if (results.warnings && results.warnings.length > 0) {
            displayVideoWarnings(results.warnings);
        }
        
        // ...existing code...
    }
});