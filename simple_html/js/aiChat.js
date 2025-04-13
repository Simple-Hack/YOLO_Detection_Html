/**
 * AI 聊天模块 - 处理 AI 对话界面和逻辑
 */

// AI对话相关变量
let chatHistory = [];
let isVoiceRecording = false;
let speechRecognizer = null; // 语音识别控制器
let voiceRecognitionTimeout = null; // 语音识别超时控制
// 添加头像变量
let userAvatar = null;
let aiAvatar = null;

// 初始化AI聊天功能
function initAiChat() {
    console.log("开始初始化AI聊天功能..."); // 添加初始化调试日志
    try {
        // 加载头像配置
        if (window.userAvatarConfig) {
            userAvatar = window.userAvatarConfig.customAvatar || window.userAvatarConfig.defaultAvatar;
            aiAvatar = window.userAvatarConfig.aiAvatar;
            console.log("已加载头像配置:", { userAvatar, aiAvatar });
        } else {
            console.warn("未找到头像配置，将使用默认图标");
        }
        // 获取DOM元素
        const aiChatNavItem = document.getElementById('ai-chat-nav-item');
        const aiChatFullscreen = document.getElementById('ai-chat-fullscreen');
        const backButton = document.getElementById('back-button');
        const newChatButton = document.getElementById('new-chat-button');
        const userInput = document.getElementById('user-input');
        const sendMessageButton = document.getElementById('send-message-button');
        const voiceInputButton = document.getElementById('voice-input-button');
        const aiChatMessages = document.getElementById('ai-chat-messages');
        
        // 检查关键元素是否存在
        if (!aiChatNavItem || !aiChatFullscreen || !backButton) {
            console.error("AI聊天所需的关键DOM元素不存在:", {
                aiChatNavItem: !!aiChatNavItem,
                aiChatFullscreen: !!aiChatFullscreen,
                backButton: !!backButton
            });
            return;
        }
        
        // 添加事件监听器
        if (aiChatNavItem) {
            aiChatNavItem.addEventListener('click', function() {
                console.log("安全问答按钮被点击");
                showAiChatFullscreen();
            });
        }
        
        if (backButton) {
            backButton.addEventListener('click', function() {
                hideAiChatInterface();
            });
        }
        
        if (newChatButton) {
            newChatButton.addEventListener('click', function() {
                startNewChat();
            });
        }
        
        if (sendMessageButton && userInput) {
            // 发送消息按钮点击事件
            sendMessageButton.addEventListener('click', sendMessage);
        }
        
        if (userInput) {
            // 输入框按Enter键发送消息
            userInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // 自适应输入框高度
            userInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
        
        if (voiceInputButton) {
            // 语音输入按钮点击事件
            voiceInputButton.addEventListener('click', function() {
                toggleVoiceInput();
            });
        }
        
        // 加载历史对话
        loadHistoryFromLocalStorage();
        
        // 初始化Web语音识别
        checkSpeechRecognitionSupport();
        
        console.log("AI聊天功能初始化成功");
    } catch (error) {
        console.error("AI聊天功能初始化失败:", error);
    }
}

// 检查语音识别支持
function checkSpeechRecognitionSupport() {
    try {
        // 检查浏览器支持
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('浏览器不支持语音识别功能，请使用Chrome或Edge浏览器');
            showToast('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器');
            
            const voiceInputButton = document.getElementById('voice-input-button');
            if (voiceInputButton) {
                voiceInputButton.classList.add('mic-error');
                voiceInputButton.title = '浏览器不支持语音识别功能';
                voiceInputButton.disabled = true;
            }
            return;
        }
        
        console.log('浏览器支持语音识别功能');
        const voiceInputButton = document.getElementById('voice-input-button');
        if (voiceInputButton) {
            voiceInputButton.classList.add('mic-ready');
            voiceInputButton.title = '点击开始语音输入';
        }
    } catch (error) {
        console.error('检查语音识别支持失败:', error);
    }
}

// 切换语音输入功能
function toggleVoiceInput() {
    console.log('切换语音输入状态, 当前状态:', isVoiceRecording);
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器');
        return;
    }
    
    if (!isVoiceRecording) {
        // 开始语音输入
        startVoiceRecognition();
    } else {
        // 停止语音输入
        stopVoiceRecognition();
    }
}

// 简化语音识别实现
function startVoiceRecognition() {
    console.log('开始语音识别');

    try {
        // 创建语音识别对象
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognizer = new SpeechRecognition();
        
        // 配置语音识别
        speechRecognizer.lang = 'zh-CN';
        speechRecognizer.interimResults = true;
        speechRecognizer.continuous = false;
        
        // 清空输入框
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.value = '';
            userInput.style.height = 'auto';
        }
        
        // 标记语音识别状态为活动
        isVoiceRecording = true;
        
        // 更新UI状态
        const voiceInputButton = document.getElementById('voice-input-button');
        if (voiceInputButton) {
            voiceInputButton.classList.add('active');
            voiceInputButton.innerHTML = '<i class="fas fa-stop"></i>';
            voiceInputButton.title = '停止语音输入';
        }
        
        // 显示开始提示
        showToast('开始语音输入...');
        console.log('语音识别已初始化，等待结果...');
        
        // 结果事件
        speechRecognizer.onresult = function(event) {
            console.log('收到语音识别结果事件:', event);
            const result = event.results[0];
            const transcript = result[0].transcript;
            const confidence = (result[0].confidence * 100).toFixed(2);
            
            console.log(`识别文本: ${transcript}, 可信度: ${confidence}%`);
            
            // 更新输入框
            if (userInput) {
                userInput.value = transcript;
                userInput.style.height = 'auto';
                userInput.style.height = `${userInput.scrollHeight}px`;
            }
        };
        
        // 错误事件
        speechRecognizer.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            showToast('语音识别出错: ' + event.error);
            isVoiceRecording = false;
            
            // 重置UI
            if (voiceInputButton) {
                voiceInputButton.classList.remove('active');
                voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceInputButton.title = '语音输入';
            }
        };
        
        // 结束事件
        speechRecognizer.onend = function() {
            console.log('语音识别服务已自动结束');
            
            // 如果仍然标记为录音中，可能是自动结束，需要重置状态
            if (isVoiceRecording) {
                isVoiceRecording = false;
                
                // 重置UI
                if (voiceInputButton) {
                    voiceInputButton.classList.remove('active');
                    voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    voiceInputButton.title = '语音输入';
                }
            }
        };
        
        // 开始识别
        speechRecognizer.start();
        console.log('语音识别已启动');
        
    } catch (error) {
        console.error('启动语音识别失败:', error);
        showToast('启动语音识别失败: ' + error.message);
        isVoiceRecording = false;
    }
}

// 停止语音识别
function stopVoiceRecognition() {
    console.log('停止语音识别被调用');
    
    if (!speechRecognizer) {
        console.warn('尝试停止语音识别，但speechRecognizer不存在');
        return;
    }
    
    try {
        // 停止语音识别
        speechRecognizer.stop();
        console.log('语音识别已停止');
        
        // 发送结果
        const userInput = document.getElementById('user-input');
        const currentText = userInput ? userInput.value.trim() : '';
        if (currentText) {
            console.log('发送语音识别结果:', currentText);
            setTimeout(() => {
                sendMessage();
            }, 300);
        }
    } catch (error) {
        console.error('停止语音识别失败:', error);
    } finally {
        // 更新状态
        isVoiceRecording = false;
        
        // 更新UI
        const voiceInputButton = document.getElementById('voice-input-button');
        if (voiceInputButton) {
            voiceInputButton.classList.remove('active');
            voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceInputButton.title = '语音输入';
        }
        
        // 清空引用
        speechRecognizer = null;
    }
}

// 显示AI聊天界面
function showAiChatInterface() {
    console.log("显示AI聊天界面被调用");
    const aiChatFullscreen = document.getElementById('ai-chat-fullscreen');
    if (aiChatFullscreen) {
        // 隐藏header和container元素，而不仅仅是container
        const header = document.querySelector('header');
        const mainContainer = document.querySelector('.container');
        
        if (header) header.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'none';
        
        // 确保显示聊天界面，并设置正确的显示属性
        aiChatFullscreen.style.display = 'flex';
        console.log("设置AI聊天界面为flex显示");
        
        // 确保子元素也使用正确的显示模式
        const aiChatMessages = document.getElementById('ai-chat-messages');
        const userInput = document.getElementById('user-input');
        const aiChatFullscreenContent = document.querySelector('.ai-chat-fullscreen-content');
        const aiChatFullscreenHeader = document.querySelector('.ai-chat-fullscreen-header');
        const aiChatFullscreenInput = document.querySelector('.ai-chat-fullscreen-input');
        
        if (aiChatFullscreenContent) {
            aiChatFullscreenContent.style.display = 'flex';
            aiChatFullscreenContent.style.flex = '1';
            console.log("设置聊天内容区域为flex");
        }
        
        if (aiChatFullscreenHeader) {
            aiChatFullscreenHeader.style.display = 'flex';
            console.log("设置聊天头部为flex");
        }
        
        if (aiChatFullscreenInput) {
            aiChatFullscreenInput.style.display = 'flex';
            console.log("设置聊天输入区为flex");
        }
        
        if (aiChatMessages) {
            aiChatMessages.style.display = 'flex';
            aiChatMessages.style.flexDirection = 'column';
            console.log("设置消息区域为flex列布局");
        }
        
        // 聚焦到输入框
        if (userInput) {
            userInput.style.display = 'block';
            setTimeout(() => {
                userInput.focus();
            }, 300);
        }
        
        // 滚动到最新消息
        scrollToLatestMessage();
        
        // 检查并创建欢迎消息
        setTimeout(() => {
            const aiChatMessages = document.getElementById('ai-chat-messages');
            if (aiChatMessages && aiChatMessages.childNodes.length === 0) {
                // 如果消息区域为空，添加欢迎消息
                addAiMessage("您好！我是安全驾驶助手。请问有什么关于安全驾驶的问题需要咨询吗？");
                console.log("添加欢迎消息");
            }
        }, 100);
    } else {
        console.error("找不到AI聊天界面元素");
    }
}

// 显示AI聊天全屏界面 - 为了兼容main.js中的调用
function showAiChatFullscreen() {
    showAiChatInterface();
}

// 隐藏AI聊天界面
function hideAiChatInterface() {
    const aiChatFullscreen = document.getElementById('ai-chat-fullscreen');
    if (aiChatFullscreen) {
        // 隐藏聊天界面
        aiChatFullscreen.style.display = 'none';
        
        // 显示header和主容器内容
        const header = document.querySelector('header');
        const mainContainer = document.querySelector('.container');
        
        if (header) header.style.display = 'block';
        if (mainContainer) mainContainer.style.display = 'flex';
        
        // 重置导航栏状态 - 取消所有选中项，然后激活主检测页面
        const navItems = document.querySelectorAll('.main-nav li');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // 默认激活检测视图
        const detectionNavItem = document.querySelector('.main-nav li[data-view="detection"]');
        if (detectionNavItem) {
            detectionNavItem.classList.add('active');
            console.log('已重置导航栏状态，激活检测视图');
            
            // 同时确保显示检测视图内容
            const viewSections = document.querySelectorAll('.view-section');
            viewSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === 'detection-view') {
                    section.classList.add('active');
                }
            });
        }
    }
    
    // 如果语音识别正在进行，停止它
    if (isVoiceRecording) {
        stopVoiceRecognition();
    }
}

// 开始新对话
function startNewChat() {
    // 清空历史对话
    chatHistory = [];
    
    // 清空对话界面
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (aiChatMessages) {
        aiChatMessages.innerHTML = '';
    }
    
    // 添加初始欢迎消息
    addAiMessage("您好！我是安全驾驶助手。请问有什么关于安全驾驶的问题需要咨询吗？");
    
    // 保存空的历史记录
    saveHistoryToLocalStorage();
}

// 从localStorage加载对话历史
function loadHistoryFromLocalStorage() {
    try {
        const savedHistory = localStorage.getItem('safeDrivingChatHistory');
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            
            // 重新生成对话界面
            const aiChatMessages = document.getElementById('ai-chat-messages');
            if (aiChatMessages) {
                aiChatMessages.innerHTML = '';
                
                chatHistory.forEach(item => {
                    if (item.role === 'user') {
                        addUserMessage(item.content, false);
                    } else if (item.role === 'assistant') {
                        addAiMessage(item.content, false);
                    }
                });
            }
            
            // 如果没有对话历史，添加欢迎消息
            if (chatHistory.length === 0) {
                addAiMessage("您好！我是安全驾驶助手。请问有什么关于安全驾驶的问题需要咨询吗？");
            }
        } else {
            // 添加欢迎消息
            addAiMessage("您好！我是安全驾驶助手。请问有什么关于安全驾驶的问题需要咨询吗？");
        }
    } catch (error) {
        console.error("从本地存储加载对话历史失败:", error);
        // 添加欢迎消息
        addAiMessage("您好！我是安全驾驶助手。请问有什么关于安全驾驶的问题需要咨询吗？");
    }
}

// 将对话历史保存到localStorage
function saveHistoryToLocalStorage() {
    try {
        localStorage.setItem('safeDrivingChatHistory', JSON.stringify(chatHistory));
    } catch (error) {
        console.error("保存对话历史到本地存储失败:", error);
    }
}

// 发送消息
function sendMessage() {
    const userInput = document.getElementById('user-input');
    if (!userInput) return;
    
    const message = userInput.value.trim();
    if (message === '') return;
    
    // 添加用户消息到对话区
    addUserMessage(message);
    
    // 清空并重置输入框
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // 请求AI回复
    requestAiResponse(message);
}

// 添加用户消息到对话区
function addUserMessage(message, scroll = true) {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (!aiChatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    
    messageDiv.innerHTML = `

        <div class="user-message-content">
            <p>${formatMessage(message)}</p>
        </div>
        <div class="user-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;min-height:40px;max-height:40px;flex-shrink:0;overflow:hidden;border-radius:50%;">
            ${userAvatar ? `<img src="${userAvatar}" alt="用户头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-user"></i>'}
        </div>
    `;
    
    aiChatMessages.appendChild(messageDiv);
    
    if (scroll) {
        scrollToLatestMessage();
    }
}

// 添加AI消息到对话区
function addAiMessage(message, scroll = true) {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (!aiChatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    
    messageDiv.innerHTML = `
        <div class="ai-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;min-height:40px;max-height:40px;flex-shrink:0;overflow:hidden;border-radius:50%;">
            ${aiAvatar ? `<img src="${aiAvatar}" alt="AI头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-robot"></i>'}
        </div>
        <div class="ai-message-content">
            <p>${formatMessage(message)}</p>
        </div>
    `;
    
    aiChatMessages.appendChild(messageDiv);
    
    if (scroll) {
        scrollToLatestMessage();
    }
}

// 滚动到最新消息
function scrollToLatestMessage() {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (aiChatMessages) {
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
}

// 添加AI思考动画
function addThinkingAnimation() {
    const aiChatMessages = document.getElementById('ai-chat-messages');
    if (!aiChatMessages) return;
    
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'ai-message thinking';
    
    thinkingDiv.innerHTML = `
        <div class="ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-message-content">
            <p>
                <span class="thinking-dot">.</span>
                <span class="thinking-dot">.</span>
                <span class="thinking-dot">.</span>
            </p>
        </div>
    `;
    
    aiChatMessages.appendChild(thinkingDiv);
    scrollToLatestMessage();
}

// 移除AI思考动画
function removeThinkingAnimation() {
    const thinkingDiv = document.querySelector('.thinking');
    if (thinkingDiv) {
        thinkingDiv.remove();
    }
}

// 请求AI回复 - 流式版本
function requestAiResponse(message) {
    // 显示AI正在思考的动画
    addThinkingAnimation();
    
    // 定义API端点
    const API_BASE_URL = getAPIBaseUrl(); // 从配置模块获取API基础URL
    const askStreamEndpoint = `${API_BASE_URL}/ask_stream`;
    
    // 构建请求数据
    const requestData = {
        question: message
    };
    
    // 创建一个变量来存储完整响应
    let fullResponse = '';
    
    // 处理思考标签的变量
    let inThinkMode = false;  // 标记是否在<think>和</think>之间
    
    // 使用fetch发送POST请求并手动处理流式响应
    fetch(askStreamEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // 移除思考动画
        removeThinkingAnimation();
        
        // 创建一个空的AI消息，等待填充
        addAiMessage("", false);
        
        // 获取最新添加的消息元素
        const aiMessageElement = document.querySelector('.ai-message:last-child .ai-message-content p');
        
        // 获取读取流的reader
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // 处理流式数据
        function processStreamChunk({ done, value }) {
            // 如果流结束，中止处理
            if (done) {
                console.log("流式响应接收完成");
                
                // 保存完整对话到历史
                updateChatHistory(message, fullResponse);
                return;
            }
            
            // 解码当前块
            const chunk = decoder.decode(value, { stream: true });
            console.log("收到数据块:", chunk);
            
            try {
                // 尝试将每行作为单独的JSON解析
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    try {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.substring(6); // 移除'data: '前缀
                            const data = JSON.parse(jsonStr);
                            
                            // 获取当前数据块的文本
                            const currentText = data.text || '';
                            
                            // 直接处理当前文本块
                            processTextDirectly(currentText);
                        }
                    } catch (jsonError) {
                        console.warn("无法解析行为JSON:", line, jsonError);
                    }
                }
            } catch (parseError) {
                console.error("解析数据块时出错:", parseError);
            }
            
            // 继续读取下一个数据块
            return reader.read().then(processStreamChunk);
        }
        
        // 直接处理文本块 - 实时应用Markdown引用格式
        function processTextDirectly(text) {
            // 检查<think>标签
            if (text === '<think>') {
                inThinkMode = true;
                return; // 不添加标签本身到响应中
            }
            
            // 检查</think>标签
            if (text === '</think>') {
                inThinkMode = false;
                return; // 不添加标签本身到响应中
            }
            
            // 处理思考模式中的文本
            if (inThinkMode) {
                // 检查是否是新行开始，或者是第一行
                if (fullResponse.endsWith('\n') || fullResponse === '') {
                    // 只有在新行开始时才添加 > 前缀
                    text = `> ${text}`;
                } else if (text.includes('\n')) {
                    // 如果当前文本块包含换行符，需要在每个新行前添加 > 
                    text = text.replace(/\n/g, '\n> ');
                }
            }
            
            // 添加到完整响应
            fullResponse += text;
            
            // 更新AI消息元素
            if (aiMessageElement) {
                aiMessageElement.innerHTML = formatMessage(fullResponse);
                scrollToLatestMessage();
            }
        }
        
        // 开始读取流
        return reader.read().then(processStreamChunk);
    })
    .catch(error => {
        // 移除思考动画
        removeThinkingAnimation();
        
        // 显示错误消息
        addAiMessage("抱歉，处理您的请求时出错了。请稍后再试。");
        console.error("AI接口调用错误:", error);
    });
}

// 更新对话历史
function updateChatHistory(userMessage, aiResponse) {
    chatHistory.push({
        role: 'user',
        content: userMessage
    });
    
    chatHistory.push({
        role: 'assistant',
        content: aiResponse
    });
    
    // 保存对话历史到本地存储
    saveHistoryToLocalStorage();
}

// 显示提示消息
function showToast(message) {
    // 创建并显示简单的提示信息
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 淡入效果
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 3秒后淡出
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 显示语音识别提示
function showVoiceRecognitionHint(text = '') {
    // 移除现有提示（如果有）
    removeVoiceRecognitionHint();
    
    // 创建语音提示元素
    const hintElement = document.createElement('div');
    hintElement.id = 'voice-recognition-hint';
    hintElement.className = 'voice-recognition-hint';
    
    if (text) {
        hintElement.innerHTML = `<p>"${text}"</p>`;
    } else {
        hintElement.innerHTML = `
            <p>请开始说话...</p>
            <div class="voice-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    }
    
    // 添加到UI
    const aiChatFullscreen = document.getElementById('ai-chat-fullscreen');
    if (aiChatFullscreen) {
        aiChatFullscreen.appendChild(hintElement);
    }
}

// 更新语音识别提示
function updateVoiceRecognitionHint(text) {
    const hintElement = document.getElementById('voice-recognition-hint');
    if (hintElement && text) {
        hintElement.innerHTML = `<p>"${text}"</p>`;
    }
}

// 移除语音识别提示
function removeVoiceRecognitionHint() {
    const hintElement = document.getElementById('voice-recognition-hint');
    if (hintElement) {
        hintElement.remove();
    }
}

// 格式化消息（支持Markdown格式）
function formatMessage(message) {
    // 如果消息是undefined或null则返回空字符串
    if (!message) return '';
    console.log("格式化消息:", message); // 调试日志
    // 处理<think>和</think>标签，将其转换为Markdown引用格式，而不是注释格式
    message = message.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
        // 按行分割内容，每行添加>前缀
        const lines = content.split('\n');
        return lines.map(line => `> ${line}`).join('\n');
    });

    // 初始化Marked.js的选项，配置代码高亮
    if (typeof marked !== 'undefined' && !window.markedInitialized) {
        marked.setOptions({
            renderer: new marked.Renderer(),
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (e) {
                        console.error('Highlight.js错误:', e);
                    }
                }
                return code;
            },
            breaks: true,           // 启用换行
            gfm: true,              // 启用GitHub风格Markdown
            headerIds: true,        // 为标题添加ID
            mangle: false,          // 不转义HTML标签中的内容
            sanitize: false,        // 允许HTML标签
            smartLists: true,       // 使用更智能的列表行为
            smartypants: true,      // 使用更智能的标点符号
            xhtml: false            // 不使用XHTML自闭合标签
        });
        window.markedInitialized = true;
    }

    // 根据上下文判断是否为主页面自动显示的建议
    const isInHomepage = !document.getElementById('ai-chat-fullscreen').style.display || document.getElementById('ai-chat-fullscreen').style.display === 'none';

    // 处理主页面智能驾驶建议特殊格式
    if (isInHomepage && message.includes("推理分析") && message.includes("安全建议")) {
        // 提取推理分析
        let reasoningAnalysis = '';
        let safetySuggestion = '';
        
        // 提取推理分析
        const analysisMatch = message.match(/推理分析([\s\S]*?)(?=安全建议|$)/);
        if (analysisMatch && analysisMatch[1]) {
            reasoningAnalysis = analysisMatch[1].trim();
        }
        
        // 提取安全建议
        const suggestionMatch = message.match(/安全建议([\s\S]*?)$/);
        if (suggestionMatch && suggestionMatch[1]) {
            safetySuggestion = suggestionMatch[1].trim();
        }
        
        // 使用Markdown渲染内容
        const renderedAnalysis = typeof marked !== 'undefined' ? 
            marked.parse(reasoningAnalysis) : 
            reasoningAnalysis.replace(/\n/g, '<br>');
            
        const renderedSuggestion = typeof marked !== 'undefined' ? 
            marked.parse(safetySuggestion) : 
            safetySuggestion.replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<span class="highlight-suggestion">$1</span>');
        
        // 返回卡片式布局的HTML
        return `
            <div class="driving-suggestion-container">
                <div class="driving-suggestion-header">
                    <i class="fas fa-car-alt"></i>
                    <span>智能驾驶建议</span>
                </div>
                <div class="driving-suggestion-content">
                    ${reasoningAnalysis ? `
                        <div class="suggestion-card reasoning-card">
                            <div class="card-title">
                                <i class="fas fa-brain"></i>
                                <h4>推理分析</h4>
                            </div>
                            <div class="card-body markdown-content">
                                ${renderedAnalysis}
                            </div>
                        </div>` : ''
                    }
                    ${safetySuggestion ? `
                        <div class="suggestion-card answer-card">
                            <div class="card-title">
                                <i class="fas fa-shield-alt"></i>
                                <h4>安全建议</h4>
                            </div>
                            <div class="card-body markdown-content">
                                ${renderedSuggestion}
                            </div>
                        </div>` : ''
                    }
                </div>
            </div>
        `;
    } 
    // 处理聊天界面中的推理分析和安全建议（简化处理）
    else if (!isInHomepage && message.includes("推理分析") && message.includes("安全建议")) {
        // 提取推理分析
        let reasoningAnalysis = '';
        let safetySuggestion = '';
        
        // 提取推理分析
        const analysisMatch = message.match(/推理分析([\s\S]*?)(?=安全建议|$)/);
        if (analysisMatch && analysisMatch[1]) {
            reasoningAnalysis = analysisMatch[1].trim();
        }
        
        // 提取安全建议
        const suggestionMatch = message.match(/安全建议([\s\S]*?)$/);
        if (suggestionMatch && suggestionMatch[1]) {
            safetySuggestion = suggestionMatch[1].trim();
        }
        
        // 使用Markdown渲染内容
        const renderedAnalysis = typeof marked !== 'undefined' ? 
            marked.parse(reasoningAnalysis) : 
            reasoningAnalysis.replace(/\n/g, '<br>');
            
        const renderedSuggestion = typeof marked !== 'undefined' ? 
            marked.parse(safetySuggestion) : 
            safetySuggestion.replace(/\n/g, '<br>').replace(/\[(.*?)\]/g, '<strong>$1</strong>');
        
        // 简化版格式 - 只剔除多余符号，保持简洁
        return `
            <div class="simple-suggestion">
                <p><strong>推理分析：</strong></p>
                <div class="markdown-content">${renderedAnalysis}</div>
                <p><strong>安全建议：</strong></p>
                <div class="markdown-content">${renderedSuggestion}</div>
            </div>
        `;
    }
    
    // 处理普通消息 - 使用Markdown解析
    if (typeof marked !== 'undefined') {
        const renderedMarkdown = marked.parse(message);
        return `<div class="markdown-content">${renderedMarkdown}</div>`;
    } else {
        // 如果marked库未加载，使用简单的换行替代
        return message.replace(/\n/g, '<br>');
    }
}

// 更新麦克风动画 - 基于音频电平
function updateMicrophoneAnimation(level) {
    // 获取语音按钮和语音提示元素
    const voiceInputButton = document.getElementById('voice-input-button');
    const voiceHint = document.getElementById('voice-recognition-hint');
    
    if (!voiceInputButton || !voiceHint) return;
    
    // 将音频电平转换为0-100的范围，便于动画展示
    // 一般音频电平范围在0.001-0.5之间，所以乘以200得到更好的可视范围
    const normalizedLevel = Math.min(100, Math.max(0, level * 200));
    
    // 根据归一化的音频电平设置按钮缩放效果
    if (normalizedLevel > 5) { // 有效的声音输入
        // 在1.0到1.2之间动态缩放，级别越高缩放越大
        const scale = 1.0 + (normalizedLevel / 100 * 0.2);
        voiceInputButton.style.transform = `scale(${scale})`;
        
        // 为按钮添加脉冲效果
        voiceInputButton.classList.add('pulse');
        
        // 调整波形动画高度
        const waveSpans = voiceHint.querySelectorAll('.voice-wave span');
        if (waveSpans && waveSpans.length > 0) {
            waveSpans.forEach((span, index) => {
                // 不同的span设置不同的高度，制造波浪效果
                // 基本高度10px，最高可达50px，取决于音频电平
                const baseHeight = 10;
                const maxAdditionalHeight = 40;
                const heightOffset = index % 2 === 0 ? 5 : 0; // 偶数索引高度偏移
                
                // 计算此span的高度，每个span高度稍有不同以制造波浪效果
                const spanHeight = baseHeight + (normalizedLevel / 100 * maxAdditionalHeight) + heightOffset;
                
                span.style.height = `${spanHeight}px`;
            });
        }
    } else {
        // 静音状态，恢复原始大小
        voiceInputButton.style.transform = 'scale(1.0)';
        voiceInputButton.classList.remove('pulse');
        
        // 重置波形动画
        const waveSpans = voiceHint.querySelectorAll('.voice-wave span');
        if (waveSpans && waveSpans.length > 0) {
            waveSpans.forEach(span => {
                span.style.height = '10px'; // 默认高度
            });
        }
    }
}
