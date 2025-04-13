/**
 * 结果显示模块 - 负责处理检测结果的展示
 */

let categoryCountChart = null;
let confidenceChart = null;
let allDetections = [];
let currentPage = 1;
// 使用固定值替代 CONFIG.MAX_FILES_PER_PAGE
const itemsPerPage = 10;

// 展示检测结果
function displayResults(data) {
    const allDetections = data.detections || [];
    
    // 使用 getAPIBaseUrl 函数获取 API URL
    const API_BASE_URL = getAPIBaseUrl(); 
    
    const isVideoFile = selectedFile && selectedFile.type.startsWith('video/');
    
    // 更新统计信息
    updateStatistics(data.statistics);
    
    // 显示图表
    if (data.statistics && data.statistics.class_details) {
        generateClassesSummary(data.statistics.class_details);
        generateCharts(data.statistics.class_details);
    }
    
    // 显示驾驶建议
    if (data.suggestions) {
        displayDrivingSuggestions(data.suggestions);
    }
    
    // 更新详细检测结果
    currentPage = 1;
    displayDetailedResults(currentPage);
    
    // 显示图像或视频结果
    displayMediaResults(data, isVideoFile);
    
    // 显示结果容器
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.style.display = 'block';
    resultsContainer.classList.add('fade-in');
}

// 更新统计信息
function updateStatistics(statistics) {
    if (!statistics) return;
    
    // 获取统计元素
    const totalCountElement = document.getElementById('total-count');
    const avgConfidenceElement = document.getElementById('avg-confidence');
    const maxConfidenceElement = document.getElementById('max-confidence');
    const classCountElement = document.getElementById('class-count');
    
    // 更新统计数据
    totalCountElement.textContent = statistics.total_count;
    classCountElement.textContent = statistics.class_count;
    avgConfidenceElement.textContent = (statistics.avg_confidence * 100).toFixed(2) + '%';
    maxConfidenceElement.textContent = (statistics.max_confidence * 100).toFixed(2) + '%';
    
    // 更新视频相关信息
    if (statistics.video_duration) {
        videoDuration = statistics.video_duration;
    }
    if (statistics.fps) {
        videoFps = statistics.fps;
    }
}

// 生成类别摘要
function generateClassesSummary(classDetails) {
    const classesSummary = document.getElementById('classes-summary');
    if (!classesSummary) return;
    
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
        } else if (classDetail.name.toLowerCase().includes('打电话')) {
            classIcon = 'fa-phone';
        } else if (classDetail.name.toLowerCase().includes('抽烟')) {
            classIcon = 'fa-smoking';
        } else if (classDetail.name.toLowerCase().includes('分心')) {
            classIcon = 'fa-exclamation-triangle';
        }
        
        // 计算持续时间显示
        let durationHtml = '';
        if (classDetail.duration !== undefined) {
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

// 生成图表
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

// 显示详细检测结果
function displayDetailedResults(page) {
    const resultsList = document.getElementById('results-list');
    if (!resultsList) return;

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
        
        if (item.frame !== undefined) {
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

// 更新分页
function updatePagination(currentPage, totalPages) {
    const paginationControls = document.getElementById('pagination-controls');
    if (!paginationControls) return;
    
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
        pageButton.addEventListener('click', () => displayDetailedResults(i));
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

// 显示媒体结果
function displayMediaResults(data, isVideoFile) {
    // 隐藏所有媒体结果容器
    document.getElementById('image-result-container').style.display = 'none';
    document.getElementById('video-result-container').style.display = 'none';
    
    try {
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
            
            // 构建完整的视频URL
            const API_BASE_URL = getAPIBaseUrl();
            const fullVideoUrl = `${API_BASE_URL}${data.video_url}`;
            
            console.log(`设置视频源: ${fullVideoUrl}`);
            
            // 设置视频源
            resultVideo.src = fullVideoUrl;
            
            // 显示视频结果容器
            videoResultContainer.style.display = 'block';
            
            // 显示预警信息（如果有）- 修复：确保对预警信息的处理
            console.log("检查预警信息:", data.warnings, "视频信息:", data.video_info);
            if (data.warnings) {
                displayWarnings(data.warnings, data.video_info);
            } else {
                // 隐藏预警容器
                document.getElementById('video-warnings-container').style.display = 'none';
            }
            
            // 初始化视频控制器 - 修正调用方式
            // 检查 initVideoControls 是否存在，可能是全局函数或者 window 对象的方法
            if (typeof initVideoControls === 'function') {
                console.log("使用本地 initVideoControls 函数初始化视频控制器");
                initVideoControls(resultVideo);
            } else if (typeof window.initVideoControls === 'function') {
                console.log("使用全局 window.initVideoControls 函数初始化视频控制器");
                window.initVideoControls(resultVideo);
            } else {
                console.error("找不到 initVideoControls 函数，视频控制器将不可用");
                // 降级处理，启用浏览器原生控制器
                resultVideo.controls = true;
            }
        } else {
            // 显示图像结果
            const imageResultContainer = document.getElementById('image-result-container');
            const resultImage = document.getElementById('result-image');
            
            // 检查图像URL是否存在
            if (!data.image_url) {
                console.error('服务器返回的数据中缺少图像URL');
                showError('服务器返回的数据中缺少图像URL');
                return;
            }
            
            // 构建完整的图像URL
            const API_BASE_URL = getAPIBaseUrl();
            const fullImageUrl = `${API_BASE_URL}${data.image_url}`;
            
            resultImage.src = fullImageUrl;
            imageResultContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('加载媒体结果时出错:', error);
        showError(`加载${isVideoFile ? '视频' : '图像'}时出错: ${error.message || error}`);
    }
}

// 显示驾驶建议
function displayDrivingSuggestions(suggestions) {
    const suggestionContainer = document.getElementById('driving-suggestions');
    if (!suggestionContainer || !suggestions) return;
    
    // 将<think>...</think>替换为Markdown引用格式(> ...)而不是注释格式
    const formattedSuggestions = suggestions.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
        // 按行分割内容，每行添加>前缀
        const lines = content.split('\n');
        return lines.map(line => `> ${line}`).join('\n');
    });
    
    suggestionContainer.innerHTML = `
        <div class="suggestion-title">
            <i class="fas fa-lightbulb"></i>
            智能驾驶建议
        </div>
        <div class="suggestion-content">
            ${formatMessage(formattedSuggestions)}
        </div>
    `;
    
    suggestionContainer.style.display = 'block';
}

/**
 * 处理预警信息并显示
 * @param {Array} warnings 预警信息数组
 * @param {Object} videoInfo 视频信息
 */
function displayWarnings(warnings, videoInfo) {
    const warningsContainer = document.getElementById('video-warnings-container');
    const warningCount = document.getElementById('warning-count');
    const warningsList = document.getElementById('warnings-list');
    
    // 如果没有预警或不是视频，则隐藏预警容器
    if (!warnings || warnings.length === 0) {
        warningsContainer.style.display = 'none';
        return;
    }
    
    // 清空现有预警列表
    warningsList.innerHTML = '';
    
    // 更新预警数量
    warningCount.textContent = `${warnings.length}条`;
    
    // 计算视频帧率，用于时间显示
    const fps = videoInfo && videoInfo.fps ? videoInfo.fps : 30;
    
    // 创建预警项目
    if (Array.isArray(warnings)) {
        warnings.forEach(warning => {
            // 计算开始和结束时间
            const startTime = warning.start_frame / fps;
            const endTime = warning.end_frame / fps;
            
            // 格式化时间显示
            const timeFormatted = `${formatTime(startTime)} - ${formatTime(endTime)}`;
            
            // 根据不同预警类型设置图标
            let warningIcon = 'fa-exclamation-triangle';
            if (warning.warning_class.includes('发短信')) {
                warningIcon = 'fa-mobile-alt';
            } else if (warning.warning_class.includes('打电话')) {
                warningIcon = 'fa-phone';
            } else if (warning.warning_class.includes('喝酒')) {
                warningIcon = 'fa-glass-cheers';
            }
            
            // 创建预警项
            const warningItem = document.createElement('div');
            warningItem.className = 'warning-item';
            warningItem.innerHTML = `
                <div class="warning-type">
                    <i class="fas ${warningIcon}"></i>
                    ${warning.warning_class}
                </div>
                <div class="warning-time">
                    ${timeFormatted}
                </div>
            `;
            
            // 添加点击跳转到对应时间点的功能
            warningItem.addEventListener('click', function() {
                const video = document.getElementById('result-video');
                if (video) {
                    video.currentTime = startTime;
                    video.play();
                }
            });
            
            warningsList.appendChild(warningItem);
        });
    } else if (typeof warnings === 'object') {
        // 处理单个预警对象情况
        const warning = warnings;
        
        // 计算开始和结束时间
        const startTime = warning.start_frame / fps;
        const endTime = warning.end_frame / fps;
        
        // 格式化时间显示
        const timeFormatted = `${formatTime(startTime)} - ${formatTime(endTime)}`;
        
        // 根据不同预警类型设置图标
        let warningIcon = 'fa-exclamation-triangle';
        if (warning.warning_class.includes('发短信')) {
            warningIcon = 'fa-mobile-alt';
        } else if (warning.warning_class.includes('打电话')) {
            warningIcon = 'fa-phone';
        } else if (warning.warning_class.includes('喝酒')) {
            warningIcon = 'fa-glass-cheers';
        }
        
        // 创建预警项
        const warningItem = document.createElement('div');
        warningItem.className = 'warning-item';
        warningItem.innerHTML = `
            <div class="warning-type">
                <i class="fas ${warningIcon}"></i>
                ${warning.warning_class}
            </div>
            <div class="warning-time">
                ${timeFormatted}
            </div>
        `;
        
        // 添加点击跳转到对应时间点的功能
        warningItem.addEventListener('click', function() {
            const video = document.getElementById('result-video');
            if (video) {
                video.currentTime = startTime;
                video.play();
            }
        });
        
        warningsList.appendChild(warningItem);
        warningCount.textContent = '1条';
    }
    
    // 显示预警容器
    warningsContainer.style.display = 'block';
}

/**
 * 格式化时间为 mm:ss 格式
 * @param {number} seconds 秒数
 * @returns {string} 格式化后的时间
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 修改显示视频结果的函数，增加预警展示
function displayVideoResult(result) {
    resetResults();
    
    // 获取视频URL
    const videoUrl = result.video_url;
    
    // 显示视频容器
    const videoContainer = document.getElementById('video-result-container');
    videoContainer.style.display = 'block';
    
    // 设置视频源并播放
    const videoElement = document.getElementById('result-video');
    videoElement.src = videoUrl;
    videoElement.load();
    
    // 显示预警信息（如果有）
    if (result.warnings) {
        displayWarnings(result.warnings, result.video_info);
    } else {
        // 隐藏预警容器
        document.getElementById('video-warnings-container').style.display = 'none';
    }
    
    // 显示统计信息和详细结果
    displayStatistics(result.statistics);
    displayResults(result.detections);
    displayCharts(result.statistics);
    
    // 显示驾驶建议
    if (result.suggestions) {
        displaySuggestions(result.suggestions);
    }
    
    // 显示结果容器
    document.getElementById('results-container').style.display = 'block';
    
    // 滚动到视频位置
    videoContainer.scrollIntoView({ behavior: 'smooth' });
}