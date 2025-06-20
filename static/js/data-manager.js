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
        // Preload critical data on first page load
        await this.preloadCriticalData();
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
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.preloadedData.clear();
        console.log('🗑️ Cache cleared');
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
}

// Create global instance
window.dataManager = new DataManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} 