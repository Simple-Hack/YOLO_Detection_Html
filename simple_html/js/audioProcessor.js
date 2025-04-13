/**
 * 音频处理器 - 用于处理麦克风输入的音频数据
 * 基于 AudioWorklet API 实现
 * 优化了性能和稳定性，支持16kHz采样率输出，适配讯飞语音识别API要求
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

            // 应用增益确保有足够音量
            result[offsetOutput] = interpolatedSample * 1.5; // 提高音量
            
            offsetInput += stepSize;
            offsetOutput++;
        }

        return result;
    }

    // 浮点音频数据转换为16位PCM
    floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        
        // 计算归一化因子，确保充分利用16bit动态范围
        let maxAbs = 0.01; // 设置最小值避免除零错误
        for (let i = 0; i < input.length; i++) {
            const absVal = Math.abs(input[i]);
            if (absVal > maxAbs) maxAbs = absVal;
        }
        
        // 如果信号太弱，适当增益
        const gainFactor = maxAbs < 0.2 ? 1.5 / maxAbs : 1.0;
        
        // 应用增益并转换
        for (let i = 0; i < input.length; i++) {
            // 应用增益，但限制在[-1,1]范围内
            const amplified = input[i] * gainFactor;
            const s = Math.max(-1, Math.min(1, amplified));
            
            // 转换为16位整数，确保充分利用动态范围
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        return output;
    }

    // 将Int16Array转换为Base64字符串
    int16ArrayToBase64(int16Array) {
        try {
            // 创建8位字节数组
            const byteArray = new Uint8Array(int16Array.buffer);
            
            // 转换为Base64 (较高效的实现)
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
            
            // 使用浏览器内置的btoa函数，更可靠
            try {
                return btoa(binary);
            } catch (e) {
                // 如果btoa失败，使用自定义函数
                return this._customBase64Encode(binary);
            }
        } catch (error) {
            console.error('转换Int16Array至Base64失败:', error);
            return ''; // 失败时返回空字符串
        }
    }
    
    // 自定义base64编码实现，替代浏览器的btoa函数
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
        
        // 设置关键参数，确保采样率符合讯飞API要求
        this.inputSampleRate = processorOptions.inputSampleRate || sampleRate;
        this.outputSampleRate = processorOptions.outputSampleRate || 16000; // 讯飞API要求16kHz
        this.bufferSize = processorOptions.bufferSize || 4096; // 缓冲区大小
        this.frameInterval = processorOptions.frameInterval || 50; // 每50ms发送一帧数据
        
        // 采集周期配置 - 新增
        this.collectionCycles = processorOptions.collectionCycles || 4; // 默认累积4个buffer后发送
        this.currentCycle = 0; // 当前累积的周期数
        this.accumulatedBuffers = []; // 用于累积多个buffer的数据
        
        // 计算多少个采样点等于一帧
        this.samplesPerFrame = Math.floor(this.inputSampleRate * this.frameInterval / 1000);
        
        // 创建重采样器
        this.resampler = new AudioResampler(
            this.inputSampleRate,
            this.outputSampleRate,
            1 // 单声道
        );
        
        // 音频缓冲区
        this.audioBuffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        
        // 音量检测相关参数
        this.silenceThreshold = processorOptions.silenceThreshold || 0.005; // 降低静音阈值，使检测更灵敏
        this.consecutiveSilenceFrames = 0; // 连续静音帧计数
        this.isSpeaking = false; // 是否检测到语音
        this.audioLevel = 0; // 当前音频电平
        this.gainFactor = processorOptions.gainFactor || 1.5; // 初始增益因子，可以提高音量
        
        // 自动增益控制
        this.agcEnabled = true;  // 启用自动增益控制
        this.targetLevel = 0.2;  // 目标电平值
        this.agcGain = 1.0;      // 当前AGC增益
        this.maxGain = 5.0;      // 最大增益
        this.agcAttack = 0.01;   // 增益上升速度
        this.agcDecay = 0.005;   // 增益下降速度
        
        // 记录处理的帧数以控制发送频率
        this.frameCount = 0;
        
        // 处理器端口用于和主线程通信
        this.port.onmessage = this.handleMessage.bind(this);
        
        // 初始化完成通知主线程
        this.port.postMessage({
            type: 'init', 
            status: 'ready',
            config: {
                inputSampleRate: this.inputSampleRate,
                outputSampleRate: this.outputSampleRate,
                bufferSize: this.bufferSize,
                collectionCycles: this.collectionCycles
            }
        });
    }
    
    // 处理接收到的消息
    handleMessage(event) {
        // 可以处理从主线程发来的控制消息
        if (event.data.command === 'config') {
            // 更新配置
            if (event.data.bufferSize) this.bufferSize = event.data.bufferSize;
            if (event.data.outputSampleRate) this.outputSampleRate = event.data.outputSampleRate;
            if (event.data.silenceThreshold) this.silenceThreshold = event.data.silenceThreshold;
            if (event.data.gainFactor) this.gainFactor = event.data.gainFactor;
            // 新增采集周期配置
            if (event.data.collectionCycles) this.collectionCycles = event.data.collectionCycles;
            
            // 重新创建重采样器和缓冲区
            this.resampler = new AudioResampler(this.inputSampleRate, this.outputSampleRate, 1);
            this.audioBuffer = new Float32Array(this.bufferSize);
            this.bufferIndex = 0;
            this.currentCycle = 0;
            this.accumulatedBuffers = [];
            
            // 回复确认
            this.port.postMessage({ 
                type: 'configUpdate', 
                status: 'success'
            });
        }
    }
    
    // 应用自动增益控制
    applyAutoGainControl(inputData) {
        if (!this.agcEnabled) return inputData;
        
        // 计算当前帧的RMS电平
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        
        // 根据当前电平调整增益
        if (rms > 0) {
            const targetGain = this.targetLevel / Math.max(rms, 0.0001);
            
            // 平滑增益变化 (更快地上升，更慢地下降)
            if (targetGain > this.agcGain) {
                this.agcGain += this.agcAttack * (targetGain - this.agcGain);
            } else {
                this.agcGain -= this.agcDecay * (this.agcGain - targetGain);
            }
            
            // 限制最大增益
            this.agcGain = Math.min(this.agcGain, this.maxGain);
        }
        
        // 应用增益到音频数据
        const outputData = new Float32Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            outputData[i] = inputData[i] * this.agcGain;
        }
        
        return outputData;
    }
    
    // 检测是否是有语音内容的帧
    detectVoiceActivity(inputData) {
        // 计算音频能量
        let energy = 0;
        for (let i = 0; i < inputData.length; i++) {
            energy += Math.abs(inputData[i]);
        }
        energy = energy / inputData.length;
        
        // 更新当前音频电平
        this.audioLevel = energy;
        
        // 判断是否超过静音阈值
        const isVoice = energy > this.silenceThreshold;
        
        // 状态机：跟踪语音状态变化
        if (isVoice) {
            this.consecutiveSilenceFrames = 0;
            if (!this.isSpeaking) {
                this.isSpeaking = true;
                this.port.postMessage({ 
                    type: 'voiceActivity', 
                    status: 'speaking',
                    energy: energy
                });
            }
        } else {
            this.consecutiveSilenceFrames++;
            // 连续10帧静音则认为说话结束
            if (this.isSpeaking && this.consecutiveSilenceFrames > 10) {
                this.isSpeaking = false;
                this.port.postMessage({ 
                    type: 'voiceActivity', 
                    status: 'silence',
                    frames: this.consecutiveSilenceFrames
                });
            }
        }
        
        return isVoice;
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
        
        // 应用自动增益控制
        const enhancedInput = this.applyAutoGainControl(inputChannel);
        
        // 检测语音活动
        this.detectVoiceActivity(enhancedInput);
        
        // 将数据添加到缓冲区
        for (let i = 0; i < enhancedInput.length; i++) {
            if (this.bufferIndex < this.bufferSize) {
                // 应用额外增益因子
                this.audioBuffer[this.bufferIndex++] = enhancedInput[i] * this.gainFactor;
            }
        }
        
        // 当缓冲区填满时，处理数据
        if (this.bufferIndex >= this.bufferSize) {
            try {
                // 将当前缓冲区的副本添加到累积缓冲区
                this.accumulatedBuffers.push(new Float32Array(this.audioBuffer));
                this.currentCycle++;
                
                // 只有当累积了足够的周期数据才发送
                if (this.currentCycle >= this.collectionCycles) {
                    // 合并所有累积的缓冲区
                    const totalLength = this.bufferSize * this.accumulatedBuffers.length;
                    const combinedBuffer = new Float32Array(totalLength);
                    
                    for (let i = 0; i < this.accumulatedBuffers.length; i++) {
                        combinedBuffer.set(this.accumulatedBuffers[i], i * this.bufferSize);
                    }
                    
                    // 执行重采样
                    const resampledData = this.resampler.resample(combinedBuffer);
                    
                    // 转换为16位PCM
                    const pcmData = this.resampler.floatTo16BitPCM(resampledData);
                    
                    // 检查PCM数据是否包含有效信号
                    let hasSignal = false;
                    let pcmEnergy = 0;
                    let maxSample = 0;
                    
                    // 使用更密集的采样计算电平
                    for (let i = 0; i < pcmData.length; i += 8) {
                        const absVal = Math.abs(pcmData[i]);
                        pcmEnergy += absVal / 32768.0;
                        if (absVal > maxSample) maxSample = absVal;
                        if (absVal > 1000) {
                            hasSignal = true;
                        }
                    }
                    pcmEnergy = pcmEnergy / (pcmData.length / 8);
                    
                    // 将转换后的PCM数据转为Base64
                    const base64Data = this.resampler.int16ArrayToBase64(pcmData);
                    
                    // 发送到主线程，始终发送数据，不论是否有声音
                    this.port.postMessage({
                        type: 'audio',
                        base64Audio: base64Data,
                        sampleRate: this.outputSampleRate,
                        isSpeaking: this.isSpeaking,
                        audioLevel: this.audioLevel,
                        pcmEnergy: pcmEnergy,
                        maxSample: maxSample,
                        hasSignal: hasSignal,
                        agcGain: this.agcGain,
                        collectionTime: (this.bufferSize / this.inputSampleRate) * this.collectionCycles * 1000 // 采集时间(毫秒)
                    });
                    
                    // 重置累积计数和缓冲区
                    this.currentCycle = 0;
                    this.accumulatedBuffers = [];
                } else {
                    // 如果还没累积够，可以发送状态更新但不发送音频数据
                    this.port.postMessage({
                        type: 'statusUpdate',
                        currentCycle: this.currentCycle,
                        collectionCycles: this.collectionCycles,
                        audioLevel: this.audioLevel
                    });
                }
            } catch (error) {
                // 处理任何可能的错误
                this.port.postMessage({
                    type: 'error',
                    message: 'Audio processing error: ' + (error.message || 'Unknown error')
                });
            }
            
            // 重置缓冲区索引
            this.bufferIndex = 0;
        }
        
        // 返回true继续处理
        return true;
    }
}

// 注册处理器
registerProcessor('audio-processor', AudioProcessor);