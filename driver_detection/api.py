"""
驾驶行为检测系统 - API模块
处理所有API路由和请求
"""
import os
import uuid
import json
import logging
import cv2
import numpy as np
import shutil
import tempfile
from collections import defaultdict
from flask import request, jsonify, send_from_directory, Response, stream_with_context
from PIL import Image

from . import config
from . import models
from . import database
from . import utils

# 配置日志
logger = logging.getLogger('api')

def register_routes(app):
    """
    注册所有API路由
    :param app: Flask应用实例
    """
    @app.route('/progress', methods=['GET'])
    def get_progress():
        """获取文件处理进度"""
        filename = request.args.get('filename', '')
        if not filename:
            return jsonify({'error': '未提供文件名'}), 400

        # 返回处理进度
        progress = utils.get_progress(filename)
        return jsonify({'progress': progress})

    @app.route('/predict', methods=['POST'])
    def predict():
        """处理图像检测请求"""
        if 'file' not in request.files:
            return jsonify({'error': '没有上传图片'}), 400

        try:
            file = request.files['file']

            # 创建唯一文件名
            file_id = str(uuid.uuid4())
            input_path = os.path.join(config.UPLOAD_FOLDER, f"{file_id}.jpg")
            output_path = os.path.join(config.OUTPUT_FOLDER, f"{file_id}_result.jpg")

            # 保存上传的图片
            file.save(input_path)

            # 确保模型已加载
            model = models.get_yolo_model()
            if model is None:
                return jsonify({'error': '模型加载失败'}), 500

            logger.info("使用车内物品检测模型")

            # 使用模型进行预测
            results = model(input_path, conf=0.25, iou=0.45)  # 将参数传递给预测函数

            # 保存标注后的图片
            for r in results:
                im_array = r.plot()  # 获取绘制后的图像数组
                im = Image.fromarray(im_array[..., ::-1])  # RGB to BGR
                im.save(output_path)

            # 提取检测结果
            detections = []
            total_count = 0
            confidence_sum = 0
            max_conf = 0

            # 分类别统计
            class_stats = defaultdict(lambda: {
                'count': 0,
                'conf_sum': 0,
                'max_conf': 0,
                'min_conf': 1.0
            })

            for r in results:
                boxes = r.boxes
                for box in boxes:
                    b = box.xyxy[0].tolist()  # 获取边界框坐标
                    conf = float(box.conf)  # 获取置信度
                    cls = int(box.cls)  # 获取类别索引
                    cls_name = model.names[cls]  # 获取类别名称

                    # 应用类别映射
                    mapped_cls_name = utils.map_class_name(cls_name)

                    detections.append({
                        'class': mapped_cls_name,
                        'confidence': conf,
                        'bbox': [b[0], b[1], b[2], b[3]]  # xmin, ymin, xmax, ymax
                    })

                    # 计算总体统计信息
                    total_count += 1
                    confidence_sum += conf
                    max_conf = max(max_conf, conf)

                    # 计算各类别统计信息 - 使用映射后的类别名称
                    cls_stat = class_stats[mapped_cls_name]
                    cls_stat['count'] += 1
                    cls_stat['conf_sum'] += conf
                    cls_stat['max_conf'] = max(cls_stat['max_conf'], conf)
                    cls_stat['min_conf'] = min(cls_stat['min_conf'], conf)

            # 计算平均可信度
            avg_conf = confidence_sum / total_count if total_count > 0 else 0

            # 处理类别统计信息
            class_details = []
            for cls_name, stats in class_stats.items():
                avg_cls_conf = stats['conf_sum'] / stats['count'] if stats['count'] > 0 else 0
                class_details.append({
                    'name': cls_name,
                    'count': stats['count'],
                    'avg_confidence': avg_cls_conf,
                    'max_confidence': stats['max_conf'],
                    'min_confidence': stats['min_conf']
                })

            # 按检测数量排序类别
            class_details.sort(key=lambda x: x['count'], reverse=True)

            # 总体统计信息
            statistics = {
                'total_count': total_count,
                'class_count': len(class_stats),  # 检测到的类别数量
                'avg_confidence': avg_conf,
                'max_confidence': max_conf,
                'class_details': class_details  # 各类别详细统计
            }

            # 确保返回正确的图像URL路径
            image_url = f"/static/outputs/{file_id}_result.jpg"

            # 生成驾驶行为建议
            detected_classes = [d['class'] for d in detections]
            if detected_classes:
                prompt = f"针对检测到的驾驶行为 {', '.join(detected_classes)}，请详细分析风险并提供专业改进建议。"
                suggestion = models.call_language_model(prompt)
            else:
                suggestion = "未检测到相关驾驶行为类别，无需建议。"

            # 清理文件夹，只保留最新的N个文件
            utils.cleanup_folder(config.UPLOAD_FOLDER)
            utils.cleanup_folder(config.OUTPUT_FOLDER)

            # 保存检测结果到数据库
            database.save_detection_to_db(file_id, file.filename, 'image', detections, statistics, image_url)

            return jsonify({
                'success': True,
                'detections': detections,
                'image_url': image_url,
                'statistics': statistics,
                'suggestions': suggestion  # 新增建议字段
            })

        except Exception as e:
            logger.error(f"处理图像过程中出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({'error': f'处理过程中出错: {str(e)}'}), 500

    @app.route('/predict_video', methods=['POST'])
    def predict_video():
        """处理视频检测请求"""
        if 'file' not in request.files:
            return jsonify({'error': '没有上传视频文件'}), 400

        try:
            file = request.files['file']

            # 创建唯一文件名
            file_id = str(uuid.uuid4())
            input_path = os.path.join(config.UPLOAD_FOLDER, f"{file_id}.mp4")
            output_path = os.path.join(config.OUTPUT_FOLDER, f"{file_id}_result.mp4")

            # 保存上传的视频
            file.save(input_path)

            # 在全局进度字典中初始化此文件的进度
            file_name = file.filename
            utils.update_progress(file_name, 0)

            # 确保模型已加载
            model = models.get_yolo_model()
            if model is None:
                return jsonify({'error': '模型加载失败'}), 500

            logger.info("使用车内物品检测模型处理视频")

            # 创建临时目录存储处理的帧
            temp_dir = os.path.join(config.TEMP_FOLDER, file_id)
            os.makedirs(temp_dir, exist_ok=True)

            # 打开视频文件
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                return jsonify({'error': '无法打开视频文件'}), 500

            # 获取视频属性
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # 创建视频写入器 - 尝试使用更兼容的编码器
            try:
                # 尝试使用 H.264 编码 (avc1)
                fourcc = cv2.VideoWriter_fourcc(*'avc1')
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

                # 检查是否成功创建
                if not out.isOpened():
                    # 回退到 mp4v
                    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                    logger.warning("使用回退编码器 mp4v")
            except Exception as e:
                logger.error(f"创建视频写入器时出错: {e}，使用默认编码器")
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

            # 处理统计信息
            all_detections = []
            frame_count = 0

            # 分类别统计
            class_stats = defaultdict(lambda: {
                'count': 0,
                'conf_sum': 0,
                'max_conf': 0,
                'min_conf': 1.0
            })

            total_count = 0
            confidence_sum = 0
            max_conf = 0

            # 用于存储连续检测的类别历史记录
            class_history = []
            # 需要连续检测的次数才确认类别
            consecutive_threshold = 8
            # 当前确认的类别
            current_confirmed_class = None

            # 存储所有帧的处理结果
            frame_results = {}

            # 跟踪每个类别在每一帧的出现情况
            class_frame_tracker = defaultdict(list)

            # 处理视频帧
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # 更新处理进度
                current_progress = frame_count / total_frames if total_frames > 0 else 0
                utils.update_progress(file_name, current_progress)

                # 保存当前帧为临时图像
                temp_frame_path = os.path.join(temp_dir, f"frame_{frame_count}.jpg")
                cv2.imwrite(temp_frame_path, frame)

                # 使用YOLO模型进行预测
                results = model(temp_frame_path, conf=0.25, iou=0.45)

                # 提取当前帧中最可能的类别（置信度最高的）
                current_frame_classes = {}

                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        b = box.xyxy[0].tolist()  # 获取边界框坐标
                        conf = float(box.conf)  # 获取置信度
                        cls = int(box.cls)  # 获取类别索引
                        cls_name = model.names[cls]  # 获取类别名称

                        # 应用类别映射
                        mapped_cls_name = utils.map_class_name(cls_name)

                        # 记录当前帧中这个类别的最高置信度
                        if mapped_cls_name not in current_frame_classes or conf > current_frame_classes[mapped_cls_name]['conf']:
                            current_frame_classes[mapped_cls_name] = {'conf': conf, 'bbox': b}

                # 确定当前帧的主要类别（置信度最高的类别）
                main_class = None
                max_conf_in_frame = 0
                for cls_name, info in current_frame_classes.items():
                    if (info['conf'] > max_conf_in_frame):
                        max_conf_in_frame = info['conf']
                        main_class = cls_name

                # 更新类别历史
                if (main_class):
                    class_history.append(main_class)
                else:
                    # 如果当前帧没有检测到任何类别，则视为"未知"
                    class_history.append("未知")

                # 只保留最近 consecutive_threshold 个检测结果
                if len(class_history) > consecutive_threshold:
                    class_history.pop(0)

                # 检查是否连续检测到相同类别
                if len(class_history) == consecutive_threshold:
                    # 检查是否所有元素都相同
                    if all(cls == class_history[0] for cls in class_history) and class_history[0] != "未知":
                        current_confirmed_class = class_history[0]

                # 存储当前帧的处理结果
                frame_results[frame_count] = {
                    'frame': frame.copy(),  # 存储原始帧
                    'confirmed_class': current_confirmed_class,  # 当前确认的类别
                    'detections': [
                        {
                            'class': cls_name,
                            'confidence': info['conf'],
                            'bbox': info['bbox']
                        }
                        for cls_name, info in current_frame_classes.items()
                    ],
                    'main_detection': {
                        'class': main_class,
                        'confidence': max_conf_in_frame if main_class else 0
                    } if main_class else None
                }

                # 更新统计信息
                for cls_name, info in current_frame_classes.items():
                    detection = {
                        'class': cls_name,
                        'confidence': info['conf'],
                        'bbox': info['bbox'],
                        'frame': frame_count
                    }
                    all_detections.append(detection)

                    # 计算统计信息
                    total_count += 1
                    confidence_sum += info['conf']
                    max_conf = max(max_conf, info['conf'])

                    # 计算各类别统计信息
                    cls_stat = class_stats[cls_name]
                    cls_stat['count'] += 1
                    cls_stat['conf_sum'] += info['conf']
                    cls_stat['max_conf'] = max(cls_stat['max_conf'], info['conf'])
                    cls_stat['min_conf'] = min(cls_stat['min_conf'], info['conf'])

                # 对于每个确认的类别，记录它出现的帧
                if current_confirmed_class:
                    class_frame_tracker[current_confirmed_class].append(frame_count)

                # 打印进度
                if frame_count % 50 == 0:
                    logger.info(f"已处理 {frame_count}/{total_frames} 帧，进度: {(frame_count / total_frames) * 100:.2f}%")
                    if current_confirmed_class:
                        logger.info(f"当前确认的类别: {current_confirmed_class}")

                frame_count += 1

                # 为了减轻内存压力，可以定期处理帧并写入视频
                if frame_count % 100 == 0 or frame_count == total_frames - 1:
                    # 处理并写入视频文件
                    for i in range(max(0, frame_count - 100), frame_count):
                        if i in frame_results:
                            # 获取当前帧信息
                            frame_data = frame_results[i]
                            annotated_frame = frame_data['frame'].copy()

                            # 在帧上标注确认的类别
                            confirmed_class = frame_data['confirmed_class']
                            if confirmed_class:
                                # 创建类别到颜色的映射，为不同类别提供不同颜色
                                class_colors = {
                                    "安全驾驶": (0, 255, 0),  # 绿色
                                    "发短信-右": (0, 0, 255),  # 红色
                                    "打电话-右": (255, 0, 0),  # 蓝色
                                    "发短信-左": (255, 255, 0),  # 青色
                                    "打电话-左": (0, 255, 255),  # 黄色
                                    "操作无线电": (255, 0, 255),  # 紫色
                                    "喝酒": (255, 165, 0),  # 橙色
                                    "向后伸手": (128, 0, 128),  # 深紫色
                                    "发型和化妆": (0, 128, 128),  # 深青色
                                    "与乘客交谈": (0, 255, 0),  # 同安全驾驶使用相同的绿色
                                }

                                # 获取类别对应的颜色，如果没有预定义则使用白色
                                color = class_colors.get(confirmed_class, (255, 255, 255))

                                # 解决中文显示问题 - 使用工具模块的函数
                                annotated_frame = utils.draw_chinese_text(
                                    annotated_frame, 
                                    f"类别: {confirmed_class}", 
                                    (10, 30), 
                                    color
                                )

                            # 绘制所有检测框
                            for detection in frame_data['detections']:
                                bbox = detection['bbox']
                                cls_name = detection['class']
                                conf = detection['confidence']

                                # 绘制边界框
                                cv2.rectangle(
                                    annotated_frame,
                                    (int(bbox[0]), int(bbox[1])),
                                    (int(bbox[2]), int(bbox[3])),
                                    (0, 255, 0),
                                    2
                                )

                                # 添加类别和置信度标签
                                label = f"{cls_name}: {conf:.2f}"
                                cv2.putText(
                                    annotated_frame,
                                    label,
                                    (int(bbox[0]), int(bbox[1]) - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX,
                                    0.5,
                                    (0, 255, 0),
                                    2
                                )

                            # 写入处理后的帧
                            out.write(annotated_frame)

                            # 从字典中移除已写入的帧，释放内存
                            del frame_results[i]

            # 表示处理已完成
            utils.update_progress(file_name, 1.0)

            # 计算每个类别的连续帧段
            class_segments = {}
            for cls_name, frames in class_frame_tracker.items():
                if not frames:
                    continue

                # 按帧排序
                frames.sort()

                # 找出连续的帧段
                segments = []
                segment_start = frames[0]
                prev_frame = frames[0]

                for frame in frames[1:]:
                    # 如果与前一帧不连续(差距大于1)，则创建新段
                    if frame > prev_frame + 1:
                        segments.append((segment_start, prev_frame))
                        segment_start = frame
                    prev_frame = frame

                # 添加最后一个段
                segments.append((segment_start, prev_frame))

                # 计算所有段的总帧数
                total_segment_frames = sum(end - start + 1 for start, end in segments)
                class_segments[cls_name] = {
                    'segments': segments,
                    'total_frames': total_segment_frames
                }

            # 计算每个类别的持续时间（秒）
            class_durations = {}
            for cls_name, segment_data in class_segments.items():
                duration_seconds = (segment_data['total_frames'] / fps) if fps > 0 else 0
                class_durations[cls_name] = round(duration_seconds, 2)  # 精确到两位小数

            # 处理类别统计信息
            class_details = []
            for cls_name, stats in class_stats.items():
                avg_cls_conf = stats['conf_sum'] / stats['count'] if stats['count'] > 0 else 0
                class_details.append({
                    'name': cls_name,
                    'count': stats['count'],
                    'avg_confidence': avg_cls_conf,
                    'max_confidence': stats['max_conf'],
                    'min_confidence': stats['min_conf'],
                    'duration': class_durations.get(cls_name, 0)  # 使用新计算的持续时间
                })

            # 按检测数量排序类别
            class_details.sort(key=lambda x: x['count'], reverse=True)

            # 计算平均可信度
            avg_conf = confidence_sum / total_count if total_count > 0 else 0

            # 总体统计信息
            statistics = {
                'total_count': total_count,
                'class_count': len(class_stats),
                'avg_confidence': avg_conf,
                'max_confidence': max_conf,
                'class_details': class_details,
                'total_frames': total_frames,
                'fps': fps,
                'video_duration': total_frames / fps if fps > 0 else 0
            }

            # 释放资源
            cap.release()
            out.release()

            # 检查输出视频是否生成成功
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                return jsonify({'error': '视频生成失败，请检查服务器日志'}), 500

            logger.info(f"视频处理完成: {output_path}, 大小: {os.path.getsize(output_path)} 字节")

            # 尝试使用 ffmpeg 进行格式转换以提高浏览器兼容性
            video_url = f"/static/outputs/{file_id}_result.mp4"  # 默认使用MP4
            
            # 视频格式转换
            try:
                webm_output_path = utils.convert_video_format(output_path, 'webm')
                if webm_output_path != output_path:  # 如果转换成功
                    # 提取文件名部分
                    webm_filename = os.path.basename(webm_output_path)
                    video_url = f"/static/outputs/{webm_filename}"
                    logger.info(f"使用WebM格式视频URL: {video_url}")
            except Exception as e:
                logger.error(f"转换视频格式时出错: {e}")
                # 继续使用原始MP4格式

            # 清理临时文件
            shutil.rmtree(temp_dir, ignore_errors=True)

            # 清理完成后从进度字典中移除
            try:
                utils.processing_progress.pop(file_name, None)
            except:
                pass

            # 清理文件夹，只保留最新的N个文件
            utils.cleanup_folder(config.UPLOAD_FOLDER)
            utils.cleanup_folder(config.OUTPUT_FOLDER)

            # 生成视频检测建议
            detected_classes = list(set([d['class'] for d in all_detections]))
            if detected_classes:
                prompt = f"视频中检测到驾驶行为 {', '.join(detected_classes)}，请分析危害并给出系统性改进方案。"
                suggestion = models.call_language_model(prompt)
            else:
                suggestion = "未检测到相关驾驶行为类别，无需建议。"

            # 保存检测结果到数据库
            database.save_detection_to_db(file_id, file.filename, 'video', all_detections, statistics, video_url)

            video_info = {
                'width': width,
                'height': height,
                'fps': fps,
                'total_frames': total_frames
            }

            return jsonify({
                'success': True,
                'detections': all_detections,
                'video_url': video_url,
                'statistics': statistics,
                'suggestions': suggestion,  # 新增建议字段
                'video_info': video_info
            })

        except Exception as e:
            # 发生错误时清除进度记录
            if 'file_name' in locals() and file_name in utils.processing_progress:
                utils.processing_progress.pop(file_name, None)

            logger.error(f"处理视频过程中出错: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({'error': f'处理视频过程中出错: {str(e)}'}), 500

    @app.route('/static/outputs/<path:filename>')
    def serve_output(filename):
        """提供静态文件"""
        return send_from_directory(config.OUTPUT_FOLDER, filename)

    @app.route('/ask', methods=['POST'])
    def ask():
        """处理文本问答请求"""
        data = request.get_json()
        question = data.get('question')
        if not question:
            return jsonify({'error': '未提供问题内容'}), 400

        # 构造prompt并调用模型
        prompt = f"用户咨询交通安全问题：{question}。请以专家身份用简洁易懂的语言详细解答。"
        answer = models.call_language_model(prompt)

        # 更新AI问答计数
        database.update_ai_question_count()

        return jsonify({'answer': answer})

    @app.route('/ask_stream', methods=['POST'])
    def ask_stream():
        """流式处理文本问答请求"""
        data = request.get_json()
        question = data.get('question')
        if not question:
            return jsonify({'error': '未提供问题内容'}), 400
        
        # 构造prompt
        prompt = f"用户咨询交通安全问题：{question}。请以专家身份用简洁易懂的语言详细解答。"
        
        # 定义一个生成器函数来逐步返回响应
        def generate_stream():
            try:
                # 获取流式响应生成器
                streamer = models.call_language_model(prompt, stream=True)
                
                # 如果是错误消息而不是流式生成器
                if isinstance(streamer, str):
                    yield "data: " + json.dumps({"text": streamer, "done": True}) + "\n\n"
                    return
                
                # 逐步获取生成的文本并发送
                for new_text in streamer:
                    # 发送当前文本片段
                    yield "data: " + json.dumps({"text": new_text, "done": False}) + "\n\n"
                
                # 发送完成标志
                yield "data: " + json.dumps({"text": "", "done": True}) + "\n\n"
                
                # 流式响应完成后更新AI问答计数
                database.update_ai_question_count()
                
            except Exception as e:
                logger.error(f"流式调用语言模型出错: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                # 发送错误消息
                yield "data: " + json.dumps({"text": f"模型调用出现错误: {str(e)}，请稍后再试。", "done": True}) + "\n\n"
        
        # 使用stream_with_context确保请求上下文在生成器执行期间可用
        return Response(stream_with_context(generate_stream()), 
                       mimetype="text/event-stream",
                       headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.route('/dashboard_stats', methods=['GET'])
    def dashboard_stats():
        """获取统计数据"""
        stats = database.get_dashboard_stats()
        if stats is None:
            return jsonify({'error': '获取统计数据失败'}), 500
        return jsonify(stats)

    @app.route('/detection_history', methods=['GET'])
    def detection_history():
        """获取历史检测记录"""
        # 获取请求参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        file_type = request.args.get('file_type')
        class_name = request.args.get('class_name')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        is_warning = request.args.get('is_warning')
        
        # 查询历史记录
        results = database.get_detection_history(
            page=page, 
            per_page=per_page, 
            file_type=file_type,
            class_name=class_name,
            start_date=start_date,
            end_date=end_date,
            is_warning=is_warning
        )
        
        if results is None:
            return jsonify({'error': '获取历史记录失败'}), 500
            
        return jsonify(results)

    logger.info("所有API路由注册完成")
    return app