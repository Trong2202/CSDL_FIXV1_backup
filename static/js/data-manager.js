/**
 * Global Data Manager với Smart Caching
 * Quản lý tất cả API calls và cache dữ liệu để cải thiện hiệu suất
 */

class DataManager {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 phút
        this.loadingPromises = new Map(); // Prevent duplicate requests
        this.preloadedData = new Set(); // Track preloaded data
        
        // Initialize on page load
        this.init();
    }

    async init() {
        console.log('🚀 DataManager initialized');
        
        // Listen for SPA content changes
        this.setupSPAListeners();
        
        // Preload critical data on first page load
        await this.preloadCriticalData();
    }

    /**
     * Setup listeners for SPA navigation events
     */
    setupSPAListeners() {
        // Listen for SPA content changes
        window.addEventListener('spaContentChanged', (event) => {
            const { path } = event.detail;
            console.log('📄 SPA content changed:', path);
            
            // Trigger page-specific data loading if needed
            this.handlePageSpecificData(path);
        });
        
        // Listen for before navigation to preload data
        window.addEventListener('spaBeforeNavigate', (event) => {
            const { path } = event.detail;
            console.log('🚀 Preloading data for:', path);
            this.preloadPageData(path);
        });
    }

    /**
     * Handle page-specific data loading after SPA navigation
     */
    async handlePageSpecificData(path) {
        try {
            switch (path) {
                case '/priceboard':
                case '/':
                    await this.loadPriceboardData();
                    break;
                case '/information':
                    await this.loadInformationData();
                    break;
                case '/analytics':
                    await this.loadAnalyticsData();
                    break;
                default:
                    if (path.startsWith('/stock')) {
                        await this.loadStockData(path);
                    }
                    break;
            }
        } catch (error) {
            console.warn('⚠️ Error loading page-specific data:', error);
        }
    }

    /**
     * Preload data for specific pages
     */
    async preloadPageData(path) {
        const criticalEndpoints = this.getCriticalEndpointsForPage(path);
        
        if (criticalEndpoints.length > 0) {
            const preloadPromises = criticalEndpoints.map(endpoint => 
                this.fetch(endpoint, { preload: true, priority: 'low' })
            );
            
            Promise.allSettled(preloadPromises).then(() => {
                console.log('✅ Page data preloaded for:', path);
            });
        }
    }

    /**
     * Get critical endpoints for each page
     */
    getCriticalEndpointsForPage(path) {
        const endpointMap = {
            '/priceboard': ['/api/index/all', '/api/market-cap', '/api/news'],
            '/information': ['/api/financial/data'],
            '/analytics': ['/api/analytics/data'],
            '/stock': ['/api/stock/data']
        };
        
        if (path.startsWith('/stock')) {
            return endpointMap['/stock'] || [];
        }
        
        return endpointMap[path] || [];
    }

    /**
     * Load priceboard-specific data
     */
    async loadPriceboardData() {
        const endpoints = [
            '/api/index/all',
            '/api/market-cap',
            '/api/news'
        ];
        
        return this.fetchBatch(endpoints);
    }

    /**
     * Load information page data
     */
    async loadInformationData() {
        const endpoints = [
            '/api/financial/data'
        ];
        
        return this.fetchBatch(endpoints);
    }

    /**
     * Load analytics page data
     */
    async loadAnalyticsData() {
        const endpoints = [
            '/api/analytics/data'
        ];
        
        return this.fetchBatch(endpoints);
    }

    /**
     * Load stock page data
     */
    async loadStockData(path) {
        const url = new URL(path, window.location.origin);
        const bankCode = url.searchParams.get('bank_code') || 'VCB';
        
        const endpoints = [
            `/api/stock/data?bank_code=${bankCode}`
        ];
        
        return this.fetchBatch(endpoints);
    }

    /**
     * Preload essential data that's used across multiple pages
     */
    async preloadCriticalData() {
        const criticalEndpoints = [
            '/api/news',
            '/api/market-cap',
            '/api/index/all'
        ];

        console.log('📊 Preloading critical data...');
        const preloadPromises = criticalEndpoints.map(endpoint => 
            this.fetch(endpoint, { preload: true })
        );

        try {
            await Promise.allSettled(preloadPromises);
            console.log('✅ Critical data preloaded successfully');
        } catch (error) {
            console.warn('⚠️ Some critical data failed to preload:', error);
        }
    }

    /**
     * Enhanced fetch with intelligent caching
     */
    async fetch(url, options = {}) {
        const cacheKey = this.getCacheKey(url, options);
        
        // Check if request is already in progress
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }

        // Check cache first
        const cached = this.getFromCache(cacheKey);
        if (cached && !options.forceRefresh) {
            console.log(`💾 Cache hit for: ${url}`);
            return cached;
        }

        // Create promise and store it to prevent duplicate requests
        const promise = this._fetchFromAPI(url, options);
        this.loadingPromises.set(cacheKey, promise);

        try {
            const data = await promise;
            this.setCache(cacheKey, data);
            this.loadingPromises.delete(cacheKey);
            
            if (options.preload) {
                this.preloadedData.add(cacheKey);
            }
            
            console.log(`📡 API call completed: ${url}`);
            return data;
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
    }

    /**
     * Batch fetch multiple endpoints
     */
    async fetchBatch(endpoints) {
        console.log('📦 Batch fetching:', endpoints.length, 'endpoints');
        const promises = endpoints.map(endpoint => 
            typeof endpoint === 'string' 
                ? this.fetch(endpoint)
                : this.fetch(endpoint.url, endpoint.options)
        );

        return Promise.allSettled(promises);
    }

    /**
     * Internal fetch method
     */
    async _fetchFromAPI(url, options = {}) {
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options.fetchOptions
        };

        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Cache management
     */
    getCacheKey(url, options = {}) {
        return `${url}:${JSON.stringify(options.params || {})}`;
    }

    getFromCache(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now - item.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache with optional pattern matching
     */
    clearCache(pattern = null) {
        if (!pattern) {
            this.cache.clear();
            this.preloadedData.clear();
            console.log('🗑️ All cache cleared');
        } else {
            // Clear cache entries matching pattern
            const keysToDelete = Array.from(this.cache.keys()).filter(key => 
                key.includes(pattern)
            );
            
            keysToDelete.forEach(key => this.cache.delete(key));
            console.log(`🗑️ Cache cleared for pattern: ${pattern} (${keysToDelete.length} items)`);
        }
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            preloadedItems: this.preloadedData.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Convenient methods for common endpoints
     */
    async getNews() {
        return this.fetch('/api/news');
    }

    async getNewsById(id) {
        return this.fetch(`/api/news/${id}`);
    }

    async getMarketCap() {
        return this.fetch('/api/market-cap');
    }

    async getIndicesData() {
        return this.fetch('/api/index/all');
    }

    async getFinancialChart(lineItemId) {
        return this.fetch(`/api/financial/chart-data/${lineItemId}`);
    }

    async getTotalCapital(year, quarter, lineItemId) {
        return this.fetch(`/api/capital/total?year=${year}&quarter=${quarter}&line_item_id=${lineItemId}`);
    }

    /**
     * Invalidate cache for specific pages
     */
    invalidatePageCache(path) {
        if (path.startsWith('/stock')) {
            this.clearCache('stock');
        } else {
            this.clearCache(path.replace('/', ''));
        }
    }

    /**
     * Refresh data for current page
     */
    async refreshPageData(path) {
        this.invalidatePageCache(path);
        await this.handlePageSpecificData(path);
    }
}

// Create global instance
window.dataManager = new DataManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} 