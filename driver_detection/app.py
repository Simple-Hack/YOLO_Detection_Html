"""
驾驶行为检测系统Flask应用配置和启动模块
"""
import sys
import os
import argparse
import logging
from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_cors import CORS

from . import config
from . import models
from . import database
from . import api
from . import utils
from .ai_chat import handle_ai_chat_request
from .detection import process_detection

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(config.BASE_DIR, 'app.log'))
    ]
)
logger = logging.getLogger('app')

def create_app(sample_rate=config.DEFAULT_SAMPLE_RATE, 
              chat_ui_layout="right", 
              user_avatar=None):
    """创建Flask应用
    
    Args:
        sample_rate: 语音识别采样率
        chat_ui_layout: 聊天界面布局(用户消息位置)
        user_avatar: 用户头像路径
        
    Returns:
        Flask应用实例
    """
    app = Flask(__name__)
    CORS(app)  # 允许跨域请求
    
    # 静态文件路径配置
    app.static_folder = os.path.dirname(config.OUTPUT_FOLDER)
    app.static_url_path = '/static'
    
    # 初始化数据库
    database.init_database()
    
    # 预加载模型
    models.preload_models()
    
    # 注册API路由
    api.register_routes(app)
    
    app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB限制
    app.config['SECRET_KEY'] = 'driver_detection_secret_key'
    app.config['SAMPLE_RATE'] = sample_rate
    app.config['CHAT_UI_LAYOUT'] = chat_ui_layout
    app.config['USER_AVATAR'] = user_avatar
    
    return app

def run_server(port=config.DEFAULT_PORT, debug=False, sample_rate=config.DEFAULT_SAMPLE_RATE, 
              chat_ui_layout="right", user_avatar=None, static_dir='driver_detection/static',
              ai_chat_endpoint=config.DEFAULT_AI_CHAT_ENDPOINT, ai_chat_timeout=30):
    """运行Flask服务器
    
    Args:
        port: 服务器端口
        debug: 是否启用调试模式
        sample_rate: 语音识别采样率
        chat_ui_layout: 聊天界面布局(用户消息位置)
        user_avatar: 用户头像路径
        static_dir: 静态文件目录
        ai_chat_endpoint: AI聊天接口
        ai_chat_timeout: AI聊天超时时间
    """
    if not utils.is_port_available(port):
        # 如果指定端口不可用，尝试查找可用端口
        available_port = utils.find_available_port(port + 1)
        if available_port:
            logger.info(f"端口 {port} 已被占用，将使用端口 {available_port}")
            port = available_port
        else:
            logger.error(f"错误：无法找到可用端口。请尝试手动指定一个端口")
            sys.exit(1)
    
    app = Flask(__name__, 
                static_folder=static_dir,
                template_folder='templates')
    CORS(app)  # 允许跨域请求
    
    # 存储配置参数
    app.config['SAMPLE_RATE'] = sample_rate
    app.config['CHAT_UI_LAYOUT'] = chat_ui_layout
    app.config['USER_AVATAR'] = user_avatar
    app.config['AI_CHAT_ENDPOINT'] = ai_chat_endpoint
    app.config['AI_CHAT_TIMEOUT'] = ai_chat_timeout
    app.config['OUTPUT_DIR'] = os.path.join(static_dir, 'outputs')
    
    # 确保输出目录存在
    os.makedirs(app.config['OUTPUT_DIR'], exist_ok=True)
    
    # 初始化数据库
    database.init_database()
    
    # 预加载模型
    models.preload_models()
    
    # 注册API路由
    api.register_routes(app)
    
    app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB限制
    app.config['SECRET_KEY'] = 'driver_detection_secret_key'
    
    # 路由：首页
    @app.route('/')
    def index():
        return render_template('index.html',
                               sample_rate=app.config['SAMPLE_RATE'],
                               chat_ui_layout=app.config['CHAT_UI_LAYOUT'],
                               user_avatar=app.config['USER_AVATAR'],
                               ai_chat_endpoint=app.config['AI_CHAT_ENDPOINT'])
    
    # 路由：处理AI聊天请求
    @app.route('/api/chat', methods=['POST'])
    def ai_chat():
        data = request.json
        query = data.get('query', '')
        return handle_ai_chat_request(query, app.config['AI_CHAT_ENDPOINT'], app.config['AI_CHAT_TIMEOUT'])
    
    # 路由：处理驾驶行为检测
    @app.route('/api/detect', methods=['POST'])
    def detect():
        if 'image' not in request.files:
            return jsonify({'error': '没有上传图像'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        return process_detection(file, app.config['OUTPUT_DIR'])
    
    # 路由：输出图像访问
    @app.route('/outputs/<path:filename>')
    def output_file(filename):
        # 从输出目录中提供文件
        output_dir = os.path.basename(app.config['OUTPUT_DIR'])
        return send_from_directory(os.path.dirname(app.config['OUTPUT_DIR']), f"{output_dir}/{filename}")
    
    logger.info(f"服务已启动在 http://localhost:{port}")
    try:
        app.run(debug=debug, host='0.0.0.0', port=port)
    except OSError as e:
        logger.error(f"启动服务器时出错: {e}")
        logger.error("可能的原因：")
        logger.error("1. 端口已被占用")
        logger.error("2. 没有足够的权限绑定到该端口")
        sys.exit(1)

if __name__ == '__main__':
    # 添加命令行参数解析
    parser = argparse.ArgumentParser(description='驾驶行为检测系统服务器')
    parser.add_argument('-p', '--port', type=int, default=config.DEFAULT_PORT, help=f'服务器端口号(默认: {config.DEFAULT_PORT})')
    parser.add_argument('-d', '--debug', action='store_true', help='启用调试模式')
    parser.add_argument('-s', '--sample_rate', type=int, default=config.DEFAULT_SAMPLE_RATE, help=f'语音识别采样率(默认: {config.DEFAULT_SAMPLE_RATE})')
    parser.add_argument('-l', '--chat_ui_layout', type=str, default="right", help='聊天界面布局(用户消息位置)')
    parser.add_argument('-a', '--user_avatar', type=str, help='用户头像路径')
    parser.add_argument('--static_dir', type=str, default='driver_detection/static', help='静态文件目录')
    parser.add_argument('--ai_chat_endpoint', type=str, default=config.DEFAULT_AI_CHAT_ENDPOINT, help='AI聊天接口')
    parser.add_argument('--ai_chat_timeout', type=int, default=30, help='AI聊天超时时间')
    args = parser.parse_args()

    # 运行服务器
    run_server(port=args.port, debug=args.debug, sample_rate=args.sample_rate, chat_ui_layout=args.chat_ui_layout, user_avatar=args.user_avatar, static_dir=args.static_dir, ai_chat_endpoint=args.ai_chat_endpoint, ai_chat_timeout=args.ai_chat_timeout)