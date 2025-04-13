"""
驾驶行为检测系统 - 配置模块
包含所有应用配置参数
"""
import os

# 基础路径配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)

# 目录配置
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'static', 'outputs')
TEMP_FOLDER = os.path.join(BASE_DIR, 'temp')
MODEL_CACHE_DIR = r"D:\hugging_face"

# 确保目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)

# 模型配置
YOLO_MODEL_PATH = r'D:\VsFile\html\models\car_inside_detect.pt'
LANGUAGE_MODEL_PATH = r"D:\hugging_face\local-driver-cot-model"

# 外部工具配置
FFMPEG_PATH = r"D:\ffmpeg-7.0.2-full_build\bin\ffmpeg.exe"

# 数据库配置
DB_PATH = os.path.join(BASE_DIR, 'detection_history.db')

# 文件管理配置
MAX_FILES_PER_FOLDER = 5

# API配置
DEFAULT_PORT = 5050

# 语音识别配置
DEFAULT_SAMPLE_RATE = 16000  # 默认采样率16kHz