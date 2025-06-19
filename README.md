# Dashboard Tài Chính & Chứng Khoán

Ứng dụng web hiển thị thông tin tài chính và chứng khoán sử dụng FastAPI và Jinja2 template inheritance.



```
CSDL_FIXV1_backup/
├── app/
│   ├── controllers/          # FastAPI controllers
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   └── config.py           # Configuration
├── templates/              # Jinja2 templates
│   ├── base.html          # Base template with common layout
│   ├── analytics.html     # PowerBI analytics page
│   ├── information.html   # Financial reports page
│   ├── priceboard.html    # Main dashboard page
│   ├── report.html        # Reports page
│   └── stock.html         # Stock details page
├── static/                # Static assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   └── images/           # Image assets
└── main.py               # FastAPI application entry point
```



### Base Template (`base.html`)
Template gốc chứa cấu trúc HTML chung:
- Header với logo, menu toggle, dark mode
- Sidebar navigation 
- Main content wrapper
- Common CSS và JavaScript

### Jinja2 Blocks
Template con có thể override các blocks sau:

```jinja2
{% block lang %}vi{% endblock %}                    # Ngôn ngữ trang
{% block title %}Dashboard Finance{% endblock %}    # Tiêu đề trang
{% block description %}...{% endblock %}            # Meta description
{% block keywords %}...{% endblock %}               # Meta keywords
{% block author %}...{% endblock %}                 # Meta author
{% block extra_css %}{% endblock %}                 # CSS riêng cho trang
{% block extra_head %}{% endblock %}                # Thêm vào <head>
{% block main_content %}{% endblock %}              # Nội dung chính
{% block profile_content %}{% endblock %}           # Profile section
{% block extra_scripts %}{% endblock %}             # JavaScript riêng
```

### Template Pages

#### 1. **Analytics Page** (`analytics.html`)
- Hiển thị PowerBI dashboard
- Ngôn ngữ: English
- Script: `analytics.js`

#### 2. **Information Page** (`information.html`)
- Báo cáo tài chính ngân hàng
- Form chọn cổ phiếu, loại báo cáo, khoảng thời gian
- Biểu đồ Chart.js và export Excel
- Dependencies: Chart.js, XLSX.js

#### 3. **Priceboard Page** (`priceboard.html`)
- Dashboard tổng quan với nhiều tabs
- Real-time WebSocket stock data
- Dependencies: Plotly.js, Chart.js
- CSS: `bieu_do_tron.css`, `priceboard.css`

#### 4. **Report Page** (`report.html`)
- Trang báo cáo đơn giản
- Dependencies: Chart.js

#### 5. **Stock Page** (`stock.html`)
- Thông tin chi tiết cổ phiếu
- Biểu đồ candlestick với Plotly.js
- Form chọn mã cổ phiếu
- CSS: `stock.css`

## 🚀 Cách Sử dụng

### Khởi chạy Ứng dụng
```bash
python main.py
```

### Routing Structure
```
/ (GET)                    # Trang chủ (Stock page)
/priceboard (GET)          # Dashboard tổng quan
/stock (GET)               # Chi tiết cổ phiếu
/information (GET)         # Báo cáo tài chính
/report (GET)              # Báo cáo
/analytics (GET)           # Phân tích PowerBI

# API Routes (JSON)
/api/stock/*              # Stock APIs
/api/capital/*            # Capital APIs  
/api/financial/*          # Financial data APIs
/api/market-cap           # Market cap API
/api/news/*               # News APIs
/api/index/*              # Market indices APIs

# WebSocket
/ws/stock-updates         # Real-time stock updates
```

## 🔧 Tính năng Chính

### 1. **Real-time Data**
- WebSocket connection cho cập nhật giá chứng khoán
- Tự động refresh mỗi 10 giây

### 2. **Interactive Charts**
- Plotly.js cho biểu đồ candlestick
- Chart.js cho biểu đồ tài chính
- PowerBI embedded analytics

### 3. **Responsive Design**
- Mobile-friendly layout
- Dark mode support
- Collapsible sidebar

### 4. **Data Export**
- Excel export cho báo cáo tài chính
- XLSX.js library integration

## 🎯 Ưu điểm của Template Inheritance

### DRY (Don't Repeat Yourself)
- Code chung được định nghĩa một lần trong `base.html`
- Loại bỏ duplicate HTML/CSS/JS

### Maintainability
- Thay đổi layout chung chỉ cần sửa base template
- Dễ thêm/sửa navigation menu

### Scalability
- Dễ dàng thêm trang mới bằng cách extend base template
- Consistent structure across all pages

### Performance
- Common assets được load một lần
- Efficient CSS và JavaScript organization

## 🛠️ Cách Thêm Trang Mới

1. **Tạo template mới** trong `/templates/`:
```jinja2
{% extends "base.html" %}

{% block title %}Trang Mới{% endblock %}

{% block extra_css %}
<link rel="stylesheet" href="/static/css/new-page.css">
{% endblock %}

{% block main_content %}
<h1>Nội dung trang mới</h1>
<!-- Nội dung HTML của bạn -->
{% endblock %}

{% block extra_scripts %}
<script src="/static/js/new-page.js"></script>
{% endblock %}
```
```

## 📝 Best Practices

- Đặt CSS specific vào `{% block extra_css %}`
- Đặt JavaScript specific vào `{% block extra_scripts %}`  
- Sử dụng versioning cho CSS (`?v=2`) để cache busting
- Maintain consistent naming conventions
- Document template blocks khi thêm tính năng mới 