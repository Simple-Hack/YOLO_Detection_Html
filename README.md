# 驾驶行为检测系统

<div align="center">
  <img src="res/pic/preview.jpg" alt="驾驶行为检测系统预览" width="800"/>
  <p>基于深度学习的驾驶行为实时检测与分析平台</p>
</div>

[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)](https://flask.palletsprojects.com/)
[![YOLO](https://img.shields.io/badge/YOLO-v8-yellow.svg)](https://github.com/ultralytics/ultralytics)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-R1-red.svg)](https://github.com/deepseek-ai/DeepSeek-LLM)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)

## 📖 项目概述

驾驶行为检测系统是一个全栈Web应用，结合先进的计算机视觉和自然语言处理技术，实时检测、分析和评估驾驶员行为。系统旨在提高道路安全性，减少因分心驾驶导致的交通事故。

### 🌟 主要功能

- **图像检测**：分析静态图片中的驾驶行为（打电话、发短信、喝水等）
- **视频分析**：处理视频内容，跟踪持续行为并生成时间线
- **预警识别**：自动识别并标记危险驾驶行为，生成视频时间戳
- **安全建议**：基于AI分析，提供定制化的安全驾驶建议
- **数据可视化**：通过图表和统计直观展示检测结果和趋势
- **历史记录**：查询和管理历史检测结果，支持多条件筛选
- **AI安全问答**：与AI助手进行驾驶安全知识交互，获取专业建议

## 🔧 技术架构

系统采用前后端分离架构，结合多种先进技术：

### 前端技术

- **纯原生技术栈**：使用原生HTML5/CSS3/JavaScript实现所有功能，无需额外框架
- **响应式设计**：自适应布局，确保在桌面和移动设备上均有良好体验
- **模块化JavaScript**：采用ES6模块化设计，提高代码可维护性
- **数据可视化**：使用Chart.js创建直观的统计图表和趋势分析
- **流式数据传输**：实现类似ChatGPT的流式文本生成效果
- **多媒体处理**：支持图片预览、视频播放控制和时间点跳转
- **Markdown渲染**：使用Marked.js渲染AI生成的富文本内容
- **语音识别**：集成浏览器原生Speech Recognition API进行语音输入

### 后端技术

- **Python Flask**：轻量级Web服务框架，提供RESTful API
- **YOLO模型**：采用最新的YOLOv8目标检测技术进行驾驶行为识别
- **DeepSeek LLM**：集成DeepSeek-R1-Distill-Qwen-1.5B大语言模型
- **OpenCV**：用于视频帧提取、图像处理和结果可视化
- **SQLite数据库**：轻量级关系型数据库，存储检测历史和统计数据
- **FFmpeg**：视频格式转换，确保跨浏览器兼容性
- **流式响应**：实现大语言模型的流式输出，提升用户体验

### 创新点

- **持续行为确认算法**：基于时间窗口的行为判定机制，减少误检率
- **多周期预警机制**：根据不安全驾驶行为的持续时间智能预警
- **AI思考透明化**：展示AI分析过程，增强系统可信度
- **类别映射与整合**：智能合并相似类别，提升检测准确性
- **模型回退机制**：在资源受限情况下自动切换到轻量级模型

## 🛠️ 系统组件

### 文件结构

```
simple_html/
├── index.html           # 主HTML文件
├── css/
│   ├── styles.css       # 主样式表
│   └── aiChat.css       # AI聊天界面样式
├── js/
│   ├── main.js          # 主JavaScript文件
│   ├── config.js        # 配置文件
│   ├── resultDisplay.js # 结果显示模块
│   ├── videoHandler.js  # 视频处理模块
│   ├── aiChat.js        # AI聊天功能模块
│   ├── dashboard.js     # 数据看板功能模块
│   ├── historyView.js   # 历史记录功能模块
│   └── speechRecognition.js # 语音识别模块
├── res/
│   └── pic/             # 图片资源
├── deepseek_detect_0.py # Python后端服务器
├── models/              # 模型目录
└── README.md            # 项目文档
```

### 前端模块详解

#### 1. 结果显示模块 (resultDisplay.js)

负责处理和可视化检测结果，包括：
- 动态生成类别摘要卡片，直观展示检测数量和置信度
- 智能匹配类别图标，提升用户体验
- 高级格式化功能，处理置信度百分比和持续时间
- 分页显示详细检测结果，支持大量数据浏览

```javascript
// 智能选择类别图标的代码片段
let classIcon = 'fa-box';
if (classDetail.name.toLowerCase().includes('phone') || 
   classDetail.name.toLowerCase().includes('mobile')) {
    classIcon = 'fa-mobile-alt';
} else if (classDetail.name.toLowerCase().includes('安全')) {
    classIcon = 'fa-shield-alt';
} else if (classDetail.name.toLowerCase().includes('疲劳')) {
    classIcon = 'fa-bed';
}
```

#### 2. 视频处理模块 (videoHandler.js)

专门处理视频相关功能：
- 自定义视频控制器，支持预警时间点标记
- 实现进度条交互，支持点击跳转到指定时间
- 预警列表生成，方便快速查看关键时刻
- 处理视频上传和预览功能

#### 3. AI聊天模块 (aiChat.js)

实现类ChatGPT的交互界面：
- 流式文本显示，实时展示AI回复
- Markdown解析与代码高亮
- 支持语音输入和识别
- 思考过程可视化，透明AI决策机制

```javascript
// AI思考过程处理代码片段
message = message.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
    const lines = content.split('\n');
    return lines.map(line => `> ${line}`).join('\n');
});
```

#### 4. 数据看板模块 (dashboard.js)

提供直观的统计和趋势分析：
- 实时更新核心指标卡片（总检测数、当日检测、预警数等）
- 生成检测趋势图表，展示7天历史数据
- 预警占比环形图，直观显示安全状况
- 行为分布柱状图，分析驾驶行为模式

```javascript
// 更新趋势图表代码片段
dashboardCharts.trendChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: labels,
        datasets: [
            {
                label: '检测数',
                data: detectionData,
                borderColor: '#4285F4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            },
            {
                label: '预警数',
                data: warningData,
                borderColor: '#EA4335',
                backgroundColor: 'rgba(234, 67, 53, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            }
        ]
    },
    // 配置选项...
});
```

### 后端核心功能

#### 1. 图像检测

使用YOLO模型对上传的图像进行处理：
- 检测多种驾驶行为类别：打电话、发短信、喝水等
- 计算检测置信度和统计信息
- 生成带有检测框和标签的结果图像
- 基于检测结果，使用大语言模型生成安全建议

#### 2. 视频分析

支持视频文件的详细分析：
- 逐帧处理并跟踪持续行为
- 实现基于时间窗口的行为确认算法
- 自动检测预警行为并生成时间戳
- 创建带有注释的结果视频，包含实时类别标签

```python
# 持续行为检测算法片段
# 检查是否连续检测到相同类别
if len(class_history) == consecutive_threshold:
    # 检查是否所有元素都相同
    if all(cls == class_history[0] for cls in class_history) and class_history[0] != "未知":
        current_confirmed_class = class_history[0]
```

#### 3. 预警机制

基于先进的多周期预警算法：
- 将视频分为多个时间周期
- 监测连续异常驾驶行为
- 当连续多个周期未检测到安全驾驶时触发预警
- 生成包含起止时间的预警记录

```python
# 预警检测算法片段
def detect_warnings(frame_results, fps, consecutive_period_threshold=3, frames_per_period=8):
    """
    检测视频中的预警情况，当连续多个周期都未检测到正常行驶时就预警
    """
    warnings = []
    frames = sorted([int(f) for f in frame_results.keys()])
    consecutive_abnormal_periods = 0
    start_frame_of_warning = None

    for i in range(0, len(frames), frames_per_period):
        period_frames = frames[i: i + frames_per_period]
        has_safe_driving = False

        # 检查当前周期是否存在安全驾驶行为
        for frame in period_frames:
            frame_data = frame_results[frame]
            confirmed_class = frame_data.get('confirmed_class')
            if confirmed_class == "安全驾驶":
                has_safe_driving = True
                break
```

#### 4. AI交互功能

集成DeepSeek大语言模型，提供智能分析和问答：
- 基于检测结果生成定制化驾驶安全建议
- 支持自然语言交通安全问答
- 实现流式输出，提升用户体验
- 透明展示AI思考过程，增强可信度

## 💻 API接口

系统提供多个RESTful API接口：

| 接口路径 | 方法 | 描述 | 参数 |
|---------|------|------|------|
| `/predict` | POST | 处理图像检测 | `file`: 图像文件 |
| `/predict_video` | POST | 处理视频分析 | `file`: 视频文件 |
| `/progress` | GET | 获取处理进度 | `filename`: 文件名 |
| `/ask` | POST | AI安全问答 | `question`: 问题文本 |
| `/ask_stream` | POST | 流式AI问答 | `question`: 问题文本 |
| `/dashboard_stats` | GET | 获取统计数据 | - |
| `/detection_history` | GET | 获取历史记录 | 多个筛选参数 |
| `/delete_history` | DELETE | 删除历史记录 | `id`: 记录ID |

## 📊 数据库结构

系统使用SQLite数据库存储检测历史和统计信息：

### 检测历史表 (detection_history)

存储每次检测的主要信息：

- `id`: 主键
- `file_id`: 文件唯一标识符
- `file_name`: 原始文件名
- `file_type`: 文件类型 (image/video)
- `detection_time`: 检测时间
- `total_detections`: 检测总数
- `classes_detected`: 检测到的类别 (JSON)
- `is_warning`: 是否包含预警
- `result_path`: 结果文件路径
- `statistics`: 统计信息 (JSON)

### 检测详情表 (detection_details)

存储每个检测项的详细信息：

- `id`: 主键
- `history_id`: 关联历史记录ID
- `class_name`: 类别名称
- `confidence`: 置信度
- `count`: 数量
- `bbox`: 边界框坐标 (JSON)
- `frame_number`: 视频帧号

### 统计数据表 (detection_stats)

按天存储统计信息：

- `id`: 主键
- `date`: 日期
- `total_detections`: 当日检测总数
- `warning_count`: 当日预警数
- `ai_questions`: 当日AI问答数

## 🚀 安装与使用

### 环境要求

- **操作系统**: Windows 10/11 或 Linux
- **Python**: 3.8+
- **CUDA**: 建议NVIDIA GPU + CUDA 11.4+
- **内存**: 最少8GB，推荐16GB+
- **硬盘空间**: 最少10GB (包含模型和临时文件)

### 安装步骤

1. **克隆仓库**:
   ```bash
   git clone https://github.com/yourusername/driver-behavior-detection.git
   cd driver-behavior-detection
   ```

2. **安装依赖**:
   ```bash
   pip install -r requirements.txt
   ```

3. **下载模型**:
   ```bash
   # 下载YOLO检测模型
   mkdir -p models
   # 下载链接见文档末尾
   
   # 下载语言模型
   pip install ollama  # 可选: 如果使用Ollama接口
   ollama pull deepseek-r1:1.5b  # 下载DeepSeek语言模型
   ```

4. **启动后端服务**:
   ```bash
   python deepseek_detect_0.py --port 5050
   ```

5. **启动Web服务**:
   使用任意Web服务器托管前端文件，例如:
   ```bash
   python -m http.server 8080
   ```

6. **访问系统**:
   打开浏览器，访问 `http://localhost:8080`

### 配置说明

系统支持多种配置选项:

- **后端URL**: 在`js/config.js`中设置后端API地址
- **上传限制**: 可在后端配置文件大小和类型限制
- **模型参数**: 调整检测置信度阈值和IOU阈值
- **视频处理**: 配置帧率和编码器选项

## 📝 使用案例

### 图片检测流程

1. 上传驾驶场景图片
2. 系统自动检测图片中的驾驶行为
3. 显示检测结果，包括类别、置信度和统计信息
4. 生成AI安全建议，指出潜在风险和改进方法

### 视频分析流程

1. 上传驾驶视频文件
2. 系统实时显示处理进度
3. 完成后展示标注后的视频和检测结果
4. 列出预警时间点，支持一键跳转查看
5. 生成针对视频内容的综合安全建议

### AI问答示例

用户可以向系统咨询各种驾驶安全问题:

- "开车时接电话有多危险？"
- "如何避免驾驶疲劳？"
- "雨天驾驶应注意什么？"

系统会提供专业、详细的安全建议。

## 🤝 贡献指南

我们欢迎各种形式的贡献!

1. **提交问题**: 如发现bug或有新功能建议，请提交issue
2. **代码贡献**: 
   - Fork仓库
   - 创建特性分支 (`git checkout -b feature/amazing-feature`)
   - 提交更改 (`git commit -m 'Add amazing feature'`)
   - 推送到分支 (`git push origin feature/amazing-feature`)
   - 提交Pull Request

3. **改进文档**: 文档改进也是非常重要的贡献

## 📜 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。

## 📮 联系方式

有任何问题或建议，请通过以下方式联系:

- **邮箱**: your.email@example.com
- **GitHub Issues**: [提交问题](https://github.com/yourusername/driver-behavior-detection/issues)
- **网站**: [你的网站](https://yourwebsite.com)

## 🙏 致谢

- [Ultralytics](https://github.com/ultralytics/ultralytics) - 提供YOLO模型实现
- [DeepSeek AI](https://github.com/deepseek-ai) - 提供DeepSeek-LLM模型
- [Flask](https://flask.palletsprojects.com/) - 轻量级Web服务框架
- [Chart.js](https://www.chartjs.org/) - 交互式图表库
- [Marked.js](https://marked.js.org/) - Markdown解析库
- 以及所有贡献者和使用者!

---

<div align="center">
  <p>用科技守护道路安全 🚗 💻 🛡️</p>
</div>
