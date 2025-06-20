/**
 * SPA Navigation Manager
 * Handles client-side navigation without full page reloads
 * Intercepts navigation clicks and loads content via AJAX
 */

class SPANavigation {
    constructor() {
        this.currentPath = window.location.pathname;
        this.isLoading = false;
        this.loadingIndicator = null;
        this.navigationHistory = [];
        
        // Route mapping for API endpoints
        this.routeMap = {
            '/': '/api/partial/priceboard',
            '/priceboard': '/api/partial/priceboard',
            '/information': '/api/partial/information',
            '/report': '/api/partial/report',
            '/analytics': '/api/partial/analytics',
            '/stock': '/api/partial/stock'
        };
        
        this.init();
    }

    init() {
        console.log('🚀 SPA Navigation initialized');
        
        // Create loading indicator
        this.createLoadingIndicator();
        
        // Intercept navigation clicks
        this.interceptNavigationClicks();
        
        // Handle browser back/forward
        this.handlePopState();
        
        // Mark current active menu item
        this.updateActiveMenuItem(this.currentPath);
        
        // Initialize navigation history
        this.navigationHistory.push({
            path: this.currentPath,
            timestamp: Date.now()
        });
    }

    createLoadingIndicator() {
        // Create a small centered loading spinner for main content
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'spa-main-loading';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner-center"></div>
        `;
        this.loadingIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: none;
            z-index: 1000;
        `;
        
        const spinner = this.loadingIndicator.querySelector('.loading-spinner-center');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--color-primary, #3498db);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        // Add spinner animation and transition styles
        if (!document.getElementById('spa-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spa-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .spa-fade-out {
                    opacity: 0.3;
                    transition: opacity 0.2s ease-out;
                }
                
                .spa-fade-in {
                    opacity: 1;
                    transition: opacity 0.2s ease-in;
                }
                
                .spa-loading-state {
                    position: relative;
                    min-height: 200px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    showLoading() {
        if (!this.isLoading) {
            this.isLoading = true;
            
            // Add loading indicator to main element
            const mainElement = document.getElementById('main');
            if (mainElement) {
                mainElement.classList.add('spa-loading-state');
                mainElement.appendChild(this.loadingIndicator);
                this.loadingIndicator.style.display = 'block';
                
                // Add subtle fade to main content
                mainElement.classList.add('spa-fade-out');
            }
        }
    }

    hideLoading() {
        if (this.isLoading) {
            this.isLoading = false;
            
            const mainElement = document.getElementById('main');
            if (mainElement) {
                mainElement.classList.remove('spa-loading-state', 'spa-fade-out');
                
                // Remove loading indicator
                if (this.loadingIndicator && this.loadingIndicator.parentNode === mainElement) {
                    mainElement.removeChild(this.loadingIndicator);
                }
            }
        }
    }

    interceptNavigationClicks() {
        // Intercept sidebar navigation
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.includes('mailto:')) {
                return; // Let these links work normally
            }
            
            // Check if this is a navigation link we should handle
            if (this.shouldInterceptLink(link, href)) {
                e.preventDefault();
                this.navigateTo(href);
            }
        });
    }

    shouldInterceptLink(link, href) {
        // Only intercept sidebar navigation links
        const isInSidebar = link.closest('#navbar .sidebar');
        const isNavigationRoute = this.routeMap.hasOwnProperty(href) || href.startsWith('/stock');
        
        return isInSidebar && isNavigationRoute;
    }

    async navigateTo(path, pushState = true) {
        if (this.isLoading || path === this.currentPath) {
            return;
        }

        try {
            // Emit before navigate event for preloading
            window.dispatchEvent(new CustomEvent('spaBeforeNavigate', {
                detail: { path, previousPath: this.currentPath }
            }));
            
            this.showLoading();
            
            // Get API endpoint for this path
            const apiEndpoint = this.getApiEndpoint(path);
            
            // Fetch partial content with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(apiEndpoint, {
                signal: controller.signal,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update main content with smooth transition
            await this.updateMainContent(data.content);
            
            // Update page title
            if (data.title) {
                document.title = data.title;
            }
            
            // Execute any scripts if needed
            if (data.scripts) {
                await this.executeScripts(data.scripts);
            }
            
            // Update URL and history
            if (pushState) {
                window.history.pushState({ 
                    path,
                    timestamp: Date.now(),
                    title: data.title 
                }, data.title || '', path);
            }
            
            // Update current path and active menu
            const previousPath = this.currentPath;
            this.currentPath = path;
            this.updateActiveMenuItem(path);
            
            // Add to navigation history
            this.navigationHistory.push({
                path,
                previousPath,
                timestamp: Date.now()
            });
            
            // Keep history manageable
            if (this.navigationHistory.length > 50) {
                this.navigationHistory = this.navigationHistory.slice(-25);
            }
            
            // Scroll to top with smooth behavior
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Emit navigation complete event
            window.dispatchEvent(new CustomEvent('spaContentChanged', {
                detail: { 
                    path,
                    previousPath,
                    data: data,
                    timestamp: Date.now()
                }
            }));
            
            console.log(`✅ Navigated to: ${path}`);
            
        } catch (error) {
            console.error('❌ Navigation error:', error);
            
            // Show user-friendly error
            this.showNavigationError(error);
            
            // Fallback to normal navigation if critical error
            if (error.name === 'AbortError') {
                console.log('🔄 Request timeout, falling back to normal navigation');
            }
            
            setTimeout(() => {
                window.location.href = path;
            }, 1500);
            
        } finally {
            this.hideLoading();
        }
    }

    showNavigationError(error) {
        // Create temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f8d7da;
                color: #721c24;
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid #f5c6cb;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            ">
                <strong>Lỗi điều hướng</strong><br>
                ${error.message}<br>
                <small>Đang chuyển hướng...</small>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after delay
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 3000);
    }

    getApiEndpoint(path) {
        // Handle stock route with parameters
        if (path.startsWith('/stock')) {
            const url = new URL(path, window.location.origin);
            const bankCode = url.searchParams.get('bank_code') || 'VCB';
            return `/api/partial/stock?bank_code=${bankCode}`;
        }
        
        return this.routeMap[path] || this.routeMap['/priceboard'];
    }

    async updateMainContent(content) {
        const mainElement = document.getElementById('main');
        if (!mainElement) return;
        
        return new Promise(resolve => {
            // Add fade out class
            mainElement.classList.add('spa-fade-out');
            
            setTimeout(() => {
                // Update content
                mainElement.innerHTML = content;
                
                // Remove fade out and add fade in
                mainElement.classList.remove('spa-fade-out');
                mainElement.classList.add('spa-fade-in');
                
                // Clean up classes
                setTimeout(() => {
                    mainElement.classList.remove('spa-fade-in');
                    resolve();
                }, 150);
                
                // Trigger any necessary reinitializations
                this.reinitializeComponents();
                
            }, 150);
        });
    }

    reinitializeComponents() {
        // Reinitialize any components that need it after content change
        
        // Re-run data manager if it exists
        if (window.dataManager) {
            console.log('🔄 DataManager will handle page-specific initialization');
        }
        
        // Reinitialize any third-party libraries
        this.reinitializeLibraries();
        
        // Trigger layout recalculation
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }

    reinitializeLibraries() {
        // Reinitialize Chart.js if present
        if (window.Chart && window.Chart.getChart) {
            // Clean up existing charts
            Object.values(window.Chart.instances || {}).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    chart.destroy();
                }
            });
        }
        
        // Reinitialize Plotly if present
        if (window.Plotly) {
            const plotlyElements = document.querySelectorAll('.plotly');
            plotlyElements.forEach(element => {
                if (element.data) {
                    window.Plotly.purge(element);
                }
            });
        }
    }

    async executeScripts(scripts) {
        if (!scripts || !scripts.trim()) return;
        
        try {
            // Create a script element and execute
            const scriptElement = document.createElement('script');
            scriptElement.textContent = scripts;
            scriptElement.setAttribute('data-spa-script', 'true');
            
            document.head.appendChild(scriptElement);
            
            // Clean up after execution
            setTimeout(() => {
                document.head.removeChild(scriptElement);
            }, 100);
            
        } catch (error) {
            console.warn('Script execution error:', error);
        }
    }

    updateActiveMenuItem(path) {
        // Remove active class from all menu items
        document.querySelectorAll('#navbar .sidebar a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current menu item
        const currentLink = document.querySelector(`#navbar .sidebar a[href="${path}"]`) ||
                           document.querySelector(`#navbar .sidebar a[href="${path.split('?')[0]}"]`);
        
        if (currentLink) {
            currentLink.classList.add('active');
        } else if (path === '/' || path === '/priceboard') {
            // Special case for home/priceboard
            const priceboardLink = document.querySelector('#navbar .sidebar a[href="/priceboard"]');
            if (priceboardLink) {
                priceboardLink.classList.add('active');
            }
        }
    }

    handlePopState() {
        window.addEventListener('popstate', (e) => {
            const path = e.state?.path || window.location.pathname;
            this.navigateTo(path, false);
        });
    }

    // Public methods
    go(path) {
        return this.navigateTo(path);
    }

    back() {
        window.history.back();
    }

    forward() {
        window.history.forward();
    }

    getCurrentPath() {
        return this.currentPath;
    }

    getNavigationHistory() {
        return [...this.navigationHistory];
    }

    isEnabled() {
        return !this.isLoading;
    }

    // Performance monitoring
    getPerformanceStats() {
        return {
            currentPath: this.currentPath,
            isLoading: this.isLoading,
            historyLength: this.navigationHistory.length,
            lastNavigation: this.navigationHistory[this.navigationHistory.length - 1]
        };
    }
}

// Initialize SPA Navigation when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.spaNavigation = new SPANavigation();
    
    // Expose performance monitoring
    window.spaStats = () => window.spaNavigation.getPerformanceStats();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SPANavigation;
} 