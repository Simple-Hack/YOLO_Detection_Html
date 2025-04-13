"""
AI聊天功能处理模块
"""
import requests
import json
import logging
from flask import jsonify

logger = logging.getLogger(__name__)

def handle_ai_chat_request(query, endpoint, timeout=30):
    """
    处理AI聊天请求
    
    Args:
        query: 用户输入的问题
        endpoint: AI聊天API接口地址
        timeout: 请求超时时间(秒)
        
    Returns:
        JSON响应
    """
    if not query:
        return jsonify({"error": "请求内容不能为空"}), 400
    
    logger.info(f"接收到AI聊天请求: {query}")
    
    try:
        # 准备请求数据
        payload = {
            "query": query,
            "context": "驾驶安全助手"
        }
        
        # 发送请求到AI接口
        logger.info(f"发送请求到AI接口: {endpoint}")
        response = requests.post(
            endpoint,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=timeout
        )
        
        # 检查响应状态
        if response.status_code != 200:
            logger.error(f"AI接口返回错误: {response.status_code}, {response.text}")
            return jsonify({
                "error": f"AI服务响应错误 (状态码: {response.status_code})"
            }), 500
        
        # 解析响应数据
        try:
            result = response.json()
            logger.info(f"AI接口返回成功: {result}")
            return jsonify(result)
        except json.JSONDecodeError:
            logger.error(f"无法解析AI接口返回的JSON: {response.text}")
            return jsonify({
                "error": "AI服务返回了无效的数据格式"
            }), 500
            
    except requests.Timeout:
        logger.error("AI接口请求超时")
        return jsonify({
            "error": "AI服务请求超时，请稍后再试"
        }), 504
        
    except requests.ConnectionError:
        logger.error("无法连接到AI接口")
        return jsonify({
            "error": "无法连接到AI服务，请检查网络连接"
        }), 503
        
    except Exception as e:
        logger.error(f"处理AI聊天请求时发生错误: {str(e)}")
        return jsonify({
            "error": f"处理请求时出错: {str(e)}"
        }), 500