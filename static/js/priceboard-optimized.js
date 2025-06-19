// ================= OPTIMIZED PRICEBOARD WITH DATA MANAGER =================
document.addEventListener("DOMContentLoaded", async function () {
  console.log('🚀 Priceboard optimized loading...');

  // Wait for dataManager to be available
  while (!window.dataManager) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('📊 DataManager ready, initializing components...');

  // Initialize all components in parallel
  const initPromises = [
    initializeTreeMap(),
    initializeTongNguonVon(),
    initializeNews(),
    initializeBieuDoTron(),
    initializeIndices()
  ];

  try {
    await Promise.allSettled(initPromises);
    console.log('✅ All priceboard components initialized');
  } catch (error) {
    console.error('❌ Error initializing priceboard:', error);
  }
});

// ================= TỔNG VỐN HÓA =================
async function initializeTreeMap() {
  if (!document.getElementById("treemap")) return;
  
  try {
    await fetchDataAndRenderTreeMap();
  } catch (error) {
    console.error('Error initializing TreeMap:', error);
  }
}

async function initializeTongNguonVon() {
  const fetchDataButton = document.getElementById("fetchDataButton");
  if (!fetchDataButton) return;

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
      errorElement.textContent = "Vui lòng nhập đầy đủ Năm, Quý và Line Item ID.";
      errorElement.style.display = "block";
      loadingElement.style.display = "none";
      return;
    }

    try {
      // Use dataManager for caching
      const data = await window.dataManager.getTotalCapital(year, quarter, lineItemId);
      console.log("API data:", data);
      
      resultYearElement.textContent = data.year_queried;
      resultQuarterElement.textContent = data.quarter_queried;
      resultLineItemIdElement.textContent = data.line_item_id_queried;
      
      const formattedValue = parseFloat(data.calculated_total_capital).toLocaleString("vi-VN", {
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

  fetchDataButton.addEventListener("click", fetchTongNguonVon);
}

// ================= NEWS =================
async function initializeNews() {
  const newsList = document.getElementById("newsList");
  if (!newsList) return;

  try {
    await fetchNews();
  } catch (error) {
    console.error('Error initializing news:', error);
  }
}

async function fetchNews() {
  try {
    // Use dataManager for caching
    const news = await window.dataManager.getNews();
    
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
        ${item.published ? `<p>${new Date(item.published).toLocaleDateString()}</p>` : ""}
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
    // Use dataManager for caching
    const news = await window.dataManager.getNewsById(newsId);
    
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

    // Add event listener for overlay to close when clicking outside
    overlay.onclick = (event) => {
      if (event.target === overlay) {
        closePopup();
      }
    };

    // Add event listener for Escape key
    document.addEventListener("keydown", handleEscKey);
  } catch (error) {
    if (error.message.includes('404')) {
      alert("News item not found.");
    } else {
      console.error(`Failed to fetch news details for ID ${newsId}:`, error);
      alert("Error loading news details. Please check the console.");
    }
  }
}

// Keep existing popup functions
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
  document.removeEventListener("keydown", handleEscKey);
}

// ================= BIỂU ĐỒ TRÒN =================
async function initializeBieuDoTron() {
  // Initialize chart buttons and UI
  initializePage();
}

// Keep existing chart color definitions
const SYMBOL_COLORS = {
  VCB: { color: "hsla(120, 79.20%, 47.10%, 0.81)" },
  BID: { color: "hsla(180, 49.80%, 50.00%, 0.79)" },
  CTG: { color: "hsla(240, 60.00%, 50.00%, 0.79)" },
  TCB: { color: "hsla(0, 100.00%, 50.00%, 0.40)" },
  MBB: { color: "hsla(220, 59.50%, 30.00%, 0.48)" },
  VPB: { color: "hsla(120, 39.90%, 70.00%, 0.44)" },
  ACB: { color: "hsla(240, 49.80%, 50.00%, 0.43)" },
  HDB: { color: "hsla(0, 60.00%, 50.00%, 0.41)" },
  STB: { color: "hsl(240, 50%, 50%)" },
  EIB: { color: "hsla(240, 49.80%, 50.00%, 0.50)" },
  LPB: { color: "hsla(30, 69.90%, 70.00%, 0.45)" },
  SHB: { color: "hsla(30, 69.60%, 40.00%, 0.47)" },
  VIB: { color: "hsla(30, 60.00%, 50.00%, 0.44)" },
  MSB: { color: "hsl(15, 60%, 50%)" },
  OCB: { color: "hsla(120, 50.30%, 30.00%, 0.51)" }
};

// ================= OPTIMIZED DATA FETCHING =================
async function fetchDataFromAPI(lineItemId) {
  try {
    console.log(`[FETCH] Requesting data for lineItemId: ${lineItemId}`);
    
    // Use dataManager for caching
    const data = await window.dataManager.getFinancialChart(lineItemId);
    
    console.log(`[FETCH] Success for ${lineItemId}. Received ${Array.isArray(data) ? data.length : 'non-array'} items`);
    return data;
  } catch (error) {
    console.error("[FETCH] Error:", error);
    throw error;
  }
}

async function fetchDataAndRenderTreeMap() {
  try {
    // Use dataManager for caching
    const data = await window.dataManager.getMarketCap();
    
    if (data && Array.isArray(data) && data.length > 0) {
      renderTreeMap(data);
    } else {
      console.warn("No market cap data available for TreeMap");
    }
  } catch (error) {
    console.error("Error fetching market cap data for TreeMap:", error);
  }
}

// ================= INDICES DATA =================
async function initializeIndices() {
  const tabIndex = document.querySelector('.tab-content[data-tab="index"]');
  if (!tabIndex) return;

  try {
    await fetchIndicesData();
  } catch (error) {
    console.error('Error initializing indices:', error);
  }
}

async function fetchIndicesData() {
  try {
    console.log('📈 Fetching indices data...');
    
    // Use dataManager for caching
    const data = await window.dataManager.getIndicesData();
    
    console.log('📈 Indices data received:', Object.keys(data));
    updateUI(data);
  } catch (error) {
    console.error('❌ Failed to fetch indices data:', error);
    throw error;
  }
}

// ================= BATCH DATA LOADING (NEW FEATURE) =================
async function loadAllDashboardData() {
  /**
   * New function to load all dashboard data in one batch request
   * This significantly improves performance by reducing HTTP requests
   */
  try {
    console.log('🚀 Loading all dashboard data in batch...');
    
    const batchData = await window.dataManager.fetch('/api/batch/dashboard-data');
    
    console.log('✅ Batch data loaded successfully');
    
    // Update all components with batch data
    if (batchData.news) {
      updateNewsWithData(batchData.news);
    }
    
    if (batchData.market_cap) {
      renderTreeMap(batchData.market_cap);
    }
    
    if (batchData.indices) {
      updateUI(batchData.indices);
    }
    
    return batchData;
  } catch (error) {
    console.error('❌ Failed to load batch dashboard data:', error);
    // Fallback to individual requests
    console.log('🔄 Falling back to individual requests...');
    throw error;
  }
}

function updateNewsWithData(newsData) {
  const newsList = document.getElementById("newsList");
  if (!newsList || !newsData) return;

  // Sort and display news
  newsData.sort((a, b) => {
    const dateA = a.published ? new Date(a.published).getTime() : 0;
    const dateB = b.published ? new Date(b.published).getTime() : 0;
    return dateB - dateA;
  });

  newsList.innerHTML = "";
  newsData.forEach((item) => {
    const div = document.createElement("div");
    div.className = "news-item";
    div.innerHTML = `
      <h3>${item.title || "No Title"}</h3>
      ${item.published ? `<p>${new Date(item.published).toLocaleDateString()}</p>` : ""}
    `;
    
    if (item.id !== undefined && !isNaN(item.id)) {
      div.onclick = () => showPopup(item.id);
    }
    newsList.appendChild(div);
  });
}

// Keep all existing utility functions (formatNumber, showChartMessage, etc.)
// ... (rest of the original functions remain the same)

// Modify the page initialization to try batch loading first
document.addEventListener("DOMContentLoaded", async function() {
  // Wait for dataManager to be available
  while (!window.dataManager) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  try {
    // Try batch loading first (more efficient)
    await loadAllDashboardData();
  } catch (error) {
    console.warn('Batch loading failed, using individual component initialization');
    // Fallback to individual initialization
    const initPromises = [
      initializeTreeMap(),
      initializeTongNguonVon(), 
      initializeNews(),
      initializeBieuDoTron(),
      initializeIndices()
    ];

    await Promise.allSettled(initPromises);
  }
  
  console.log('✅ Priceboard initialization complete');
});

// Export functions for use in other modules
window.priceboardOptimized = {
  loadAllDashboardData,
  fetchDataFromAPI,
  fetchNews,
  showPopup,
  closePopup
}; 