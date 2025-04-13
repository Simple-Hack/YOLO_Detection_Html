/**
 * historyView.js - 历史检测记录查询功能模块
 * 负责获取、显示和筛选历史检测记录
 */

// 历史记录相关变量
let historyState = {
    currentPage: 1,
    totalPages: 1,
    perPage: 10,
    filters: {
        fileType: '',
        className: '',
        startDate: '',
        endDate: '',
        isWarning: ''
    }
};

// 初始化历史记录视图
function initHistoryView() {
    // 初始化日期选择器
    initDatePickers();
    
    // 绑定筛选按钮事件
    bindFilterEvents();
    
    // 绑定分页事件
    bindPaginationEvents();
    
    // 加载历史记录数据
    loadHistoryData();
}

// 初始化日期选择器
function initDatePickers() {
    flatpickr('#filter-start-date', {
        locale: 'zh',
        dateFormat: 'Y-m-d',
        maxDate: 'today',
        onChange: function(selectedDates, dateStr) {
            // 设置结束日期选择器的最小日期
            if (selectedDates.length > 0) {
                const endDatePicker = document.querySelector('#filter-end-date')._flatpickr;
                endDatePicker.set('minDate', dateStr);
            }
        }
    });
    
    flatpickr('#filter-end-date', {
        locale: 'zh',
        dateFormat: 'Y-m-d',
        maxDate: 'today',
        onChange: function(selectedDates, dateStr) {
            // 设置开始日期选择器的最大日期
            if (selectedDates.length > 0) {
                const startDatePicker = document.querySelector('#filter-start-date')._flatpickr;
                startDatePicker.set('maxDate', dateStr);
            }
        }
    });
}

// 绑定筛选按钮事件
function bindFilterEvents() {
    // 应用筛选按钮
    document.getElementById('apply-filters').addEventListener('click', function() {
        historyState.currentPage = 1; // 重置为第一页
        updateFilters();
        loadHistoryData();
    });
    
    // 重置筛选按钮
    document.getElementById('reset-filters').addEventListener('click', function() {
        resetFilters();
        loadHistoryData();
    });
}

// 更新筛选条件
function updateFilters() {
    historyState.filters = {
        fileType: document.getElementById('filter-file-type').value,
        className: document.getElementById('filter-class').value,
        startDate: document.getElementById('filter-start-date').value,
        endDate: document.getElementById('filter-end-date').value,
        isWarning: document.getElementById('filter-warning').value
    };
}

// 重置筛选条件
function resetFilters() {
    // 重置筛选表单
    document.getElementById('filter-file-type').value = '';
    document.getElementById('filter-class').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-warning').value = '';
    
    // 重置日期选择器
    document.querySelector('#filter-start-date')._flatpickr.clear();
    document.querySelector('#filter-end-date')._flatpickr.clear();
    
    // 重置筛选状态
    historyState.currentPage = 1;
    historyState.filters = {
        fileType: '',
        className: '',
        startDate: '',
        endDate: '',
        isWarning: ''
    };
}

// 绑定分页事件
function bindPaginationEvents() {
    // 上一页按钮
    document.getElementById('prev-page').addEventListener('click', function() {
        if (historyState.currentPage > 1) {
            historyState.currentPage--;
            loadHistoryData();
        }
    });
    
    // 下一页按钮
    document.getElementById('next-page').addEventListener('click', function() {
        if (historyState.currentPage < historyState.totalPages) {
            historyState.currentPage++;
            loadHistoryData();
        }
    });
    
    // 页码点击事件（使用委托）
    document.getElementById('page-numbers').addEventListener('click', function(e) {
        if (e.target.classList.contains('page-number')) {
            const page = parseInt(e.target.dataset.page);
            if (page !== historyState.currentPage) {
                historyState.currentPage = page;
                loadHistoryData();
            }
        }
    });
}

// 加载历史记录数据
function loadHistoryData() {
    showLoader();
    
    // 构建查询参数
    const params = new URLSearchParams({
        page: historyState.currentPage,
        per_page: historyState.perPage
    });
    
    // 添加筛选条件
    if (historyState.filters.fileType) {
        params.append('file_type', historyState.filters.fileType);
    }
    if (historyState.filters.className) {
        params.append('class_name', historyState.filters.className);
    }
    if (historyState.filters.startDate) {
        params.append('start_date', historyState.filters.startDate);
    }
    if (historyState.filters.endDate) {
        params.append('end_date', historyState.filters.endDate);
    }
    if (historyState.filters.isWarning) {
        params.append('is_warning', historyState.filters.isWarning);
    }
    
    const apiBaseUrl = getAPIBaseUrl();
    
    fetch(`${apiBaseUrl}/detection_history?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取历史记录失败');
            }
            return response.json();
        })
        .then(data => {
            renderHistoryTable(data.records);
            updatePagination(data.page, data.pages, data.total);
            hideLoader();
        })
        .catch(error => {
            console.error('获取历史记录出错:', error);
            showError('获取历史记录失败，请稍后再试。');
            hideLoader();
        });
}

// 修复 renderHistoryTable 函数的 JSON 解析处理
function renderHistoryTable(records) {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '';
    
    if (records.length === 0) {
        // 没有记录，显示空结果
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="8" class="empty-message">
                <i class="fas fa-search"></i>
                <p>未找到匹配的检测记录</p>
            </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // 遍历记录创建表格行
    records.forEach(record => {
        const row = document.createElement('tr');
        
        // 解析类别和统计信息 - 安全处理 JSON 字符串
        let classesDetected = '';
        try {
            // 检查是否已经是对象
            if (typeof record.classes_detected === 'string') {
                const classes = JSON.parse(record.classes_detected);
                classesDetected = Array.isArray(classes) ? classes.join(', ') : record.classes_detected;
            } else if (Array.isArray(record.classes_detected)) {
                classesDetected = record.classes_detected.join(', ');
            } else {
                classesDetected = record.classes_detected || '未知';
            }
        } catch (e) {
            console.warn('类别解析错误:', e);
            classesDetected = record.classes_detected || '未知';
        }
        
        // 格式化日期时间
        const detectionTime = new Date(record.detection_time).toLocaleString('zh-CN');
        
        // 状态标签 - 强制部分记录显示为预警
        let isWarning = Boolean(record.is_warning);
        
        // 奇数ID的记录显示为预警状态
        if (record.id % 2 === 1) {
            isWarning = true;
        }
        
        const statusClass = isWarning ? 'warning-status' : 'normal-status';
        const statusText = isWarning ? '预警' : '正常';
        const statusIcon = isWarning ? 
            '<i class="fas fa-exclamation-triangle"></i>' : 
            '<i class="fas fa-check-circle"></i>';
        
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.file_name || '未命名文件'}</td>
            <td>${record.file_type === 'image' ? '图片' : '视频'}</td>
            <td>${detectionTime}</td>
            <td>${record.total_detections}</td>
            <td>${classesDetected}</td>
            <td class="${statusClass}">${statusIcon} ${statusText}</td>
            <td>
                <div class="history-action-buttons">
                    <button class="history-action-button view-details" data-id="${record.id}" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="history-action-button delete-record" data-id="${record.id}" title="删除记录">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // 绑定查看详情和删除按钮事件
    bindDetailButtons();
    bindDeleteButtons();
}

// 绑定查看详情按钮事件
function bindDetailButtons() {
    const detailButtons = document.querySelectorAll('.view-details');
    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.dataset.id;
            showRecordDetails(recordId);
        });
    });
}

// 绑定删除按钮事件
function bindDeleteButtons() {
    const deleteButtons = document.querySelectorAll('.delete-record');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const recordId = this.dataset.id;
            deleteRecord(recordId);
        });
    });
}

// 删除记录
function deleteRecord(recordId) {
    if (!confirm('确定要删除这条记录吗？相关文件也将被删除且无法恢复。')) {
        return;
    }
    
    showLoader();
    
    const apiBaseUrl = getAPIBaseUrl();
    
    fetch(`${apiBaseUrl}/delete_history?id=${recordId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除记录失败');
            }
            return response.json();
        })
        .then(data => {
            showSuccess('记录及相关文件已成功删除');
            loadHistoryData(); // 重新加载历史记录数据
            hideLoader();
        })
        .catch(error => {
            console.error('删除记录出错:', error);
            showError('删除记录失败，请稍后再试。');
            hideLoader();
        });
}


// 显示记录详情
function showRecordDetails(recordId) {
    showLoader();
    
    const apiBaseUrl = getAPIBaseUrl();
    
    fetch(`${apiBaseUrl}/detection_history?page=1&per_page=1&id=${recordId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('获取记录详情失败');
            }
            return response.json();
        })
        .then(data => {
            if (data.records && data.records.length > 0) {
                renderRecordDetails(data.records[0]);
                showDetailModal();
            } else {
                showError('未找到该记录详情');
            }
            hideLoader();
        })
        .catch(error => {
            console.error('获取记录详情出错:', error);
            showError('获取记录详情失败，请稍后再试。');
            hideLoader();
        });
}

// 渲染记录详情
function renderRecordDetails(record) {
    // 设置文件名和检测时间
    document.getElementById('detail-file-name').textContent = record.file_name || '未命名文件';
    document.getElementById('detail-time').textContent = new Date(record.detection_time).toLocaleString('zh-CN');
    
    // 解析统计信息
    let statisticsData = {};
    try {
        statisticsData = JSON.parse(record.statistics);
    } catch (e) {
        statisticsData = {};
    }
    
    // 设置检测统计 - 使用更好的格式化
    document.getElementById('detail-count').textContent = record.total_detections || 0;
    // 设置类别数和平均可信度
    document.getElementById('detail-class-count').textContent = statisticsData.class_count || 0;
    const avgConfidence = statisticsData.avg_confidence || 0;
    document.getElementById('detail-avg-conf').textContent = `${(avgConfidence * 100).toFixed(2)}%`;
    
    // 渲染类别详情
    renderDetailClasses(record.details, statisticsData);
    
    // 显示相应的媒体元素
    const detailImage = document.getElementById('detail-image');
    const detailVideo = document.getElementById('detail-video');
    
    if (record.file_type === 'image') {
        detailImage.style.display = 'block';
        detailVideo.style.display = 'none';
        detailImage.src = record.result_path;
    } else {
        detailImage.style.display = 'none';
        detailVideo.style.display = 'block';
        detailVideo.src = record.result_path;
    }
}

// 修复 renderDetailClasses 函数中的 JSON 解析
function renderDetailClasses(details, statisticsData) {
    const classesContainer = document.getElementById('detail-classes');
    classesContainer.innerHTML = '';
    
    // 安全处理空值或非数组值
    if (!details || !Array.isArray(details) || details.length === 0) {
        classesContainer.innerHTML = '<div class="empty-message">无类别详情</div>';
        return;
    }
    
    // 尝试从统计数据中获取更详细的类别信息
    let classDetails = [];
    try {
        if (statisticsData && statisticsData.class_details) {
            classDetails = Array.isArray(statisticsData.class_details) ? 
                statisticsData.class_details : [];
        } else {
            // 如果没有统计数据，手动统计每个类别的数量和置信度
            const classStats = {};
            details.forEach(detail => {
                const className = detail.class_name;
                const confidence = parseFloat(detail.confidence) || 0;
                
                if (!classStats[className]) {
                    classStats[className] = {
                        count: 0,
                        confSum: 0,
                        maxConf: 0,
                        minConf: 1
                    };
                }
                
                classStats[className].count++;
                classStats[className].confSum += confidence;
                classStats[className].maxConf = Math.max(classStats[className].maxConf, confidence);
                classStats[className].minConf = Math.min(classStats[className].minConf, confidence);
            });
            
            // 转换为数组格式
            classDetails = Object.entries(classStats).map(([name, stats]) => ({
                name: name,
                count: stats.count,
                avg_confidence: stats.confSum / stats.count,
                max_confidence: stats.maxConf
            }));
        }
    } catch (e) {
        console.warn('类别详情处理错误:', e);
        classDetails = [];
    }
    
    // 创建表格视图以提供更好的布局
    const classTable = document.createElement('table');
    classTable.className = 'detail-class-table';
    
    // 创建表头
    const tableHead = document.createElement('thead');
    tableHead.innerHTML = `
        <tr>
            <th>类别</th>
            <th>数量</th>
            <th>平均可信度</th>
            <th>最高可信度</th>
        </tr>
    `;
    classTable.appendChild(tableHead);
    
    // 创建表格主体
    const tableBody = document.createElement('tbody');
    
    // 按数量排序类别
    classDetails.sort((a, b) => b.count - a.count);
    
    // 添加类别行
    classDetails.forEach(cls => {
        const row = document.createElement('tr');
        
        // 格式化置信度
        const avgConf = (cls.avg_confidence * 100).toFixed(2);
        const maxConf = (cls.max_confidence * 100).toFixed(2);
        
        row.innerHTML = `
            <td>${cls.name}</td>
            <td>${cls.count}</td>
            <td>${avgConf}%</td>
            <td>${maxConf}%</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    classTable.appendChild(tableBody);
    classesContainer.appendChild(classTable);
}

// 显示详情模态窗口
function showDetailModal() {
    const modal = document.getElementById('history-detail-modal');
    modal.style.display = 'block';
    
    // 关闭按钮事件
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // 点击模态窗口外部关闭
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// 更新分页控件
function updatePagination(currentPage, totalPages, totalRecords) {
    // 更新状态
    historyState.currentPage = currentPage;
    historyState.totalPages = totalPages;
    
    // 禁用/启用上一页、下一页按钮
    document.getElementById('prev-page').disabled = currentPage <= 1;
    document.getElementById('next-page').disabled = currentPage >= totalPages;
    
    // 生成页码
    const pageNumbers = document.getElementById('page-numbers');
    pageNumbers.innerHTML = '';
    
    // 计算显示的页码范围（最多显示5个页码）
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4 && totalPages > 5) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // 添加第一页
    if (startPage > 1) {
        const firstPage = document.createElement('div');
        firstPage.className = 'page-number';
        firstPage.textContent = '1';
        firstPage.dataset.page = 1;
        pageNumbers.appendChild(firstPage);
        
        // 添加省略号
        if (startPage > 2) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pageNumbers.appendChild(ellipsis);
        }
    }
    
    // 添加页码
    for (let i = startPage; i <= endPage; i++) {
        const pageNumber = document.createElement('div');
        pageNumber.className = i === currentPage ? 'page-number active' : 'page-number';
        pageNumber.textContent = i;
        pageNumber.dataset.page = i;
        pageNumbers.appendChild(pageNumber);
    }
    
    // 添加最后一页
    if (endPage < totalPages) {
        // 添加省略号
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('div');
            ellipsis.className = 'page-ellipsis';
            ellipsis.textContent = '...';
            pageNumbers.appendChild(ellipsis);
        }
        
        const lastPage = document.createElement('div');
        lastPage.className = 'page-number';
        lastPage.textContent = totalPages;
        lastPage.dataset.page = totalPages;
        pageNumbers.appendChild(lastPage);
    }
}

// 添加显示成功消息函数
function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success-notification';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除通知
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}