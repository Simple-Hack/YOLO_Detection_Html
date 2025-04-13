"""
驾驶行为检测系统 - 工具模块
包含各种公共工具函数
"""
import os
import socket
import shutil
import logging
import cv2
import numpy as np
import subprocess
from PIL import Image
from . import config

# 配置日志
logger = logging.getLogger('utils')

# 全局变量存储文件处理进度
processing_progress = {}

def cleanup_folder(folder_path, max_files=None):
    """
    清理指定文件夹，只保留最新的max_files个文件
    :param folder_path: 文件夹路径
    :param max_files: 要保留的最大文件数，默认使用配置中的值
    """
    if max_files is None:
        max_files = config.MAX_FILES_PER_FOLDER
        
    try:
        # 获取文件夹中所有文件
        files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if
                 os.path.isfile(os.path.join(folder_path, f))]

        # 按文件修改时间排序
        files.sort(key=lambda x: os.path.getmtime(x))

        # 如果文件数量超过最大值，删除最旧的文件
        if len(files) > max_files:
            for f in files[:-max_files]:  # 保留最新的max_files个文件
                try:
                    os.remove(f)
                    logger.info(f"已删除旧文件: {f}")
                except Exception as e:
                    logger.error(f"删除文件时出错: {f}, 错误: {e}")
    except Exception as e:
        logger.error(f"清理文件夹 {folder_path} 时出错: {e}")

def is_port_available(port):
    """
    检查指定端口是否可用
    :param port: 端口号
    :return: 布尔值表示端口是否可用
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('0.0.0.0', port))
        available = True
    except:
        available = False
    finally:
        sock.close()
    return available

def find_available_port(start_port, max_attempts=100):
    """
    从start_port开始查找可用端口
    :param start_port: 起始端口号
    :param max_attempts: 最大尝试次数
    :return: 找到的可用端口，如果没找到返回None
    """
    for port in range(start_port, start_port + max_attempts):
        if is_port_available(port):
            return port
    return None

def map_class_name(cls_name):
    """
    合并特定类别到指定类别
    :param cls_name: 原始类别名称
    :return: 映射后的类别名称
    """
    # 检查类别名称是否以"与乘客交谈"开头
    if cls_name.startswith("与乘客交谈"):
        return "安全驾驶"
    return cls_name

def convert_video_format(input_path, output_format='webm'):
    """
    使用ffmpeg转换视频格式
    :param input_path: 输入视频路径
    :param output_format: 输出格式，默认为webm
    :return: 新视频路径，如果转换失败返回原路径
    """
    # 生成输出路径
    filename, _ = os.path.splitext(input_path)
    output_path = f"{filename}.{output_format}"
    
    # 尝试使用ffmpeg进行转换
    try:
        # 检查ffmpeg是否可用
        ffmpeg_cmd = None
        if os.path.exists(config.FFMPEG_PATH):
            ffmpeg_cmd = config.FFMPEG_PATH
            logger.info(f"使用配置的ffmpeg路径: {config.FFMPEG_PATH}")
        else:
            # 尝试使用系统环境中的ffmpeg
            try:
                result = subprocess.run(['ffmpeg', '-version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
                if result.returncode == 0:
                    ffmpeg_cmd = 'ffmpeg'
                    logger.info("使用环境变量中的ffmpeg")
            except Exception as e:
                logger.error(f"检查ffmpeg安装状态时出错: {e}")
        
        if not ffmpeg_cmd:
            logger.warning("未检测到ffmpeg，跳过视频格式转换")
            return input_path
        
        # 使用绝对路径以确保命令正确运行
        input_abs_path = os.path.abspath(input_path)
        output_abs_path = os.path.abspath(output_path)
        
        # 配置转换命令
        if output_format.lower() == 'webm':
            command = [
                ffmpeg_cmd, '-i', input_abs_path,
                '-c:v', 'libvpx-vp9', '-crf', '30', '-b:v', '0',
                output_abs_path
            ]
        else:
            # 根据需要添加其他格式的转换命令
            command = [
                ffmpeg_cmd, '-i', input_abs_path,
                output_abs_path
            ]
        
        logger.info(f"执行命令: {' '.join(command)}")
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
        
        # 检查命令是否执行成功
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"视频转换为{output_format}成功: {output_path}")
            return output_path
        else:
            logger.error(f"视频格式转换失败，返回原始格式")
            logger.error(f"ffmpeg错误: {result.stderr.decode('utf-8', errors='ignore')}")
            return input_path
            
    except Exception as e:
        logger.error(f"尝试转换视频格式时出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return input_path

def update_progress(filename, progress):
    """
    更新文件处理进度
    :param filename: 文件名
    :param progress: 进度值 (0-1)
    """
    global processing_progress
    processing_progress[filename] = progress

def get_progress(filename):
    """
    获取文件处理进度
    :param filename: 文件名
    :return: 进度值 (0-1)，如果文件不在进度字典中返回0
    """
    global processing_progress
    return processing_progress.get(filename, 0)

def draw_chinese_text(image, text, position, color, font_size=36):
    """
    在图像上绘制中文文本
    :param image: OpenCV格式的图像
    :param text: 要绘制的文本
    :param position: 文本位置，元组 (x, y)
    :param color: 文本颜色，元组 (B, G, R)
    :param font_size: 字体大小
    :return: 绘制文本后的图像
    """
    try:
        # 将OpenCV图像转换为PIL图像
        img_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img_pil)

        # 尝试加载中文字体
        font_paths = [
            'C:\\Windows\\Fonts\\simhei.ttf',  # 黑体
            'C:\\Windows\\Fonts\\simsun.ttc',  # 宋体
            'C:\\Windows\\Fonts\\simkai.ttf',  # 楷体
            'C:\\Windows\\Fonts\\msyh.ttc',  # 微软雅黑
        ]

        font = None
        for path in font_paths:
            try:
                if os.path.exists(path):
                    font = ImageFont.truetype(path, font_size)
                    break
            except:
                continue

        if font is None:
            # 如果没有找到系统字体，尝试使用PIL默认字体
            font = ImageFont.load_default()

        # 绘制文本，添加黑色轮廓使文本更清晰
        x, y = position
        # 首先绘制黑色边框
        for offset_x, offset_y in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
            draw.text((x + offset_x, y + offset_y), text, fill=(0, 0, 0), font=font)

        # 然后绘制彩色文本
        draw.text(position, text, fill=color[::-1], font=font)  # PIL使用RGB而非BGR

        # 将PIL图像转回OpenCV格式
        return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

    except Exception as e:
        logger.error(f"绘制中文文本出错: {e}")
        # 如果中文渲染失败，退回到OpenCV的英文渲染
        cv2.putText(
            image,
            text,
            position,
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            color,
            2
        )
        return image