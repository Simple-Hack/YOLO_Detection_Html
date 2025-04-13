from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os

# 创建模型和卸载目录
model_cache_dir = "D:/hugging_face"
offload_dir = "D:/model_offload"
os.makedirs(model_cache_dir, exist_ok=True)
os.makedirs(offload_dir, exist_ok=True)
model, tokenizer = None,None
# 尝试直接加载模型，不使用量化
try:
    print("尝试加载模型（方法1）...")
    model = AutoModelForCausalLM.from_pretrained(
        r"D:\hugging_face\local-driver-cot-model",
        cache_dir=model_cache_dir,
        torch_dtype=torch.float16,
        device_map="auto",
        local_files_only=False,  # 强制从网络下载模型
        offload_folder=offload_dir  # 指定模型卸载目录
    )
    print("模型加载成功!")
except Exception as e:
    print(f"方法1失败: {e}")
    

# 如果成功加载模型，显示模型信息
if 'model' in locals():
    print(f"模型类型: {type(model)}")
    print(f"模型结构: {model.__class__.__name__}")
    
    # 加载分词器
    try:
        tokenizer = AutoTokenizer.from_pretrained(
            r"D:\hugging_face\local-driver-cot-model", 
            cache_dir=model_cache_dir,
            local_files_only=False  # 强制从网络下载分词器
        )
        print("分词器加载成功!")
        
        # # 保存模型和分词器到本地
        # print("保存模型和分词器到本地...")
        # local_model_path = r"D:\hugging_face\local-driver-cot-model"
        # model.save_pretrained(local_model_path)
        # tokenizer.save_pretrained(local_model_path)
        # print(f"模型和分词器已保存到: {local_model_path}")
    except Exception as e:
        print(f"分词器加载或保存失败: {e}")