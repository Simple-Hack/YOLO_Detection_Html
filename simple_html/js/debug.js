/**
 * 调试模块 - 用于监控文件上传和API请求
 */

document.addEventListener('DOMContentLoaded', function() {
    // 获取调试相关DOM元素
    const debugButton = document.getElementById('debug-button');
    const debugModal = document.getElementById('debug-modal');
    let closeDebugModal = document.querySelector('.close-debug-modal');
    
    // 重构调试模态框结构 - 创建选项卡系统
    const modalContent = document.querySelector('.debug-modal-content');
    if (modalContent) {
        // 清空现有内容
        modalContent.innerHTML = `
            <span class="close-debug-modal">&times;</span>
            <h2>调试信息中心</h2>
            
            <!-- 调试选项卡 -->
            <div class="debug-tabs">
                <button class="debug-tab-btn active" data-tab="video-upload-tab">
                    <i class="fas fa-video"></i> 视频上传
                </button>
                <button class="debug-tab-btn" data-tab="network-tab">
                    <i class="fas fa-network-wired"></i> 网络请求
                </button>
                <button class="debug-tab-btn" data-tab="system-tab">
                    <i class="fas fa-info-circle"></i> 系统信息
                </button>
            </div>
            
            <!-- 选项卡内容 -->
            <div class="debug-tab-content">
                <!-- 视频上传调试信息 -->
                <div id="video-upload-tab" class="debug-pane active">
                    <h3>视频上传调试信息</h3>
                    <div id="video-debug-info" class="debug-content"></div>
                    <div class="debug-actions">
                        <button id="test-video-upload" class="debug-button">
                            <i class="fas fa-vial"></i> 测试视频上传
                        </button>
                    </div>
                </div>
                
                <!-- 网络请求日志 -->
                <div id="network-tab" class="debug-pane">
                    <h3>网络请求日志</h3>
                    <ul id="request-log" class="network-log"></ul>
                </div>
                
                <!-- 系统信息 -->
                <div id="system-tab" class="debug-pane">
                    <h3>系统信息</h3>
                    <div id="debug-info" class="debug-content"></div>
                    <div class="debug-actions">
                        <button id="check-server-status" class="debug-button">
                            <i class="fas fa-server"></i> 检查服务器状态
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 重新获取关闭按钮
        closeDebugModal = modalContent.querySelector('.close-debug-modal');
    }
    
    // 选项卡切换功能
    function setupDebugTabs() {
        const tabButtons = document.querySelectorAll('.debug-tab-btn');
        const tabPanes = document.querySelectorAll('.debug-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // 移除所有活动状态
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // 设置当前选项卡为活动状态
                button.classList.add('active');
                const targetTab = button.getAttribute('data-tab');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }
    
    // 初始化选项卡
    setupDebugTabs();

    // 创建调试实例对象
    const debugManager = {
        // 存储请求历史
        requestHistory: [],
        
        // 更新视频调试信息
        updateVideoDebugInfo(info) {
            const videoDebugInfo = document.getElementById('video-debug-info');
            if (!videoDebugInfo) return;
            
            // 在现有内容的顶部添加新条目
            const infoDiv = document.createElement('div');
            infoDiv.className = 'video-debug-entry';
            
            // 添加时间戳（如果没有提供）
            if (!info.timestamp) {
                info.timestamp = new Date().toLocaleString();
            }
            
            let infoHtml = '';
            for (const key in info) {
                const value = info[key];
                infoHtml += `<div><strong>${key}:</strong> ${value}</div>`;
            }
            
            infoDiv.innerHTML = infoHtml;
            
            // 添加到内容的顶部
            if (videoDebugInfo.firstChild) {
                videoDebugInfo.insertBefore(infoDiv, videoDebugInfo.firstChild);
            } else {
                videoDebugInfo.appendChild(infoDiv);
            }
        },
        
        // 更新系统调试信息
        updateSystemInfo() {
            const debugInfo = document.getElementById('debug-info');
            if (!debugInfo) return;
            
            // 重置调试信息
            debugInfo.innerHTML = '';
            
            // 获取当前选中的文件
            const fileInput = document.getElementById('file-input');
            const selectedFile = fileInput.files.length > 0 ? fileInput.files[0] : null;
            
            // 系统信息块
            const systemInfoDiv = document.createElement('div');
            systemInfoDiv.className = 'debug-section';
            
            // 系统信息
            let systemInfo = `
                <h4>系统环境</h4>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">浏览器:</div>
                        <div class="info-value">${navigator.userAgent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">时间:</div>
                        <div class="info-value">${new Date().toLocaleString()}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">API地址:</div>
                        <div class="info-value">${getAPIBaseUrl()}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">联网状态:</div>
                        <div class="info-value">${navigator.onLine ? '在线' : '离线'}</div>
                    </div>
                </div>
            `;
            
            // 文件信息块
            let fileInfo = `
                <h4>文件信息</h4>
                <div class="info-grid">
            `;
            
            if (selectedFile) {
                fileInfo += `
                    <div class="info-row">
                        <div class="info-label">文件名:</div>
                        <div class="info-value">${selectedFile.name}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">文件类型:</div>
                        <div class="info-value">${selectedFile.type}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">文件大小:</div>
                        <div class="info-value">${this.formatFileSize(selectedFile.size)}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">最后修改:</div>
                        <div class="info-value">${new Date(selectedFile.lastModified).toLocaleString()}</div>
                    </div>
                `;
            } else {
                fileInfo += `
                    <div class="info-row">
                        <div class="info-label">状态:</div>
                        <div class="info-value">未选择文件</div>
                    </div>
                `;
            }
            
            fileInfo += `</div>`;
            
            // 服务器配置块
            const serverInfo = `
                <h4>服务器配置</h4>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">API端口:</div>
                        <div class="info-value">${API_PORT}</div>
                    </div>
                </div>
            `;
            
            // 请求历史摘要
            const requestSummary = `
                <h4>请求历史摘要</h4>
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">总请求数:</div>
                        <div class="info-value">${this.requestHistory.length}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">成功请求:</div>
                        <div class="info-value">${this.requestHistory.filter(req => req.status === 'success').length}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">失败请求:</div>
                        <div class="info-value">${this.requestHistory.filter(req => req.status === 'error').length}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">待处理请求:</div>
                        <div class="info-value">${this.requestHistory.filter(req => req.status === 'pending').length}</div>
                    </div>
                </div>
            `;
            
            // 合并所有信息
            systemInfoDiv.innerHTML = systemInfo + fileInfo + serverInfo + requestSummary;
            debugInfo.appendChild(systemInfoDiv);
        },
        
        // 更新请求日志
        updateRequestLog() {
            const requestLog = document.getElementById('request-log');
            if (!requestLog) return;
            
            requestLog.innerHTML = '';
            
            // 按时间倒序排序，最近的请求在前面
            const sortedRequests = [...this.requestHistory].sort((a, b) => {
                return (b.startTime || 0) - (a.startTime || 0);
            });
            
            sortedRequests.forEach(req => {
                const li = document.createElement('li');
                li.className = `request-item ${req.status}`;
                
                // 创建请求头部信息
                const header = document.createElement('div');
                header.className = 'request-header';
                
                // 创建图标
                const icon = document.createElement('i');
                if (req.status === 'success') {
                    icon.className = 'fas fa-check-circle';
                } else if (req.status === 'error') {
                    icon.className = 'fas fa-times-circle';
                } else {
                    icon.className = 'fas fa-spinner fa-spin';
                }
                
                // 设置请求标题
                const title = document.createElement('div');
                title.className = 'request-title';
                title.textContent = `${req.method} ${this.getShortUrl(req.url)}`;
                
                // 设置请求时间和状态
                const meta = document.createElement('div');
                meta.className = 'request-meta';
                
                let metaText = this.formatTime(req.startTime);
                if (req.status !== 'pending') {
                    metaText += ` · ${req.duration}ms`;
                    if (req.statusCode) {
                        metaText += ` · ${req.statusCode}`;
                    }
                }
                meta.textContent = metaText;
                
                header.appendChild(icon);
                header.appendChild(title);
                header.appendChild(meta);
                
                // 创建请求详情
                const details = document.createElement('div');
                details.className = 'request-details';
                
                let detailsHtml = `<div class="request-url"><strong>URL:</strong> ${req.url}</div>`;
                
                // 如果是FormData请求，显示文件信息
                if (req.formData) {
                    detailsHtml += `
                        <div class="request-file-info">
                            <div><strong>文件名:</strong> ${req.formData.fileName}</div>
                            <div><strong>文件大小:</strong> ${req.formData.fileSize}</div>
                            <div><strong>文件类型:</strong> ${req.formData.fileType}</div>
                        </div>
                    `;
                    
                    // 添加估算的内容长度
                    if (req.contentLength) {
                        detailsHtml += `<div><strong>估算请求大小:</strong> ${this.formatFileSize(req.contentLength)}</div>`;
                    }
                }
                
                // 如果请求完成，显示状态码
                if (req.statusCode) {
                    detailsHtml += `<div><strong>状态码:</strong> ${req.statusCode} ${req.statusText}</div>`;
                    
                    // 如果有响应头信息，显示关键头信息
                    if (req.headers) {
                        const importantHeaders = [
                            'content-type', 'content-length', 'transfer-encoding',
                            'x-powered-by', 'server'
                        ];
                        
                        let headersText = '';
                        for (const header of importantHeaders) {
                            if (req.headers[header]) {
                                headersText += `<div><strong>${header}:</strong> ${req.headers[header]}</div>`;
                            }
                        }
                        
                        if (headersText) {
                            detailsHtml += `<div class="response-headers"><strong>响应头信息:</strong>${headersText}</div>`;
                        }
                    }
                }
                
                // 如果请求出错，显示错误信息
                if (req.error) {
                    detailsHtml += `<div class="request-error"><strong>错误:</strong> ${req.error}</div>`;
                }
                
                details.innerHTML = detailsHtml;
                
                // 将头部和详情添加到列表项
                li.appendChild(header);
                li.appendChild(details);
                
                // 可折叠详情
                header.addEventListener('click', () => {
                    details.style.display = details.style.display === 'block' ? 'none' : 'block';
                    li.classList.toggle('expanded');
                });
                
                requestLog.appendChild(li);
            });
        },
        
        // 检查服务器状态
        checkServerStatus(apiBaseUrl) {
            this.updateVideoDebugInfo({
                stage: '服务器检查',
                status: '正在检测...',
                url: apiBaseUrl
            });
            
            // 添加一个检查记录到请求日志
            const statusCheck = {
                id: 'server_check_' + Date.now(),
                url: `${apiBaseUrl}/progress?filename=test`,
                method: 'GET',
                startTime: new Date(),
                status: 'pending'
            };
            
            this.requestHistory.push(statusCheck);
            this.updateRequestLog();
            
            // 切换到网络请求选项卡
            document.querySelector('[data-tab="network-tab"]').click();
            
            // 先检查服务器基本连接
            fetch(`${apiBaseUrl}/progress?filename=test`, { 
                method: 'GET',
                cache: 'no-store' // 避免缓存影响检测结果
            })
            .then(response => {
                // 更新状态检查记录
                const index = this.requestHistory.findIndex(item => item.id === statusCheck.id);
                if (index !== -1) {
                    this.requestHistory[index].endTime = new Date();
                    this.requestHistory[index].duration = this.requestHistory[index].endTime - this.requestHistory[index].startTime;
                    this.requestHistory[index].status = response.ok ? 'success' : 'error';
                    this.requestHistory[index].statusCode = response.status;
                    this.requestHistory[index].statusText = response.statusText;
                    
                    // 记录所有响应头
                    const headers = {};
                    response.headers.forEach((value, name) => {
                        headers[name] = value;
                    });
                    this.requestHistory[index].headers = headers;
                }
                
                this.updateRequestLog();
                
                if (response.ok) {
                    this.updateVideoDebugInfo({
                        stage: '服务器检查',
                        status: '正常',
                        url: apiBaseUrl,
                        statusCode: response.status
                    });
                } else {
                    this.updateVideoDebugInfo({
                        stage: '服务器检查',
                        status: '异常',
                        statusCode: response.status,
                        statusText: response.statusText
                    });
                }
            })
            .catch(error => {
                // 更新状态检查记录
                const index = this.requestHistory.findIndex(item => item.id === statusCheck.id);
                if (index !== -1) {
                    this.requestHistory[index].endTime = new Date();
                    this.requestHistory[index].duration = this.requestHistory[index].endTime - this.requestHistory[index].startTime;
                    this.requestHistory[index].status = 'error';
                    this.requestHistory[index].error = error.message;
                }
                
                this.updateRequestLog();
                
                this.updateVideoDebugInfo({
                    stage: '服务器检查',
                    status: '连接失败',
                    error: error.message
                });
                
                // 提供可能的解决方案
                this.updateVideoDebugInfo({
                    stage: '可能的解决方案',
                    suggestions: `1. 确认服务器已启动
2. 检查API_PORT配置(当前: ${API_PORT})
3. 检查浏览器网络连接
4. 检查防火墙设置`
                });
            });
        },
        
        // 测试视频上传
        testVideoUpload() {
            const API_BASE_URL = getAPIBaseUrl();
            
            // 创建一个小的测试视频Blob（1秒黑色视频）
            // 这是一个最小MP4文件的二进制表示
            const testVideoBase64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAADJtZGF0AAACoQYF//+c3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDEzMyByMjMzOSBjZGU5YWM2IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTUgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD00MCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAAAAAA==';
            
            // 将base64转换为Blob
            const byteCharacters = atob(testVideoBase64);
            const byteArrays = [];
            for (let i = 0; i < byteCharacters.length; i++) {
                byteArrays.push(byteCharacters.charCodeAt(i));
            }
            const byteArray = new Uint8Array(byteArrays);
            const blob = new Blob([byteArray], {type: 'video/mp4'});
            
            // 创建File对象
            const testFile = new File([blob], 'test_video.mp4', {type: 'video/mp4', lastModified: new Date()});
            
            // 创建FormData并添加文件
            const formData = new FormData();
            formData.append('file', testFile);
            
            // 更新UI状态
            this.updateVideoDebugInfo({
                stage: '开始测试上传',
                fileName: 'test_video.mp4',
                fileSize: this.formatFileSize(testFile.size),
                fileType: 'video/mp4'
            });
            
            // 切换到视频选项卡
            document.querySelector('[data-tab="video-upload-tab"]').click();
            
            // 发送请求
            fetch(`${API_BASE_URL}/predict_video`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                this.updateVideoDebugInfo({
                    stage: '测试上传成功',
                    result: JSON.stringify(data).substring(0, 100) + '...'
                });
            })
            .catch(error => {
                this.updateVideoDebugInfo({
                    stage: '测试上传失败',
                    error: error.message
                });
            });
        },
        
        // 辅助函数：格式化时间
        formatTime(dateObj) {
            if (!dateObj) return 'N/A';
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            const seconds = String(dateObj.getSeconds()).padStart(2, '0');
            const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');
            return `${hours}:${minutes}:${seconds}.${milliseconds}`;
        },
        
        // 辅助函数：格式化文件大小
        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },
        
        // 辅助函数：获取URL的短版本（用于显示）
        getShortUrl(url) {
            try {
                const urlObj = new URL(url);
                // 返回路径部分
                return urlObj.pathname + urlObj.search;
            } catch (e) {
                // 如果解析失败，返回原始URL
                return url;
            }
        }
    };
    
    // 打开调试窗口
    debugButton.addEventListener('click', function() {
        debugManager.updateSystemInfo();
        debugModal.style.display = 'block';
    });
    
    // 关闭调试窗口
    closeDebugModal.addEventListener('click', function() {
        debugModal.style.display = 'none';
    });
    
    // 点击窗口外部关闭调试窗口
    window.addEventListener('click', function(event) {
        if (event.target === debugModal) {
            debugModal.style.display = 'none';
        }
    });
    
    // 检查服务器状态按钮
    document.getElementById('check-server-status')?.addEventListener('click', function() {
        const API_BASE_URL = getAPIBaseUrl();
        debugManager.checkServerStatus(API_BASE_URL);
    });
    
    // 测试视频上传按钮
    document.getElementById('test-video-upload')?.addEventListener('click', function() {
        debugManager.testVideoUpload();
    });
    
    // 监听文件选择变化
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (debugModal.style.display === 'block') {
                debugManager.updateSystemInfo();
            }
        });
    }
    
    // 拦截网络请求
    setupFetchInterceptor(debugManager);
    
    // 初始化系统信息
    debugManager.updateSystemInfo();
});

// 设置Fetch拦截器
function setupFetchInterceptor(debugManager) {
    // 存储原始的fetch函数
    const originalFetch = window.fetch;
    
    // 替换原始的fetch函数
    window.fetch = function(url, options) {
        const startTime = new Date();
        const requestId = 'req_' + Math.random().toString(36).substr(2, 9);
        
        // 记录请求开始
        const requestInfo = {
            id: requestId,
            url: url,
            method: options ? options.method || 'GET' : 'GET',
            startTime: startTime,
            status: 'pending',
            duration: 0,
            formData: null,
            contentLength: null
        };
        
        // 检查视频上传请求
        let isVideoUpload = false;
        
        // 如果是FormData请求，提取文件信息
        if (options && options.body instanceof FormData) {
            const formData = options.body;
            if (formData.has('file')) {
                const file = formData.get('file');
                if (file instanceof File) {
                    requestInfo.formData = {
                        fileName: file.name,
                        fileSize: debugManager.formatFileSize(file.size),
                        fileType: file.type,
                        lastModified: new Date(file.lastModified).toLocaleString()
                    };
                    
                    // 检测是否是视频上传
                    if (file.type.startsWith('video/')) {
                        isVideoUpload = true;
                        
                        // 更新视频调试信息
                        debugManager.updateVideoDebugInfo({
                            stage: '开始上传',
                            fileName: file.name,
                            fileSize: debugManager.formatFileSize(file.size),
                            fileType: file.type,
                            uploadTime: new Date().toLocaleString()
                        });
                    }
                }
            }
            
            // 估算Content-Length
            try {
                let contentLength = 0;
                
                // 遍历FormData中的所有条目
                for (let [key, value] of formData.entries()) {
                    if (value instanceof File) {
                        contentLength += value.size;
                        contentLength += key.length + 128; // 额外的表单数据开销
                    } else if (typeof value === 'string') {
                        contentLength += value.length;
                        contentLength += key.length + 32;
                    }
                }
                
                // 添加FormData的边界字符串的额外开销
                contentLength += 512;
                
                requestInfo.contentLength = contentLength;
            } catch (e) {
                console.error('估算内容长度时出错:', e);
            }
        }
        
        // 添加到请求历史
        debugManager.requestHistory.push(requestInfo);
        debugManager.updateRequestLog();
        
        // 检查上传进度的定时器
        let progressInterval = null;
        if (isVideoUpload) {
            startUploadProgressMonitoring(requestId);
        }
        
        function startUploadProgressMonitoring(reqId) {
            let startMonitorTime = Date.now();
            progressInterval = setInterval(() => {
                // 检查请求是否仍在进行中
                const reqIndex = debugManager.requestHistory.findIndex(item => item.id === reqId);
                if (reqIndex !== -1 && debugManager.requestHistory[reqIndex].status === 'pending') {
                    const elapsedSecs = (Date.now() - startMonitorTime) / 1000;
                    const uploadingFor = Math.round(elapsedSecs);
                    
                    // 更新视频调试信息
                    debugManager.updateVideoDebugInfo({
                        stage: '上传中',
                        uploadingFor: `${uploadingFor} 秒`
                    });
                    
                    // 如果上传时间超过5分钟，可能有问题
                    if (elapsedSecs > 300) {
                        debugManager.updateVideoDebugInfo({
                            stage: '上传可能卡住',
                            warning: '上传时间超过5分钟，可能存在问题'
                        });
                    }
                } else {
                    // 请求已完成或未找到
                    clearInterval(progressInterval);
                }
            }, 5000); // 每5秒检查一次
        }
        
        // 调用原始的fetch函数
        return originalFetch(url, options)
            .then(response => {
                const endTime = new Date();
                const duration = endTime - startTime;
                
                // 更新请求信息
                const index = debugManager.requestHistory.findIndex(item => item.id === requestId);
                if (index !== -1) {
                    debugManager.requestHistory[index].status = response.ok ? 'success' : 'error';
                    debugManager.requestHistory[index].statusCode = response.status;
                    debugManager.requestHistory[index].statusText = response.statusText;
                    debugManager.requestHistory[index].duration = duration;
                    debugManager.requestHistory[index].endTime = endTime;
                    
                    // 记录所有响应头
                    const headers = {};
                    response.headers.forEach((value, name) => {
                        headers[name] = value;
                    });
                    debugManager.requestHistory[index].headers = headers;
                    
                    if (isVideoUpload) {
                        debugManager.updateVideoDebugInfo({
                            stage: response.ok ? '上传成功' : '上传失败',
                            duration: `${(duration / 1000).toFixed(2)}秒`,
                            statusCode: response.status,
                            statusText: response.statusText
                        });
                        
                        // 如果上传成功，清除进度监控
                        if (response.ok && progressInterval) {
                            clearInterval(progressInterval);
                        }
                    }
                }
                
                debugManager.updateRequestLog();
                
                // 如果是视频上传且成功，克隆响应以便后面可以读取内容
                if (isVideoUpload && response.ok) {
                    return response.clone().text().then(text => {
                        try {
                            const data = JSON.parse(text);
                            
                            if (data.success) {
                                debugManager.updateVideoDebugInfo({
                                    stage: '视频处理完成',
                                    videoUrl: data.video_url,
                                    detectionCount: data.detections ? data.detections.length : 0
                                });
                            } else if (data.error) {
                                debugManager.updateVideoDebugInfo({
                                    stage: '视频处理失败',
                                    error: data.error
                                });
                            }
                        } catch (e) {
                            console.error('无法解析视频处理响应:', e);
                        }
                        
                        return response;
                    }).catch(err => {
                        // 如果解析失败，返回原始响应
                        console.error('解析视频处理响应时出错:', err);
                        return response;
                    });
                }
                
                return response;
            })
            .catch(error => {
                const endTime = new Date();
                const duration = endTime - startTime;
                
                // 更新请求信息
                const index = debugManager.requestHistory.findIndex(item => item.id === requestId);
                if (index !== -1) {
                    debugManager.requestHistory[index].status = 'error';
                    debugManager.requestHistory[index].error = error.message;
                    debugManager.requestHistory[index].duration = duration;
                    debugManager.requestHistory[index].endTime = endTime;
                    
                    if (isVideoUpload) {
                        debugManager.updateVideoDebugInfo({
                            stage: '上传出错',
                            error: error.message,
                            duration: `${(duration / 1000).toFixed(2)}秒`
                        });
                        
                        // 清除进度监控
                        if (progressInterval) {
                            clearInterval(progressInterval);
                        }
                    }
                }
                
                debugManager.updateRequestLog();
                throw error;
            });
    };
}