/**
 * 配置模块 - 管理API端口和其他全局配置
 */

// 默认API端口
let API_PORT = 5050;

// 获取API基础URL
function getAPIBaseUrl() {
    // 检查本地存储中是否有自定义端口设置
    const savedPort = localStorage.getItem('api_port');
    if (savedPort) {
        API_PORT = parseInt(savedPort);
    }
    
    // 确保从localStorage获取最新端口
    return `http://localhost:${API_PORT}`;
}

// 设置API端口
function setAPIPort(port) {
    if (port && !isNaN(port)) {
        API_PORT = parseInt(port);
        // 保存到本地存储，以便页面刷新后仍然生效
        localStorage.setItem('api_port', API_PORT);
        console.log(`API端口已设置为: ${API_PORT}`);
        return true;
    }
    return false;
}

// 检查API服务器状态
async function checkServerStatus(apiUrl) {
    try {
        const response = await fetch(`${apiUrl}/progress?filename=test`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        // 即使返回404也表示服务器在线，只是这个端点可能没有实现
        return { 
            status: 'online', 
            statusCode: response.status,
            message: '服务器在线'
        };
    } catch (error) {
        return { 
            status: 'offline', 
            statusCode: 0,
            message: `服务器离线或无法访问: ${error.message}`
        };
    }
}

// 添加自动端口检测功能
async function detectAPIPort(startPort, endPort) {
    console.log(`正在检测可用的API端口 (${startPort}-${endPort})...`);
    
    for (let port = startPort; port <= endPort; port++) {
        try {
            const response = await fetch(`http://localhost:${port}/progress?filename=test`, {
                method: 'GET',
                signal: AbortSignal.timeout(500) // 设置超时时间为500ms
            });
            
            console.log(`发现活动的API端口: ${port}`);
            // 找到活动端口，设置并返回
            setAPIPort(port);
            return port;
        } catch (error) {
            // 忽略错误，继续检查下一个端口
        }
    }
    
    console.log('未检测到活动的API端口');
    return null;
}

// 页面加载时执行端口检测
document.addEventListener('DOMContentLoaded', function() {
    // 如果localStorage中没有设置API端口，尝试自动检测
    if (!localStorage.getItem('api_port')) {
        detectAPIPort(5050, 5060).then(port => {
            if (port) {
                console.log(`自动检测到API端口: ${port}`);
                // 更新UI显示
                const debugInfo = document.getElementById('debug-info');
                if (debugInfo) {
                    const timestamp = new Date().toLocaleTimeString();
                    debugInfo.innerHTML = `[${timestamp}] 自动检测到API端口: ${port}<br>` + debugInfo.innerHTML;
                }
            }
        });
    }
});