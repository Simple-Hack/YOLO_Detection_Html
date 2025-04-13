"""
驾驶行为检测处理模块
"""
import os
import time
import logging
import uuid
from flask import jsonify
from PIL import Image
import numpy as np

from . import models

logger = logging.getLogger(__name__)

def process_detection(file, output_dir):
    """
    处理驾驶行为检测
    
    Args:
        file: 上传的图片文件
        output_dir: 输出目录路径
        
    Returns:
        JSON响应
    """
    try:
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成唯一文件名
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{timestamp}_{unique_id}"
        
        # 保存原始图片
        input_path = os.path.join(output_dir, f"{filename}_input.jpg")
        file.save(input_path)
        
        # 设置输出图片路径
        output_path = os.path.join(output_dir, f"{filename}_result.jpg")
        
        # 加载图像
        image = Image.open(input_path)
        image_np = np.array(image)
        
        # 运行检测
        logger.info(f"开始对图片进行驾驶行为检测: {input_path}")
        result = models.run_detection(image_np, output_path)
        
        # 相对路径用于前端显示
        input_relative_path = f"outputs/{filename}_input.jpg"
        output_relative_path = f"outputs/{filename}_result.jpg"
        
        # 返回结果
        return jsonify({
            "message": "检测完成",
            "behaviors": result["behaviors"],
            "confidence": result["confidence"],
            "input_image": input_relative_path,
            "output_image": output_relative_path,
            "processing_time": result["processing_time"]
        })
        
    except Exception as e:
        logger.error(f"处理检测请求时发生错误: {str(e)}")
        return jsonify({
            "error": f"处理检测请求时出错: {str(e)}"
        }), 500