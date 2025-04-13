# 视频检测 API 接口文档

## 接口名称：/predict_video

### 请求方式
POST

### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|-------|------|-----|------|
| file  | File | 是  | 要上传的视频文件，支持 MP4 格式 |

### 返回参数说明

```json
{
    "success": true,
    "detections": [...],
    "video_url": "/static/outputs/123456_result.mp4",
    "statistics": {...},
    "suggestions": "安全驾驶建议内容...",
    "video_info": {...},
    "warnings": [...],
    "warning_count": 2
}
```

#### 1. success
- **类型**: Boolean
- **说明**: 表示请求处理是否成功
- **示例**: `true`

#### 2. detections
- **类型**: Array
- **说明**: 包含所有检测到的行为/物体的数组
- **数组元素结构**:
  ```json
  {
    "class": "发短信-右",
    "confidence": 0.87,
    "bbox": [120, 80, 350, 200],
    "frame": 156
  }
  ```
- **字段说明**:
  - `class`: 检测到的行为类别名称
  - `confidence`: 检测置信度，范围 0-1
  - `bbox`: 边界框坐标 [x_min, y_min, x_max, y_max]
  - `frame`: 检测发生的帧号

#### 3. video_url
- **类型**: String
- **说明**: 处理后视频的访问URL路径
- **示例**: `"/static/outputs/123456_result.mp4"`

#### 4. statistics
- **类型**: Object
- **说明**: 检测统计信息
- **结构**:
  ```json
  {
    "total_count": 256,
    "class_count": 3,
    "avg_confidence": 0.76,
    "max_confidence": 0.92,
    "class_details": [
      {
        "name": "安全驾驶",
        "count": 180,
        "avg_confidence": 0.78,
        "max_confidence": 0.92,
        "min_confidence": 0.65,
        "duration": 12.5
      },
      // 其他类别...
    ],
    "total_frames": 300,
    "fps": 24,
    "video_duration": 12.5
  }
  ```
- **字段说明**:
  - `total_count`: 检测到的总对象数
  - `class_count`: 检测到的不同类别数量
  - `avg_confidence`: 所有检测的平均置信度
  - `max_confidence`: 最高置信度
  - `class_details`: 各类别详细统计
    - `name`: 类别名称
    - `count`: 检测次数
    - `avg_confidence`: 该类别平均置信度
    - `max_confidence`: 该类别最高置信度
    - `min_confidence`: 该类别最低置信度
    - `duration`: 该类别在视频中的持续时间(秒)
  - `total_frames`: 视频总帧数
  - `fps`: 视频帧率
  - `video_duration`: 视频总时长(秒)

#### 5. suggestions
- **类型**: String
- **说明**: 基于检测结果的安全驾驶建议
- **示例**: `"您在驾驶过程中存在使用手机的行为，这可能会分散注意力并增加事故风险。建议您在驾驶时将手机放在无法触及的地方，专注于驾驶。"`

#### 6. video_info
- **类型**: Object
- **说明**: 视频基本信息
- **结构**:
  ```json
  {
    "width": 1280,
    "height": 720,
    "fps": 24,
    "total_frames": 300
  }
  ```
- **字段说明**:
  - `width`: 视频宽度(像素)
  - `height`: 视频高度(像素)
  - `fps`: 视频帧率
  - `total_frames`: 视频总帧数

#### 7. warnings
- **类型**: Array
- **说明**: 视频中的预警信息列表
- **数组元素结构**:
  ```json
  {
    "start_frame": 120,
    "end_frame": 178,
    "duration": 2.4,
    "warning_class": "发短信-右"
  }
  ```
- **字段说明**:
  - `start_frame`: 预警开始帧
  - `end_frame`: 预警结束帧
  - `duration`: 持续时间(秒)
  - `warning_class`: 导致预警的行为类别

#### 8. warning_count
- **类型**: Number
- **说明**: 视频中预警的总数量
- **示例**: `2`

### 预警机制说明

视频预警是指当检测到连续多帧的危险驾驶行为时，系统会标记为一个预警事件。具体实现参考以下规则：

1. 当系统检测到**连续30帧或更多**的非"安全驾驶"行为时，会生成一条预警记录
2. 每条预警记录包含开始帧、结束帧、持续时间和行为类别
3. 如果驾驶行为类别发生变化，会视为一个新的行为序列
4. 预警判定阈值(连续帧数)可由后端配置，默认为30帧

### 常见行为类别

系统可检测的驾驶行为类别包括但不限于：
- 安全驾驶
- 发短信-右
- 打电话-右
- 发短信-左
- 打电话-左
- 操作无线电
- 喝酒
- 向后伸手
- 发型和化妆
- 与乘客交谈

### 实现函数

后端需实现 `detect_warnings` 函数，分析连续帧中的行为并生成预警信息：

```python
def detect_warnings(frame_results, fps, consecutive_threshold=30):
    """
    检测视频中的预警情况
    参数:
        frame_results: 包含每一帧检测结果的字典
        fps: 视频帧率
        consecutive_threshold: 连续非安全驾驶的帧数阈值，超过该值则触发一次预警
    返回:
        warnings: 包含预警信息的列表，每个元素包含:
            - start_frame: 预警开始帧
            - end_frame: 预警结束帧
            - duration: 持续时间(秒)
            - warning_class: 导致预警的行为类别
    """
    # 实现预警检测逻辑...
    return warnings
```

### 错误码

| 错误码 | 说明 |
|-------|------|
| 400   | 参数错误，如未提供视频文件 |
| 500   | 服务器内部错误，如模型加载失败 |

### 调用示例

```python
# 在predict_video函数末尾
# 获取预警信息
warnings = detect_warnings(frame_results, fps)
warning_count = len(warnings)

# 返回结果
return jsonify({
    'success': True,
    'detections': all_detections,
    'video_url': video_url,
    'statistics': statistics,
    'suggestions': suggestion,
    'video_info': video_info,
    'warnings': warnings,
    'warning_count': warning_count
})
```