import os
import time
import re

def count_lines(file_path):
    """统计文件的代码行数，去除空行和注释行"""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
        lines = file.readlines()

    # 去除空行和只有注释的行
    non_empty_lines = 0
    comment_lines = 0
    code_lines = 0
    is_comment_block = False  # 用于CSS和JS的多行注释
    
    for line in lines:
        line = line.strip()
        
        # 检查多行注释块开始和结束
        if '/*' in line and '*/' in line:
            # 单行的多行注释
            comment_lines += 1
            continue
        elif '/*' in line:
            is_comment_block = True
            comment_lines += 1
            continue
        elif '*/' in line:
            is_comment_block = False
            comment_lines += 1
            continue
        
        # 如果在多行注释块内，则计入注释行
        if is_comment_block:
            comment_lines += 1
            continue
        
        # 检查是否为空行
        if not line:
            continue
            
        # 检查是否为单行注释 (// 或 #)
        if line.startswith('//') or line.startswith('#'):
            comment_lines += 1
            continue
            
        # 如果都不是，则计入代码行
        code_lines += 1
        non_empty_lines += 1
    
    return {
        'total_lines': len(lines),
        'non_empty_lines': non_empty_lines,
        'comment_lines': comment_lines,
        'code_lines': code_lines
    }

def format_file_size(size_bytes):
    """将字节大小格式化为人类可读的格式"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"

def scan_directory(directory_path, extensions=None):
    """扫描指定目录下的所有文件，返回指定扩展名的文件统计信息"""
    if extensions is None:
        extensions = ['.js', '.css']
        
    stats = {
        ext[1:]: {
            'files': 0,
            'total_lines': 0,
            'non_empty_lines': 0,
            'comment_lines': 0,
            'code_lines': 0,
            'total_size': 0
        } for ext in extensions
    }
    
    all_files = []
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            file_extension = os.path.splitext(file)[1].lower()
            if file_extension in extensions:
                file_path = os.path.join(root, file)
                
                # 收集文件信息
                file_info = {
                    'path': file_path,
                    'extension': file_extension[1:],  # 去掉点号
                    'size': os.path.getsize(file_path),
                    'modified': os.path.getmtime(file_path)
                }
                
                all_files.append(file_info)
    
    # 统计代码信息
    for file_info in all_files:
        ext = file_info['extension']
        stats[ext]['files'] += 1
        stats[ext]['total_size'] += file_info['size']
        
        try:
            line_stats = count_lines(file_info['path'])
            stats[ext]['total_lines'] += line_stats['total_lines']
            stats[ext]['non_empty_lines'] += line_stats['non_empty_lines']
            stats[ext]['comment_lines'] += line_stats['comment_lines']
            stats[ext]['code_lines'] += line_stats['code_lines']
        except Exception as e:
            print(f"统计文件 {file_info['path']} 时出错: {e}")
    
    return stats, all_files

def print_stats(stats):
    """打印统计结果的表格"""
    print("\n" + "=" * 80)
    print(f"{'文件类型':<10} {'文件数量':<10} {'总行数':<10} {'代码行数':<10} {'注释行数':<10} {'总大小':<15}")
    print("-" * 80)
    
    total_files = 0
    total_lines = 0
    total_code_lines = 0
    total_comment_lines = 0
    total_size = 0
    
    for ext, data in stats.items():
        if data['files'] > 0:
            print(f"{ext:<10} {data['files']:<10} {data['total_lines']:<10} {data['code_lines']:<10} "
                  f"{data['comment_lines']:<10} {format_file_size(data['total_size']):<15}")
            
            total_files += data['files']
            total_lines += data['total_lines']
            total_code_lines += data['code_lines']
            total_comment_lines += data['comment_lines']
            total_size += data['total_size']
    
    print("-" * 80)
    print(f"{'总计':<10} {total_files:<10} {total_lines:<10} {total_code_lines:<10} "
          f"{total_comment_lines:<10} {format_file_size(total_size):<15}")
    print("=" * 80)

def print_top_files(all_files, top_n=10):
    """打印最大的N个文件"""
    all_files.sort(key=lambda x: x['size'], reverse=True)
    
    print(f"\n最大的{top_n}个文件:")
    print(f"{'序号':<5} {'文件路径':<60} {'大小':<10} {'类型':<5}")
    print("-" * 80)
    
    for i, file_info in enumerate(all_files[:top_n]):
        print(f"{i+1:<5} {file_info['path'][-60:]:<60} {format_file_size(file_info['size']):<10} {file_info['extension']:<5}")

def main():
    # 获取当前目录
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.join(current_dir, 'simple_html')
    
    extensions = ['.js', '.css']
    print(f"开始统计 {project_dir} 目录下的 {', '.join(extensions)} 文件...")
    
    start_time = time.time()
    stats, all_files = scan_directory(project_dir, extensions)
    end_time = time.time()
    
    print_stats(stats)
    print_top_files(all_files)
    
    # 打印简单的摘要信息
    total_code_lines = sum(data['code_lines'] for data in stats.values())
    print(f"\n总结: 项目共有 {total_code_lines} 行有效代码 (JS + CSS)")
    print(f"统计用时: {end_time - start_time:.2f} 秒")

if __name__ == "__main__":
    main()