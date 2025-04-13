"""
驾驶行为检测系统 - 模型模块
负责加载和运行模型
"""
import os
import torch
import threading
from ultralytics import YOLO
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
import logging
import traceback

from . import config

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('models')

# 全局模型变量
yolo_model = None
language_model = None
tokenizer = None
model_loading_in_progress = False

# 加载YOLO模型的线程锁
yolo_model_lock = threading.Lock()
# 加载语言模型的线程锁
language_model_lock = threading.Lock()

def load_yolo_model():
    """
    加载YOLO模型用于检测车内行为
    """
    global yolo_model, yolo_model_lock
    
    # 使用线程锁确保只有一个线程在加载模型
    with yolo_model_lock:
        # 如果模型已经加载，直接返回
        if yolo_model is not None:
            return True
            
        try:
            logger.info("开始加载YOLO模型...")
            # 使用ultralytics库加载YOLO模型
            yolo_model = YOLO(config.YOLO_MODEL_PATH)
            logger.info("YOLO模型加载成功")
            return True
        except Exception as e:
            logger.error(f"YOLO模型加载失败: {e}")
            logger.error(traceback.format_exc())
            return False

def load_language_model():
    """
    加载大语言模型用于驾驶行为分析
    """
    global language_model, tokenizer, model_loading_in_progress, language_model_lock
    
    # 使用线程锁确保只有一个线程在加载模型
    with language_model_lock:
        # 如果模型已经加载，直接返回
        if language_model is not None:
            return True
            
        # 设置模型加载状态
        model_loading_in_progress = True
        
        try:
            # 设置Hugging Face缓存目录
            os.environ["TRANSFORMERS_CACHE"] = config.MODEL_CACHE_DIR
            logger.info(f"使用本地缓存目录: {os.environ['TRANSFORMERS_CACHE']}")
            
            # 创建临时目录用于模型卸载
            offload_folder = os.path.join(config.TEMP_FOLDER, "model_offload")
            os.makedirs(offload_folder, exist_ok=True)
            
            # 打印当前CUDA是否可用
            logger.info(f"CUDA是否可用: {torch.cuda.is_available()}")
            if torch.cuda.is_available():
                logger.info(f"当前CUDA设备: {torch.cuda.get_device_name(0)}")
                logger.info(f"可用GPU内存: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
            
            logger.info("开始从本地路径加载语言模型...")
            try:
                # 使用AutoModelForCausalLM加载本地模型
                model = AutoModelForCausalLM.from_pretrained(
                    config.LANGUAGE_MODEL_PATH,
                    device_map="auto",
                    torch_dtype=torch.float16,
                    cache_dir=os.environ["TRANSFORMERS_CACHE"]
                )
                
                tokenizer = AutoTokenizer.from_pretrained(
                    config.LANGUAGE_MODEL_PATH, 
                    cache_dir=os.environ["TRANSFORMERS_CACHE"]
                )
                
            except Exception as e:
                logger.warning(f"使用默认方式加载模型失败，尝试其他配置: {e}")
                # 尝试使用备选配置从远程加载
                model = AutoModelForCausalLM.from_pretrained(
                    "HRLB/driver-cot-model",
                    device_map="auto",
                    from_tf=True,  # 尝试从TensorFlow模型加载
                    cache_dir=os.environ["TRANSFORMERS_CACHE"]
                )
                
                tokenizer = AutoTokenizer.from_pretrained(
                    "HRLB/driver-cot-model", 
                    cache_dir=os.environ["TRANSFORMERS_CACHE"]
                )
            
            logger.info("语言模型加载成功，准备推理配置...")
            language_model = model
            model_loading_in_progress = False  # 设置加载完成状态
            return True
        except Exception as e:
            model_loading_in_progress = False  # 设置加载失败状态
            logger.error(f"语言模型加载失败，错误信息: {e}")
            logger.error(traceback.format_exc())
            return False

def preload_models():
    """
    预加载所有模型
    """
    # 启动模型加载线程
    logger.info("启动模型预加载...")
    
    # 创建并启动YOLO模型加载线程
    yolo_thread = threading.Thread(target=load_yolo_model)
    yolo_thread.daemon = True
    yolo_thread.start()
    
    # 创建并启动语言模型加载线程
    llm_thread = threading.Thread(target=load_language_model)
    llm_thread.daemon = True
    llm_thread.start()
    
    return True

def get_yolo_model():
    """
    获取YOLO模型，如果未加载则先加载
    """
    global yolo_model
    if yolo_model is None:
        load_yolo_model()
    return yolo_model

def call_language_model(prompt, stream=False):
    """
    调用语言模型进行推理
    :param prompt: 提示文本
    :param stream: 是否使用流式输出
    :return: 如果stream=False返回完整文本，否则返回TextIteratorStreamer
    """
    global language_model, tokenizer, model_loading_in_progress
    
    try:
        # 如果模型未加载且未在加载中，尝试加载
        if language_model is None and not model_loading_in_progress:
            if not load_language_model():
                return "模型加载失败，请稍后再试。"
        
        # 如果模型正在加载中
        if model_loading_in_progress:
            return "模型正在加载中，请稍后再试。"
            
        # 如果模型加载失败
        if language_model is None:
            return "模型尚未准备好，请刷新页面或稍后再试。"
        
        logger.info(f"向模型发送请求: {prompt[:50]}...")
        
        # 构建完整的聊天上下文
        messages = [
            {"role": "user", "content": prompt}
        ]
        
        # 将消息转换为模型可以接受的格式
        encoded_input = tokenizer.apply_chat_template(
            messages, 
            return_tensors="pt"
        ).to(language_model.device)
        
        # 设置生成参数
        generation_config = {
            "max_new_tokens": 1024,
            "do_sample": True,
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 50,
            "repetition_penalty": 1.1
        }
        
        # 流式模式
        if stream:
            streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
            generation_kwargs = {
                "input_ids": encoded_input,
                "streamer": streamer,
                **generation_config
            }
            
            # 创建线程执行生成任务
            thread = threading.Thread(target=language_model.generate, kwargs=generation_kwargs)
            thread.start()
            
            return streamer
        
        # 非流式模式 - 使用模型生成完整回复
        with torch.no_grad():
            outputs = language_model.generate(
                encoded_input,
                **generation_config
            )
        
        # 解码生成的文本
        decoded_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # 提取模型回复（去除用户输入部分）
        response = decoded_output.split("</s>")[-1].strip()
        
        # 如果解析出现问题，尝试查找模型回复的起始位置
        if prompt in response:
            response = response.split(prompt)[-1].strip()
        
        logger.info(f"模型生成回复: {response[:50]}...")
        return response
    except Exception as e:
        logger.error(f"调用语言模型出错: {str(e)}")
        logger.error(traceback.format_exc())
        return f"模型调用出现错误: {str(e)}，请稍后再试。"