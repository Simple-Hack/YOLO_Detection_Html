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
        
        // 初始化语音合成功能
        // initSpeechSynthesis();
        
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
        console.log("加载对话历史:", savedHistory);
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            
            // 重新生成对话界面
            const aiChatMessages = document.getElementById('ai-chat-messages');
            if (aiChatMessages) {
                aiChatMessages.innerHTML = '';
                
                // 遍历历史记录并添加消息
                chatHistory.forEach(item => {
                    if (item.role === 'user') {
                        addUserMessage(item.content, false);
                    } else if (item.role === 'assistant') {
                        // 检查消息是否含有思考内容
                        const content = item.content;
                        
                        // 1. 检查原始保存的消息是否有<think>标签
                        if (content.includes('<think>')) {
                            addAiMessage(content, false); // 使用原始格式，包含<think>标签
                        } 
                        // 2. 检查是否已经有>前缀的引用格式
                        else if (content.match(/^>\s/m)) {
                            // 提取思考内容和正文内容
                            const lines = content.split('\n');
                            let thinkingLines = [];
                            let normalLines = [];
                            
                            for (let i = 0; i < lines.length; i++) {
                                if (lines[i].startsWith('> ')) {
                                    thinkingLines.push(lines[i]);
                                } else {
                                    normalLines.push(lines[i]);
                                }
                            }
                            
                            // 如果有思考内容，重新构造为<think>格式
                            if (thinkingLines.length > 0) {
                                const thinkingContent = thinkingLines.join('\n').replace(/^> /gm, '');
                                const normalContent = normalLines.join('\n');
                                
                                // 重新生成带<think>标签的内容
                                const reconstructedContent = `<think>${thinkingContent}</think>${normalContent}`;
                                addAiMessage(reconstructedContent, false);
                            } else {
                                addAiMessage(content, false);
                            }
                        } 
                        // 3. 如果消息标记为含有思考内容但现在没有标签（兼容旧数据）
                        else if (item.hasThinkingContent === true) {
                            addAiMessage(content, false);
                        }
                        // 4. 普通消息
                        else {
                            addAiMessage(content, false);
                        }
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
    
    // 加载完成后，滚动到最新消息
    setTimeout(scrollToLatestMessage, 100);
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
    
    // 检查消息是否包含思考内容（<think>标签或已格式化的>引用）
    const hasThinkingContent = message.includes('<think>') || message.match(/^>\s/m);
    
    // 提取思考时间（如果有）
    let thinkingTimeText = '已完成';
    
    // 查找当前消息对应的历史记录，获取思考时间
    if (hasThinkingContent && chatHistory && chatHistory.length > 0) {
        // 尝试在历史记录中查找最近的包含思考时间的AI消息
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            const item = chatHistory[i];
            if (item.role === 'assistant' && item.thinkingTime !== undefined && item.thinkingTime !== null) {
                thinkingTimeText = `用时 ${item.thinkingTime.toFixed(2)}秒`;
                break;
            }
        }
    }
    
    let formattedMessage = message;
    
    // 处理消息内容
    if (hasThinkingContent) {
        // 如果包含<think>标签，创建可折叠的思考UI结构
        if (message.includes('<think>')) {
            let thinkingContent = '';
            let normalContent = '';
            
            // 提取<think>...</think>部分
            formattedMessage = message.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
                thinkingContent = content;
                return ''; // 从原始消息中移除思考部分
            });
            normalContent = formattedMessage.trim(); // 去除可能的前导空白
            
            // 创建包含可折叠思考部分的HTML结构
            messageDiv.innerHTML = `
                <div class="ai-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;min-height:40px;max-height:40px;flex-shrink:0;overflow:hidden;border-radius:50%;">
                    ${aiAvatar ? `<img src="${aiAvatar}" alt="AI头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-robot"></i>'}
                </div>
                <div class="ai-message-content">
                    <div class="ai-thinking-block">
                        <div class="ai-thinking-header">
                            <div class="ai-thinking-indicator">
                                <span>思考结束</span>
                            </div>
                            <i class="fas fa-chevron-down thinking-toggle-icon"></i>
                            <div class="ai-thinking-time">${thinkingTimeText}</div>
                        </div>
                        <div class="ai-thinking-content">
                            ${formatMessage(thinkingContent.split('\n').map(line => `> ${line}`).join('\n'))}
                        </div>
                    </div>
                    ${normalContent ? `<p>${formatMessage(normalContent)}</p>` : ''}
                </div>
            `;
            
            // 添加点击事件用于折叠/展开
            setTimeout(() => {
                const thinkingHeader = messageDiv.querySelector('.ai-thinking-header');
                if (thinkingHeader) {
                    thinkingHeader.addEventListener('click', function() {
                        const thinkingContent = this.nextElementSibling;
                        if (thinkingContent) {
                            thinkingContent.classList.toggle('collapsed');
                            const toggleIcon = this.querySelector('.thinking-toggle-icon');
                            if (toggleIcon) toggleIcon.classList.toggle('collapsed');
                        }
                    });
                }
            }, 0);
        } 
        // 如果是已转换为Markdown引用格式的内容（已有>前缀）
        else if (message.match(/^>\s/m)) {
            // 分离思考部分和普通内容
            const lines = message.split('\n');
            let thinkingLines = [];
            let normalLines = [];
            
            // 识别连续的引用行作为思考内容
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('> ')) {
                    thinkingLines.push(lines[i]);
                } else {
                    normalLines.push(lines[i]);
                }
            }
            
            const thinkingContent = thinkingLines.join('\n');
            const normalContent = normalLines.join('\n').trim(); // 去除可能的前导空白
            
            // 确保思考内容非空，才创建思考区块
            if (thinkingContent.trim()) {
                // 创建包含可折叠思考部分的HTML结构
                messageDiv.innerHTML = `
                    <div class="ai-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;min-height:40px;max-height:40px;flex-shrink:0;overflow:hidden;border-radius:50%;">
                        ${aiAvatar ? `<img src="${aiAvatar}" alt="AI头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-robot"></i>'}
                    </div>
                    <div class="ai-message-content">
                        <div class="ai-thinking-block">
                            <div class="ai-thinking-header">
                                <div class="ai-thinking-indicator">
                                    <span>思考结束</span>
                                </div>
                                <i class="fas fa-chevron-down thinking-toggle-icon"></i>
                                <div class="ai-thinking-time">${thinkingTimeText}</div>
                            </div>
                            <div class="ai-thinking-content">
                                ${formatMessage(thinkingContent)}
                            </div>
                        </div>
                        ${normalContent ? `<p>${formatMessage(normalContent)}</p>` : ''}
                    </div>
                `;
                
                // 添加点击事件用于折叠/展开
                setTimeout(() => {
                    const thinkingHeader = messageDiv.querySelector('.ai-thinking-header');
                    if (thinkingHeader) {
                        thinkingHeader.addEventListener('click', function() {
                            const thinkingContent = this.nextElementSibling;
                            if (thinkingContent) {
                                thinkingContent.classList.toggle('collapsed');
                                const toggleIcon = this.querySelector('.thinking-toggle-icon');
                                if (toggleIcon) toggleIcon.classList.toggle('collapsed');
                            }
                        });
                    }
                }, 0);
            } else {
                // 如果没有有效的思考内容，直接显示正常内容
                messageDiv.innerHTML = `
                    <div class="ai-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;min-height:40px;max-height:40px;flex-shrink:0;overflow:hidden;border-radius:50%;">
                        ${aiAvatar ? `<img src="${aiAvatar}" alt="AI头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-robot"></i>'}
                    </div>
                    <div class="ai-message-content">
                        <p>${formatMessage(message)}</p>
                    </div>
                `;
            }
        }
    } else {
        // 常规消息，无思考部分
        messageDiv.innerHTML = `
            <div class="ai-avatar" style="width:40px;height:40px;min-width:40px;max-width:40px;min-height:40px;max-height:40px;flex-shrink:0;overflow:hidden;border-radius:50%;">
                ${aiAvatar ? `<img src="${aiAvatar}" alt="AI头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-robot"></i>'}
            </div>
            <div class="ai-message-content">
                <p>${formatMessage(message)}</p>
            </div>
        `;
    }
    
    // 加入到聊天区域之前先检查是否有重复的思考卡片
    const existingThinkingElements = messageDiv.querySelectorAll('.ai-thinking-block');
    if (existingThinkingElements.length > 1) {
        // 保留第一个思考卡片，移除其他重复的
        for (let i = 1; i < existingThinkingElements.length; i++) {
            existingThinkingElements[i].remove();
        }
    }
    
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
            ${aiAvatar ? `<img src="${aiAvatar}" alt="AI头像" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : '<i class="fas fa-robot"></i>'}
        </div>
        <div class="ai-message-content">
            <div class="ai-waiting">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
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
        
    // 构建消息历史，包含当前用户消息和历史对话
    const messages = [];
    
    // 添加历史对话到消息列表
    if (chatHistory && chatHistory.length > 0) {
        // 遍历历史记录，最多取最近的10条对话（5轮问答）
        // 限制对话历史长度，避免请求过大
        const maxHistoryLength = 10;
        const startIndex = Math.max(0, chatHistory.length - maxHistoryLength);
        
        for (let i = startIndex; i < chatHistory.length; i++) {
            const item = chatHistory[i];
            messages.push({
                role: item.role,
                content: item.content
            });
        }
    }
    
    // 添加当前用户消息到消息列表
    messages.push({
        role: "user",
        content: message
    });
    // 构建请求数据 - 恢复使用question参数格式
    const requestData = {
        question: message
    };
    
    // 记录请求数据收到数据块
    console.log("发送请求数据:", message);
    
    // 创建一个变量来存储完整响应
    let fullResponse = '';
    let normalContent = ''; // 新增：单独存储正文内容
    
    // 处理思考标签的变量
    let inThinkMode = false;  // 标记是否在<think>和</think>之间
    let thinkingStartTime = null; // 记录思考开始时间
    let thinkingContent = ''; // 记录思考内容
    let thinkingHeader = null; // 思考标题元素
    let thinkingContentElement = null; // 思考内容元素
    let aiMessageElement = null; // AI消息元素
    
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
        const aiMessageContainer = document.querySelector('.ai-message:last-child');
        aiMessageElement = aiMessageContainer.querySelector('.ai-message-content p');
        
        // 获取读取流的reader
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // 处理流式数据
        function processStreamChunk({ done, value }) {
            // 如果流结束，中止处理
            if (done) {
                console.log("流式响应接收完成");
                
                // 如果还在思考模式，结束思考
                if (inThinkMode) {
                    endThinking();
                }
                
                // 保存完整对话到历史
                updateChatHistory(message, fullResponse);
                return;
            }
            
            // 解码当前块
            const chunk = decoder.decode(value, { stream: true });
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
                            
                            // 判断currentText是否包含<think>或</think>并输出到console
                            if (currentText==='<think>' || currentText==='</think>') {
                                console.log(`Detected special tag in text: ${currentText}`);
                            }
                            
                            // 直接处理当前文本块 - 在实时聊天时设置is_real_time=true
                            processTextDirectly(currentText, true);
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
        function processTextDirectly(text, is_real_time = true) {
            // 检查<think>标签
            if (text === '<think>') {
                // 标记思考模式
                inThinkMode = true;
                thinkingStartTime = new Date();
                thinkingContent = '';
                
                // 在创建新的思考区块前，先检查是否已存在
                const existingThinkingBlock = document.querySelector('.ai-message:last-child .ai-thinking-block');
                if (existingThinkingBlock) {
                    console.log("已存在思考区块，不再创建新的区块");
                    // 复用现有元素
                    thinkingHeader = existingThinkingBlock.querySelector('.ai-thinking-header');
                    thinkingContentElement = existingThinkingBlock.querySelector('.ai-thinking-content');
                    
                    // 更新标题内容
                    if (thinkingHeader) {
                        thinkingHeader.innerHTML = `
                            <div class="ai-thinking-indicator">
                                <span>思考中</span>
                                <div class="ai-thinking-spinner"></div>
                            </div>
                            <i class="fas fa-chevron-down thinking-toggle-icon"></i>
                            <div class="ai-thinking-time">0.00秒</div>
                        `;
                    }
                    
                    // 清空思考内容
                    if (thinkingContentElement) {
                        thinkingContentElement.innerHTML = '';
                    }
                    
                    // 启动思考时间更新
                    startThinkingTimer();
                } else {
                    // 如果不存在，则创建新的思考区块
                    startThinking();
                }
                
                // 保留标签本身到fullResponse，用于历史记录
                fullResponse += '<think>';
                return;
            }
            
            // 检查</think>标签
            if (text === '</think>') {
                endThinking();
                // 保留标签本身到fullResponse，用于历史记录
                fullResponse += '</think>';

                // 重要修复：清空aiMessageElement的内容，确保思考内容不会显示在正文中
                if (aiMessageElement) {
                    aiMessageElement.innerHTML = '';
                }
                return;
            }
            
            // 处理思考模式中的文本
            if (inThinkMode) {
                // 添加到思考内容
                appendThinkingContent(text);
                // 同时添加到完整响应，不做转换，保持原始格式
                fullResponse += text;
                
                // 重要修复：思考模式下不向正文添加内容
                // 之前这里没有阻止思考内容添加到正文，导致重复显示
            } else {
                // 常规文本，直接添加
                fullResponse += text;
                
                // 创建一个副本用于显示，过滤掉思考部分
                // 注意：这里只在当前实时显示时过滤，不修改保存到历史记录的fullResponse内容
                let displayContent = fullResponse;
                normalContent += text; // 新增：正文内容单独累加
                // 仅当是实时聊天时才过滤思考内容，加载历史记录时不过滤
                if (is_real_time) {
                    displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>/g, '');
                }
                
                updateAiMessageContent(normalContent);
            }
        }
        
        // 开始思考模式
        function startThinking() {
            inThinkMode = true;
            thinkingStartTime = new Date();
            thinkingContent = '';
            
            // 创建思考容器 - 确保只创建一次
            if (!thinkingHeader) {
                const thinkingBlock = document.createElement('div');
                thinkingBlock.className = 'ai-thinking-block';
                
                // 创建思考标题
                thinkingHeader = document.createElement('div');
                thinkingHeader.className = 'ai-thinking-header';
                thinkingHeader.innerHTML = `
                    <div class="ai-thinking-indicator">
                        <span>思考中</span>
                        <div class="ai-thinking-spinner"></div>
                    </div>
                    <i class="fas fa-chevron-down thinking-toggle-icon"></i>
                    <div class="ai-thinking-time">0.00秒</div>
                `;
                
                // 创建思考内容
                thinkingContentElement = document.createElement('div');
                thinkingContentElement.className = 'ai-thinking-content';
                
                // 添加到AI消息中
                thinkingBlock.appendChild(thinkingHeader);
                thinkingBlock.appendChild(thinkingContentElement);
                
                // 只有当父元素存在时才添加
                if (aiMessageElement && aiMessageElement.parentNode) {
                    // 检查是否已存在思考区块，如果有则先移除
                    const existingThinkingBlock = aiMessageElement.parentNode.querySelector('.ai-thinking-block');
                    if (existingThinkingBlock) {
                        existingThinkingBlock.remove();
                    }
                    
                    aiMessageElement.parentNode.insertBefore(thinkingBlock, aiMessageElement);
                }
                
                // 添加点击事件用于折叠/展开
                thinkingHeader.addEventListener('click', toggleThinking);
                
                // 启动思考时间更新
                startThinkingTimer();
            }
        }
        
        // 添加思考内容
        function appendThinkingContent(text) {
            thinkingContent += text;
            
            // 更新思考内容显示
            if (thinkingContentElement) {
                // 先将文本转换为Markdown格式(主要是保留换行)
                const formattedContent = thinkingContent
                    .split('\n')
                    .map(line => line ? `> ${line}` : '>')
                    .join('\n');
                
                thinkingContentElement.innerHTML = formatMessage(formattedContent);
                scrollToLatestMessage();
            }
        }
        
        // 结束思考模式
        function endThinking() {
            inThinkMode = false;
            
            if (thinkingHeader) {
                // 停止思考时间计时器
                stopThinkingTimer();
                
                // 计算思考时间
                const thinkingEndTime = new Date();
                const thinkingDuration = (thinkingEndTime - thinkingStartTime) / 1000;
                
                // 更新思考标题
                const thinkingTimeDisplay = thinkingHeader.querySelector('.ai-thinking-time');
                if (thinkingTimeDisplay) {
                    thinkingTimeDisplay.textContent = `用时 ${thinkingDuration.toFixed(2)}秒`;
                }
                
                // 更新样式，移除spinner
                const thinkingIndicator = thinkingHeader.querySelector('.ai-thinking-indicator');
                if (thinkingIndicator) {
                    thinkingIndicator.innerHTML = '<span>思考结束</span>';
                }
            }
        }
        
        // 切换思考内容的显示/隐藏
        function toggleThinking() {
            if (thinkingContentElement) {
                thinkingContentElement.classList.toggle('collapsed');
                
                // 更新箭头方向
                const toggleIcon = thinkingHeader.querySelector('.thinking-toggle-icon');
                if (toggleIcon) {
                    toggleIcon.classList.toggle('collapsed');
                }
            }
        }
        
        // 启动思考时间更新计时器
        function startThinkingTimer() {
            const timeDisplay = thinkingHeader.querySelector('.ai-thinking-time');
            const updateTimer = setInterval(() => {
                if (!inThinkMode) {
                    clearInterval(updateTimer);
                    return;
                }
                
                const currentTime = new Date();
                const elapsedSeconds = (currentTime - thinkingStartTime) / 1000;
                timeDisplay.textContent = `${elapsedSeconds.toFixed(2)}秒`;
            }, 50); // 每50毫秒更新一次，使计时更流畅
        }
        
        // 停止思考时间计时器
        function stopThinkingTimer() {
            // 计时器在startThinkingTimer内部创建和清除，这里不需要额外操作
        }
        
        // 更新AI消息内容
        function updateAiMessageContent(content) {
            if (aiMessageElement) {
                // 先删除现有的可能是临时的内容
                while (aiMessageElement.firstChild) {
                    aiMessageElement.removeChild(aiMessageElement.firstChild);
                }
                // 检查是否已经存在formatMessage格式化的内容
                if (content.includes('<div class="markdown-content">')) {
                    // 如果已经是HTML内容，直接设置
                    aiMessageElement.innerHTML = content;
                } else {
                    // 否则先格式化再设置
                    aiMessageElement.innerHTML = formatMessage(content);
                }
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
    // 记录当前时间，用于计算保存时间
    const saveTime = new Date().toISOString();
    
    // 提取思考时间（如果有的话）
    let thinkingTime = null;
    if (aiResponse.includes('<think>') && aiResponse.includes('</think>')) {
        const thinkingHeader = document.querySelector('.ai-thinking-header');
        if (thinkingHeader) {
            const timeDisplay = thinkingHeader.querySelector('.ai-thinking-time');
            if (timeDisplay) {
                const timeText = timeDisplay.textContent;
                // 提取数字部分（如"用时 3.45秒"中的3.45）
                const timeMatch = timeText.match(/(\d+\.\d+)/);
                if (timeMatch && timeMatch[1]) {
                    thinkingTime = parseFloat(timeMatch[1]);
                }
            }
        }
    }
    
    // 添加用户消息到历史
    chatHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: saveTime
    });
    
    // 保存AI响应，包含原始格式（带<think>标签）和思考时间
    chatHistory.push({
        role: 'assistant',
        content: aiResponse,
        hasThinkingContent: aiResponse.includes('<think>'),
        thinkingTime: thinkingTime,
        timestamp: saveTime
    });
    
    // 保存对话历史到本地存储
    saveHistoryToLocalStorage();
    
    // 调试输出
    console.log("保存历史记录: ", {
        userMessage: userMessage.length + " 字符",
        aiResponse: aiResponse.length + " 字符",
        hasThinking: aiResponse.includes('<think>'),
        thinkingTime: thinkingTime
    });
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

// 创建思考区块UI元素
function createThinkingBlock(thinkingContent) {
    const thinkingBlock = document.createElement('div');
    thinkingBlock.className = 'ai-thinking-block';
    
    // 创建思考标题
    const thinkingHeader = document.createElement('div');
    thinkingHeader.className = 'ai-thinking-header';
    thinkingHeader.innerHTML = `
        <div class="ai-thinking-indicator">
            <span>思考结束</span>
        </div>
        <i class="fas fa-chevron-down thinking-toggle-icon"></i>
        <div class="ai-thinking-time">已完成</div>
    `;
    
    // 创建思考内容容器
    const thinkingContentElement = document.createElement('div');
    thinkingContentElement.className = 'ai-thinking-content';
    
    // 格式化思考内容 - 确保每行前面有 > 前缀
    const formattedContent = thinkingContent
        .split('\n')
        .map(line => line.trim() ? `> ${line}` : '>')
        .join('\n');
    
    thinkingContentElement.innerHTML = formatMessage(formattedContent);
    
    // 添加到思考区块
    thinkingBlock.appendChild(thinkingHeader);
    thinkingBlock.appendChild(thinkingContentElement);
    
    // 添加点击事件用于折叠/展开
    thinkingHeader.addEventListener('click', function() {
        thinkingContentElement.classList.toggle('collapsed');
        const toggleIcon = this.querySelector('.thinking-toggle-icon');
        if (toggleIcon) {
            toggleIcon.classList.toggle('collapsed');
        }
    });
    
    return thinkingBlock;
}

/**
 * 初始化语音合成功能
 */
function initSpeechSynthesis() {
    // 检查浏览器是否支持语音合成API
    if (!('speechSynthesis' in window)) {
        console.warn("当前浏览器不支持语音合成API");
        return false;
    }
    
    // 预加载默认中文语音
    loadChineseVoice();
    
    console.log("语音合成功能初始化完成");
    return true;
}

/**
 * 预加载中文语音
 */
function loadChineseVoice() {
    // 延迟执行以确保语音合成API已完全加载
    setTimeout(() => {
        if (!window.speechSynthesis) return;
        
        // 获取所有可用的语音
        const voices = window.speechSynthesis.getVoices();
        
        // 寻找中文语音
        window.chineseVoice = voices.find(voice => 
            voice.lang.includes('zh') || 
            voice.name.includes('Chinese') || 
            voice.name.includes('普通话') || 
            voice.name.includes('国语')
        );
        
        if (window.chineseVoice) {
            console.log(`已加载中文语音: ${window.chineseVoice.name}`);
        } else {
            console.log("未找到中文语音，将使用系统默认语音");
        }
    }, 100);
    
    // 针对某些浏览器需要在voiceschanged事件中获取
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadChineseVoice;
    }
}

/**
 * 文本转语音合成并播放
 * @param {string} text 要播放的文本
 * @param {Object} options 播放选项
 * @param {boolean} options.immediate 是否立即播放(中断当前播放)
 * @param {number} options.rate 语速 (0.1-10)
 * @param {number} options.pitch 音调 (0-2)
 * @param {number} options.volume 音量 (0-1)
 * @returns {SpeechSynthesisUtterance} 语音合成对象
 */
function synthesizeSpeech(text, options = {}) {
    if (!('speechSynthesis' in window)) {
        console.warn("当前浏览器不支持语音合成API");
        return null;
    }
    
    // 设置默认选项
    const defaultOptions = {
        immediate: false, // 是否立即播放(中断当前播放)
        rate: 1.0,        // 语速 (0.1-10)
        pitch: 1.0,       // 音调 (0-2)
        volume: 1.0       // 音量 (0-1)
    };
    
    // 合并选项
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 如果需要立即播放，停止当前所有语音
    if (mergedOptions.immediate) {
        window.speechSynthesis.cancel();
    }
    
    // 创建语音合成对象
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音参数
    utterance.rate = mergedOptions.rate;    // 语速
    utterance.pitch = mergedOptions.pitch;  // 音调
    utterance.volume = mergedOptions.volume; // 音量
    
    // 设置语音为中文(如果已加载)
    if (window.chineseVoice) {
        utterance.voice = window.chineseVoice;
        utterance.lang = window.chineseVoice.lang; // 设置语言
    } else {
        utterance.lang = 'zh-CN'; // 默认设置为中文
    }
    
    // 添加事件监听
    utterance.onstart = () => {
        console.log(`开始播放语音: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
    };
    
    utterance.onend = () => {
        console.log("语音播放完成");
    };
    
    utterance.onerror = (event) => {
        console.error("语音播放出错:", event.error);
    };
    
    // 播放语音
    window.speechSynthesis.speak(utterance);
    
    return utterance;
}

// 使语音合成功能全局可用
window.synthesizeSpeech = synthesizeSpeech;
