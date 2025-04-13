"""
驾驶行为检测系统 - 数据库模块
负责数据库操作
"""
import sqlite3
import json
import datetime
import logging

from . import config

# 配置日志
logger = logging.getLogger('database')

def init_database():
    """初始化数据库，创建必要的表"""
    try:
        conn = sqlite3.connect(config.DB_PATH)
        cursor = conn.cursor()
        
        # 创建检测历史记录表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS detection_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id TEXT NOT NULL,
            file_name TEXT,
            file_type TEXT NOT NULL,
            detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_detections INTEGER DEFAULT 0,
            classes_detected TEXT,
            is_warning BOOLEAN DEFAULT 0,
            result_path TEXT,
            statistics TEXT
        )
        ''')
        
        # 创建检测详情表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS detection_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            history_id INTEGER,
            class_name TEXT NOT NULL,
            confidence REAL,
            count INTEGER DEFAULT 1,
            bbox TEXT,
            frame_number INTEGER DEFAULT 0,
            FOREIGN KEY (history_id) REFERENCES detection_history(id)
        )
        ''')
        
        # 创建统计数据表
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS detection_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE UNIQUE,
            total_detections INTEGER DEFAULT 0,
            warning_count INTEGER DEFAULT 0,
            ai_questions INTEGER DEFAULT 0
        )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("数据库初始化完成")
        return True
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        return False

def save_detection_to_db(file_id, file_name, file_type, detections, statistics, result_path, is_warning=False):
    """保存检测结果到数据库"""
    try:
        conn = sqlite3.connect(config.DB_PATH)
        cursor = conn.cursor()
        
        # 准备类别列表
        classes = [d['class'] for d in detections]
        unique_classes = list(set(classes))
        classes_json = json.dumps(unique_classes)
        
        # 统计信息转JSON
        stats_json = json.dumps(statistics)
        
        # 插入主记录
        cursor.execute('''
        INSERT INTO detection_history 
        (file_id, file_name, file_type, total_detections, classes_detected, is_warning, result_path, statistics)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (file_id, file_name, file_type, len(detections), classes_json, 1 if is_warning else 0, result_path, stats_json))
        
        history_id = cursor.lastrowid
        
        # 插入详细记录
        for detection in detections:
            bbox_json = json.dumps(detection.get('bbox', []))
            frame = detection.get('frame', 0)
            cursor.execute('''
            INSERT INTO detection_details 
            (history_id, class_name, confidence, bbox, frame_number)
            VALUES (?, ?, ?, ?, ?)
            ''', (history_id, detection['class'], detection['confidence'], bbox_json, frame))
        
        # 更新日期统计
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        cursor.execute('''
        INSERT INTO detection_stats (date, total_detections, warning_count) 
        VALUES (?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET 
        total_detections = total_detections + ?, 
        warning_count = warning_count + ?
        ''', (today, len(detections), 1 if is_warning else 0, len(detections), 1 if is_warning else 0))
        
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        logger.error(f"保存检测记录到数据库出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def update_ai_question_count():
    """更新AI问答次数统计"""
    try:
        conn = sqlite3.connect(config.DB_PATH)
        cursor = conn.cursor()
        
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        cursor.execute('''
        INSERT INTO detection_stats (date, ai_questions) 
        VALUES (?, 1)
        ON CONFLICT(date) DO UPDATE SET 
        ai_questions = ai_questions + 1
        ''', (today,))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"更新AI问答计数出错: {e}")
        return False

def get_dashboard_stats():
    """获取数据看板统计信息"""
    try:
        conn = sqlite3.connect(config.DB_PATH)
        cursor = conn.cursor()
        
        # 获取总检测数
        cursor.execute('SELECT COUNT(*) FROM detection_history')
        total_detections = cursor.fetchone()[0]
        
        # 获取当日检测数
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        cursor.execute('SELECT total_detections FROM detection_stats WHERE date = ?', (today,))
        result = cursor.fetchone()
        today_detections = result[0] if result else 0
        
        # 获取总预警数
        cursor.execute('SELECT COUNT(*) FROM detection_history WHERE is_warning = 1')
        total_warnings = cursor.fetchone()[0]
        
        # 获取当日预警数
        cursor.execute('SELECT warning_count FROM detection_stats WHERE date = ?', (today,))
        result = cursor.fetchone()
        today_warnings = result[0] if result else 0
        
        # 获取AI问答总数
        cursor.execute('SELECT SUM(ai_questions) FROM detection_stats')
        result = cursor.fetchone()
        total_questions = result[0] if result and result[0] else 0
        
        # 获取当日AI问答数
        cursor.execute('SELECT ai_questions FROM detection_stats WHERE date = ?', (today,))
        result = cursor.fetchone()
        today_questions = result[0] if result else 0
        
        # 获取最近7天的趋势数据
        seven_days_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime('%Y-%m-%d')
        cursor.execute('''
        SELECT date, total_detections, warning_count, ai_questions 
        FROM detection_stats 
        WHERE date >= ? 
        ORDER BY date
        ''', (seven_days_ago,))
        
        trend_data = []
        for row in cursor.fetchall():
            trend_data.append({
                'date': row[0],
                'detections': row[1],
                'warnings': row[2],
                'questions': row[3]
            })
        
        # 获取各类别统计
        cursor.execute('''
        SELECT class_name, COUNT(*) as count 
        FROM detection_details 
        GROUP BY class_name 
        ORDER BY count DESC
        ''')
        
        class_stats = []
        for row in cursor.fetchall():
            class_stats.append({
                'class': row[0],
                'count': row[1]
            })
        
        # 组装结果
        stats = {
            'total_detections': total_detections,
            'today_detections': today_detections,
            'total_warnings': total_warnings,
            'today_warnings': today_warnings,
            'total_questions': total_questions,
            'today_questions': today_questions,
            'trend_data': trend_data,
            'class_stats': class_stats
        }
        
        conn.close()
        return stats
    
    except Exception as e:
        logger.error(f"获取统计数据出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if 'conn' in locals():
            conn.close()
        return None

def get_detection_history(page=1, per_page=10, file_type=None, class_name=None, 
                          start_date=None, end_date=None, is_warning=None):
    """获取历史检测记录"""
    try:
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row  # 使结果以字典形式返回
        cursor = conn.cursor()
        
        # 构建查询语句和参数
        query = 'SELECT * FROM detection_history WHERE 1=1'
        params = []
        
        if file_type:
            query += ' AND file_type = ?'
            params.append(file_type)
        
        if class_name:
            query += ' AND json_extract(classes_detected, \'$\') LIKE ?'
            params.append(f'%{class_name}%')
        
        if start_date:
            query += ' AND date(detection_time) >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND date(detection_time) <= ?'
            params.append(end_date)
        
        if is_warning is not None:
            is_warning_value = 1 if is_warning.lower() in ('true', '1', 'yes') else 0
            query += ' AND is_warning = ?'
            params.append(is_warning_value)
        
        # 计算总记录数
        count_query = f'SELECT COUNT(*) FROM ({query})'
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # 添加分页和排序
        query += ' ORDER BY detection_time DESC LIMIT ? OFFSET ?'
        params.extend([per_page, (page - 1) * per_page])
        
        cursor.execute(query, params)
        
        results = []
        for row in cursor.fetchall():
            row_dict = dict(row)
            
            # 获取每条记录的详细检测结果
            cursor.execute('SELECT * FROM detection_details WHERE history_id = ?', (row_dict['id'],))
            details = [dict(r) for r in cursor.fetchall()]
            
            row_dict['details'] = details
            results.append(row_dict)
        
        conn.close()
        
        return {
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
            'records': results
        }
    
    except Exception as e:
        logger.error(f"获取历史检测记录出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
        if 'conn' in locals():
            conn.close()
        return None