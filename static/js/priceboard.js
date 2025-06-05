// ================= TỔNG VỐN HÓA =================
document.addEventListener("DOMContentLoaded", function () {
  // TreeMap
  if (document.getElementById("treemap")) fetchDataAndRenderTreeMap();

  // Tổng nguồn vốn
  const fetchDataButton = document.getElementById("fetchDataButton");
  const yearInput = document.getElementById("year");
  const quarterInput = document.getElementById("quarter");
  const lineItemIdInput = document.getElementById("line_item_id");
  const loadingElement = document.getElementById("loading-tongvon");
  const errorElement = document.getElementById("error-tongvon");
  const resultDiv = document.getElementById("result-tongvon");
  const resultYearElement = document.getElementById("resultYear");
  const resultQuarterElement = document.getElementById("resultQuarter");
  const resultLineItemIdElement = document.getElementById("resultLineItemId");
  const tongNguonVonElement = document.getElementById("tongNguonVonValue");

  async function fetchTongNguonVon() {
    loadingElement.style.display = "block";
    errorElement.style.display = "none";
    errorElement.textContent = "";
    resultDiv.style.display = "none";
    const year = yearInput ? yearInput.value : null;
    const quarter = quarterInput ? quarterInput.value : null;
    const lineItemId = lineItemIdInput ? lineItemIdInput.value : null;
    if (!year || !quarter || !lineItemId) {
      errorElement.textContent =
        "Vui lòng nhập đầy đủ Năm, Quý và Line Item ID.";
      errorElement.style.display = "block";
      loadingElement.style.display = "none";
      return;
    }
    const apiUrl = `/api/capital/total?year=${year}&quarter=${quarter}&line_item_id=${lineItemId}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorMsg = `Lỗi HTTP: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      console.log("API data:", data);
      resultYearElement.textContent = data.year_queried;
      resultQuarterElement.textContent = data.quarter_queried;
      resultLineItemIdElement.textContent = data.line_item_id_queried;
      const formattedValue = parseFloat(
        data.calculated_total_capital
      ).toLocaleString("vi-VN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      tongNguonVonElement.textContent = formattedValue;
      loadingElement.style.display = "none";
      resultDiv.style.display = "block";
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      errorElement.textContent = `Không thể tải dữ liệu: ${error.message}`;
      errorElement.style.display = "block";
      loadingElement.style.display = "none";
    }
  }
  if (fetchDataButton)
    fetchDataButton.addEventListener("click", fetchTongNguonVon);
});

// ================= NEWS =================
const backendUrl = ""; // Để rỗng để fetch relative path
async function fetchNews() {
  try {
    const response = await fetch(`/api/news`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const news = await response.json();
    // Sort news by published date descending (newest first)
    news.sort((a, b) => {
      const dateA = a.published ? new Date(a.published).getTime() : 0;
      const dateB = b.published ? new Date(b.published).getTime() : 0;
      return dateB - dateA;
    });
    const newsList = document.getElementById("newsList");
    if (!newsList) return;
    newsList.innerHTML = "";
    news.forEach((item) => {
      const div = document.createElement("div");
      div.className = "news-item";
      div.innerHTML = `
                <h3>${item.title || "No Title"}</h3>
                ${
                  item.published
                    ? `<p>${new Date(item.published).toLocaleDateString()}</p>`
                    : ""
                }
            `;
      if (item.id !== undefined && !isNaN(item.id)) {
        div.onclick = () => showPopup(item.id);
      } else {
        console.error("Missing or invalid id for item:", item);
        div.onclick = () => alert("Cannot load details for this item.");
      }
      newsList.appendChild(div);
    });
  } catch (error) {
    console.error("Failed to fetch news:", error);
    const newsList = document.getElementById("newsList");
    if (newsList)
      newsList.innerHTML = `<p class="text-red-500">Error loading news. Please check the console.</p>`;
  }
}

async function showPopup(newsId) {
  try {
    const response = await fetch(`/api/news/${newsId}`);
    if (!response.ok) {
      if (response.status === 404) {
        alert("News item not found.");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return;
    }
    const news = await response.json();
    if (news.error) {
      console.error("API returned error:", news.error);
      alert(`Error: ${news.error}`);
      return;
    }
    document.getElementById("popupTitle").textContent = news.title || "N/A";
    document.getElementById("popupContent").textContent = news.content || "N/A";
    document.getElementById("popupPublished").textContent = news.published
      ? `Published: ${new Date(news.published).toLocaleString()}`
      : "Published: N/A";
    const linkElement = document.getElementById("popupLink");
    if (news.link) {
      linkElement.href = news.link;
      linkElement.textContent = "Read More";
      linkElement.style.display = "block";
    } else {
      linkElement.style.display = "none";
    }
    const overlay = document.getElementById("overlay");
    const popup = document.getElementById("popup");
    overlay.style.display = "block";
    popup.style.display = "block";

    // Thêm event listener cho overlay để đóng khi click ra ngoài
    overlay.onclick = (event) => {
      if (event.target === overlay) {
        closePopup();
      }
    };

    // Thêm event listener cho phím Escape
    document.addEventListener("keydown", handleEscKey);
  } catch (error) {
    console.error(`Failed to fetch news details for ID ${newsId}:`, error);
    alert("Error loading news details. Please check the console.");
  }
}

// Hàm xử lý phím Escape
function handleEscKey(event) {
  if (event.key === "Escape") {
    closePopup();
  }
}

function closePopup() {
  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("popup");
  overlay.style.display = "none";
  popup.style.display = "none";
  // Xóa event listener khi đóng popup
  document.removeEventListener("keydown", handleEscKey);
}

window.onload = function () {
  if (document.getElementById("newsList")) fetchNews();
};

// ================= BIỂU ĐỒ TRÒN =================
// Định nghĩa ánh xạ màu cố định cho các mã cổ phiếu
const SYMBOL_COLORS = {
  VCB: { color: "hsla(120, 79.20%, 47.10%, 0.81)" }, // Xanh lá
  BID: { color: "hsla(180, 49.80%, 50.00%, 0.79)" }, // Xanh lam (Turquoise)
  CTG: { color: "hsla(240, 60.00%, 50.00%, 0.79)" }, // Xanh dương (đại diện cho Xanh dương và Đỏ)
  TCB: { color: "hsla(0, 100.00%, 50.00%, 0.40)" }, // Đỏ (đại diện cho Đỏ và Đen)
  MBB: { color: "hsla(220, 59.50%, 30.00%, 0.48)" }, // Xanh dương đậm
  VPB: { color: "hsla(120, 39.90%, 70.00%, 0.44)" }, // Xanh lá nhạt
  ACB: { color: "hsla(240, 49.80%, 50.00%, 0.43)" }, // Xanh dương
  HDB: { color: "hsla(0, 60.00%, 50.00%, 0.41)" }, // Đỏ (đại diện cho Đỏ và Vàng)
  STB: { color: "hsl(240, 50%, 50%)" }, // Xanh dương
  EIB: { color: "hsla(240, 49.80%, 50.00%, 0.50)" }, // Xanh dương
  LPB: { color: "hsla(30, 69.90%, 70.00%, 0.45)" }, // Cam nhạt
  SHB: { color: "hsla(30, 69.60%, 40.00%, 0.47)" }, // Cam đậm
  VIB: { color: "hsla(30, 60.00%, 50.00%, 0.44)" }, // Cam (đại diện cho Cam và Xanh dương)
  MSB: { color: "hsl(15, 60%, 50%)" }, // Cam đỏ (đại diện cho Cam và Đỏ)
  OCB: { color: "hsla(120, 50.30%, 30.00%, 0.51)" }, // Xanh lá đậm
  TPB: { color: "hsla(270, 49.80%, 50.00%, 0.46)" }, // Tím (đại diện cho Tím và Cam)
  BAB: { color: "hsla(90, 49.80%, 50.00%, 0.47)" }, // Xanh lá trộn vàng
  ABB: { color: "hsla(210, 49.80%, 50.00%, 0.44)" }, // Xanh dương (đại diện cho Xanh dương và Cam)
  BVB: { color: "hsla(60, 49.80%, 50.00%, 0.45)" }, // Vàng (đại diện cho Xanh dương và Vàng)
  KLB: { color: "hsla(150, 49.80%, 50.00%, 0.46)" }, // Xanh lá (đại diện cho Xanh lá và Đỏ)
  NAB: { color: "hsla(60, 49.80%, 50.00%, 0.39)" }, // Vàng (đại diện cho Xanh dương và Vàng)
  PGB: { color: "hsla(210, 49.80%, 50.00%, 0.46)" }, // Xanh dương (đại diện cho Xanh dương và Cam)
  SGB: { color: "hsla(240, 50.30%, 70.00%, 0.45)" }, // Xanh dương nhạt (đại diện cho Xanh dương và Trắng)
  VAB: { color: "hsla(0, 59.80%, 60.00%, 0.42)" }, // Đỏ nhạt (đại diện cho Đỏ và Trắng)
  VBB: { color: "hsla(240, 60.00%, 50.00%, 0.39)" }, // Xanh dương (đại diện cho Xanh dương và Đỏ)
  SSB: { color: "hsla(0, 59.80%, 60.00%, 0.39)" }, // Đỏ nhạt (đại diện cho Đỏ và Trắng)
  SCB: { color: "hsla(240, 50.30%, 70.00%, 0.40)" }, // Xanh dương nhạt (đại diện cho Xanh dương và Trắng)
};
const API_BASE_URL = ""; // Để rỗng để fetch relative path
const CHART_YEAR = 2024;
const CHART_QUARTER = "Q4";
const metrics = [
  { label: "Tổng tài sản", lineItemId: 2 },
  { label: "Lãi thuần HĐ DV", lineItemId: 33 },
  { label: "Tổng thu nhập", lineItemId: 41 },
  { label: "Huy động", lineItemId: 13 },
  { label: "Tín dụng", lineItemId: 8 },
  { label: "LN Sau Thuế", lineItemId: 49 },
  { label: "Vốn chủ sở hữu", lineItemId: 21 },
];
let chartCanvas,
  chartContainer,
  chartMessageElement,
  ctx,
  buttonsContainer,
  loadingIndicator,
  errorIndicator;
let currentChart = null;

function formatNumber(num) {
  try {
    if (isNaN(num) || num === null || num === undefined) {
      return "N/A";
    }
    return num.toLocaleString("vi-VN");
  } catch (error) {
    console.error("Error formatting number:", num, error);
    return "Error";
  }
}
function showChartMessage(message, isError = false) {
  if (!chartCanvas || !chartMessageElement) return;
  chartCanvas.style.display = "none";
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
  chartMessageElement.textContent = message;
  chartMessageElement.style.color = isError
    ? "var(--color-danger)"
    : "var(--color-dark)";
  chartMessageElement.style.display = "block";
}
function showChartCanvas() {
  if (!chartCanvas || !chartMessageElement) return;
  chartMessageElement.style.display = "none";
  chartCanvas.style.display = "block";
}

function createGradient(ctx, chartArea, colors) {
  const gradient = ctx.createLinearGradient(
    chartArea.left,
    chartArea.top,
    chartArea.right,
    chartArea.bottom
  );
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
}

// Hàm sửa đổi updateChart (cho biểu đồ hình tròn)
function updateChart(chartData, metricLabel) {
  if (!ctx) {
    console.error("Canvas context is not available.");
    showChartMessage("Lỗi hiển thị biểu đồ (canvas context).", true);
    return;
  }
  if (!chartData) {
    showChartMessage("Lỗi: Không thể tải dữ liệu biểu đồ.", true);
    return;
  }
  if (!Array.isArray(chartData) || chartData.length === 0) {
    showChartMessage(
      `Không có dữ liệu cho chỉ số "${metricLabel}" (${CHART_QUARTER}/${CHART_YEAR}).`
    );
    return;
  }
  const labels = chartData.map((item) => item.symbol);
  const values = chartData.map((item) => item.value);
  // Tạo màu nền và viền cho biểu đồ
  const backgroundColors = labels.map((symbol) => {
    const config = SYMBOL_COLORS[symbol] || {
      type: "solid",
      color: "hsl(0, 50%, 50%)",
    }; // Mặc định đỏ
    if (config.type === "gradient") {
      return createGradient(
        ctx,
        chartCanvas.getBoundingClientRect(),
        config.colors
      );
    }
    return config.color;
  });
  const borderColors = backgroundColors.map((color) => {
    if (typeof color === "string") {
      return color.replace(/,\s*\d*\.?\d*\)$/, ", 1)"); // Tăng độ mờ cho viền
    }
    return "hsl(0, 2.90%, 66.10%)"; // Màu viền mặc định cho gradient
  });
  const chartConfig = {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          label: metricLabel,
          data: values,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          hoverOffset: 8,
          hoverBorderColor: "var(--color-dark)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            padding: 15,
            boxWidth: 12,
            font: { size: 13 },
            color: "var(--color-dark)",
          },
        },
        title: {
          display: true,
          text: `${metricLabel} (${CHART_QUARTER}/${CHART_YEAR})`,
          font: { size: 16, weight: "bold" },
          color: "var(--color-dark)",
          padding: { top: 10, bottom: 25 },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "var(--color-dark)",
          titleColor: "var(--color-white)",
          bodyColor: "var(--color-white)",
          titleFont: { size: 14, weight: "bold" },
          bodyFont: { size: 12 },
          padding: 12,
          boxPadding: 4,
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed;
              const dataset = context.dataset.data || [];
              const total = dataset.reduce(
                (acc, val) => acc + (typeof val === "number" ? val : 0),
                0
              );
              const percentage =
                total > 0 && typeof value === "number"
                  ? ((value / total) * 100).toFixed(1)
                  : 0;
              const formattedValue =
                typeof value === "number" ? formatNumber(value) : "N/A";
              return ` ${label}: ${formattedValue} (${percentage}%)`;
            },
          },
        },
      },
    },
  };
  showChartCanvas();
  if (currentChart) {
    currentChart.data = chartConfig.data;
    currentChart.options = chartConfig.options;
    currentChart.update();
    console.log("Chart updated for:", metricLabel);
  } else {
    const currentCtx = chartCanvas.getContext("2d");
    if (currentCtx) {
      currentChart = new Chart(currentCtx, chartConfig);
      console.log("New chart created for:", metricLabel);
    } else {
      console.error("Failed to get canvas context when creating new chart.");
      showChartMessage("Lỗi khởi tạo biểu đồ (canvas context).", true);
    }
  }
  if (chartCanvas) {
    chartCanvas.style.width = "100%";
    chartCanvas.style.height = "100%";
  }
}

async function fetchDataFromAPI(lineItemId) {
  if (!loadingIndicator || !errorIndicator) return null;
  loadingIndicator.style.display = "block";
  errorIndicator.style.display = "none";
  const apiUrl = `/api/financial/chart-data/${lineItemId}`;
  console.log(`[FETCH] Requesting data from: ${apiUrl}`);
  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      let errorMsg = `Lỗi ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg += `: ${
          errorData.detail || errorData.message || response.statusText
        }`;
      } catch (e) {
        errorMsg += `: ${response.statusText}`;
      }
      throw new Error(errorMsg);
    }
    const data = await response.json();
    console.log(
      `[FETCH] Success for ${lineItemId}. Received ${
        Array.isArray(data) ? data.length : "invalid"
      } items.`
    );
    return data;
  } catch (err) {
    console.error("[FETCH] Error:", err);
    if (errorIndicator) {
      errorIndicator.textContent = `Lỗi tải dữ liệu: ${err.message}`;
      errorIndicator.style.display = "block";
    }
    return null;
  } finally {
    if (loadingIndicator) {
      loadingIndicator.style.display = "none";
    }
    console.log(`[FETCH] Finished for ${lineItemId}.`);
  }
}
async function handleButtonClick(metric, buttonElement) {
  console.log(`Button clicked: ${metric.label} (ID: ${metric.lineItemId})`);
  if (!buttonsContainer) return;
  const currentActive = buttonsContainer.querySelector("button.active");
  if (currentActive) {
    currentActive.classList.remove("active");
  }
  if (buttonElement) {
    buttonElement.classList.add("active");
  } else {
    console.warn("Button element not provided to handleButtonClick");
  }
  const data = await fetchDataFromAPI(metric.lineItemId);
  updateChart(data, metric.label);
}
function initializePage() {
  chartCanvas = document.getElementById("financialChart");
  chartContainer = document.getElementById("chartContainer");
  chartMessageElement = document.getElementById("chartMessage");
  buttonsContainer = document.getElementById("metricButtons");
  loadingIndicator = document.getElementById("loading");
  errorIndicator = document.getElementById("error");
  if (
    !chartCanvas ||
    !chartContainer ||
    !chartMessageElement ||
    !buttonsContainer ||
    !loadingIndicator ||
    !errorIndicator
  ) {
    console.error(
      "One or more essential DOM elements are missing. Initialization failed."
    );
    alert(
      "Lỗi: Không thể khởi tạo giao diện người dùng. Vui lòng kiểm tra cấu trúc HTML."
    );
    return;
  }
  ctx = chartCanvas.getContext("2d");
  if (!ctx) {
    console.error("Failed to get 2D context from canvas.");
    alert(
      "Lỗi: Không thể vẽ biểu đồ. Trình duyệt của bạn có thể không hỗ trợ Canvas."
    );
    return;
  }
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
  showChartMessage("Vui lòng chọn một chỉ số tài chính để xem biểu đồ.");
  let firstButtonElement = null;
  buttonsContainer.innerHTML = "";
  metrics.forEach((metric, index) => {
    const button = document.createElement("button");
    button.textContent = metric.label;
    button.onclick = () => handleButtonClick(metric, button);
    buttonsContainer.appendChild(button);
    if (index === 0) {
      firstButtonElement = button;
    }
  });
  if (firstButtonElement) {
    requestAnimationFrame(() => {
      if (document.body.contains(firstButtonElement)) {
        handleButtonClick(metrics[0], firstButtonElement);
      } else {
        console.error(
          "First button element no longer exists in DOM before initial click."
        );
      }
    });
  } else {
    showChartMessage("Không có chỉ số nào được định nghĩa.", true);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePage);
} else {
  initializePage();
}

// ================= TREE MAP =================
// Hàm sửa đổi fetchDataAndRenderTreeMap (cho biểu đồ cây)
const treemapDiv = document.getElementById("treemap");
const loadingDiv = document.getElementById("loading-treemap");
const errorDiv = document.getElementById("error-treemap");

async function fetchDataAndRenderTreeMap() {
  try {
    const response = await fetch("/api/market-cap");
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(
        `Lỗi ${response.status}: ${errorData.detail || response.statusText}`
      );
    }
    const data = await response.json();
    loadingDiv.style.display = "none";
    if (data && data.length > 0) {
      const labels = data.map((item) => item.symbol);
      const values = data.map((item) => item.value);
      const parents = Array(data.length).fill("");
      const hovertemplate = `<b>%{label}</b><br>Vốn hóa: %{value:,.0f}<extra></extra>`;
      // Áp dụng màu từ SYMBOL_COLORS
      const colors = labels.map((symbol) => {
        const config = SYMBOL_COLORS[symbol] || {
          type: "solid",
          color: "hsl(0, 50%, 50%)",
        };
        return config.type === "gradient" ? config.primary : config.color;
      });
      const trace = {
        type: "treemap",
        labels: labels,
        parents: parents,
        values: values,
        textinfo: "label+value",
        hoverinfo: "label+value+percent parent",
        hovertemplate: hovertemplate,
        marker: {
          colors: colors, // Sử dụng màu cố định hoặc màu đại diện
          pad: { t: 25, l: 5, r: 5, b: 5 },
        },
        outsidetextfont: { size: 20, color: "var(--color-dark)" },
        insidetextfont: { size: 14 },
        pathbar: { visible: false },
      };
      const layout = {
        title: "Phân bổ Vốn hóa Thị trường theo Công ty",
        margin: { t: 50, l: 10, r: 10, b: 10 },
        paper_bgcolor: "var(--color-dark)",
      };
      Plotly.newPlot(treemapDiv, [trace], layout);
    } else {
      treemapDiv.innerHTML =
        '<p style="text-align:center;">Không tìm thấy dữ liệu phù hợp cho Q4/2024.</p>';
    }
  } catch (error) {
    console.error("Lỗi khi tải hoặc vẽ biểu đồ:", error);
    loadingDiv.style.display = "none";
    errorDiv.textContent = `Không thể tải dữ liệu: ${error.message}`;
    errorDiv.style.display = "block";
  }
}
// ================= CHỈ SỐ THỊ TRƯỜNG =================
// Hàm vẽ biểu đồ mini cho chỉ số
function renderMiniChart(canvasId, mini_chart_data, change) {
  if (!mini_chart_data || mini_chart_data.length === 0) return;
  const ctx = document.getElementById(canvasId)?.getContext("2d");
  if (!ctx) {
    console.error("Canvas context not found for ID:", canvasId);
    return;
  }
  const existingChart = Chart.getChart(canvasId);
  if (existingChart) {
    existingChart.destroy();
  }
  const isPositive = change >= 0;
  const borderColor = isPositive ? "#28a745" : "#dc3545";
  const backgroundColor = isPositive
    ? "rgba(40, 167, 69, 0.1)"
    : "rgba(220, 53, 69, 0.1)";
  new Chart(ctx, {
    type: "line",
    data: {
      labels: mini_chart_data.map((item) => item.time),
      datasets: [
        {
          data: mini_chart_data.map((item) => item.close),
          borderColor: borderColor,
          fill: true,
          backgroundColor: backgroundColor,
          tension: 0.1,
          pointRadius: 0,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: { display: false },
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      animation: {
        duration: 300,
      },
      elements: {
        line: {
          borderCapStyle: "round",
          borderJoinStyle: "round",
        },
      },
    },
  });
}

function updateUI(data) {
  const indicesContainer = document.getElementById("indices-container");
  const loadingIndicator = document.getElementById("loading");
  if (loadingIndicator) loadingIndicator.style.display = "none";
  indicesContainer.innerHTML = "";
  if (!data || Object.keys(data).length === 0) {
    indicesContainer.innerHTML =
      '<p class="text-danger text-center">Không nhận được dữ liệu từ API.</p>';
    return;
  }
  for (const [indexName, indexData] of Object.entries(data)) {
    const card = document.createElement("div");
    card.className = "col-md-4 mb-4";
    const cardContent = document.createElement("div");
    cardContent.className = "index-card d-flex align-items-center";
    const infoDiv = document.createElement("div");
    infoDiv.className = "index-info";
    const nameH5 = document.createElement("h5");
    nameH5.className = "index-name";
    nameH5.textContent = indexData.name
      ? indexData.name.replace("INDEX", " Index")
      : indexName;
    infoDiv.appendChild(nameH5);
    if (indexData && indexData.status === "success") {
      const { latest_close, change, change_percent, mini_chart_data } =
        indexData;
      const valueP = document.createElement("p");
      valueP.className = "index-value";
      valueP.textContent =
        latest_close !== null ? latest_close.toFixed(2) : "N/A";
      const changeP = document.createElement("p");
      const changeClass = change >= 0 ? "positive" : "negative";
      changeP.className = `index-change ${changeClass}`;
      changeP.textContent =
        `${change >= 0 ? "+" : ""}${
          change !== null ? change.toFixed(2) : "-"
        }` + ` (${change_percent !== null ? change_percent.toFixed(2) : "-"}%)`;
      infoDiv.appendChild(valueP);
      infoDiv.appendChild(changeP);
      const canvas = document.createElement("canvas");
      const canvasId = `chart-${indexName}`;
      canvas.id = canvasId;
      canvas.className = "mini-chart";
      cardContent.appendChild(infoDiv);
      cardContent.appendChild(canvas);
      card.appendChild(cardContent);
      indicesContainer.appendChild(card);
      setTimeout(() => {
        renderMiniChart(canvasId, mini_chart_data, change);
      }, 0);
    } else if (indexData && indexData.status === "warning") {
      const valueP = document.createElement("p");
      valueP.className = "index-value";
      valueP.textContent =
        indexData.latest_close !== null
          ? indexData.latest_close.toFixed(2)
          : "N/A";
      const messageP = document.createElement("p");
      messageP.className = "text-warning small";
      messageP.textContent = indexData.message || "Dữ liệu không đầy đủ.";
      infoDiv.appendChild(valueP);
      infoDiv.appendChild(messageP);
      const canvas = document.createElement("canvas");
      const canvasId = `chart-${indexName}`;
      canvas.id = canvasId;
      canvas.className = "mini-chart";
      cardContent.appendChild(infoDiv);
      cardContent.appendChild(canvas);
      card.appendChild(cardContent);
      indicesContainer.appendChild(card);
      setTimeout(() => {
        renderMiniChart(
          canvasId,
          indexData.mini_chart_data,
          indexData.change !== null ? indexData.change : 0
        );
      }, 0);
    } else {
      const errorP = document.createElement("p");
      errorP.className = "text-danger";
      errorP.textContent = `Lỗi: ${
        indexData?.message || "Không thể tải dữ liệu"
      }`;
      infoDiv.appendChild(errorP);
      cardContent.appendChild(infoDiv);
      card.appendChild(cardContent);
      indicesContainer.appendChild(card);
    }
  }
}

async function fetchIndicesData() {
  const loadingIndicator = document.getElementById("loading");
  const indicesContainer = document.getElementById("indices-container");
  if (loadingIndicator) loadingIndicator.style.display = "block";
  indicesContainer.innerHTML = "";
  indicesContainer.appendChild(loadingIndicator);
  try {
    const response = await fetch("/api/index/all");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    updateUI(data);
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
    if (loadingIndicator) loadingIndicator.style.display = "none";
    indicesContainer.innerHTML = `<p class=\"text-danger text-center col-12\">Không thể tải dữ liệu từ server. Vui lòng thử lại sau. (${error.message})</p>`;
  }
}

// --- Hook vào tab switching ---
if (typeof window.showTab === "function") {
  const _oldShowTab = window.showTab;
  window.showTab = function (tabId) {
    _oldShowTab(tabId);
    if (tabId === "tab-index") {
      fetchIndicesData();
    }
  };
}

document.addEventListener("DOMContentLoaded", function () {
  // Nếu tab-index đang active khi load trang, gọi fetchIndicesData
  if (document.getElementById("tab-index").classList.contains("active")) {
    fetchIndicesData();
  }
});
