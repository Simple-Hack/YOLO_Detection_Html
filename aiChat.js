/**
 * AI 聊天模块 - 处理 AI 对话界面和逻辑
 */

// AI对话相关变量
let chatHistory = [];
let isVoiceRecording = false;
let speechRecognizer = null; // 讯飞语音识别控制器
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
        
        // 初始化讯飞语音识别器
        initSpeechRecognizer();
        
        console.log("AI聊天功能初始化成功");
    } catch (error) {
        console.error("AI聊天功能初始化失败:", error);
    }
}

// // 初始化讯飞语音识别器
// function initSpeechRecognizer() {
//     // 检查相关依赖是否已加载
//     if (typeof CryptoJS === 'undefined') {
//         console.error('CryptoJS库未加载，语音识别功能将无法使用');
//         showToast('语音识别依赖库未加载，请检查网络连接');
//         return;
//     }
    
//     // 检查XFSpeechRecognizer是否已正确加载
//     if (typeof XFSpeechRecognizer === 'undefined') {
//         console.error('讯飞语音识别模块未加载，请检查speechRecognition.js文件');
//         showToast('语音识别模块未加载，请刷新页面重试');
//         return;
//     }
    
//     try {
//         // 创建讯飞语音识别器实例
//         createSpeechRecognizer();
        
//         // 主动请求麦克风权限
//         console.log('主动请求麦克风权限...');
//         navigator.mediaDevices.getUserMedia({ audio: true })
//             .then(function(stream) {
//                 // 成功获取权限后销毁临时流
//                 stream.getTracks().forEach(track => track.stop());
//                 console.log('已获取麦克风权限，可以使用语音识别');
                
//                 // 显示权限已获取的视觉提示
//                 const voiceInputButton = document.getElementById('voice-input-button');
//                 if (voiceInputButton) {
//                     voiceInputButton.classList.add('mic-ready');
//                     // 添加一个小动画表示麦克风已准备就绪
//                     voiceInputButton.classList.add('pulse');
//                     setTimeout(() => voiceInputButton.classList.remove('pulse'), 1500);
//                 }
//             })
//             .catch(function(err) {
//                 console.error('获取麦克风权限失败:', err);
//                 showToast('无法获取麦克风权限，语音识别功能不可用');
                
//                 // 显示权限被拒绝的视觉提示
//                 const voiceInputButton = document.getElementById('voice-input-button');
//                 if (voiceInputButton) {
//                     voiceInputButton.classList.add('mic-error');
//                     voiceInputButton.title = '麦克风权限被拒绝，请检查浏览器设置';
//                 }
//             });
//     } catch (error) {
//         console.error('初始化语音识别器失败:', error);
//         showToast('初始化语音识别失败，请刷新页面重试');
//     }
// }

// // 创建语音识别器实例
// function createSpeechRecognizer() {
//     try {
//         // 创建讯飞语音识别器实例
//         speechRecognizer = new XFSpeechRecognizer({
//             onStart: function() {
//                 console.log('语音识别开始...');
                
//                 // 显示语音输入正在进行的状态
//                 updateVoiceInputStatus(true);
                
//                 // 添加语音识别提示
//                 showVoiceRecognitionHint();
                
//                 // 设置超时自动停止（如果60秒无结果则停止）
//                 if (voiceRecognitionTimeout) {
//                     clearTimeout(voiceRecognitionTimeout);
//                 }
//                 voiceRecognitionTimeout = setTimeout(() => {
//                     console.log('语音识别超时，自动停止');
//                     stopVoiceRecognition();
//                     showToast('未检测到语音输入，已自动停止');
//                 }, 60000);
//             },
//             onResult: function(result) {
//                 // 每次有结果时重置超时
//                 if (voiceRecognitionTimeout) {
//                     clearTimeout(voiceRecognitionTimeout);
//                 }
                
//                 // 如果空闲超过15秒，则设置自动停止
//                 voiceRecognitionTimeout = setTimeout(() => {
//                     console.log('语音输入空闲超时，自动停止');
//                     stopVoiceRecognition();
//                 }, 15000);
                
//                 // 更新输入框文本
//                 const userInput = document.getElementById('user-input');
//                 if (userInput) {
//                     userInput.value = result;
//                     // 触发输入事件以调整文本框高度
//                     userInput.dispatchEvent(new Event('input'));
//                 }
                
//                 // 更新语音提示
//                 updateVoiceRecognitionHint(result);
//             },
//             // 添加临时结果回调，确保实时显示
//             onInterimResult: function(interim) {
//                 console.log('语音识别实时结果:', interim);
                
//                 // 实时更新输入框文本
//                 const userInput = document.getElementById('user-input');
//                 if (userInput) {
//                     userInput.value = interim;
//                     // 触发输入事件以调整文本框高度
//                     userInput.dispatchEvent(new Event('input'));
//                 }
                
//                 // 更新语音提示
//                 updateVoiceRecognitionHint(interim);
//             },
//             // 添加音频电平回调
//             onAudioLevel: function(level) {
//                 // 音频电平可以用于用户界面展示麦克风音量
//                 updateMicrophoneAnimation(level);
//             },
//             onError: function(error) {
//                 console.error('语音识别错误:', error);
//                 showToast('语音识别出错: ' + error);
//                 // 停止语音录制状态
//                 updateVoiceInputStatus(false);
//                 // 移除语音提示
//                 removeVoiceRecognitionHint();
//                 // 清除超时
//                 if (voiceRecognitionTimeout) {
//                     clearTimeout(voiceRecognitionTimeout);
//                     voiceRecognitionTimeout = null;
//                 }
//             },
//             onClose: function() {
//                 console.log('语音识别结束');
//                 // 停止语音录制状态
//                 updateVoiceInputStatus(false);
//                 // 移除语音提示
//                 removeVoiceRecognitionHint();
//                 // 清除超时
//                 if (voiceRecognitionTimeout) {
//                     clearTimeout(voiceRecognitionTimeout);
//                     voiceRecognitionTimeout = null;
//                 }
//             },
//             // 音频增强配置
//             realTimeOutput: true, // 启用实时输出，即使是中间结果也立即显示
//             saveAudio: false, // 禁用音频保存功能
//             gainFactor: 2.0, // 增强增益因子，提高音频音量
//             silenceThreshold: 0.005, // 更灵敏的静音检测阈值
//             audioBufferSize: 4096 // 较大的缓冲区以确保音频质量
//         });
        
//         console.log('讯飞语音识别器初始化成功');
//     } catch (error) {
//         console.error('初始化讯飞语音识别器时出错:', error);
//     }
// }
// 初始化语音识别器
function initSpeechRecognizer() {
    try {
        // 检查浏览器是否支持语音识别
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('浏览器不支持语音识别功能，请使用Chrome或Edge浏览器');
            showToast('您的浏览器不支持语音识别功能，请使用Chrome或Edge浏览器');
            
            // 显示不支持的视觉提示
            const voiceInputButton = document.getElementById('voice-input-button');
            if (voiceInputButton) {
                voiceInputButton.classList.add('mic-error');
                voiceInputButton.title = '浏览器不支持语音识别功能';
                voiceInputButton.disabled = true;
            }
            return;
        }

        // 主动请求麦克风权限
        console.log('主动请求麦克风权限...');
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                // 成功获取权限后销毁临时流
                stream.getTracks().forEach(track => track.stop());
                console.log('已获取麦克风权限，可以使用语音识别');
                
                // 显示权限已获取的视觉提示
                const voiceInputButton = document.getElementById('voice-input-button');
                if (voiceInputButton) {
                    voiceInputButton.classList.add('mic-ready');
                    // 添加一个小动画表示麦克风已准备就绪
                    voiceInputButton.classList.add('pulse');
                    setTimeout(() => voiceInputButton.classList.remove('pulse'), 1500);
                }
                
                // 创建语音识别对象
                createSpeechRecognizer();
            })
            .catch(function(err) {
                console.error('获取麦克风权限失败:', err);
                showToast('无法获取麦克风权限，语音识别功能不可用');
                
                // 显示权限被拒绝的视觉提示
                const voiceInputButton = document.getElementById('voice-input-button');
                if (voiceInputButton) {
                    voiceInputButton.classList.add('mic-error');
                    voiceInputButton.title = '麦克风权限被拒绝，请检查浏览器设置';
                }
            });
    } catch (error) {
        console.error('初始化语音识别器失败:', error);
        showToast('初始化语音识别失败，请刷新页面重试');
    }
}

// 创建语音识别器实例
function createSpeechRecognizer() {
    try {
        // 创建Web Speech API语音识别对象
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognizer = new SpeechRecognition();
        
        // 配置语音识别器
        speechRecognizer.lang = 'zh-CN';           // 设置语言为中文
        speechRecognizer.interimResults = true;    // 返回临时结果
        speechRecognizer.continuous = true;       // 不持续识别
        speechRecognizer.maxAlternatives = 1;      // 最多返回一个结果
        
        // 处理开始事件
        speechRecognizer.onstart = function() {
            console.log('语音识别开始...');
            
            // 显示语音输入正在进行的状态
            updateVoiceInputStatus(true);
            
            // 添加语音识别提示
            showVoiceRecognitionHint();
            
            // 设置超时自动停止（如果60秒无结果则停止）
            if (voiceRecognitionTimeout) {
                clearTimeout(voiceRecognitionTimeout);
            }
            voiceRecognitionTimeout = setTimeout(() => {
                console.log('语音识别超时，自动停止');
                stopVoiceRecognition();
                showToast('未检测到语音输入，已自动停止');
            }, 60000);
        };
        
        // 处理结果事件
        speechRecognizer.onresult = function(event) {
            // 每次有结果时重置超时
            if (voiceRecognitionTimeout) {
                clearTimeout(voiceRecognitionTimeout);
            }
            
            // 如果空闲超过15秒，则设置自动停止
            voiceRecognitionTimeout = setTimeout(() => {
                console.log('语音输入空闲超时，自动停止');
                stopVoiceRecognition();
            }, 15000);
            
            // 获取最新的识别结果
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;
            
            // 模拟音频电平效果
            const confidence = result[0].confidence || 0.5;
            updateMicrophoneAnimation(confidence);
            
            // 更新输入框文本
            const userInput = document.getElementById('user-input');
            if (userInput) {
                userInput.value = transcript;
                // 触发输入事件以调整文本框高度
                userInput.dispatchEvent(new Event('input'));
            }
            
            // 更新语音提示
            updateVoiceRecognitionHint(transcript);
        };
        
        // 处理结束事件
        speechRecognizer.onend = function() {
            console.log('语音识别结束');
            // 停止语音录制状态
            updateVoiceInputStatus(false);
            // 移除语音提示
            removeVoiceRecognitionHint();
            // 清除超时
            if (voiceRecognitionTimeout) {
                clearTimeout(voiceRecognitionTimeout);
                voiceRecognitionTimeout = null;
            }
        };
        
        // 处理错误事件
        speechRecognizer.onerror = function(event) {
            console.error('语音识别错误:', event.error);
            showToast('语音识别出错: ' + event.error);
            // 停止语音录制状态
            updateVoiceInputStatus(false);
            // 移除语音提示
            removeVoiceRecognitionHint();
            // 清除超时
            if (voiceRecognitionTimeout) {
                clearTimeout(voiceRecognitionTimeout);
                voiceRecognitionTimeout = null;
            }
        };
        
        console.log('Web语音识别器初始化成功');
    } catch (error) {
        console.error('初始化Web语音识别器时出错:', error);
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
                            
                            // 将新文本添加到现有响应中
                            fullResponse += data.text || '';
                            
                            // 更新AI消息元素
                            if (aiMessageElement) {
                                aiMessageElement.innerHTML = formatMessage(fullResponse);
                                scrollToLatestMessage();
                            }
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

// 切换语音输入功能
function toggleVoiceInput() {
    if (!speechRecognizer) {
        showToast('语音识别模块未初始化，请刷新页面重试');
        return;
    }
    
    if (!isVoiceRecording) {
        // 开始语音输入
        startVoiceRecognition();
    } else {
        // 停止语音输入并发送当前识别结果
        stopVoiceRecognitionAndSend();
    }
}

// 开始语音识别
function startVoiceRecognition() {
    if (!speechRecognizer) {
        initSpeechRecognizer();
        if (!speechRecognizer) {
            showToast('语音识别模块初始化失败');
            return;
        }
    }
    
    try {
        // 先清空输入框
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.value = '';
            userInput.dispatchEvent(new Event('input'));
        }
        
        // 启动语音识别
        speechRecognizer.start();
        // 状态会由onstart回调函数处理
    } catch (error) {
        console.error('启动语音识别失败:', error);
        showToast('启动语音识别失败: ' + error.message);
        updateVoiceInputStatus(false);
    }
}

// 停止语音识别
function stopVoiceRecognition() {
    if (speechRecognizer) {
        try {
            // 停止语音识别
            speechRecognizer.stop();
            // 状态会由onend回调函数处理
        } catch (error) {
            console.error('停止语音识别失败:', error);
            // 直接更新状态
            updateVoiceInputStatus(false);
            // 移除语音提示
            removeVoiceRecognitionHint();
        }
    }
}
// // 开始语音识别
// function startVoiceRecognition() {
//     if (!speechRecognizer) {
//         initSpeechRecognizer();
//         if (!speechRecognizer) {
//             showToast('语音识别模块初始化失败');
//             return;
//         }
//     }
    
//     try {
//         // 先清空输入框
//         const userInput = document.getElementById('user-input');
//         if (userInput) {
//             userInput.value = '';
//             userInput.dispatchEvent(new Event('input'));
//         }
        
//         // 启动语音识别
//         speechRecognizer.start();
//         // 状态会由onStart回调函数处理
//     } catch (error) {
//         console.error('启动语音识别失败:', error);
//         showToast('启动语音识别失败: ' + error.message);
//         updateVoiceInputStatus(false);
//     }
// }

// // 停止语音识别
// function stopVoiceRecognition() {
//     if (speechRecognizer) {
//         try {
//             // 停止语音识别
//             speechRecognizer.stop();
//             // 状态会由onClose回调函数处理
//         } catch (error) {
//             console.error('停止语音识别失败:', error);
//             // 直接更新状态
//             updateVoiceInputStatus(false);
//             // 移除语音提示
//             removeVoiceRecognitionHint();
//         }
//     }
// }

// 停止语音识别并发送当前识别的内容
function stopVoiceRecognitionAndSend() {
    // 先获取当前的输入内容
    const userInput = document.getElementById('user-input');
    const currentText = userInput ? userInput.value.trim() : '';
    
    // 停止语音识别
    stopVoiceRecognition();
    
    // 如果有识别结果，则发送
    if (currentText) {
        // 添加一点延迟以确保语音识别完全停止
        setTimeout(() => {
            console.log('发送语音识别结果:', currentText);
            sendMessage();
        }, 300);
    }
}

// 更新语音输入状态UI
function updateVoiceInputStatus(isActive) {
    const voiceInputButton = document.getElementById('voice-input-button');
    if (voiceInputButton) {
        if (isActive) {
            voiceInputButton.classList.add('active');
            voiceInputButton.innerHTML = '<i class="fas fa-stop"></i>'; // 切换为停止图标
            voiceInputButton.title = '停止语音输入';
        } else {
            voiceInputButton.classList.remove('active');
            voiceInputButton.innerHTML = '<i class="fas fa-microphone"></i>'; // 恢复麦克风图标
            voiceInputButton.title = '语音输入';
        }
    }
    
    // 更新全局状态变量
    isVoiceRecording = isActive;
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
