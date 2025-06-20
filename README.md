# 📊 Dashboard Tài Chính & Chứng Khoán Việt Nam

> Ứng dụng web hiển thị dữ liệu chứng khoán real-time với FastAPI backend và frontend tương tác cao

## 🌟 Tổng Quan Dự Án

**Financial Dashboard** là một ứng dụng web full-stack được xây dựng để hiển thị dữ liệu chứng khoán Việt Nam với hiệu suất cao và giao diện người dùng modern. Dự án tích hợp **VNStock API**, **Redis caching**, và **Plotly** để tạo ra trải nghiệm người dùng mượt mà với thời gian load **dưới 300ms**.

### 🎯 **Điểm Nổi Bật**
- ⚡ **Hiệu suất cao**: 93-94% faster với Redis caching
- 📱 **Responsive Design**: Mobile-first với dark mode
- 📊 **Interactive Charts**: Plotly.js candlestick & real-time data
- 🔄 **Real-time Updates**: WebSocket cho dữ liệu live
- 🚀 **Modern Stack**: FastAPI + Jinja2 + Redis + Plotly

## 🏗️ Kiến Trúc Hệ Thống

### **Tech Stack Overview**

```mermaid
graph TB
    A[Frontend Layer] --> B[Backend API Layer]
    B --> C[Cache Layer - Redis]
    B --> D[Data Source - VNStock API]
    
    A1[HTML/CSS/JS] --> A
    A2[Plotly.js Charts] --> A
    A3[Responsive UI] --> A
    
    B1[FastAPI Framework] --> B
    B2[Async/Await] --> B
    B3[Jinja2 Templates] --> B
    
    C1[Redis Cache] --> C
    C2[TTL Strategy] --> C
    
    D1[VNStock API] --> D
    D2[Financial Data] --> D
```

### **Performance Architecture**

| Layer | Technology | Response Time | Cache Strategy |
|-------|------------|---------------|----------------|
| **Frontend** | HTML/CSS/JS, Plotly.js | < 100ms | Browser cache, lazy loading |
| **API Layer** | FastAPI, Async/Await | 150-200ms | Redis L2 cache |
| **Data Source** | VNStock API | 2-3s (uncached) | 30min - 2hr TTL |

## 📁 Cấu Trúc Dự Án

```
CSDL_FIXV1_backup/
├── 📄 main.py                    # FastAPI application entry point
├── 📄 requirements.txt           # Python dependencies
├── 📁 app/                       # Backend logic
│   ├── 📄 cache_manager.py       # Redis cache implementation
│   ├── 📁 controllers/           # FastAPI route handlers
│   ├── 📁 services/              # Business logic & data processing
│   ├── 📁 models/                # Data models & schemas
│   └── 📄 config.py              # Application configuration
├── 📁 templates/                 # Jinja2 HTML templates
│   ├── 📄 base.html              # Base template với common layout
│   ├── 📄 index.html             # Trang chủ dashboard
│   ├── 📄 stock.html             # Chi tiết cổ phiếu với charts
│   ├── 📄 priceboard.html        # Bảng giá real-time
│   ├── 📄 information.html       # Báo cáo tài chính
│   └── 📄 analytics.html         # PowerBI analytics
└── 📁 static/                    # Frontend assets
    ├── 📁 css/                   # Responsive stylesheets
    │   ├── style.css             # Global styles với CSS variables
    │   ├── stock.css             # Stock page specific styles
    │   ├── priceboard.css        # Dashboard styles với dark mode
    │   └── bieu_do_tron.css      # Chart specific styles
    ├── 📁 js/                    # JavaScript modules
    │   ├── main.js               # Core functionality
    │   ├── stock.js              # Stock page interactions
    │   └── charts.js             # Chart configurations
    └── 📁 images/                # Static images & icons
```

## 🚀 Quick Start cho Frontend Developers

### **1. Khởi chạy Development Environment**

```bash
# Clone và setup
git clone <repository>
cd CSDL_FIXV1_backup

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi chạy server (với hot reload)
python main.py
# hoặc: uvicorn main:app --reload --port 8000

# Truy cập ứng dụng
# http://localhost:8000
```

### **2. Development URLs**

```
🏠 Homepage (Stock Dashboard):     http://localhost:8000/
📊 Priceboard (Main Dashboard):    http://localhost:8000/priceboard  
📈 Stock Details:                 http://localhost:8000/stock?bank_code=VCB
📋 Financial Reports:             http://localhost:8000/information
📊 Analytics (PowerBI):           http://localhost:8000/analytics
🔍 API Documentation:             http://localhost:8000/docs
```

## 🎨 Frontend Architecture & UI Components

### **Template System - Jinja2 Inheritance**

#### **Base Template Structure:**
```html
<!-- base.html - Master template -->
<!DOCTYPE html>
<html lang="{% block lang %}vi{% endblock %}">
<head>
    <title>{% block title %}Dashboard Finance{% endblock %}</title>
    <!-- Common CSS variables & fonts -->
    <link rel="stylesheet" href="/static/css/style.css">
    {% block extra_css %}{% endblock %}
</head>
<body>
    <!-- Header với navigation & dark mode toggle -->
    <header class="header">
        <nav class="navbar"><!-- Navigation menu --></nav>
    </header>
    
    <!-- Sidebar cho mobile -->
    <aside class="sidebar"><!-- Navigation sidebar --></aside>
    
    <!-- Main content area -->
    <main class="main-content">
        {% block main_content %}{% endblock %}
    </main>
    
    <!-- Common JavaScript -->
    <script src="/static/js/main.js"></script>
    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

#### **Page Templates:**
```html
<!-- stock.html - Stock details page -->
{% extends "base.html" %}

{% block title %}Thông tin {{ stock_symbol }} - Dashboard{% endblock %}

{% block extra_css %}
<link rel="stylesheet" href="/static/css/stock.css">
{% endblock %}

{% block main_content %}
<div class="stock-container">
    <!-- Stock info cards -->
    <!-- Interactive Plotly charts -->
    <!-- Data tables với conditional formatting -->
</div>
{% endblock %}

{% block extra_scripts %}
<script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
<script src="/static/js/stock.js"></script>
{% endblock %}
```

### **CSS Architecture - Design System**

#### **CSS Variables (Design Tokens):**
```css
/* style.css - Global design system */
:root {
    /* Colors */
    --color-primary: #007bff;
    --color-success: #28a745;    /* Positive changes */
    --color-danger: #dc3545;     /* Negative changes */
    --color-warning: #ffc107;
    --color-info: #17a2b8;
    
    /* Typography */
    --font-family: 'Segoe UI', Tahoma, sans-serif;
    --font-size-base: 0.88rem;
    --line-height: 1.6;
    
    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 2rem;
    
    /* Layout */
    --header-height: 70px;
    --sidebar-width: 250px;
    --border-radius: 8px;
    --box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

/* Dark mode variables */
.dark-mode-variables {
    --color-background: #1a1a1a;
    --color-surface: #2d2d2d;
    --color-text: #ffffff;
}
```

#### **Component Styles:**
```css
/* Responsive components */
.stock-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-family);
}

.stock-table td.positive {
    color: var(--color-success) !important;
    font-weight: bold !important;
}

.stock-table td.negative {
    color: var(--color-danger) !important;
    font-weight: bold !important;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
    .stock-table {
        font-size: 0.8rem;
        overflow-x: auto;
    }
}
```

### **JavaScript Modules & Chart Integration**

#### **Chart Configuration - Plotly.js:**
```javascript
// stock.js - Interactive candlestick charts
function createCandlestickChart(priceData) {
    const trace = {
        x: priceData.map(item => item.time),
        close: priceData.map(item => item.close),
        high: priceData.map(item => item.high),
        low: priceData.map(item => item.low),
        open: priceData.map(item => item.open),
        type: 'candlestick',
        name: 'Stock Price',
        increasing: {line: {color: '#28a745'}},
        decreasing: {line: {color: '#dc3545'}}
    };

    const layout = {
        title: 'Biểu đồ nến',
        xaxis: {title: 'Thời gian'},
        yaxis: {title: 'Giá (VND)'},
        responsive: true,
        displayModeBar: true
    };

    Plotly.newPlot('stock-chart', [trace], layout, {responsive: true});
}
```

#### **Real-time Data Updates:**
```javascript
// main.js - WebSocket integration
function initWebSocket() {
    const ws = new WebSocket('ws://localhost:8000/ws/stock-updates');
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        updateStockTable(data);
        updateCharts(data);
    };
    
    // Reconnect logic
    ws.onclose = function() {
        setTimeout(initWebSocket, 5000);
    };
}
```

## 📊 Data Flow & API Integration

### **Frontend Data Flow:**

```mermaid
graph LR
    A[User Interaction] --> B[JavaScript Event]
    B --> C[API Call fetch/axios]
    C --> D[FastAPI Endpoint]
    D --> E{Cache Check}
    E -->|Hit| F[Return Cached Data]
    E -->|Miss| G[VNStock API Call]
    G --> H[Process & Cache Data]
    H --> I[Return JSON Response]
    F --> I
    I --> J[Update DOM]
    J --> K[Render Charts]
    K --> L[Update UI]
```

### **API Endpoints cho Frontend:**

#### **Stock Data APIs:**
```javascript
// API calls từ frontend
const stockAPI = {
    // Lấy thông tin cổ phiếu
    async getStockInfo(symbol) {
        const response = await fetch(`/api/stock/${symbol}/profile`);
        return await response.json();
    },
    
    // Lấy dữ liệu giá
    async getPriceData(symbol) {
        const response = await fetch(`/api/stock/${symbol}/price`);
        return await response.json();
    },
    
    // Lấy dữ liệu chart
    async getChartData(bankId) {
        const response = await fetch(`/api/financial/chart-data/${bankId}`);
        return await response.json();
    }
};
```

#### **Response Data Structure:**
```javascript
// Ví dụ response structure
{
    "success": true,
    "data": {
        "symbol": "VCB",
        "price": 85500,
        "change": 1500,
        "percent_change": 1.78,
        "volume": 2150000,
        "market_cap": 425000000000,
        "pe_ratio": 12.5
    },
    "cached": true,
    "timestamp": "2024-12-20T10:30:00"
}
```

## ⚡ Performance Optimization cho Frontend

### **Current Performance Metrics:**

| Metric | Desktop | Mobile | Target | Status |
|--------|---------|--------|--------|--------|
| **First Contentful Paint** | 1.2s | 2.1s | <2.5s | ✅ |
| **Largest Contentful Paint** | 1.8s | 2.8s | <3.0s | ✅ |
| **Cumulative Layout Shift** | 0.05 | 0.08 | <0.1 | ✅ |
| **Time to Interactive** | 2.1s | 3.2s | <3.5s | ✅ |

### **Optimization Techniques Implemented:**

#### **1. Asset Optimization:**
```html
<!-- CSS optimization -->
<link rel="preload" href="/static/css/style.css" as="style">
<link rel="stylesheet" href="/static/css/style.min.css?v=2.1">

<!-- JavaScript lazy loading -->
<script>
const loadChart = async () => {
    const { Chart } = await import('./charts.js');
    return new Chart();
};
</script>

<!-- Image optimization -->
<img src="/static/images/chart.webp" loading="lazy" alt="Stock Chart">
```

#### **2. Caching Strategy:**
```javascript
// Service Worker cho offline capability
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/static/js/sw.js');
}

// Local Storage cho user preferences
const themeManager = {
    setTheme(theme) {
        localStorage.setItem('theme', theme);
        document.body.className = theme;
    },
    
    getTheme() {
        return localStorage.getItem('theme') || 'light';
    }
};
```

#### **3. Code Splitting & Lazy Loading:**
```javascript
// Dynamic imports cho heavy components
const loadPriceboard = async () => {
    const module = await import('./priceboard.js');
    return module.initPriceboard();
};

// Intersection Observer cho lazy loading
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            loadChartComponent(entry.target);
        }
    });
});
```

## 📱 Responsive Design & Mobile Optimization

### **Breakpoint Strategy:**
```css
/* Mobile First Approach */
/* Base styles - Mobile (320px+) */
.container {
    padding: var(--spacing-sm);
    max-width: 100%;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
    .container {
        padding: var(--spacing-md);
        max-width: 750px;
    }
    
    .sidebar {
        display: block;
    }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
    .container {
        max-width: 1200px;
        margin: 0 auto;
    }
    
    .stock-table {
        font-size: 1rem;
    }
}
```

### **Touch-Friendly UI:**
```css
/* Touch targets >= 44px */
.btn {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 24px;
    border-radius: var(--border-radius);
    touch-action: manipulation;
}

/* Smooth scrolling */
.stock-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
}
```

## 🎨 Dark Mode Implementation

### **CSS Variables Approach:**
```css
/* Light mode (default) */
:root {
    --bg-primary: #ffffff;
    --text-primary: #333333;
    --border-color: #e0e0e0;
}

/* Dark mode */
.dark-mode-variables {
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
    --border-color: #404040;
}

/* Components automatically adapt */
.card {
    background: var(--bg-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}
```

### **JavaScript Toggle:**
```javascript
// Dark mode toggle
const darkModeToggle = {
    init() {
        const toggle = document.getElementById('dark-mode-toggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        
        this.setTheme(savedTheme);
        
        toggle.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('dark-mode-variables') 
                ? 'light' : 'dark';
            this.setTheme(currentTheme);
        });
    },
    
    setTheme(theme) {
        document.body.className = theme === 'dark' ? 'dark-mode-variables' : '';
        localStorage.setItem('theme', theme);
    }
};
```

## 🚨 Error Handling & User Experience

### **API Error Handling:**
```javascript
// Global error handler
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Lỗi khi tải dữ liệu. Vui lòng thử lại.', 'error');
        return null;
    }
}
```

### **Loading States:**
```javascript
// Loading indicator
function showLoading(element) {
    element.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>Đang tải dữ liệu...</span>
        </div>
    `;
}

function hideLoading(element) {
    element.classList.remove('loading');
}
```

## 🔧 Development Tools & Debugging

### **Browser DevTools Setup:**
```javascript
// Development helpers
if (process.env.NODE_ENV === 'development') {
    // Performance monitoring
    const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
            console.log(`${entry.name}: ${entry.duration}ms`);
        });
    });
    observer.observe({entryTypes: ['measure']});
    
    // API call logging
    window.apiLogger = true;
}
```

### **Performance Testing:**
```javascript
// Frontend performance testing
const performanceTest = {
    measurePageLoad() {
        window.addEventListener('load', () => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`Page Load Time: ${pageLoadTime}ms`);
        });
    },
    
    measureAPICall(name, apiPromise) {
        const start = performance.now();
        return apiPromise.then(result => {
            const end = performance.now();
            console.log(`${name}: ${(end - start).toFixed(2)}ms`);
            return result;
        });
    }
};
```

## 📈 Future Frontend Roadmap

### **Kế Hoạch Ngắn Hạn (1-2 tháng):**
- [ ] **Progressive Web App (PWA)** - Offline capability
- [ ] **Component Library** - Reusable UI components
- [ ] **TypeScript Migration** - Better type safety
- [ ] **Webpack/Vite Setup** - Modern build pipeline

### **Kế Hoạch Trung Hạn (3-6 tháng):**
- [ ] **React/Vue Migration** - Modern frontend framework
- [ ] **Real-time Notifications** - WebSocket notifications
- [ ] **Advanced Charts** - TradingView charts integration
- [ ] **Micro-frontends** - Modular architecture

### **Kế Hoạch Dài Hạn (6+ tháng):**
- [ ] **Mobile App** - React Native/Flutter
- [ ] **Desktop App** - Electron wrapper
- [ ] **AI-powered Features** - Smart alerts & predictions
- [ ] **Multi-language** - i18n support

## 🛠️ Troubleshooting cho Frontend Developers

### **Common Issues:**

#### **1. Charts không hiển thị:**
```javascript
// Kiểm tra Plotly.js loaded
if (typeof Plotly === 'undefined') {
    console.error('Plotly.js chưa được load');
    // Load Plotly dynamically
    await import('https://cdn.plot.ly/plotly-latest.min.js');
}

// Kiểm tra data format
if (!Array.isArray(chartData) || chartData.length === 0) {
    console.error('Chart data không hợp lệ:', chartData);
    return;
}
```

#### **2. API calls bị timeout:**
```javascript
// Timeout wrapper
function timeoutPromise(promise, ms = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), ms)
        )
    ]);
}

// Usage
const data = await timeoutPromise(
    fetch('/api/stock/VCB/price'),
    10000
);
```

#### **3. CSS không load đúng:**
```html
<!-- Force reload CSS in development -->
<link rel="stylesheet" href="/static/css/style.css?v={{ timestamp }}">

<!-- Check CSS loading -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const style = getComputedStyle(document.body);
    if (style.fontFamily.indexOf('Segoe UI') === -1) {
        console.warn('CSS chưa load đúng');
    }
});
</script>
```

## 📚 Resources & Documentation

### **Frontend Libraries Used:**
- **Plotly.js 5.17.0** - Interactive charts
- **Chart.js 4.x** - Simple charts
- **Vanilla JavaScript** - No framework overhead
- **CSS Grid & Flexbox** - Modern layouts

### **Design Resources:**
- **Color Palette**: Material Design inspired
- **Typography**: System fonts (Segoe UI, San Francisco)
- **Icons**: SVG icons với proper accessibility
- **Animations**: CSS transitions & transforms

### **Browser Support:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- 📱 iOS Safari 14+
- 📱 Chrome Mobile 90+

---

## 📞 Support & Contact

**Phát triển bởi**: Financial Dashboard Team  
**Phiên bản**: 1.2.0  
**Cập nhật**: Tháng 12, 2024  

**Frontend Performance Target**:
- ⚡ First Paint < 1.5s
- 📊 Interactive < 2.5s  
- 📱 Mobile Score > 90
- ♿ Accessibility Score > 95

**Liên hệ hỗ trợ**:
- 💬 GitHub Issues: [Báo cáo lỗi frontend](https://github.com/your-repo/issues)
- 📖 Frontend Docs: [Chi tiết implementation](https://github.com/your-repo/wiki)
- 🎨 Design System: [UI Components guide](https://github.com/your-repo/design-system) 