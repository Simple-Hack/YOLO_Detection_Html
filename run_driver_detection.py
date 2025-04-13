#!/usr/bin/env python
"""
驾驶行为检测系统启动脚本
"""
import sys
import os
import argparse

# 确保能够导入driver_detection包
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from driver_detection.app import run_server
from driver_detection import config

if __name__ == "__main__":
    # 添加命令行参数解析
    parser = argparse.ArgumentParser(description='驾驶行为检测系统服务器')
    parser.add_argument('-p', '--port', type=int, default=config.DEFAULT_PORT, 
                        help=f'服务器端口号(默认: {config.DEFAULT_PORT})')
    parser.add_argument('-d', '--debug', action='store_true', help='启用调试模式')
    parser.add_argument('-s', '--sample-rate', type=int, default=config.DEFAULT_SAMPLE_RATE,
                        help=f'语音识别采样率(默认: {config.DEFAULT_SAMPLE_RATE}Hz)')
    parser.add_argument('--chat-ui-layout', choices=['right', 'left'], default='right',
                        help='对话界面用户消息位置(默认: right)')
    parser.add_argument('--avatar', type=str, default=None,
                        help='自定义用户头像图片路径')
    parser.add_argument('--static-dir', type=str, default='driver_detection/static',
                        help='静态文件目录路径(默认: driver_detection/static)')
    parser.add_argument('--ai-chat-endpoint', type=str, default=config.DEFAULT_AI_CHAT_ENDPOINT,
                        help='AI聊天接口地址')
    parser.add_argument('--ai-chat-timeout', type=int, default=30,
                        help='AI聊天接口超时时间(默认: 30秒)')
    args = parser.parse_args()

    # 打印启动信息
    print("正在启动驾驶行为检测系统...")
    print(f"模型路径: {config.YOLO_MODEL_PATH}")
    print(f"语言模型路径: {config.LANGUAGE_MODEL_PATH}")
    print(f"语音识别采样率: {args.sample_rate}Hz")
    print(f"对话界面布局: 用户消息位于{args.chat_ui_layout}侧")
    print(f"静态文件目录: {args.static_dir}")
    print(f"AI聊天接口: {args.ai_chat_endpoint}")
    if args.avatar:
        print(f"自定义用户头像: {args.avatar}")
    
    # 运行服务器
    run_server(port=args.port, debug=args.debug, sample_rate=args.sample_rate, 
               chat_ui_layout=args.chat_ui_layout, user_avatar=args.avatar,
               static_dir=args.static_dir, ai_chat_endpoint=args.ai_chat_endpoint,
               ai_chat_timeout=args.ai_chat_timeout)