/**
 * dashboard.js - 数据看板功能模块
 * 负责获取和显示数据看板的统计信息和趋势图表
 */

// 数据看板相关变量
let dashboardCharts = {
    trendChart: null,
    warningRatioChart: null,
    behaviorDistributionChart: null
};

// 初始化数据看板
function initDashboard() {
    // 获取看板数据
    fetchDashboardStats();
    
    // 设置自动刷新（每5分钟刷新一次）
    setInterval(fetchDashboardStats, 5 * 60 * 1000);
}

// 获取看板统计数据
function fetchDashboardStats() {
    showLoader();
    
    const apiBaseUrl = getAPIBaseUrl();
    
    fetch(`${apiBaseUrl}/dashboard_stats`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取数据看板统计信息失败');
            }
            return response.json();
        })
        .then(data => {
            updateDashboardStats(data);
            updateDashboardCharts(data);
            hideLoader();
        })
        .catch(error => {
            console.error('获取数据看板统计信息出错:', error);
            showError('获取数据看板统计信息失败，请稍后再试。');
            hideLoader();
        });
}

// 更新看板统计数字
function updateDashboardStats(data) {
    // 更新统计卡片的数值
    document.getElementById('dash-total-detections').textContent = data.total_detections;
    document.getElementById('dash-today-detections').textContent = data.today_detections;
    document.getElementById('dash-total-warnings').textContent = data.total_warnings;
    document.getElementById('dash-today-warnings').textContent = data.today_warnings;
    document.getElementById('dash-total-questions').textContent = data.total_questions;
    document.getElementById('dash-today-questions').textContent = data.today_questions;
}

// 更新看板图表
function updateDashboardCharts(data) {
    // 更新趋势图表
    updateTrendChart(data.trend_data);
    
    // 更新预警占比图表
    updateWarningRatioChart(data);
    
    // 更新行为分布图表
    updateBehaviorDistributionChart(data.class_stats);
}

// 更新趋势图表
function updateTrendChart(trendData) {
    const ctx = document.getElementById('detection-trend-chart').getContext('2d');
    
    // 如果图表已存在，销毁它
    if (dashboardCharts.trendChart) {
        dashboardCharts.trendChart.destroy();
    }
    
    // 准备数据
    const labels = trendData.map(item => formatDate(item.date));
    const detectionData = trendData.map(item => item.detections);
    const warningData = trendData.map(item => item.warnings);
    
    // 创建新图表
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
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 更新预警占比图表
function updateWarningRatioChart(data) {
    const ctx = document.getElementById('warning-ratio-chart').getContext('2d');
    
    // 如果图表已存在，销毁它
    if (dashboardCharts.warningRatioChart) {
        dashboardCharts.warningRatioChart.destroy();
    }
    
    // 计算正常检测数量
    const normalDetections = data.total_detections - data.total_warnings;
    
    // 创建新图表
    dashboardCharts.warningRatioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['正常检测', '预警检测'],
            datasets: [{
                data: [normalDetections, data.total_warnings],
                backgroundColor: ['#34A853', '#EA4335'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// 更新行为分布图表
function updateBehaviorDistributionChart(classStats) {
    const ctx = document.getElementById('behavior-distribution-chart').getContext('2d');
    
    // 如果图表已存在，销毁它
    if (dashboardCharts.behaviorDistributionChart) {
        dashboardCharts.behaviorDistributionChart.destroy();
    }
    
    // 限制显示最多10个类别
    const topClasses = classStats.slice(0, 10);
    
    // 准备数据
    const labels = topClasses.map(item => item.class);
    const data = topClasses.map(item => item.count);
    
    // 为每个类别生成一个颜色
    const colors = generateChartColors(labels.length);
    
    // 创建新图表
    dashboardCharts.behaviorDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '检测数量',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `检测数量: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// 生成图表颜色
function generateChartColors(count) {
    // 预定义的颜色数组
    const colorPalette = [
        'rgba(66, 133, 244, 0.7)',   // 蓝色
        'rgba(234, 67, 53, 0.7)',    // 红色
        'rgba(52, 168, 83, 0.7)',    // 绿色
        'rgba(251, 188, 5, 0.7)',    // 黄色
        'rgba(149, 117, 205, 0.7)',  // 紫色
        'rgba(0, 172, 193, 0.7)',    // 青色
        'rgba(255, 112, 67, 0.7)',   // 橙色
        'rgba(96, 125, 139, 0.7)',   // 蓝灰色
        'rgba(158, 157, 36, 0.7)',   // 橄榄色
        'rgba(121, 85, 72, 0.7)'     // 棕色
    ];
    
    // 如果需要的颜色数量小于等于预定义的颜色数量，直接返回前n个
    if (count <= colorPalette.length) {
        return colorPalette.slice(0, count);
    }
    
    // 否则生成随机颜色
    const colors = [...colorPalette];
    for (let i = colorPalette.length; i < count; i++) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    
    return colors;
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}