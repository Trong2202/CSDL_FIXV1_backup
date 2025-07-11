async function fetchStocks() {
    try {
      const res = await fetch('/api/stocks');
      if (!res.ok) throw new Error(`Failed to fetch stocks: ${res.statusText}`);
      const data = await res.json();
      const select = document.getElementById('stock');
      select.innerHTML = '<option value="">Chọn mã cổ phiếu</option>';
      data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.symbol;
        opt.text = d.symbol;
        select.appendChild(opt);
      }); 
      select.value = 'VCB'; // Giá trị mặc định
    } catch (error) {
      console.error('Error fetching stocks:', error);
      document.getElementById('data-table').innerHTML = '<p style="color:red;">Lỗi khi tải danh sách cổ phiếu</p>';
    }
  }

  async function fetchReportTypes() {
    try {
      const res = await fetch('/api/report_types');
      if (!res.ok) throw new Error(`Failed to fetch report types: ${res.statusText}`);
      const data = await res.json();
      const select = document.getElementById('report');
      select.innerHTML = '<option value="">Chọn loại báo cáo</option>';
      data.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.report_type_id;
        opt.text = d.report_type_name || `Loại ${d.report_type_id}: ${d.report_type}`;
        select.appendChild(opt);
      });
      select.value = '1'; // Mặc định balance_sheet
    } catch (error) {
      console.error('Error fetching report types:', error);
      document.getElementById('data-table').innerHTML = '<p style="color:red;">Lỗi khi tải danh sách loại báo cáo</p>';
    }
  }
  
  async function fetchLineItems() {
    try {
        const reportType = document.getElementById('report').value;
        if (!reportType) return;
        const res = await fetch(`/api/line_items?report_type_id=${reportType}`);
        if (!res.ok) throw new Error(`Failed to fetch line items: ${res.statusText}`);
        const data = await res.json();
        const select = document.getElementById('line');
        select.innerHTML = ''; // Xóa tùy chọn cũ
        data.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.line_item_name;
            opt.text = d.line_item_name;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error fetching line items:', error);
        document.getElementById('data-table').innerHTML = '<p style="color:red;">Lỗi khi tải danh sách chỉ tiêu</p>';
    }
}
  
  async function fetchFinancialData() {
    try {
      const stock = document.getElementById('stock').value;
      const report = document.getElementById('report').value;
      const period = document.getElementById('period').value;
      if (!stock || !report || !period) {
        document.getElementById('data-table').innerHTML = '<p style="color:red;">Vui lòng chọn đầy đủ mã cổ phiếu, loại báo cáo và khoảng thời gian</p>';
        return null;
      }
      const res = await fetch(`/api/financial_data?symbol=${stock}&report_type_id=${report}&period=${period}`);
      if (!res.ok) throw new Error(`Failed to fetch financial data: ${res.statusText}`);
      const data = await res.json();
      renderTable(data, period);
      return data;
    } catch (error) {
      console.error('Error fetching financial data:', error);
      document.getElementById('data-table').innerHTML = `<p style="color:red;">Lỗi khi tải dữ liệu tài chính: ${error.message}</p>`;
      return null;
    }
  }
  
  // Hàm định dạng số với dấu phẩy
// Hàm định dạng số với dấu phẩy
function formatNumber(value) {
    if (value === null || value === undefined) {
        console.log('Null or undefined value in formatNumber:', value);
        return '-';
    }
    const number = parseFloat(value); // Chuyển chuỗi hoặc số thành số
    if (isNaN(number)) {
        console.log('Invalid number in formatNumber:', value);
        return '-';
    }
    return number.toLocaleString('vi-VN');
}

function renderTable(data, period) {
    const container = document.getElementById('data-table');
    console.log('Data received in renderTable:', data); // Ghi log dữ liệu đầu vào

    if (data.error) {
        container.innerHTML = `<p style="color:red;">${data.error}</p>`;
        return;
    }

    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p style="color:red;">Không có dữ liệu để hiển thị</p>';
        return;
    }

    let html = '<table><tr><th>Chỉ tiêu</th>';
    if (period === 'yearly') {
        for (let y = 2020; y <= 2024; y++) {
            html += `<th>${y}</th>`;
        }
    } else {
        for (let y = 2020; y <= 2024; y++) {
            for (let q = 1; q <= 4; q++) {
                html += `<th>${y} Q${q}</th>`;
            }
        }
    }
    html += '</tr>';

    // Danh sách các dòng cần làm nổi bật
    const highlightItems = ["TỔNG TÀI SẢN", "TỔNG NỢ PHẢI TRẢ", "VỐN CHỦ SỞ HỮU", "THU NHẬP LÃI THUẦN", "TỔNG THU NHẬP HOẠT ĐỘNG","TỔNG LỢI NHUẬN TRƯỚC THUẾ","LỢI NHUẬN SAU THUẾ","LƯU CHUYỂN TIỀN TỆ RÒNG TỪ HOẠT ĐỘNG ĐẦU TƯ","LƯU CHUYỂN TIỀN TỆ RÒNG TỪ CÁC HOẠT ĐỘNG KINH DOANH"];

    data.forEach(row => {
        console.log('Row data:', row); // Ghi log mỗi hàng
        const itemText = row.item?.toUpperCase().trim();
        const isHighlight = highlightItems.includes(itemText);
        const trClass = isHighlight ? ' class="highlight-row"' : '';

        html += `<tr${trClass}><td>${row.item}</td>`;

        if (period === 'yearly') {
            for (let y = 2020; y <= 2024; y++) {
                html += `<td>${formatNumber(row[y])}</td>`;
            }
        } else {
            for (let y = 2020; y <= 2024; y++) {
                for (let q = 1; q <= 4; q++) {
                    const key = `${y}Q${q}`;
                    html += `<td>${formatNumber(row[key])}</td>`;
                }
            }
        }

        html += '</tr>';
    });

    html += '</table>';
    container.innerHTML = html;
}
function exportToExcel() {
    const container = document.getElementById('data-table');
    const table = container.querySelector('table');

    if (!table) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    // Chuyển HTML Table thành Sheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.table_to_sheet(table);

    // Thêm sheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo');

    // Xuất file
    const stock = document.getElementById('stock').value || 'bao_cao';
    const report = document.getElementById('report').value || 'report';
    const period = document.getElementById('period').value || 'period';
    const fileName = `${stock}_${report}_${period}.xlsx`;

    XLSX.writeFile(workbook, fileName);
}


  async function drawChart() {
    try {
        const lineItem = document.getElementById('line').value;
        const period = document.getElementById('period').value;
        if (!lineItem) {
            alert('Vui lòng chọn chỉ tiêu để vẽ biểu đồ!');
            return;
        }
        const data = await fetchFinancialData();
        if (!data || data.error || !Array.isArray(data)) {
            alert('Không có dữ liệu để vẽ biểu đồ!');
            return;
        }
        const item = data.find(row => row.item === lineItem);
        if (!item) {
            alert('Không có dữ liệu cho chỉ tiêu này!');
            return;
        }

        let labels;
        if (period === 'yearly') {
            labels = Object.keys(item).filter(k => k.match(/^\d{4}$/)).sort();
        } else {
            labels = Object.keys(item).filter(k => k.match(/^\d{4}Q[1-4]$/)).sort();
        }
        const values = labels.map(y => {
            const value = item[y];
            console.log(`Value for ${y}:`, value, typeof value); // Debug dữ liệu
            return value !== null && value !== undefined ? parseFloat(value) : null;
        });

        const ctx = document.getElementById('chartCanvas').getContext('2d');
        if (window.chart) {
            window.chart.destroy();
        }
        window.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: lineItem,
                    data: values,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: false,
                    tension: 0.1 // Đường cong nhẹ
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return formatNumber(value); // Định dạng trục y
                            }
                        },
                        title: {
                            display: true,
                            text: 'Giá trị (Đồng)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: period === 'yearly' ? 'Năm' : 'Quý'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        mode: 'nearest', // Hiển thị tooltip cho điểm gần nhất
                        intersect: false, // Hiển thị ngay cả khi không trỏ chính xác vào điểm
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Màu nền tooltip
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#007bff',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                console.log('Tooltip value:', value, typeof value); // Debug tooltip
                                return `${label}: ${formatNumber(value)}`;
                            },
                            title: function(context) {
                                return context[0].label; // Năm hoặc quý
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: `Biểu đồ ${lineItem}`,
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });

        document.getElementById('overlay').style.display = 'block';
        document.getElementById('chartModal').style.display = 'block';
    } catch (error) {
        console.error('Error drawing chart:', error);
        alert('Lỗi khi vẽ biểu đồ.');
    }
}
  
  function closeChart() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('chartModal').style.display = 'none';
  }
  
  // Gắn sự kiện thay đổi
  document.getElementById('report').addEventListener('change', async () => {
    await fetchLineItems();
    await fetchFinancialData();
  });
  
  document.getElementById('stock').addEventListener('change', fetchFinancialData);
  
  document.getElementById('period').addEventListener('change', fetchFinancialData);
  
  // Khởi tạo khi trang tải
  window.onload = async () => {
    await Promise.all([fetchStocks(), fetchReportTypes()]);
    await fetchLineItems();
    await fetchFinancialData();
  };