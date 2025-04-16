// filepath: d:\VsFile\html\simple_html\js\speechRecognition.js
/**
 * 讯飞语音识别模块 - 基于WebAPI直接调用讯飞开放平台实时语音听写服务
 * 基于科大讯飞语音听写WebAPI (https://www.xfyun.cn/doc/asr/voicedictation/API.html)
 */

// 讯飞语音识别API配置
const XF_SPEECH_CONFIG = {
    APPID: '',
    APISecret: '',
    APIKey: '',
    DOMAIN: 'iat', // 接口类型
    LANGUAGE: 'zh_cn', // 语种
    ACCENT: 'mandarin', // 方言，普通话
    FORMAT: 'audio/L16;rate=16000', // 音频格式
    VAD_BOS: 5000, // 前端点超时时间，单位ms
    VAD_EOS: 1800, // 后端点超时时间，单位ms
    SAVE_AUDIO: false, // 是否保存音频数据到本地用于调试，设置为false禁用保存
    FRAME_INTERVAL: 200, // 发送音频帧间隔，单位ms
    COLLECTION_CYCLES: 4 // 采集周期数，累积多少个buffer数据后一次性发送
};

// 调试日志级别：0=关闭, 1=错误, 2=警告, 3=信息, 4=详细
const DEBUG_LEVEL = 4;

// 音频调试设置
const AUDIO_DEBUG = {
    saveToLocal: false, // 是否保存音频到本地，设置为false禁用保存
    maxSavedAudioChunks: 100, // 最大保存的音频块数量
    audioChunks: [], // 存储音频数据块
    visualizeAudio: true // 是否可视化音频数据
};

// 调试日志函数
function debugLog(level, ...args) {
    // 根据日志级别决定是否输出
    if (level <= DEBUG_LEVEL) {
        const prefix = ['', '[错误]', '[警告]', '[信息]', '[详细]'][level];
        console.log(`${prefix} 语音识别:`, ...args);
    }
}

// 音频处理器内联代码
const INLINE_AUDIO_PROCESSOR_CODE = `
/**
 * 音频处理器 - 用于处理麦克风输入的音频数据
 * 基于 AudioWorklet API 实现
 */

// 音频重采样工具类
class AudioResampler {
    constructor(inputSampleRate, outputSampleRate, channels = 1) {
        this.inputSampleRate = inputSampleRate;
        this.outputSampleRate = outputSampleRate;
        this.channels = channels;
    }

    // 重采样处理，将任意采样率转换为目标采样率
    resample(audioBuffer) {
        if (this.inputSampleRate === this.outputSampleRate) {
            return audioBuffer; // 如果采样率相同，无需转换
        }

        // 计算新缓冲区长度
        const ratio = this.outputSampleRate / this.inputSampleRate;
        const newLength = Math.round(audioBuffer.length * ratio);
        const result = new Float32Array(newLength);

        // 计算步进和小数部分
        const stepSize = this.inputSampleRate / this.outputSampleRate;
        let offsetInput = 0;
        let offsetOutput = 0;

        // 线性插值重采样算法
        while (offsetOutput < result.length) {
            // 计算整数和小数索引部分
            const indexInput = Math.floor(offsetInput);
            const fraction = offsetInput - indexInput;

            // 确保不越界
            if (indexInput >= audioBuffer.length - 1) {
                break;
            }

            // 线性插值
            const inputSample1 = audioBuffer[indexInput];
            const inputSample2 = audioBuffer[indexInput + 1];
            const interpolatedSample = inputSample1 + fraction * (inputSample2 - inputSample1);

            result[offsetOutput] = interpolatedSample;
            offsetInput += stepSize;
            offsetOutput++;
        }

        return result;
    }

    // 浮点音频数据转换为16位PCM
    floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            // 将浮点数(-1.0 ~ 1.0)转换为16位整数
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    // 将Int16Array转换为Base64字符串
    int16ArrayToBase64(int16Array) {
        try {
            // 创建8位字节数组
            const byteArray = new Uint8Array(int16Array.buffer);
            
            // 转换为Base64
            let binary = '';
            const bytes = new Uint8Array(byteArray.buffer);
            const len = bytes.byteLength;
            
            // 每次处理1024字节以提高性能
            const chunkSize = 1024;
            
            for (let i = 0; i < len; i += chunkSize) {
                const chunk = bytes.subarray(
                    i, 
                    Math.min(i + chunkSize, len)
                );
                
                for (let j = 0; j < chunk.length; j++) {
                    binary += String.fromCharCode(chunk[j]);
                }
            }
            
            // 自定义base64编码实现
            return this._customBase64Encode(binary);
        } catch (error) {
            console.error('转换Int16Array至Base64失败:', error);
            return ''; // 失败时返回空字符串
        }
    }
    
    // 自定义base64编码实现
    _customBase64Encode(str) {
        const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        // 每三个字符处理为一组
        while (i < str.length) {
            const char1 = str.charCodeAt(i++);
            const char2 = i < str.length ? str.charCodeAt(i++) : 0;
            const char3 = i < str.length ? str.charCodeAt(i++) : 0;
            
            const triplet = (char1 << 16) | (char2 << 8) | char3;
            
            result += b64chars[(triplet >> 18) & 0x3F];
            result += b64chars[(triplet >> 12) & 0x3F];
            result += i > str.length + 1 ? '=' : b64chars[(triplet >> 6) & 0x3F];
            result += i > str.length ? '=' : b64chars[triplet & 0x3F];
        }
        
        return result;
    }
}

// 注册音频处理器
class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // 从选项中获取配置
        const processorOptions = options.processorOptions || {};
        this.inputSampleRate = processorOptions.inputSampleRate || sampleRate;
        this.outputSampleRate = processorOptions.outputSampleRate || 16000;
        this.bufferSize = processorOptions.bufferSize || 4096;
        
        // 创建重采样器
        this.resampler = new AudioResampler(
            this.inputSampleRate,
            this.outputSampleRate,
            1 // 单声道
        );
        
        // 音频缓冲区
        this.audioBuffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        
        // 处理器端口用于和主线程通信
        this.port.onmessage = this.handleMessage.bind(this);
    }
    
    // 处理接收到的消息
    handleMessage(event) {
        // 可以处理从主线程发来的控制消息
        if (event.data.command === 'config') {
            // 更新配置
            if (event.data.bufferSize) this.bufferSize = event.data.bufferSize;
            if (event.data.outputSampleRate) this.outputSampleRate = event.data.outputSampleRate;
            
            // 重新创建重采样器和缓冲区
            this.resampler = new AudioResampler(this.inputSampleRate, this.outputSampleRate, 1);
            this.audioBuffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
        }
    }
    
    // 处理音频数据的主方法，每128帧调用一次
    process(inputs, outputs) {
        // 检查是否有输入数据
        if (inputs.length === 0 || inputs[0].length === 0) {
            return true;
        }
        
        // 获取输入通道数据（一般是单声道）
        const inputChannel = inputs[0][0];
        if (!inputChannel) return true;
        
        // 将数据添加到缓冲区
        for (let i = 0; i < inputChannel.length; i++) {
            if (this.bufferIndex < this.bufferSize) {
                this.audioBuffer[this.bufferIndex++] = inputChannel[i];
            }
        }
        
        // 当缓冲区填满时，处理并发送数据
        if (this.bufferIndex >= this.bufferSize) {
            // 执行重采样
            const resampledData = this.resampler.resample(this.audioBuffer);
            
            // 转换为16位PCM
            const pcmData = this.resampler.floatTo16BitPCM(resampledData);
            
            // 转换为Base64后发送到主线程
            const base64Data = this.resampler.int16ArrayToBase64(pcmData);
            
            // 发送到主线程
            this.port.postMessage({
                type: 'audio',
                base64Audio: base64Data
            });
            
            // 重置缓冲区索引
            this.bufferIndex = 0;
        }
        
        // 返回true继续处理
        return true;
    }
}

// 注册处理器
registerProcessor('audio-processor', AudioProcessor);
`;

// 音频处理器代码路径 - 注意我们还保留原始路径用于回退
const AUDIO_PROCESSOR_URL = './js/audioProcessor.js';

// 全局音频上下文和流，避免重复创建
let globalAudioContext = null;
let globalAudioStream = null;
let permissionGranted = false;
let audioWorkletLoaded = false; // 添加标志跟踪AudioWorklet模块加载状态
let useScriptProcessor = false; // 标记是否使用ScriptProcessor作为备用

// 用于调试保存的音频会话ID
let audioSessionId = null;

// 讯飞语音识别控制器类
class XFSpeechRecognizer {
    constructor(options = {}) {
        // 合并默认配置和用户配置
        this.config = Object.assign({
            onStart: () => debugLog(3, '语音识别已启动'),
            onResult: (result) => debugLog(3, '识别结果:', result),
            onError: (error) => debugLog(1, '识别错误:', error),
            onClose: () => debugLog(3, '语音识别已关闭'),
            onInterimResult: (result) => debugLog(4, '临时识别结果:', result), // 新增：临时结果回调
            onAudioLevel: (level) => {}, // 新增：音频电平回调
            autoRestart: true, // 是否在非正常关闭后自动重连
            audioBufferSize: 4096, // 音频缓冲区大小
            realTimeOutput: true, // 新增：是否启用实时输出(即使是中间结果也显示)
            saveAudio: false, // 是否保存音频到本地，设置为false禁用保存
            gainFactor: 3.0, // 增加音频增益因子到3.0，提高音量
            silenceThreshold: 0.002 // 降低静音阈值，
        }, options);

        // 初始化变量
        this.ws = null;        // WebSocket连接
        this.isRecording = false;
        this.isConnecting = false;
        this.currentText = ''; // 当前识别的文本
        this.lastResult = '';  // 上一次识别结果
        this.handlerInterval = null; // 处理间隔
        this.reconnectAttempts = 0;  // 重连尝试次数
        this.maxReconnectAttempts = 3; // 最大重连次数
        this.audioWorklet = null;    // 音频工作进程
        this.scriptProcessor = null; // ScriptProcessor备用节点
        this.lastInterimUpdate = 0;  // 记录上次临时结果更新时间
        this.audioLevelHistory = []; // 音频电平历史记录
        
        // 调试元素ID
        this.audioDebugElementId = 'xf-audio-debug';
        
        // 音频调试相关
        this.audioChunks = [];       // 存储音频数据块
        this.audioSessionId = null;  // 会话ID
        
        // 初始化时尝试请求麦克风权限
        this._initAudioPermission();
    }
    
    // 初始化时尝试请求麦克风权限，仅在首次加载时执行
    async _initAudioPermission() {
        // 如果已经获得权限，则不再请求
        if (permissionGranted && globalAudioStream) {
            return;
        }
        
        try {
            debugLog(3, "尝试初始化麦克风权限...");
            
            // 请求麦克风权限
            globalAudioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false // 禁用浏览器的AGC，使用我们自己的
                } 
            });
            
            // 创建音频上下文(如果尚未创建)
            if (!globalAudioContext) {
                globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                debugLog(3, `创建音频上下文，采样率: ${globalAudioContext.sampleRate}Hz`);
                
                // 检查是否支持AudioWorklet
                if (globalAudioContext.audioWorklet) {
                    // 尝试加载AudioWorklet模块
                    try {
                        debugLog(3, "尝试加载AudioWorklet模块...");
                        await globalAudioContext.audioWorklet.addModule('./js/audioProcessor.js');
                        audioWorkletLoaded = true;
                        useScriptProcessor = false;
                        debugLog(3, "AudioWorklet模块加载成功");
                    } catch (error) {
                        debugLog(1, "加载AudioWorklet模块失败:", error);
                        debugLog(2, "将使用ScriptProcessor作为备用方案");
                        audioWorkletLoaded = false;
                        useScriptProcessor = true;
                    }
                } else {
                    debugLog(2, "当前环境不支持AudioWorklet，将使用ScriptProcessor");
                    useScriptProcessor = true;
                }
            }
            
            permissionGranted = true;
            debugLog(3, "麦克风权限已授权并初始化完成");
        } catch (error) {
            debugLog(1, "初始化麦克风权限失败，将在用户操作时再次尝试:", error);
            permissionGranted = false;
        }
    }

    // 生成WebSocket URL和鉴权参数
    _createWebSocketUrl() {
        const apiUrl = 'wss://iat-api.xfyun.cn/v2/iat';
        const host = 'iat-api.xfyun.cn';
        const date = new Date().toGMTString();
        const algorithm = 'hmac-sha256';
        
        // 鉴权参数
        const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
        const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, XF_SPEECH_CONFIG.APISecret);
        const signature = CryptoJS.enc.Base64.stringify(signatureSha);
        
        const authorizationOrigin = `api_key="${XF_SPEECH_CONFIG.APIKey}", algorithm="${algorithm}", headers="host date request-line", signature="${signature}"`;
        const authorization = btoa(authorizationOrigin);
        
        // 构建WebSocket URL
        return `${apiUrl}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
    }

    // 创建WebSocket连接
    _createWebSocketConnection() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            debugLog(3, "WebSocket连接已存在，无需重新创建");
            return;  // 已经连接或正在连接中，不需要重新创建
        }

        try {
            this.isConnecting = true;
            
            const wsUrl = this._createWebSocketUrl();
            debugLog(3, "正在连接WebSocket...");
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                debugLog(3, '✅ WebSocket连接已建立');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                
                // 创建新的音频会话ID
                if (this.config.saveAudio) {
                    this.audioSessionId = this._generateAudioSessionId();
                    this.audioChunks = []; // 重置音频块
                    debugLog(3, `创建音频会话: ${this.audioSessionId}`);
                }
                
                // 发送开始参数帧
                this._sendStartFrame();
            };
            
            this.ws.onmessage = (e) => {
                this._handleResponse(e.data);
            };
            
            this.ws.onerror = (e) => {
                debugLog(1, 'WebSocket错误:', e);
                this.isConnecting = false;
                this.config.onError('WebSocket连接错误');
            };
            
            this.ws.onclose = (e) => {
                debugLog(3, 'WebSocket连接已关闭:', e.code, e.reason);
                this.isConnecting = false;
                
                // 如果有保存的音频并且会话结束，尝试保存音频文件
                if (this.config.saveAudio && this.audioChunks.length > 0) {
                    this._saveAudioChunks();
                }
                
                // 如果是非正常关闭并且配置了自动重连，则尝试重连
                if (e.code !== 1000 && this.config.autoRestart && this.isRecording && 
                    this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    debugLog(3, `尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    
                    setTimeout(() => {
                        this._createWebSocketConnection();
                    }, 1000 * this.reconnectAttempts); // 逐步增加重连延迟
                } else {
                    this.stop();
                    this.config.onClose();
                }
            };
        } catch (error) {
            this.isConnecting = false;
            debugLog(1, '创建WebSocket连接失败:', error);
            this.config.onError(`创建WebSocket连接失败: ${error.message}`);
        }
    }

    // 发送开始帧
    _sendStartFrame() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        // 构建开始帧参数
        const params = {
            common: {
                app_id: XF_SPEECH_CONFIG.APPID
            },
            business: {
                language: XF_SPEECH_CONFIG.LANGUAGE,
                domain: XF_SPEECH_CONFIG.DOMAIN,
                accent: XF_SPEECH_CONFIG.ACCENT,
                vad_eos: XF_SPEECH_CONFIG.VAD_EOS,
                dwa: 'wpgs' // 开启动态修正
            },
            data: {
                status: 0,    // 开始帧
                format: XF_SPEECH_CONFIG.FORMAT,
                encoding: 'raw'
            }
        };
        
        try {
            debugLog(4, "发送WebSocket开始帧");
            this.ws.send(JSON.stringify(params));
        } catch (error) {
            debugLog(1, '发送开始帧失败:', error);
        }
    }

    // 发送结束帧
    _sendEndFrame() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        // 构建结束帧参数
        const params = {
            data: {
                status: 2    // 结束帧
            }
        };
        
        try {
            debugLog(4, "发送WebSocket结束帧");
            this.ws.send(JSON.stringify(params));
            
            // 如果启用了音频保存，在结束时保存音频数据
            if (this.config.saveAudio && this.audioChunks.length > 0) {
                this._saveAudioChunks();
            }
        } catch (error) {
            debugLog(1, '发送结束帧失败:', error);
        }
    }

    // 生成唯一的音频会话ID
    _generateAudioSessionId() {
        // 如果保存音频功能被禁用，直接返回null
        if (!this.config.saveAudio) {
            return null;
        }
        
        const date = new Date();
        const timestamp = date.getTime();
        const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
        return `xf_audio_${dateStr}_${timestamp}`;
    }
    
    // 将Base64音频数据解码为Int16Array
    _base64ToInt16Array(base64) {
        try {
            // 将Base64转换为字符串
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            
            // 提取字节数据
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // 转换为Int16Array（16位PCM格式）
            return new Int16Array(bytes.buffer);
        } catch (error) {
            debugLog(1, "Base64解码为Int16Array失败:", error);
            return new Int16Array(0);
        }
    }
    
    // 将多个Int16Array合并为一个
    _concatenateInt16Arrays(arrays) {
        // 计算总长度
        let totalLength = 0;
        for (const arr of arrays) {
            totalLength += arr.length;
        }
        
        // 创建结果数组
        const result = new Int16Array(totalLength);
        
        // 复制所有数组内容
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        
        return result;
    }
    
    // 创建WAV文件数据
    _createWavFile(pcmData, sampleRate = 16000) {
        // 创建WAV文件头
        const createWavHeader = function(dataLength) {
            const header = new ArrayBuffer(44);
            const view = new DataView(header);
            
            // RIFF标识
            view.setUint8(0, 'R'.charCodeAt(0));
            view.setUint8(1, 'I'.charCodeAt(0));
            view.setUint8(2, 'F'.charCodeAt(0));
            view.setUint8(3, 'F'.charCodeAt(0));
            
            // 文件长度
            view.setUint32(4, 36 + dataLength * 2, true);
            
            // WAVE标识
            view.setUint8(8, 'W'.charCodeAt(0));
            view.setUint8(9, 'A'.charCodeAt(0));
            view.setUint8(10, 'V'.charCodeAt(0));
            view.setUint8(11, 'E'.charCodeAt(0));
            
            // fmt子块
            view.setUint8(12, 'f'.charCodeAt(0));
            view.setUint8(13, 'm'.charCodeAt(0));
            view.setUint8(14, 't'.charCodeAt(0));
            view.setUint8(15, ' '.charCodeAt(0));
            
            // 子块长度
            view.setUint32(16, 16, true);
            
            // 音频格式 (1为PCM)
            view.setUint16(20, 1, true);
            
            // 通道数
            view.setUint16(22, 1, true); // 单声道
            
            // 采样率
            view.setUint32(24, sampleRate, true);
            
            // 字节率
            view.setUint32(28, sampleRate * 2, true);
            
            // 数据块对齐
            view.setUint16(32, 2, true);
            
            // 位深度
            view.setUint16(34, 16, true);
            
            // data子块
            view.setUint8(36, 'd'.charCodeAt(0));
            view.setUint8(37, 'a'.charCodeAt(0));
            view.setUint8(38, 't'.charCodeAt(0));
            view.setUint8(39, 'a'.charCodeAt(0));
            
            // 数据长度
            view.setUint32(40, dataLength * 2, true);
            
            return header;
        };
        
        // 创建WAV文件头
        const header = createWavHeader(pcmData.length);
        
        // 合并头和数据
        const wav = new Uint8Array(header.byteLength + pcmData.byteLength);
        wav.set(new Uint8Array(header), 0);
        wav.set(new Uint8Array(pcmData.buffer), header.byteLength);
        
        return wav;
    }
    
    // 将WAV文件保存到本地
    _saveWavFile(wavData, fileName) {
        try {
            // 创建Blob对象
            const blob = new Blob([wavData], { type: 'audio/wav' });
            
            // 创建下载链接
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            
            // 添加到文档并触发点击
            document.body.appendChild(link);
            link.click();
            
            // 清理
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            debugLog(3, `音频文件已保存为 ${fileName}`);
            return true;
        } catch (error) {
            debugLog(1, "保存WAV文件失败:", error);
            return false;
        }
    }
    
    // 保存收集的音频块到WAV文件
    _saveAudioChunks() {
        // 如果禁用了音频保存功能，则直接返回
        if (!this.config.saveAudio || this.audioChunks.length === 0 || !this.audioSessionId) {
            return;
        }
        
        try {
            debugLog(3, `准备保存 ${this.audioChunks.length} 个音频块为WAV文件`);
            
            // 将Base64音频块转换为Int16Array数组
            const pcmArrays = this.audioChunks.map(base64 => this._base64ToInt16Array(base64));
            
            // 合并所有PCM数据
            const mergedPcm = this._concatenateInt16Arrays(pcmArrays);
            
            // 创建WAV文件数据
            const wavData = this._createWavFile(mergedPcm, 16000);
            
            // 生成文件名
            const fileName = `${this.audioSessionId}.wav`;
            
            // 保存文件
            const result = this._saveWavFile(wavData, fileName);
            if (result) {
                debugLog(3, `已成功将 ${this.audioChunks.length} 个音频块保存为 ${fileName}`);
                this.audioChunks = []; // 清空已保存的音频块
            }
        } catch (error) {
            debugLog(1, "保存音频块失败:", error);
        }
    }

    // 发送音频数据
    _sendAudioData(data, audioInfo = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        try {
            // 如果启用了音频电平回调，处理电平数据
            if (this.config.onAudioLevel && audioInfo.audioLevel) {
                // 记录历史电平值（最多保存10个）
                this.audioLevelHistory.push(audioInfo.audioLevel);
                if (this.audioLevelHistory.length > 10) {
                    this.audioLevelHistory.shift();
                }
                
                // 计算平均电平
                const avgLevel = this.audioLevelHistory.reduce((sum, val) => sum + val, 0) / this.audioLevelHistory.length;
                
                // 回调音频电平
                this.config.onAudioLevel(avgLevel);
                
                // 调试音频信息
                debugLog(4, `音频电平: ${audioInfo.audioLevel.toFixed(4)}, PCM能量: ${audioInfo.pcmEnergy?.toFixed(4) || 0}, 最大样本: ${audioInfo.maxSample || 0}, AGC增益: ${audioInfo.agcGain?.toFixed(2) || 1.0}`);
            }
            
            // 如果启用了音频保存，存储音频数据
            if (this.config.saveAudio) {
                this.audioChunks.push(data);
                
                // 如果超出最大存储量，保存并清除
                if (this.audioChunks.length >= AUDIO_DEBUG.maxSavedAudioChunks) {
                    debugLog(3, `已达到最大音频块存储限制 (${AUDIO_DEBUG.maxSavedAudioChunks})，保存当前音频`);
                    this._saveAudioChunks();
                }
            }
            
            // 继续帧参数
            const params = {
                data: {
                    status: 1,    // 连续帧
                    format: XF_SPEECH_CONFIG.FORMAT,
                    encoding: 'raw',
                    audio: data
                }
            };
            
            debugLog(4, "发送音频数据帧");
            this.ws.send(JSON.stringify(params));
            
        } catch (error) {
            debugLog(1, '发送音频数据失败:', error);
        }
    }

    // 处理服务器返回的结果
    _handleResponse(data) {
        try {
            debugLog(4, '收到WebSocket响应数据:', data);
            const response = JSON.parse(data);
            const code = response.code;
            
            if (code !== 0) {
                // 出错
                debugLog(1, '识别错误, 错误码:', code, '错误信息:', response.message);
                this.config.onError(`识别错误: ${response.message} (${code})`);
                return;
            }
            
            // 处理结果
            const result = response.data;
            let text = '';
            
            if (result.status === 0 || result.status === 1) {
                // 识别中间结果或最终结果
                if (result.result && result.result.ws) {
                    for (const ws of result.result.ws) {
                        for (const cw of ws.cw) {
                            text += cw.w;
                        }
                    }
                    
                    // 记录并调试输出有效响应内容
                    debugLog(3, '收到识别文本:', text);
                }
                
                // 如果是临时结果且包含动态修正信息
                if (result.result && result.result.pgs) {
                    const pgs = result.result.pgs;
                    const now = Date.now();
                    
                    if (pgs === 'rpl') { // 替换前面的部分
                        let rg = result.result.rg || [];
                        if (rg.length > 0) {
                            // 替换掉被修正的内容
                            let startIdx = rg[0];
                            let endIdx = rg[1];
                            if (startIdx >= 0 && endIdx >= 0) {
                                let textArr = this.currentText.split('');
                                textArr.splice(startIdx, endIdx - startIdx + 1);
                                this.currentText = textArr.join('');
                            }
                        }
                        this.currentText += text;
                        
                        // 调试日志
                        debugLog(4, '动态修正:', this.currentText);
                    } else {
                        this.currentText += text;
                        
                        // 调试日志
                        debugLog(4, '追加文本:', text);
                    }
                    
                    // 实时调用临时结果回调
                    if (this.config.realTimeOutput && this.config.onInterimResult && 
                        (now - this.lastInterimUpdate > 100)) { // 限制更新频率
                        this.lastInterimUpdate = now;
                        this.config.onInterimResult(this.currentText);
                    }
                    
                    // 向UI显示当前结果(包括不稳定的部分)
                    this.config.onResult(this.currentText);
                } else if (text) {
                    // 没有动态修正标记但有文本结果，直接更新
                    this.currentText = text;
                    debugLog(3, '更新识别文本:', this.currentText);
                    
                    // 通知UI更新
                    if (this.config.onResult) {
                        this.config.onResult(this.currentText);
                    }
                }
            }
            
            // 最终确认的结果
            if (result.status === 2) {
                this.lastResult = this.currentText || text;
                debugLog(3, '最终识别结果:', this.lastResult);
                if (this.config.onResult) {
                    this.config.onResult(this.lastResult);
                }
                this.currentText = '';
            }
        } catch (error) {
            debugLog(1, '处理识别结果时出错:', error, '原始数据:', data);
            try {
                // 尝试获取更多错误上下文
                if (typeof data === 'string' && data.length > 0) {
                    if (data.startsWith('{') && data.includes('code')) {
                        // 尝试再次提取错误信息
                        const simpleExtract = data.match(/"message"\s*:\s*"([^"]+)"/);
                        if (simpleExtract && simpleExtract[1]) {
                            this.config.onError(`WebSocket响应解析错误: ${simpleExtract[1]}`);
                            return;
                        }
                    }
                }
            } catch (e) {
                // 忽略二次解析错误
            }
            
            // 默认错误信息
            this.config.onError('处理WebSocket响应时出错: ' + (error.message || '未知错误'));
        }
    }

    // 开始录音并进行语音识别
    async start() {
        if (this.isRecording) {
            debugLog(3, '已经在录音中...');
            return;
        }
        
        // 检查浏览器是否支持Web Audio API
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const errorMsg = '您的浏览器不支持语音录制功能，请使用最新版Chrome/Firefox/Safari浏览器';
            debugLog(1, errorMsg);
            this.config.onError(errorMsg);
            return;
        }
        
        // 重置状态
        this.isRecording = true;
        this.currentText = '';
        this.audioLevelHistory = [];
        
        // 通知开始录音
        this.config.onStart();
        
        // 创建WebSocket连接
        this._createWebSocketConnection();
        
        try {
            // 如果已经有权限和全局流，则直接使用
            if (!permissionGranted || !globalAudioStream) {
                debugLog(3, "尝试获取麦克风权限...");
                globalAudioStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: false
                    } 
                });
                permissionGranted = true;
            }
            
            // 如果全局音频上下文不存在或已关闭，则重新创建
            if (!globalAudioContext || globalAudioContext.state === 'closed') {
                globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
                debugLog(3, `创建音频上下文，采样率: ${globalAudioContext.sampleRate}Hz`);
                audioWorkletLoaded = false;
                useScriptProcessor = false;
            } else if (globalAudioContext.state === 'suspended') {
                // 如果音频上下文被挂起，则恢复
                await globalAudioContext.resume();
            }
            
            // 创建音频源
            debugLog(3, "创建音频源...");
            const audioSource = globalAudioContext.createMediaStreamSource(globalAudioStream);
            
            // 音频处理状态
            let processorType = 'unknown';

            // 根据环境选择音频处理方式
            if (globalAudioContext.audioWorklet && !useScriptProcessor) {
                try {
                    // 尝试使用AudioWorklet
                    if (!audioWorkletLoaded) {
                        debugLog(3, "尝试加载AudioWorklet模块...");
                        
                        try {
                            await globalAudioContext.audioWorklet.addModule('./js/audioProcessor.js');
                            audioWorkletLoaded = true;
                            processorType = "AudioWorklet";
                        } catch (error) {
                            debugLog(1, "加载AudioWorklet模块失败:", error);
                            useScriptProcessor = true;
                        }
                    } else {
                        processorType = "AudioWorklet (已加载)";
                    }

                    if (audioWorkletLoaded) {
                        // 创建音频处理节点
                        this.audioWorklet = new AudioWorkletNode(globalAudioContext, 'audio-processor', {
                            processorOptions: {
                                inputSampleRate: globalAudioContext.sampleRate,
                                outputSampleRate: 16000,
                                bufferSize: this.config.audioBufferSize,
                                silenceThreshold: this.config.silenceThreshold,
                                gainFactor: this.config.gainFactor
                            }
                        });
                        
                        // 设置音频数据处理回调
                        this.audioWorklet.port.onmessage = (event) => {
                            if (!this.isRecording) return;
                            
                            if (event.data.type === 'audio') {
                                // 发送到WebSocket，同时传递音频信息
                                this._sendAudioData(event.data.base64Audio, {
                                    audioLevel: event.data.audioLevel,
                                    pcmEnergy: event.data.pcmEnergy,
                                    maxSample: event.data.maxSample,
                                    agcGain: event.data.agcGain,
                                    hasSignal: event.data.hasSignal
                                });
                            } else if (event.data.type === 'error') {
                                debugLog(1, "AudioWorklet错误:", event.data.message);
                            } else if (event.data.type === 'init') {
                                debugLog(3, "AudioWorklet初始化完成:", event.data.config);
                            }
                        };
                        
                        // 连接节点
                        audioSource.connect(this.audioWorklet);
                        this.audioWorklet.connect(globalAudioContext.destination);
                        debugLog(3, `${processorType} 处理器设置完成，采样率: ${globalAudioContext.sampleRate}Hz -> 16000Hz`);
                        return; // 成功设置AudioWorklet，直接返回
                    }
                } catch (workletError) {
                    debugLog(2, "AudioWorklet设置失败，将使用ScriptProcessor备用方案:", workletError);
                    useScriptProcessor = true;
                }
            } else {
                processorType = "ScriptProcessor";
            }

            // 备用方案：使用ScriptProcessor
            debugLog(3, "使用ScriptProcessor处理音频...");
            this.scriptProcessor = globalAudioContext.createScriptProcessor(this.config.audioBufferSize, 1, 1);
            
            this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (!this.isRecording) return;
                
                // 获取输入音频数据
                const inputBuffer = audioProcessingEvent.inputBuffer;
                const inputData = inputBuffer.getChannelData(0);
                
                // 处理音频数据的逻辑已移动到下面的方法中
                this._processAudioData(inputData);
            };
            
            // 连接节点
            audioSource.connect(this.scriptProcessor);
            this.scriptProcessor.connect(globalAudioContext.destination);
            debugLog(3, `${processorType} 处理器设置完成，采样率: ${globalAudioContext.sampleRate}Hz -> 16000Hz`);
            
        } catch (error) {
            this.isRecording = false;
            debugLog(1, '获取麦克风权限或创建音频处理器失败:', error);
            this.config.onError(`获取麦克风权限或创建音频处理器失败: ${error.message}`);
        }
    }

    // 处理音频数据(用于ScriptProcessor) - 添加音频增强功能
    _processAudioData(audioBuffer) {
        if (!this.isRecording) return;
        
        try {
            // 应用音频增益
            const gainFactor = this.config.gainFactor || 1.5;
            const enhancedBuffer = new Float32Array(audioBuffer.length);
            
            // 计算RMS电平
            let sumSquares = 0;
            for (let i = 0; i < audioBuffer.length; i++) {
                const sample = audioBuffer[i] * gainFactor;
                enhancedBuffer[i] = sample;
                sumSquares += sample * sample;
            }
            const rms = Math.sqrt(sumSquares / audioBuffer.length);
            
            // 记录音频电平
            this.audioLevelHistory.push(rms);
            if (this.audioLevelHistory.length > 10) {
                this.audioLevelHistory.shift();
            }
            
            // 计算平均电平并回调
            const avgLevel = this.audioLevelHistory.reduce((sum, val) => sum + val, 0) / this.audioLevelHistory.length;
            if (this.config.onAudioLevel) {
                this.config.onAudioLevel(avgLevel);
            }
            
            // 将音频数据转换为16位PCM
            const buffer = new ArrayBuffer(enhancedBuffer.length * 2);
            const view = new DataView(buffer);
            
            // 计算音频最大值用于自动增益
            let maxAbs = 0.01; // 最小值避免除零错误
            for (let i = 0; i < enhancedBuffer.length; i++) {
                const absVal = Math.abs(enhancedBuffer[i]);
                if (absVal > maxAbs) maxAbs = absVal;
            }
            
            // 动态增益调整
            const dynamicGain = maxAbs < 0.2 ? Math.min(1.5 / maxAbs, 5.0) : 1.0;
            
            // 转换为16位PCM并应用动态增益
            for (let i = 0; i < enhancedBuffer.length; i++) {
                // 应用动态增益，但限制在[-1,1]范围内
                const amplifiedSample = enhancedBuffer[i] * dynamicGain;
                const s = Math.max(-1, Math.min(1, amplifiedSample));
                
                // 转换为16位整数
                const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
                view.setInt16(i * 2, val, true); // 小端序
            }
            
            // 计算PCM能量
            let pcmEnergy = 0;
            let maxSample = 0;
            let hasSignal = false;
            
            // 每8个样本检查一次
            for (let i = 0; i < enhancedBuffer.length; i += 8) {
                const sample = Math.abs(enhancedBuffer[i]);
                pcmEnergy += sample;
                if (sample > maxSample) maxSample = sample;
                if (sample > this.config.silenceThreshold) {
                    hasSignal = true;
                }
            }
            pcmEnergy = pcmEnergy / (enhancedBuffer.length / 8);
            
            // 转换为Base64编码
            const audioBase64 = btoa(
                Array.from(new Uint8Array(buffer))
                    .map(val => String.fromCharCode(val))
                    .join('')
            );
            
            // 发送到WebSocket
            this._sendAudioData(audioBase64, {
                audioLevel: avgLevel,
                pcmEnergy: pcmEnergy,
                maxSample: maxSample * 32767, // 转换为16位范围
                hasSignal: hasSignal,
                agcGain: dynamicGain
            });
            
        } catch (error) {
            debugLog(1, '处理音频数据失败:', error);
        }
    }

    // 停止录音和识别
    stop() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        console.log('语音识别已停止');
        
        // 发送结束帧
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this._sendEndFrame();
            
            // 给服务器一点时间处理最后的数据
            setTimeout(() => {
                this._closeWebSocket();
            }, 500);
        } else {
            this._closeWebSocket();
        }
        
        // 停止录音
        this._stopRecorder();
    }

    // 关闭WebSocket连接
    _closeWebSocket() {
        if (this.ws) {
            try {
                // 如果有保存的音频相关处理代码，确保已禁用
                if (this.config.saveAudio && this.audioChunks.length > 0) {
                    this._saveAudioChunks();
                }
                
                this.ws.close();
                debugLog(3, "WebSocket连接已关闭");
            } catch (e) {
                debugLog(1, '关闭WebSocket连接失败:', e);
            }
            this.ws = null;
        }
    }

    // 停止录音器
    _stopRecorder() {
        // 如果使用AudioWorklet，则断开连接
        if (this.audioWorklet) {
            try {
                this.audioWorklet.disconnect();
                debugLog(3, "AudioWorklet已断开连接");
            } catch (e) {
                debugLog(1, '断开音频处理节点失败:', e);
            }
            this.audioWorklet = null;
        }
        
        // 如果使用ScriptProcessor，则断开连接
        if (this.scriptProcessor) {
            try {
                this.scriptProcessor.disconnect();
                debugLog(3, "ScriptProcessor已断开连接");
            } catch (e) {
                debugLog(1, '断开ScriptProcessor节点失败:', e);
            }
            this.scriptProcessor = null;
        }
    }
}

// 页面卸载时释放资源
window.addEventListener('beforeunload', () => {
    // 释放麦克风资源
    if (globalAudioStream) {
        try {
            const tracks = globalAudioStream.getTracks();
            tracks.forEach(track => track.stop());
            debugLog(3, "音频轨道已停止");
        } catch (e) {
            debugLog(1, '停止音频轨道失败:', e);
        }
        globalAudioStream = null;
    }
    
    // 关闭音频上下文
    if (globalAudioContext && globalAudioContext.state !== 'closed') {
        try {
            globalAudioContext.close();
            debugLog(3, "音频上下文已关闭");
        } catch (e) {
            debugLog(1, '关闭音频上下文失败:', e);
        }
        globalAudioContext = null;
    }
    
    permissionGranted = false;
});

// 导出语音识别器
window.XFSpeechRecognizer = XFSpeechRecognizer;