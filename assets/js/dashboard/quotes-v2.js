/**
 * GlazierOS Quotes Panel v2.0
 * Production-grade quotes management with advanced features
 * 
 * @package GlazierOS
 * @version 2.0.0
 * @since   0.4.0
 */

(function($, window, document) {
    'use strict';

    console.log('⚙️ quotes-v2.js loaded');

    /**
     * ========================================
     * CONSTANTS & CONFIGURATION
     * ========================================
     */
    const CONFIG = {
        API_BASE: '/wp-json/glazieros/v1',
        DEBOUNCE_DELAY: 500,
        AUTO_SAVE_DELAY: 2000,
        ITEMS_PER_PAGE: 12,
        ANIMATION_DURATION: 300,
        STORAGE_KEY: 'gos_quotes_preferences',
        VIEW_MODES: ['grid', 'table', 'kanban'],
        DATE_RANGES: {
            today: { label: 'Today', days: 0 },
            week: { label: 'This Week', days: 7 },
            month: { label: 'This Month', days: 30 },
            quarter: { label: 'This Quarter', days: 90 },
            year: { label: 'This Year', days: 365 },
            custom: { label: 'Custom Range', days: null }
        },
        STATUSES: {
            lead: [
                { value: 'New', label: 'New', color: '#3498db', icon: '🆕' },
                { value: 'Quoted', label: 'Quoted', color: '#f1c40f', icon: '💰' },
                { value: 'Follow-up', label: 'Follow-up', color: '#e67e22', icon: '📞' },
                { value: 'Won', label: 'Won', color: '#2ecc71', icon: '✅' },
                { value: 'Lost', label: 'Lost', color: '#e74c3c', icon: '❌' }
            ],
            install: [
                { value: 'Pending', label: 'Pending', color: '#95a5a6', icon: '⏳' },
                { value: 'Scheduled', label: 'Scheduled', color: '#8e44ad', icon: '📅' },
                { value: 'In Progress', label: 'In Progress', color: '#3498db', icon: '🔧' },
                { value: 'Completed', label: 'Completed', color: '#27ae60', icon: '✔️' }
            ]
        },
        SORT_OPTIONS: [
            { value: 'date_desc', label: 'Newest First' },
            { value: 'date_asc', label: 'Oldest First' },
            { value: 'price_desc', label: 'Price: High to Low' },
            { value: 'price_asc', label: 'Price: Low to High' },
            { value: 'customer_asc', label: 'Customer A-Z' },
            { value: 'customer_desc', label: 'Customer Z-A' }
        ]
    };

    /**
     * ========================================
     * STATE MANAGEMENT
     * ========================================
     */
    class StateManager {
        constructor() {
            this.state = this.loadState() || this.getDefaultState();
            this.listeners = [];
        }

        getDefaultState() {
            return {
                // View preferences
                viewMode: 'grid',
                sortBy: 'date_desc',
                itemsPerPage: CONFIG.ITEMS_PER_PAGE,
                
                // Filters
                filters: {
                    search: '',
                    dateRange: null,
                    startDate: null,
                    endDate: null,
                    leadStatuses: [],
                    installStatuses: [],
                    minPrice: null,
                    maxPrice: null,
                    fitters: [],
                    branches: [],
                    tags: []
                },
                
                // Pagination
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                
                // Selection
                selectedQuotes: new Set(),
                selectAll: false,
                
                // Data
                quotes: [],
                filteredQuotes: [],
                statistics: null,
                
                // UI state
                loading: false,
                error: null,
                lastUpdate: null
            };
        }

        setState(updates, persist = true) {
            const oldState = { ...this.state };
            
            // Reset to page 1 if filters, sortBy, or search changed
            if (updates.filters || updates.sortBy) {
                updates.currentPage = 1;
            }
            
            this.state = { ...this.state, ...updates };
            
            if (persist && !updates.quotes && !updates.filteredQuotes) {
                this.saveState();
            }
            
            this.notifyListeners(this.state, oldState);
        }

        getState() {
            return this.state;
        }

        subscribe(listener) {
            this.listeners.push(listener);
            return () => {
                this.listeners = this.listeners.filter(l => l !== listener);
            };
        }

        notifyListeners(newState, oldState) {
            this.listeners.forEach(listener => listener(newState, oldState));
        }

        saveState() {
            try {
                const persistData = {
                    viewMode: this.state.viewMode,
                    sortBy: this.state.sortBy,
                    itemsPerPage: this.state.itemsPerPage,
                    filters: this.state.filters
                };
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(persistData));
            } catch (e) {
                console.warn('Failed to save state:', e);
            }
        }

        loadState() {
            try {
                const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    return { ...this.getDefaultState(), ...parsed };
                }
            } catch (e) {
                console.warn('Failed to load state:', e);
            }
            return null;
        }

        resetFilters() {
            this.setState({
                filters: this.getDefaultState().filters,
                currentPage: 1
            });
        }

        toggleQuoteSelection(quoteId) {
            const selected = new Set(this.state.selectedQuotes);
            if (selected.has(quoteId)) {
                selected.delete(quoteId);
            } else {
                selected.add(quoteId);
            }
            this.setState({ selectedQuotes: selected }, false);
        }

        selectAllQuotes(quotes) {
            const selected = new Set(quotes.map(q => q.id));
            this.setState({ selectedQuotes: selected, selectAll: true }, false);
        }

        deselectAllQuotes() {
            this.setState({ selectedQuotes: new Set(), selectAll: false }, false);
        }
    }

    /**
     * ========================================
     * API SERVICE
     * ========================================
     */
    class APIService {
        constructor() {
            this.baseURL = CONFIG.API_BASE;
            this.nonce = wpApiSettings?.nonce || '';
        }

        async request(endpoint, options = {}) {
            const url = `${this.baseURL}${endpoint}`;
            console.log('🌐 API Request:', url);
            const headers = {
                'Content-Type': 'application/json',
                'X-WP-Nonce': this.nonce,
                ...options.headers
            };

            try {
                console.log('Fetching...', { url, options });
                const response = await fetch(url, { ...options, headers });
                console.log('Response status:', response.status, response.statusText);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Response data:', data);
                return {
                    success: true,
                    data,
                    headers: {
                        totalPages: parseInt(response.headers.get('X-WP-TotalPages') || '1'),
                        totalItems: parseInt(response.headers.get('X-WP-Total') || '0')
                    }
                };
            } catch (error) {
                console.error('❌ API Error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        async getQuotes(params = {}) {
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });

            const query = queryParams.toString();
            return this.request(`/jobs${query ? '?' + query : ''}`);
        }

        async getQuote(id) {
            return this.request(`/jobs/${id}`);
        }

        async updateQuoteStatus(id, status, type) {
            return this.request(`/jobs/${id}/status`, {
                method: 'POST',
                body: JSON.stringify({ status, type })
            });
        }

        async updateQuote(id, data) {
            return this.request(`/jobs/${id}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }

        async createQuote(data) {
            return this.request('/jobs', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }

        async deleteQuote(id) {
            return this.request(`/jobs/${id}`, { method: 'DELETE' });
        }

        async bulkDelete(ids) {
            return this.request('/jobs/bulk-delete', {
                method: 'POST',
                body: JSON.stringify({ ids })
            });
        }

        async getStatistics(filters = {}) {
            // This would call a dedicated stats endpoint
            // For now, we'll calculate client-side
            return { success: true, data: {} };
        }
    }

    /**
     * ========================================
     * FILTER MANAGER
     * ========================================
     */
    class FilterManager {
        constructor(state) {
            this.state = state;
        }

        applyFilters(quotes) {
            const filters = this.state.getState().filters;
            let filtered = [...quotes];

            // Search filter
            if (filters.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(q => {
                    const customerName = `${q.first_name} ${q.last_name}`.toLowerCase();
                    const email = (q.email || '').toLowerCase();
                    const phone = (q.phone || '').toLowerCase();
                    const id = q.id.toString();
                    
                    return customerName.includes(search) ||
                           email.includes(search) ||
                           phone.includes(search) ||
                           id.includes(search);
                });
            }

            // Date range filter
            if (filters.startDate && filters.endDate) {
                const start = new Date(filters.startDate);
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                
                filtered = filtered.filter(q => {
                    const quoteDate = new Date(q.date);
                    return quoteDate >= start && quoteDate <= end;
                });
            }

            // Status filters
            if (filters.leadStatuses.length > 0) {
                filtered = filtered.filter(q => 
                    filters.leadStatuses.includes(q.lead_status)
                );
            }

            if (filters.installStatuses.length > 0) {
                filtered = filtered.filter(q => 
                    filters.installStatuses.includes(q.install_status)
                );
            }

            // Price range filter
            if (filters.minPrice !== null) {
                filtered = filtered.filter(q => 
                    parseFloat(q.price) >= parseFloat(filters.minPrice)
                );
            }

            if (filters.maxPrice !== null) {
                filtered = filtered.filter(q => 
                    parseFloat(q.price) <= parseFloat(filters.maxPrice)
                );
            }

            // Fitter filter
            if (filters.fitters.length > 0) {
                filtered = filtered.filter(q => 
                    filters.fitters.includes(q.assigned_fitter)
                );
            }

            // Branch filter
            if (filters.branches.length > 0) {
                filtered = filtered.filter(q => 
                    filters.branches.includes(q.branch_id)
                );
            }

            return filtered;
        }

        sortQuotes(quotes, sortBy) {
            const sorted = [...quotes];
            
            switch (sortBy) {
                case 'date_desc':
                    return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
                case 'date_asc':
                    return sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
                case 'price_desc':
                    return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                case 'price_asc':
                    return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                case 'customer_asc':
                    return sorted.sort((a, b) => {
                        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                case 'customer_desc':
                    return sorted.sort((a, b) => {
                        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                        return nameB.localeCompare(nameA);
                    });
                default:
                    return sorted;
            }
        }

        getActiveFilterCount() {
            const filters = this.state.getState().filters;
            let count = 0;
            
            if (filters.search) count++;
            if (filters.startDate && filters.endDate) count++;
            if (filters.leadStatuses.length > 0) count += filters.leadStatuses.length;
            if (filters.installStatuses.length > 0) count += filters.installStatuses.length;
            if (filters.minPrice !== null || filters.maxPrice !== null) count++;
            if (filters.fitters.length > 0) count += filters.fitters.length;
            if (filters.branches.length > 0) count += filters.branches.length;
            
            return count;
        }
    }

    /**
     * ========================================
     * MAIN QUOTES MANAGER
     * ========================================
     */
    class QuotesManager {
        constructor($container) {
            this.$container = $container;
            this.state = new StateManager();
            this.api = new APIService();
            this.filterManager = new FilterManager(this.state);
            this.initialized = false;
            
            // Bind methods
            this.loadQuotes = this.loadQuotes.bind(this);
            this.render = this.render.bind(this);
            this.handleFilterChange = $.debounce(CONFIG.DEBOUNCE_DELAY, this.handleFilterChange.bind(this));
        }

        async init() {
            console.log('🚀 QuotesManager.init() started');
            if (this.initialized) {
                console.log('Already initialized, calling refresh');
                return this.refresh();
            }

            this.initialized = true;
            
            // Subscribe to state changes FIRST (before loading data)
            this.state.subscribe((newState, oldState) => {
                // Trigger render when quotes, filters, sort, viewMode, or loading changes
                if (newState.quotes !== oldState.quotes || 
                    newState.filters !== oldState.filters ||
                    newState.sortBy !== oldState.sortBy ||
                    newState.viewMode !== oldState.viewMode ||
                    newState.loading !== oldState.loading) {
                    console.log('State changed, triggering render');
                    this.render();
                }
            });
            
            // Keyboard shortcuts for power users and accessibility
            console.log('Setting up keyboard shortcuts...');
            this.setupKeyboardShortcuts();
            
            console.log('Rendering UI...');
            this.renderUI();
            console.log('Attaching event listeners...');
            this.attachEventListeners();
            
            // Set initial page size from state
            const pageSize = this.state.getState().itemsPerPage;
            $('#gos-page-size-select').val(pageSize);
            
            console.log('Loading quotes from API...');
            try {
                await this.loadQuotes();
                console.log('✅ Quotes loaded successfully');
            } catch (error) {
                console.error('❌ Error loading quotes:', error);
            }
            
            console.log('✅ QuotesManager.init() complete');
        }

        setupKeyboardShortcuts() {
            // Remove any existing keyboard listener
            $(document).off('keydown.quotesManager');
            
            // Global keyboard shortcuts
            $(document).on('keydown.quotesManager', (e) => {
                // Don't interfere with typing in inputs/textareas
                if ($(e.target).is('input, textarea, select')) return;
                
                const ctrl = e.ctrlKey || e.metaKey; // Support both Ctrl (Windows) and Cmd (Mac)
                
                switch(e.key.toLowerCase()) {
                    case 'c':
                        if (ctrl) {
                            e.preventDefault();
                            this.handleQuickClone();
                        }
                        break;
                    case 'd':
                        if (ctrl) {
                            e.preventDefault();
                            this.handleQuickDelete();
                        }
                        break;
                    case 'e':
                        if (ctrl) {
                            e.preventDefault();
                            this.handleQuickEdit();
                        }
                        break;
                    case 'escape':
                        // Close all open dropdowns and panels
                        $('#gos-export-dropdown').hide();
                        $('#gos-debug-panel').slideUp(300);
                        $('#gos-stats-panel').slideUp(300);
                        break;
                    case 'f':
                        if (ctrl) {
                            e.preventDefault();
                            $('#gos-search-input').focus();
                        }
                        break;
                    case '?':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showKeyboardShortcutsHelp();
                        }
                        break;
                }
            });
            
            console.log('✅ Keyboard shortcuts enabled (Ctrl+C/D/E, Ctrl+F, Esc, Shift+?)');
        }

        handleQuickClone() {
            const selected = Array.from(this.state.getState().selectedQuotes);
            if (selected.length === 1) {
                this.cloneQuote(selected[0]);
            } else if (selected.length === 0) {
                this.showNotification('💡 Select a quote to clone (click checkbox)', 'info');
            } else {
                this.showNotification('⚠️ Can only clone one quote at a time', 'warning');
            }
        }

        handleQuickDelete() {
            const selected = Array.from(this.state.getState().selectedQuotes);
            if (selected.length > 0) {
                this.bulkDelete();
            } else {
                this.showNotification('💡 Select quotes to delete (click checkboxes)', 'info');
            }
        }

        handleQuickEdit() {
            const selected = Array.from(this.state.getState().selectedQuotes);
            if (selected.length === 1) {
                window.selectedJobId = selected[0];
                $(document).trigger('gsa:activate:panel', ['quote-detail']);
            } else if (selected.length === 0) {
                this.showNotification('💡 Select a quote to edit (click checkbox)', 'info');
            } else {
                this.showNotification('⚠️ Can only edit one quote at a time', 'warning');
            }
        }

        showKeyboardShortcutsHelp() {
            const helpHTML = `
                <div class="gos-keyboard-help-modal">
                    <div class="gos-keyboard-help-content">
                        <h3>⌨️ Keyboard Shortcuts</h3>
                        <div class="gos-shortcuts-grid">
                            <div class="gos-shortcut-section">
                                <h4>Navigation</h4>
                                <div class="gos-shortcut-item">
                                    <kbd>Ctrl</kbd> + <kbd>F</kbd>
                                    <span>Focus search</span>
                                </div>
                                <div class="gos-shortcut-item">
                                    <kbd>Esc</kbd>
                                    <span>Close panels</span>
                                </div>
                            </div>
                            <div class="gos-shortcut-section">
                                <h4>Actions</h4>
                                <div class="gos-shortcut-item">
                                    <kbd>Ctrl</kbd> + <kbd>C</kbd>
                                    <span>Clone selected quote</span>
                                </div>
                                <div class="gos-shortcut-item">
                                    <kbd>Ctrl</kbd> + <kbd>D</kbd>
                                    <span>Delete selected quotes</span>
                                </div>
                                <div class="gos-shortcut-item">
                                    <kbd>Ctrl</kbd> + <kbd>E</kbd>
                                    <span>Edit selected quote</span>
                                </div>
                            </div>
                            <div class="gos-shortcut-section">
                                <h4>Help</h4>
                                <div class="gos-shortcut-item">
                                    <kbd>Shift</kbd> + <kbd>?</kbd>
                                    <span>Show this help</span>
                                </div>
                            </div>
                        </div>
                        <button class="gos-btn gos-btn-primary" onclick="$('.gos-keyboard-help-modal').remove()">Got it!</button>
                    </div>
                </div>
            `;
            
            // Remove existing help modal
            $('.gos-keyboard-help-modal').remove();
            
            // Inject styles
            const helpStyles = `
                <style>
                .gos-keyboard-help-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100000;
                    animation: fadeIn 0.2s ease;
                }
                .gos-keyboard-help-content {
                    background: white;
                    border-radius: 12px;
                    padding: 32px;
                    max-width: 600px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                }
                .gos-keyboard-help-content h3 {
                    margin: 0 0 24px 0;
                    font-size: 24px;
                    color: #1e293b;
                }
                .gos-shortcuts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 24px;
                    margin-bottom: 24px;
                }
                .gos-shortcut-section h4 {
                    font-size: 14px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin: 0 0 12px 0;
                }
                .gos-shortcut-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                    font-size: 14px;
                }
                .gos-shortcut-item kbd {
                    background: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-family: monospace;
                    font-size: 12px;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }
                .gos-shortcut-item span {
                    color: #475569;
                }
                </style>
            `;
            
            // Append to body
            $('body').append(helpStyles + helpHTML);
            
            // Close on background click
            $('.gos-keyboard-help-modal').on('click', function(e) {
                if (e.target === this) {
                    $(this).remove();
                }
            });
            
            // Close on Escape
            $(document).one('keydown', function(e) {
                if (e.key === 'Escape') {
                    $('.gos-keyboard-help-modal').remove();
                }
            });
        }

        destroy() {
            // Cleanup keyboard shortcuts when quotes manager is destroyed
            $(document).off('keydown.quotesManager');
            console.log('✅ QuotesManager keyboard shortcuts cleaned up');
        }

        renderUI() {
            this.$container.html(this.getMainTemplate());
            this.injectStyles();
        }

        getMainTemplate() {
            return `
                <div class="gos-quotes-v2">
                    <!-- Header with controls -->
                    <div class="gos-quotes-header">
                        <div class="gos-header-left">
                            <h2 class="gos-quotes-title">Quotes</h2>
                            <div class="gos-quotes-stats" id="gos-quotes-stats">
                                <span class="gos-stat-badge">Loading...</span>
                            </div>
                        </div>
                        <div class="gos-header-right">
                            <div class="gos-view-switcher" role="radiogroup" aria-label="View mode">
                                <button class="gos-view-btn active" data-view="grid" title="Grid view" aria-label="Grid view">
                                    <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/><rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/></svg>
                                </button>
                                <button class="gos-view-btn" data-view="table" title="Table view" aria-label="Table view">
                                    <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="3"/><rect x="1" y="6" width="14" height="3"/><rect x="1" y="11" width="14" height="3"/></svg>
                                </button>
                                <button class="gos-view-btn" data-view="kanban" title="Kanban view" aria-label="Kanban view">
                                    <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="4" height="14"/><rect x="6" y="1" width="4" height="14"/><rect x="11" y="1" width="4" height="14"/></svg>
                                </button>
                            </div>
                            <button class="gos-button-primary" id="gos-create-quote-btn">
                                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2"/></svg>
                                New Quote
                            </button>
                        </div>
                    </div>

                    <!-- Filters bar -->
                    <div class="gos-filters-bar">
                        <div class="gos-search-wrapper">
                            <svg class="gos-search-icon" width="16" height="16" viewBox="0 0 16 16">
                                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" fill="none" stroke-width="2"/>
                                <path d="M10 10l4 4" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <input type="search" 
                                   id="gos-search-input" 
                                   class="gos-search-input" 
                                   placeholder="Search quotes by name, email, phone, or ID..."
                                   aria-label="Search quotes">
                        </div>
                        
                        <select id="gos-sort-select" class="gos-select" aria-label="Sort by">
                            ${CONFIG.SORT_OPTIONS.map(opt => 
                                `<option value="${opt.value}">${opt.label}</option>`
                            ).join('')}
                        </select>
                        
                        <button class="gos-button-secondary" id="gos-toggle-filters-btn" aria-expanded="false">
                            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M0 1h14M2 5h10M4 9h6" stroke="currentColor" stroke-width="2"/></svg>
                            Filters
                            <span class="gos-filter-badge" id="gos-filter-count" style="display: none;">0</span>
                        </button>
                        
                        <button class="gos-button-secondary gos-stats-btn gos-stats-btn-primary" id="gos-stats-btn" title="View Analytics & Statistics">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M2 12V8M7 12V4M12 12V6"/>
                                <circle cx="2" cy="8" r="1.5" fill="currentColor"/>
                                <circle cx="7" cy="4" r="1.5" fill="currentColor"/>
                                <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                            </svg>
                            Analytics
                        </button>
                        
                        <button class="gos-button-secondary" id="gos-debug-btn" title="System Diagnostics: View detailed API data and state information">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="7" cy="7" r="5.5"/>
                                <path d="M7 4v5M7 11h.01"/>
                            </svg>
                            Diagnostics
                        </button>
                        
                        <div class="gos-export-dropdown-wrapper">
                            <button class="gos-button-secondary" id="gos-export-btn" title="Export quotes to CSV, Excel, or PDF">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M7 2v8M4 7l3 3 3-3"/>
                                    <path d="M2 12h10"/>
                                </svg>
                                Export
                                <svg width="10" height="10" viewBox="0 0 10 10" class="gos-dropdown-arrow">
                                    <path d="M2 3l3 3 3-3" stroke="currentColor" fill="none" stroke-width="1.5"/>
                                </svg>
                            </button>
                            <div class="gos-export-dropdown" id="gos-export-dropdown" style="display: none;">
                                <button class="gos-export-option" data-format="csv">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="2" width="10" height="12" rx="1"/>
                                        <path d="M5 5h6M5 8h6M5 11h4"/>
                                    </svg>
                                    <div class="gos-export-option-content">
                                        <span class="gos-export-option-title">Export to CSV</span>
                                        <span class="gos-export-option-desc">Comma-separated values file</span>
                                    </div>
                                </button>
                                <button class="gos-export-option" data-format="excel">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="2" width="10" height="12" rx="1"/>
                                        <path d="M6 2v12M10 2v12M3 6h10M3 10h10"/>
                                    </svg>
                                    <div class="gos-export-option-content">
                                        <span class="gos-export-option-title">Export to Excel</span>
                                        <span class="gos-export-option-desc">Formatted spreadsheet (.xlsx)</span>
                                    </div>
                                </button>
                                <button class="gos-export-option" data-format="pdf">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="3" y="2" width="10" height="12" rx="1"/>
                                        <path d="M5 5h6M5 8h6M5 11h3"/>
                                    </svg>
                                    <div class="gos-export-option-content">
                                        <span class="gos-export-option-title">Export to PDF</span>
                                        <span class="gos-export-option-desc">Professional quote documents</span>
                                    </div>
                                </button>
                                <div class="gos-export-divider"></div>
                                <button class="gos-export-option" data-format="selected">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="2" y="3" width="5" height="5" rx="1"/>
                                        <rect x="9" y="3" width="5" height="5" rx="1"/>
                                        <rect x="2" y="10" width="5" height="5" rx="1"/>
                                        <path d="M11 12l1.5 1.5 2-2"/>
                                    </svg>
                                    <div class="gos-export-option-content">
                                        <span class="gos-export-option-title">Export Selected Only</span>
                                        <span class="gos-export-option-desc" id="gos-export-selected-count">0 quotes selected</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                        
                        <button class="gos-button-secondary" id="gos-bulk-actions-btn" disabled>
                            Bulk Actions
                            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 5l4 4 4-4" stroke="currentColor" fill="none"/></svg>
                        </button>
                        
                        <!-- Page Size Selector -->
                        <div class="gos-page-size-wrapper">
                            <label for="gos-page-size-select" class="gos-page-size-label">Show:</label>
                            <select id="gos-page-size-select" class="gos-select gos-page-size-select" aria-label="Items per page">
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="250">250</option>
                                <option value="0">All</option>
                            </select>
                        </div>
                    </div>

                    <!-- Diagnostics panel -->
                    <div class="gos-debug-panel" id="gos-debug-panel" style="display: none;">
                        <div class="gos-debug-header">
                            <div class="gos-debug-title">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <circle cx="8" cy="8" r="6"/>
                                    <path d="M8 5v5M8 12h.01"/>
                                </svg>
                                <span>System Diagnostics</span>
                            </div>
                            <div class="gos-debug-actions">
                                <button class="gos-debug-copy-btn" id="gos-debug-copy-btn" title="Copy diagnostic data to clipboard">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <rect x="4" y="4" width="8" height="8" rx="1"/>
                                        <path d="M2 10V3a1 1 0 0 1 1-1h7"/>
                                    </svg>
                                    Copy
                                </button>
                                <button class="gos-debug-close-btn" id="gos-debug-close-btn" title="Close diagnostics">×</button>
                            </div>
                        </div>
                        <div class="gos-debug-content" id="gos-debug-content"></div>
                    </div>

                    <!-- Statistics Panel -->
                    <div class="gos-stats-panel" id="gos-stats-panel" style="display: none;">
                        <div class="gos-stats-header">
                            <div class="gos-stats-title">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M3 15V10M9 15V5M15 15V8"/>
                                    <circle cx="3" cy="10" r="2" fill="currentColor"/>
                                    <circle cx="9" cy="5" r="2" fill="currentColor"/>
                                    <circle cx="15" cy="8" r="2" fill="currentColor"/>
                                </svg>
                                <span>Analytics & Statistics</span>
                            </div>
                            <div class="gos-stats-actions">
                                <button class="gos-stats-export-btn" id="gos-stats-export-btn" title="Export statistics data">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                                        <path d="M7 2v8M4 7l3 3 3-3"/>
                                        <path d="M2 12h10"/>
                                    </svg>
                                    Export
                                </button>
                                <button class="gos-stats-close-btn" id="gos-stats-close-btn" title="Close analytics">×</button>
                            </div>
                        </div>
                        <div class="gos-stats-content" id="gos-stats-content">
                            <!-- Content will be dynamically generated -->
                        </div>
                    </div>

                    <!-- Advanced filters panel (collapsible) -->
                    <div class="gos-filters-panel" id="gos-filters-panel" style="display: none;">
                        <!-- Will be populated dynamically -->
                    </div>

                    <!-- Bulk actions toolbar -->
                    <div class="gos-bulk-toolbar" id="gos-bulk-toolbar" style="display: none;">
                        <div class="gos-bulk-left">
                            <label class="gos-select-all-wrapper">
                                <input type="checkbox" id="gos-select-all-checkbox" aria-label="Select all quotes">
                                <span class="gos-select-all-label">
                                    <span id="gos-selected-count">0</span> selected
                                </span>
                            </label>
                            <button class="gos-bulk-deselect" id="gos-deselect-all" title="Clear selection">
                                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2"/></svg>
                            </button>
                        </div>
                        <div class="gos-bulk-actions">
                            <div class="gos-bulk-action-group">
                                <label class="gos-bulk-label">Change Status:</label>
                                <select id="gos-bulk-status-select" class="gos-bulk-select">
                                    <option value="">Select status...</option>
                                    <optgroup label="Lead Status">
                                        ${CONFIG.STATUSES.lead.map(s => `<option value="lead:${s.value}">${s.label}</option>`).join('')}
                                    </optgroup>
                                    <optgroup label="Install Status">
                                        ${CONFIG.STATUSES.install.map(s => `<option value="install:${s.value}">${s.label}</option>`).join('')}
                                    </optgroup>
                                </select>
                            </div>
                            <button class="gos-bulk-action-btn gos-bulk-export" data-action="export" title="Export to CSV">
                                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v8M4 6l3 3 3-3M1 13h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                                Export CSV
                            </button>
                            <button class="gos-bulk-action-btn gos-bulk-delete" data-action="delete" title="Delete selected">
                                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 3h12M5 1h4M5 5v6M9 5v6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
                                Delete
                            </button>
                        </div>
                    </div>

                    <!-- Main content area -->
                    <div class="gos-quotes-body" id="gos-quotes-body">
                        <div class="gos-loading-skeleton">
                            ${this.getLoadingSkeleton()}
                        </div>
                    </div>

                    <!-- Pagination -->
                    <div class="gos-pagination" id="gos-pagination" style="display: none;"></div>
                </div>

                <!-- Modal placeholder -->
                <div class="gos-modal" id="gos-quote-modal" style="display: none;"></div>
            `;
        }

        getLoadingSkeleton() {
            return Array(6).fill(0).map(() => `
                <div class="gos-skeleton-card">
                    <div class="gos-skeleton-header"></div>
                    <div class="gos-skeleton-body">
                        <div class="gos-skeleton-line"></div>
                        <div class="gos-skeleton-line"></div>
                        <div class="gos-skeleton-line short"></div>
                    </div>
                </div>
            `).join('');
        }

        getFiltersTemplate() {
            const state = this.state.getState();
            const filters = state.filters;
            
            return `
                <div class="gos-filters-content">
                    <div class="gos-filters-header">
                        <h3>Advanced Filters</h3>
                        <button class="gos-button-text" id="gos-clear-all-filters">Clear All</button>
                    </div>
                    
                    <div class="gos-filters-grid">
                        <!-- Date Range Filter -->
                        <div class="gos-filter-group">
                            <label class="gos-filter-label">Date Range</label>
                            <div class="gos-date-presets">
                                <button class="gos-preset-btn" data-preset="today">Today</button>
                                <button class="gos-preset-btn" data-preset="week">This Week</button>
                                <button class="gos-preset-btn" data-preset="month">This Month</button>
                                <button class="gos-preset-btn" data-preset="quarter">This Quarter</button>
                                <button class="gos-preset-btn" data-preset="year">This Year</button>
                            </div>
                            <div class="gos-date-inputs">
                                <input type="date" 
                                       id="gos-start-date" 
                                       class="gos-date-input" 
                                       value="${filters.startDate || ''}"
                                       aria-label="Start date">
                                <span class="gos-date-separator">to</span>
                                <input type="date" 
                                       id="gos-end-date" 
                                       class="gos-date-input" 
                                       value="${filters.endDate || ''}"
                                       aria-label="End date">
                            </div>
                        </div>

                        <!-- Lead Status Filter -->
                        <div class="gos-filter-group">
                            <label class="gos-filter-label">Lead Status</label>
                            <div class="gos-checkbox-group" id="gos-lead-status-group">
                                ${CONFIG.STATUSES.lead.map(status => `
                                    <label class="gos-checkbox-label">
                                        <input type="checkbox" 
                                               class="gos-filter-checkbox" 
                                               data-filter="leadStatus"
                                               value="${status.value}"
                                               ${filters.leadStatuses.includes(status.value) ? 'checked' : ''}>
                                        <span class="gos-checkbox-status">
                                            <span class="gos-status-dot" style="background: ${status.color}"></span>
                                            ${status.label}
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Install Status Filter -->
                        <div class="gos-filter-group">
                            <label class="gos-filter-label">Install Status</label>
                            <div class="gos-checkbox-group" id="gos-install-status-group">
                                ${CONFIG.STATUSES.install.map(status => `
                                    <label class="gos-checkbox-label">
                                        <input type="checkbox" 
                                               class="gos-filter-checkbox" 
                                               data-filter="installStatus"
                                               value="${status.value}"
                                               ${filters.installStatuses.includes(status.value) ? 'checked' : ''}>
                                        <span class="gos-checkbox-status">
                                            <span class="gos-status-dot" style="background: ${status.color}"></span>
                                            ${status.label}
                                        </span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Price Range Filter -->
                        <div class="gos-filter-group">
                            <label class="gos-filter-label">Price Range</label>
                            <div class="gos-price-inputs">
                                <div class="gos-input-wrapper">
                                    <span class="gos-input-prefix">£</span>
                                    <input type="number" 
                                           id="gos-min-price" 
                                           class="gos-price-input" 
                                           placeholder="Min"
                                           min="0"
                                           step="100"
                                           value="${filters.minPrice || ''}"
                                           aria-label="Minimum price">
                                </div>
                                <span class="gos-price-separator">–</span>
                                <div class="gos-input-wrapper">
                                    <span class="gos-input-prefix">£</span>
                                    <input type="number" 
                                           id="gos-max-price" 
                                           class="gos-price-input" 
                                           placeholder="Max"
                                           min="0"
                                           step="100"
                                           value="${filters.maxPrice || ''}"
                                           aria-label="Maximum price">
                                </div>
                            </div>
                            <div class="gos-price-range-visual">
                                <input type="range" 
                                       id="gos-price-slider" 
                                       class="gos-range-slider" 
                                       min="0" 
                                       max="10000" 
                                       step="100"
                                       value="${filters.maxPrice || 10000}">
                                <div class="gos-range-labels">
                                    <span>£0</span>
                                    <span>£10,000+</span>
                                </div>
                            </div>
                        </div>

                        <!-- Fitter Filter (Disabled - no backend data yet) -->
                        <!-- TODO: Uncomment when fitters endpoint is ready -->
                        <!--
                        <div class="gos-filter-group">
                            <label class="gos-filter-label">Assigned Fitter</label>
                            <select id="gos-fitter-filter" 
                                    class="gos-multiselect" 
                                    multiple
                                    aria-label="Filter by fitter">
                                <option value="">Loading...</option>
                            </select>
                        </div>
                        -->

                        <!-- Branch Filter (Disabled - no backend data yet) -->
                        <!-- TODO: Uncomment when branches endpoint is ready -->
                        <!--
                        <div class="gos-filter-group">
                            <label class="gos-filter-label">Branch</label>
                            <select id="gos-branch-filter" 
                                    class="gos-multiselect" 
                                    multiple
                                    aria-label="Filter by branch">
                                <option value="">Loading...</option>
                            </select>
                        </div>
                        -->
                    </div>

                    <!-- Active Filters Display -->
                    <div class="gos-active-filters" id="gos-active-filters" style="display: none;">
                        <!-- Will be populated dynamically -->
                    </div>

                    <!-- Filter Presets -->
                    <div class="gos-filter-presets">
                        <div class="gos-presets-header">
                            <span class="gos-presets-label">Saved Filters</span>
                            <button class="gos-button-text" id="gos-save-preset-btn">
                                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2v8M2 6h8" stroke="currentColor"/></svg>
                                Save Current
                            </button>
                        </div>
                        <div class="gos-presets-list" id="gos-presets-list">
                            <!-- Will be populated from localStorage -->
                        </div>
                    </div>
                </div>
            `;
        }

        renderFiltersPanel() {
            const $panel = $('#gos-filters-panel');
            $panel.html(this.getFiltersTemplate());
            this.updateActiveFiltersDisplay();
        }

        updateActiveFiltersDisplay() {
            const state = this.state.getState();
            const filters = state.filters;
            const activeFilters = [];

            // Check each filter type
            if (filters.search) {
                activeFilters.push({ type: 'search', label: `Search: "${filters.search}"`, value: filters.search });
            }
            if (filters.startDate && filters.endDate) {
                activeFilters.push({ 
                    type: 'dateRange', 
                    label: `${filters.startDate} to ${filters.endDate}`,
                    value: null
                });
            }
            if (filters.leadStatuses.length > 0) {
                activeFilters.push({ 
                    type: 'leadStatus', 
                    label: `Lead: ${filters.leadStatuses.join(', ')}`,
                    value: filters.leadStatuses
                });
            }
            if (filters.installStatuses.length > 0) {
                activeFilters.push({ 
                    type: 'installStatus', 
                    label: `Install: ${filters.installStatuses.join(', ')}`,
                    value: filters.installStatuses
                });
            }
            if (filters.minPrice !== null || filters.maxPrice !== null) {
                const min = filters.minPrice || '0';
                const max = filters.maxPrice || '∞';
                activeFilters.push({ 
                    type: 'priceRange', 
                    label: `Price: £${min} - £${max}`,
                    value: null
                });
            }

            const $container = $('#gos-active-filters');
            const $badge = $('#gos-filter-count');

            if (activeFilters.length === 0) {
                $container.hide();
                $badge.hide();
                return;
            }

            $badge.text(activeFilters.length).show();
            $container.show();
            
            const html = activeFilters.map(filter => `
                <span class="gos-active-filter-tag" data-filter-type="${filter.type}">
                    ${filter.label}
                    <button class="gos-remove-filter" data-filter-type="${filter.type}" aria-label="Remove filter">×</button>
                </span>
            `).join('');

            $container.html(html);
        }

        async loadQuotes() {
            console.log('📡 loadQuotes() called');
            this.state.setState({ loading: true, error: null });
            
            const currentState = this.state.getState();
            const params = {
                page: currentState.currentPage,
                per_page: currentState.itemsPerPage,
                sort: currentState.sortBy
            };

            console.log('Calling API with params:', params);
            const result = await this.api.getQuotes(params);
            console.log('API result:', result);
            
            if (result.success) {
                console.log('✅ API success, processing data...');
                // Handle empty data
                const data = result.data || [];
                console.log('Raw data count:', data.length);
                const filtered = this.filterManager.applyFilters(data);
                console.log('Filtered count:', filtered.length);
                const sorted = this.filterManager.sortQuotes(filtered, currentState.sortBy);
                console.log('Sorted count:', sorted.length);
                
                this.state.setState({
                    quotes: data,
                    filteredQuotes: sorted,
                    totalPages: result.headers.totalPages || 1,
                    totalItems: result.headers.totalItems || 0,
                    loading: false,
                    lastUpdate: new Date()
                });
                console.log('State updated with quotes');
                
                this.calculateStatistics();
                console.log('Statistics calculated');
            } else {
                console.error('Failed to load quotes:', result.error);
                this.state.setState({
                    loading: false,
                    error: result.error || 'Failed to load quotes. Please try again.'
                });
            }
        }

        calculateStatistics() {
            const quotes = this.state.getState().filteredQuotes;
            if (!quotes || quotes.length === 0) {
                this.state.setState({ 
                    statistics: {
                        total: 0,
                        totalValue: 0,
                        avgValue: 0,
                        conversionRate: 0,
                        byLeadStatus: {},
                        byInstallStatus: {}
                    }
                });
                this.updateStatisticsDisplay();
                return;
            }

            const stats = {
                total: quotes.length,
                totalValue: quotes.reduce((sum, q) => sum + parseFloat(q.price || 0), 0),
                avgValue: 0,
                byLeadStatus: {},
                byInstallStatus: {},
                conversionRate: 0
            };

            stats.avgValue = stats.totalValue / stats.total;

            // Count by status
            quotes.forEach(q => {
                const leadStatus = (q.lead_status || 'new').toLowerCase();
                const installStatus = q.install_status || 'pending';
                stats.byLeadStatus[leadStatus] = (stats.byLeadStatus[leadStatus] || 0) + 1;
                stats.byInstallStatus[installStatus] = (stats.byInstallStatus[installStatus] || 0) + 1;
            });

            // Calculate conversion rate
            const won = stats.byLeadStatus['won'] || 0;
            stats.conversionRate = stats.total > 0 ? (won / stats.total * 100).toFixed(1) : '0.0';

            this.state.setState({ statistics: stats });
            this.updateStatisticsDisplay();
        }

        updateStatisticsDisplay() {
            const stats = this.state.getState().statistics;
            if (!stats) return;

            const $statsContainer = $('#gos-quotes-stats');
            $statsContainer.html(`
                <span class="gos-stat-badge">
                    <strong>${stats.total}</strong> quotes
                </span>
                <span class="gos-stat-badge">
                    <strong>£${stats.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> total
                </span>
                <span class="gos-stat-badge">
                    <strong>${stats.conversionRate}%</strong> conversion
                </span>
            `);
        }

        render() {
            const state = this.state.getState();
            
            if (state.loading) {
                return; // Skeleton already showing
            }

            if (state.error) {
                this.renderError(state.error);
                return;
            }

            if (state.filteredQuotes.length === 0) {
                this.renderEmpty();
                return;
            }

            // Render based on view mode
            switch (state.viewMode) {
                case 'table':
                    this.renderTableView();
                    break;
                case 'kanban':
                    this.renderKanbanView();
                    break;
                case 'grid':
                default:
                    this.renderGridView();
            }

            this.updateBulkToolbar();
            this.renderPagination();
        }

        getPaginatedQuotes(quotes) {
            const state = this.state.getState();
            const pageSize = state.itemsPerPage;
            
            // If pageSize is 0 or 'all', return all quotes
            if (!pageSize || pageSize === 0 || pageSize === '0') {
                return quotes;
            }
            
            const currentPage = state.currentPage || 1;
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            
            return quotes.slice(startIndex, endIndex);
        }

        renderPagination() {
            const state = this.state.getState();
            const totalQuotes = state.filteredQuotes.length;
            const pageSize = parseInt(state.itemsPerPage) || 25;
            const currentPage = state.currentPage || 1;
            
            // Hide pagination if showing all or less than one page
            if (pageSize === 0 || totalQuotes <= pageSize) {
                $('#gos-pagination').hide();
                return;
            }
            
            const totalPages = Math.ceil(totalQuotes / pageSize);
            const startItem = (currentPage - 1) * pageSize + 1;
            const endItem = Math.min(currentPage * pageSize, totalQuotes);
            
            // Update state with total pages
            this.state.setState({ totalPages }, false);
            
            // Generate page numbers to show (max 7: 1 ... 3 4 5 ... 10)
            const pageNumbers = this.getPageNumbers(currentPage, totalPages);
            
            const html = `
                <div class="gos-pagination-wrapper">
                    <div class="gos-pagination-info">
                        Showing <strong>${startItem}-${endItem}</strong> of <strong>${totalQuotes}</strong> quotes
                    </div>
                    <div class="gos-pagination-controls">
                        <button class="gos-page-btn" 
                                data-page="1" 
                                ${currentPage === 1 ? 'disabled' : ''}
                                title="First page"
                                aria-label="Go to first page">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M8 2L4 6l4 4M6 2L2 6l4 4" stroke="currentColor" fill="none" stroke-width="1.5"/>
                            </svg>
                        </button>
                        <button class="gos-page-btn" 
                                data-page="${currentPage - 1}" 
                                ${currentPage === 1 ? 'disabled' : ''}
                                title="Previous page"
                                aria-label="Go to previous page">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M7 2L3 6l4 4" stroke="currentColor" fill="none" stroke-width="1.5"/>
                            </svg>
                        </button>
                        
                        ${pageNumbers.map(page => {
                            if (page === '...') {
                                return `<span class="gos-page-ellipsis">...</span>`;
                            }
                            return `
                                <button class="gos-page-btn ${page === currentPage ? 'active' : ''}" 
                                        data-page="${page}"
                                        aria-label="Go to page ${page}"
                                        ${page === currentPage ? 'aria-current="page"' : ''}>
                                    ${page}
                                </button>
                            `;
                        }).join('')}
                        
                        <button class="gos-page-btn" 
                                data-page="${currentPage + 1}" 
                                ${currentPage === totalPages ? 'disabled' : ''}
                                title="Next page"
                                aria-label="Go to next page">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M5 2l4 4-4 4" stroke="currentColor" fill="none" stroke-width="1.5"/>
                            </svg>
                        </button>
                        <button class="gos-page-btn" 
                                data-page="${totalPages}" 
                                ${currentPage === totalPages ? 'disabled' : ''}
                                title="Last page"
                                aria-label="Go to last page">
                            <svg width="12" height="12" viewBox="0 0 12 12">
                                <path d="M4 2l4 4-4 4M6 2l4 4-4 4" stroke="currentColor" fill="none" stroke-width="1.5"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
            
            $('#gos-pagination').html(html).show();
        }

        getPageNumbers(current, total) {
            // Always show first and last page
            // Show current page and 2 pages on each side
            // Add ellipsis for gaps
            
            if (total <= 7) {
                // Show all pages if 7 or fewer
                return Array.from({ length: total }, (_, i) => i + 1);
            }
            
            const pages = [];
            
            if (current <= 4) {
                // Near start: [1 2 3 4 5 ... 10]
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(total);
            } else if (current >= total - 3) {
                // Near end: [1 ... 6 7 8 9 10]
                pages.push(1);
                pages.push('...');
                for (let i = total - 4; i <= total; i++) pages.push(i);
            } else {
                // Middle: [1 ... 4 5 6 ... 10]
                pages.push(1);
                pages.push('...');
                for (let i = current - 1; i <= current + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(total);
            }
            
            return pages;
        }

        renderGridView() {
            const allQuotes = this.state.getState().filteredQuotes;
            const quotes = this.getPaginatedQuotes(allQuotes);
            const selectedIds = this.state.getState().selectedQuotes;
            
            const html = quotes.map(quote => this.getQuoteCard(quote, selectedIds.has(quote.id))).join('');
            
            $('#gos-quotes-body').html(`
                <div class="gos-quotes-grid">
                    ${html}
                </div>
            `);
        }

        getQuoteCard(quote, isSelected) {
            // Map different possible field name formats from WordPress API
            const firstName = quote.first_name || quote.firstName || quote.meta?.first_name || '';
            const lastName = quote.last_name || quote.lastName || quote.meta?.last_name || '';
            const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'No name';
            
            const email = quote.email || quote.meta?.email || '';
            const phone = quote.phone || quote.meta?.phone || '';
            const contact = email || phone || 'No contact';
            
            const productType = quote.type || quote.product_type || quote.meta?.type || 'Window';
            const width = parseFloat(quote.width || quote.meta?.width || 0);
            const height = parseFloat(quote.height || quote.meta?.height || 0);
            const price = parseFloat(quote.price || quote.meta?.price || 0);
            
            const leadStatus = CONFIG.STATUSES.lead.find(s => s.value === quote.lead_status) || CONFIG.STATUSES.lead[0];
            const installStatus = CONFIG.STATUSES.install.find(s => s.value === quote.install_status) || CONFIG.STATUSES.install[0];
            
            // Debug log to see what we're getting
            console.log('Quote data:', { quote, firstName, lastName, email, phone, productType, width, height, price });
            
            return `
                <div class="gos-quote-card ${isSelected ? 'selected' : ''}" data-quote-id="${quote.id}">
                    <div class="gos-card-checkbox">
                        <input type="checkbox" 
                               class="gos-quote-checkbox" 
                               data-quote-id="${quote.id}"
                               ${isSelected ? 'checked' : ''}
                               aria-label="Select quote ${quote.id}">
                    </div>
                    
                    <div class="gos-card-header">
                        <div class="gos-card-title-row">
                            <div class="gos-card-title-left">
                                <span class="gos-quote-id">#${quote.id}</span>
                                <span class="gos-quote-type">${productType}</span>
                            </div>
                            <div class="gos-dual-status-pill" data-quote-id="${quote.id}">
                                <button class="gos-status-segment gos-status-lead" 
                                        data-quote-id="${quote.id}"
                                        data-status-type="lead"
                                        data-current-status="${quote.lead_status}"
                                        style="background-color: ${leadStatus.color};"
                                        title="Lead Status: ${leadStatus.label} (click to change)">
                                    ${leadStatus.label}
                                </button>
                                <button class="gos-status-segment gos-status-install" 
                                        data-quote-id="${quote.id}"
                                        data-status-type="install"
                                        data-current-status="${quote.install_status}"
                                        style="background-color: ${installStatus.color};"
                                        title="Install Status: ${installStatus.label} (click to change)">
                                    ${installStatus.label}
                                </button>
                            </div>
                        </div>
                        <div class="gos-card-meta">
                            <span class="gos-meta-date">${this.formatDate(quote.date || quote.post_date || new Date())}</span>
                        </div>
                    </div>
                    
                    <div class="gos-card-body">
                        <div class="gos-customer-info">
                            <div class="gos-customer-name">${customerName}</div>
                            <div class="gos-customer-contact">${contact}</div>
                        </div>
                        
                        <div class="gos-quote-details">
                            <div class="gos-detail-row">
                                <span class="gos-detail-label">Size:</span>
                                <span class="gos-detail-value">${width.toFixed(2)}m × ${height.toFixed(2)}m</span>
                            </div>
                            <div class="gos-detail-row">
                                <span class="gos-detail-label">Price:</span>
                                <span class="gos-detail-value gos-price">£${price.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="gos-card-footer">
                        <div class="gos-card-actions">
                            <button class="gos-action-btn" data-action="view" data-quote-id="${quote.id}" title="View details">
                                <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="3"/><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" fill="none" stroke="currentColor"/></svg>
                            </button>
                            <button class="gos-action-btn" data-action="clone" data-quote-id="${quote.id}" title="Clone quote">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <rect x="5" y="5" width="9" height="9" rx="1"/>
                                    <path d="M3 11V3a1 1 0 0 1 1-1h8"/>
                                </svg>
                            </button>
                            <button class="gos-action-btn" data-action="edit" data-quote-id="${quote.id}" title="Edit quote">
                                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M11 2l3 3-8 8H3v-3z" fill="none" stroke="currentColor"/></svg>
                            </button>
                            <button class="gos-action-btn gos-action-delete" data-action="delete" data-quote-id="${quote.id}" title="Delete quote">
                                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12M6 4V2h4v2M3 4v10h10V4" fill="none" stroke="currentColor"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        renderTableView() {
            // Table view implementation
            const allQuotes = this.state.getState().filteredQuotes;
            const quotes = this.getPaginatedQuotes(allQuotes);
            
            $('#gos-quotes-body').html(`
                <div class="gos-table-container">
                    <p>Table view with ${quotes.length} quotes (paginated from ${allQuotes.length} total)...</p>
                </div>
            `);
        }

        renderKanbanView() {
            const allQuotes = this.state.getState().filteredQuotes;
            const quotes = this.getPaginatedQuotes(allQuotes);
            
            // Group quotes by lead status
            const columns = CONFIG.STATUSES.lead.map(status => ({
                ...status,
                quotes: quotes.filter(q => q.lead_status === status.value)
            }));
            
            const columnsHTML = columns.map(column => `
                <div class="gos-kanban-column" data-status="${column.value}">
                    <div class="gos-kanban-column-header" style="background: ${column.color};">
                        <div class="gos-kanban-header-title">
                            <span class="gos-kanban-icon">${column.icon}</span>
                            <span class="gos-kanban-label">${column.label}</span>
                        </div>
                        <span class="gos-kanban-count">${column.quotes.length}</span>
                    </div>
                    <div class="gos-kanban-column-body" data-status="${column.value}">
                        ${column.quotes.length === 0 ? 
                            `<div class="gos-kanban-empty">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="8" y="8" width="32" height="32" rx="4"/>
                                    <path d="M16 20h16M16 24h16M16 28h10"/>
                                </svg>
                                <p>No quotes</p>
                            </div>` :
                            column.quotes.map(quote => this.getKanbanCard(quote)).join('')
                        }
                    </div>
                </div>
            `).join('');
            
            $('#gos-quotes-body').html(`
                <div class="gos-kanban-container">
                    ${columnsHTML}
                </div>
            `);
            
            // Attach drag-and-drop listeners
            this.attachKanbanListeners();
        }

        getKanbanCard(quote) {
            const firstName = quote.first_name || '';
            const lastName = quote.last_name || '';
            const customerName = [firstName, lastName].filter(Boolean).join(' ') || 'No name';
            const productType = quote.type || 'Window';
            const price = parseFloat(quote.price || 0);
            const isSelected = this.state.getState().selectedQuotes.has(quote.id);
            
            return `
                <div class="gos-kanban-card ${isSelected ? 'selected' : ''}" 
                     data-quote-id="${quote.id}"
                     draggable="true">
                    <div class="gos-kanban-card-checkbox">
                        <input type="checkbox" 
                               class="gos-quote-checkbox" 
                               data-quote-id="${quote.id}"
                               ${isSelected ? 'checked' : ''}
                               aria-label="Select quote ${quote.id}">
                    </div>
                    <div class="gos-kanban-card-header">
                        <span class="gos-kanban-card-id">#${quote.id}</span>
                        <span class="gos-kanban-card-type">${productType}</span>
                    </div>
                    <div class="gos-kanban-card-customer">${customerName}</div>
                    <div class="gos-kanban-card-details">
                        <div class="gos-kanban-card-price">£${price.toFixed(2)}</div>
                        <div class="gos-kanban-card-size">${(quote.width || 0).toFixed(1)}m × ${(quote.height || 0).toFixed(1)}m</div>
                    </div>
                    <div class="gos-kanban-card-footer">
                        <div class="gos-kanban-card-actions">
                            <button class="gos-kanban-action-btn" data-action="view" data-quote-id="${quote.id}" title="View details">
                                <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2.5"/><path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" fill="none" stroke="currentColor"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        attachKanbanListeners() {
            const $container = $('#gos-quotes-body');
            let draggedCard = null;
            
            // Card drag start
            $container.on('dragstart', '.gos-kanban-card', (e) => {
                draggedCard = e.currentTarget;
                $(draggedCard).addClass('gos-dragging');
                e.originalEvent.dataTransfer.effectAllowed = 'move';
                e.originalEvent.dataTransfer.setData('text/html', draggedCard.innerHTML);
            });
            
            // Card drag end
            $container.on('dragend', '.gos-kanban-card', (e) => {
                $(draggedCard).removeClass('gos-dragging');
                $('.gos-kanban-column-body').removeClass('gos-drag-over');
                draggedCard = null;
            });
            
            // Column drag over
            $container.on('dragover', '.gos-kanban-column-body', (e) => {
                e.preventDefault();
                e.originalEvent.dataTransfer.dropEffect = 'move';
                $('.gos-kanban-column-body').removeClass('gos-drag-over');
                $(e.currentTarget).addClass('gos-drag-over');
            });
            
            // Column drag leave
            $container.on('dragleave', '.gos-kanban-column-body', (e) => {
                if (e.currentTarget === e.target) {
                    $(e.currentTarget).removeClass('gos-drag-over');
                }
            });
            
            // Column drop
            $container.on('drop', '.gos-kanban-column-body', async (e) => {
                e.preventDefault();
                const $column = $(e.currentTarget);
                $column.removeClass('gos-drag-over');
                
                if (!draggedCard) return;
                
                const quoteId = parseInt($(draggedCard).data('quote-id'));
                const newStatus = $column.data('status');
                const currentStatus = $(draggedCard).closest('.gos-kanban-column').data('status');
                
                if (newStatus === currentStatus) return;
                
                // Optimistic update - move card immediately
                $column.append(draggedCard);
                
                // Update via API
                const result = await this.api.updateQuoteStatus(quoteId, newStatus, 'lead');
                
                if (result.success) {
                    this.showNotification(`Quote moved to ${newStatus}`, 'success');
                    // Refresh to update counts
                    await this.loadQuotes();
                } else {
                    this.showNotification('Failed to update status', 'error');
                    // Revert on failure
                    await this.loadQuotes();
                }
            });
            
            // Card click to view
            $container.on('click', '.gos-kanban-card', (e) => {
                // Don't open modal if clicking checkbox, button, or input
                if ($(e.target).closest('button, input, .gos-kanban-action-btn, .gos-kanban-card-checkbox, .gos-quote-checkbox').length) return;
                const quoteId = $(e.currentTarget).data('quote-id');
                this.openQuoteModal(quoteId);
            });
            
            // Quick action buttons
            $container.on('click', '.gos-kanban-action-btn', (e) => {
                e.stopPropagation();
                const action = $(e.currentTarget).data('action');
                const quoteId = parseInt($(e.currentTarget).data('quote-id'));
                
                if (action === 'view') {
                    this.openQuoteModal(quoteId);
                }
            });
        }

        renderEmpty() {
            const hasFilters = this.filterManager.getActiveFilterCount() > 0;
            
            $('#gos-quotes-body').html(`
                <div class="gos-empty-state">
                    <svg class="gos-empty-icon" width="64" height="64" viewBox="0 0 64 64">
                        <rect x="8" y="8" width="48" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
                        <path d="M20 24h24M20 32h24M20 40h16" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h3>${hasFilters ? 'No quotes match your filters' : 'No quotes yet'}</h3>
                    <p>${hasFilters ? 'Try adjusting your filters or search criteria' : 'Get started by creating your first quote'}</p>
                    ${hasFilters ? 
                        '<button class="gos-button-secondary" id="gos-clear-filters-btn">Clear Filters</button>' :
                        '<button class="gos-button-primary" id="gos-create-quote-empty-btn">Create New Quote</button>'
                    }
                </div>
            `);
        }

        renderError(error) {
            $('#gos-quotes-body').html(`
                <div class="gos-error-state">
                    <svg class="gos-error-icon" width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="2"/>
                        <path d="M32 20v16M32 44v4" stroke="currentColor" stroke-width="3"/>
                    </svg>
                    <h3>Failed to load quotes</h3>
                    <p>${error}</p>
                    <button class="gos-button-primary" id="gos-retry-btn">Try Again</button>
                </div>
            `);
        }

        generateDiagnosticsData(state) {
            return {
                '📊 STATE': {
                    totalQuotes: state.quotes.length,
                    filteredQuotes: state.filteredQuotes.length,
                    selectedQuotes: Array.from(state.selectedQuotes),
                    loading: state.loading,
                    error: state.error,
                    viewMode: state.viewMode,
                    currentPage: state.currentPage,
                    totalPages: state.totalPages,
                    lastUpdate: state.lastUpdate
                },
                '🔍 FILTERS': state.filters,
                '📈 STATISTICS': state.statistics,
                '📦 SAMPLE QUOTES (first 3)': state.quotes.slice(0, 3).map(q => ({
                    id: q.id,
                    availableFields: Object.keys(q),
                    customer: {
                        first_name: q.first_name,
                        last_name: q.last_name,
                        email: q.email,
                        phone: q.phone,
                        address: q.address
                    },
                    product: {
                        type: q.type,
                        width: q.width,
                        height: q.height,
                        price: q.price,
                        material: q.material
                    },
                    status: {
                        lead_status: q.lead_status,
                        install_status: q.install_status
                    },
                    fullObject: q
                })),
                '🔧 SYSTEM INFO': {
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    screenSize: `${window.innerWidth}x${window.innerHeight}`,
                    pluginVersion: '2.0.0'
                }
            };
        }

        updateDiagnosticsPanel() {
            const state = this.state.getState();
            const debugData = this.generateDiagnosticsData(state);
            const $content = $('#gos-debug-content');
            $content.html(JSON.stringify(debugData, null, 2));
        }

        generateStatistics() {
            const quotes = this.state.getState().quotes;
            
            // Revenue metrics
            const totalRevenue = quotes.reduce((sum, q) => sum + parseFloat(q.price || 0), 0);
            const avgQuoteValue = quotes.length > 0 ? totalRevenue / quotes.length : 0;
            
            // Status distribution
            const statusCounts = {
                new: 0,
                quoted: 0,
                followup: 0,
                won: 0,
                lost: 0
            };
            
            quotes.forEach(q => {
                const status = (q.lead_status || 'new').toLowerCase();
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                }
            });
            
            // Conversion metrics
            const totalLeads = quotes.length;
            const quotedCount = statusCounts.quoted + statusCounts.followup + statusCounts.won;
            const wonCount = statusCounts.won;
            const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
            const quoteRate = totalLeads > 0 ? (quotedCount / totalLeads) * 100 : 0;
            
            // Product type breakdown
            const productTypes = {};
            quotes.forEach(q => {
                const type = q.type || q.product_type || 'Window';
                productTypes[type] = (productTypes[type] || 0) + 1;
            });
            
            // Recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentQuotes = quotes.filter(q => {
                const quoteDate = new Date(q.created_at || q.date_created);
                return quoteDate >= sevenDaysAgo;
            });
            
            // Won revenue - check for both lowercase and original case
            const wonRevenue = quotes.filter(q => {
                const status = (q.lead_status || '').toLowerCase();
                return status === 'won';
            }).reduce((sum, q) => sum + parseFloat(q.price || 0), 0);
            
            return {
                revenue: {
                    total: totalRevenue,
                    average: avgQuoteValue,
                    won: wonRevenue
                },
                counts: {
                    total: totalLeads,
                    new: statusCounts.new,
                    quoted: statusCounts.quoted,
                    followup: statusCounts.followup,
                    won: statusCounts.won,
                    lost: statusCounts.lost,
                    recent: recentQuotes.length
                },
                conversion: {
                    rate: conversionRate,
                    quoteRate: quoteRate,
                    winRate: quotedCount > 0 ? (wonCount / quotedCount) * 100 : 0
                },
                products: productTypes
            };
        }

        renderStatisticsPanel() {
            const stats = this.generateStatistics();
            const $content = $('#gos-stats-content');
            
            const html = `
                <div class="gos-stats-grid">
                    <!-- Potential Revenue Card -->
                    <div class="gos-stat-card gos-stat-card-revenue">
                        <div class="gos-stat-card-header">
                            <div class="gos-stat-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="10" cy="10" r="8"/>
                                    <path d="M10 6v8M6 10h8"/>
                                </svg>
                            </div>
                            <span class="gos-stat-label">Potential Revenue</span>
                        </div>
                        <div class="gos-stat-value">£${stats.revenue.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="gos-stat-subtitle">Average: £${stats.revenue.average.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    <!-- Total Quotes Card -->
                    <div class="gos-stat-card gos-stat-card-quotes">
                        <div class="gos-stat-card-header">
                            <div class="gos-stat-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="14" height="14" rx="2"/>
                                    <path d="M7 7h6M7 10h6M7 13h4"/>
                                </svg>
                            </div>
                            <span class="gos-stat-label">Total Quotes</span>
                        </div>
                        <div class="gos-stat-value">${stats.counts.total}</div>
                        <div class="gos-stat-subtitle">Last 7 days: ${stats.counts.recent}</div>
                    </div>

                    <!-- Conversion Rate Card -->
                    <div class="gos-stat-card gos-stat-card-conversion">
                        <div class="gos-stat-card-header">
                            <div class="gos-stat-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 10l4 4 10-10"/>
                                </svg>
                            </div>
                            <span class="gos-stat-label">Conversion Rate</span>
                        </div>
                        <div class="gos-stat-value">${stats.conversion.rate.toFixed(1)}%</div>
                        <div class="gos-stat-subtitle">${stats.counts.won} won / ${stats.counts.total} total</div>
                    </div>

                    <!-- Won Revenue Card -->
                    <div class="gos-stat-card gos-stat-card-won">
                        <div class="gos-stat-card-header">
                            <div class="gos-stat-icon">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M10 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/>
                                </svg>
                            </div>
                            <span class="gos-stat-label">Won Revenue</span>
                        </div>
                        <div class="gos-stat-value">£${stats.revenue.won.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div class="gos-stat-subtitle">${stats.counts.won} won quotes</div>
                    </div>
                </div>

                <!-- Conversion Funnel -->
                <div class="gos-stats-section">
                    <h3 class="gos-stats-section-title">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 2h12L10 8v6l-4-2V8z"/>
                        </svg>
                        Conversion Funnel
                    </h3>
                    <div class="gos-funnel">
                        ${this.renderFunnelStage('New Leads', stats.counts.new, stats.counts.total, '#8b5cf6')}
                        ${this.renderFunnelStage('Quoted', stats.counts.quoted, stats.counts.total, '#6366f1')}
                        ${this.renderFunnelStage('Follow-up', stats.counts.followup, stats.counts.total, '#3b82f6')}
                        ${this.renderFunnelStage('Won', stats.counts.won, stats.counts.total, '#10b981')}
                        ${this.renderFunnelStage('Lost', stats.counts.lost, stats.counts.total, '#ef4444')}
                    </div>
                </div>

                <!-- Product Breakdown -->
                <div class="gos-stats-section">
                    <h3 class="gos-stats-section-title">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="2" width="5" height="5" rx="1"/>
                            <rect x="9" y="2" width="5" height="5" rx="1"/>
                            <rect x="2" y="9" width="5" height="5" rx="1"/>
                            <rect x="9" y="9" width="5" height="5" rx="1"/>
                        </svg>
                        Product Distribution
                    </h3>
                    <div class="gos-product-grid">
                        ${Object.entries(stats.products).map(([type, count]) => `
                            <div class="gos-product-item">
                                <span class="gos-product-type">${type}</span>
                                <span class="gos-product-count">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            $content.html(html);
        }

        renderFunnelStage(label, count, total, color) {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            return `
                <div class="gos-funnel-stage">
                    <div class="gos-funnel-label">
                        <span>${label}</span>
                        <span class="gos-funnel-count">${count}</span>
                    </div>
                    <div class="gos-funnel-bar-container">
                        <div class="gos-funnel-bar" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <div class="gos-funnel-percentage">${percentage.toFixed(1)}%</div>
                </div>
            `;
        }

        async handleExport(format, selectedOnly = false) {
            const state = this.state.getState();
            const quotes = selectedOnly 
                ? state.quotes.filter(q => state.selectedQuotes.has(q.id))
                : state.filteredQuotes;
            
            if (quotes.length === 0) {
                this.showNotification('❌ No quotes to export', 'error');
                return;
            }
            
            this.showNotification(`⏳ Preparing ${format.toUpperCase()} export...`, 'info');
            
            try {
                switch (format) {
                    case 'csv':
                        await this.exportToCSV(quotes);
                        break;
                    case 'excel':
                        await this.exportToExcel(quotes);
                        break;
                    case 'pdf':
                        await this.exportToPDF(quotes);
                        break;
                }
                
                this.showNotification(`✅ Successfully exported ${quotes.length} quote${quotes.length !== 1 ? 's' : ''} to ${format.toUpperCase()}`, 'success');
            } catch (error) {
                console.error('Export error:', error);
                this.showNotification(`❌ Failed to export: ${error.message}`, 'error');
            }
        }

        async exportToCSV(quotes) {
            // CSV headers
            const headers = [
                'ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Address',
                'Product Type', 'Width (m)', 'Height (m)', 'Material', 'Glazing', 'Color',
                'Price (£)', 'Lead Status', 'Install Status'
            ];
            
            // Convert quotes to CSV rows
            const rows = quotes.map(q => [
                q.id,
                q.date || '',
                `${q.first_name || ''} ${q.last_name || ''}`.trim() || 'N/A',
                q.email || '',
                q.phone || '',
                q.address || '',
                q.type || q.product_type || 'Window',
                q.width || 0,
                q.height || 0,
                q.material || '',
                q.glazing || '',
                q.color || '',
                q.price || 0,
                q.lead_status || 'new',
                q.install_status || 'pending'
            ]);
            
            // Build CSV content
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => 
                    // Escape cells with commas or quotes
                    typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
                        ? `"${cell.replace(/"/g, '""')}"` 
                        : cell
                ).join(','))
            ].join('\n');
            
            // Download file
            this.downloadFile(csvContent, `glazieros-quotes-${this.getDateStamp()}.csv`, 'text/csv');
        }

        async exportToExcel(quotes) {
            this.showNotification('📋 Excel export copied to clipboard - paste into Excel or Google Sheets', 'info');
            
            // Create tab-separated values (TSV) for pasting into Excel
            const headers = [
                'ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Address',
                'Product Type', 'Width (m)', 'Height (m)', 'Material', 'Glazing', 'Color',
                'Price (£)', 'Lead Status', 'Install Status'
            ];
            
            const rows = quotes.map(q => [
                q.id,
                q.date || '',
                `${q.first_name || ''} ${q.last_name || ''}`.trim() || 'N/A',
                q.email || '',
                q.phone || '',
                q.address || '',
                q.type || q.product_type || 'Window',
                q.width || 0,
                q.height || 0,
                q.material || '',
                q.glazing || '',
                q.color || '',
                q.price || 0,
                q.lead_status || 'new',
                q.install_status || 'pending'
            ]);
            
            const tsvContent = [
                headers.join('\t'),
                ...rows.map(row => row.join('\t'))
            ].join('\n');
            
            // Copy to clipboard
            await navigator.clipboard.writeText(tsvContent);
        }

        async exportToPDF(quotes) {
            // Create HTML content for PDF
            const html = this.generatePDFContent(quotes);
            
            // Open print dialog
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }

        generatePDFContent(quotes) {
            const stats = {
                totalRevenue: quotes.reduce((sum, q) => sum + parseFloat(q.price || 0), 0),
                avgQuoteValue: quotes.length > 0 
                    ? quotes.reduce((sum, q) => sum + parseFloat(q.price || 0), 0) / quotes.length 
                    : 0
            };
            
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>GlazierOS Quotes Export - ${this.getDateStamp()}</title>
                    <style>
                        @media print {
                            @page { margin: 1cm; }
                            body { margin: 0; }
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            padding: 20px;
                            max-width: 1200px;
                            margin: 0 auto;
                        }
                        .header {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 30px;
                            border-radius: 12px;
                            margin-bottom: 30px;
                        }
                        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
                        .header p { margin: 0; opacity: 0.9; }
                        .stats {
                            display: grid;
                            grid-template-columns: repeat(3, 1fr);
                            gap: 20px;
                            margin-bottom: 30px;
                        }
                        .stat-card {
                            background: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                            border-left: 4px solid #667eea;
                        }
                        .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
                        .stat-value { font-size: 24px; font-weight: bold; color: #111827; margin-top: 5px; }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            background: white;
                        }
                        th {
                            background: #f3f4f6;
                            padding: 12px;
                            text-align: left;
                            font-size: 12px;
                            font-weight: 600;
                            color: #374151;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        td {
                            padding: 12px;
                            border-bottom: 1px solid #e5e7eb;
                            font-size: 13px;
                        }
                        tr:hover { background: #f9fafb; }
                        .footer {
                            margin-top: 40px;
                            padding-top: 20px;
                            border-top: 2px solid #e5e7eb;
                            text-align: center;
                            color: #6b7280;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>GlazierOS Quotes Export</h1>
                        <p>Generated on ${new Date().toLocaleString('en-GB')}</p>
                    </div>
                    
                    <div class="stats">
                        <div class="stat-card">
                            <div class="stat-label">Total Quotes</div>
                            <div class="stat-value">${quotes.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Total Revenue</div>
                            <div class="stat-value">£${stats.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Average Value</div>
                            <div class="stat-value">£${stats.avgQuoteValue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Email</th>
                                <th>Product</th>
                                <th>Size</th>
                                <th>Price</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${quotes.map(q => `
                                <tr>
                                    <td>#${q.id}</td>
                                    <td>${q.date || 'N/A'}</td>
                                    <td>${q.first_name || ''} ${q.last_name || ''}</td>
                                    <td>${q.email || 'N/A'}</td>
                                    <td>${q.type || q.product_type || 'Window'}</td>
                                    <td>${q.width || 0}m × ${q.height || 0}m</td>
                                    <td>£${parseFloat(q.price || 0).toFixed(2)}</td>
                                    <td>${q.lead_status || 'new'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="footer">
                        <p>© ${new Date().getFullYear()} GlazierOS - Quote Management System</p>
                    </div>
                </body>
                </html>
            `;
        }

        showExportFormatDialog() {
            // Simple prompt for now - could be enhanced with a modal
            const format = prompt('Export selected quotes as:\n\n1 = CSV\n2 = Excel\n3 = PDF\n\nEnter 1, 2, or 3:');
            
            const formatMap = {
                '1': 'csv',
                '2': 'excel',
                '3': 'pdf'
            };
            
            if (formatMap[format]) {
                this.handleExport(formatMap[format], true);
            }
        }

        downloadFile(content, filename, type) {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }

        getDateStamp() {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }

        formatDate(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            
            return date.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short', 
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
            });
        }

        updateBulkToolbar() {
            const selectedCount = this.state.getState().selectedQuotes.size;
            const $toolbar = $('#gos-bulk-toolbar');
            const $button = $('#gos-bulk-actions-btn');
            
            if (selectedCount > 0) {
                $toolbar.show();
                $button.prop('disabled', false);
                $('#gos-selected-count').text(selectedCount);
            } else {
                $toolbar.hide();
                $button.prop('disabled', true);
            }
        }

        attachEventListeners() {
            const $container = this.$container;
            
            // Diagnostics button - toggle panel
            $container.on('click', '#gos-debug-btn', () => {
                const $panel = $('#gos-debug-panel');
                
                if ($panel.is(':visible')) {
                    $panel.slideUp(300);
                } else {
                    this.updateDiagnosticsPanel();
                    $panel.slideDown(300);
                }
            });
            
            // Close diagnostics panel
            $container.on('click', '#gos-debug-close-btn', () => {
                $('#gos-debug-panel').slideUp(300);
            });
            
            // Copy diagnostics to clipboard
            $container.on('click', '#gos-debug-copy-btn', async () => {
                const state = this.state.getState();
                const debugData = this.generateDiagnosticsData(state);
                const text = JSON.stringify(debugData, null, 2);
                
                try {
                    await navigator.clipboard.writeText(text);
                    this.showNotification('✅ Diagnostic data copied to clipboard', 'success');
                    
                    // Visual feedback
                    const $btn = $('#gos-debug-copy-btn');
                    const originalText = $btn.html();
                    $btn.html(`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#27ae60" stroke-width="2"><path d="M2 7l4 4 6-8"/></svg> Copied!`);
                    setTimeout(() => $btn.html(originalText), 2000);
                } catch (err) {
                    this.showNotification('❌ Failed to copy. Please copy manually.', 'error');
                }
            });
            
            // Statistics button - toggle panel
            $container.on('click', '#gos-stats-btn', () => {
                const $panel = $('#gos-stats-panel');
                
                if ($panel.is(':visible')) {
                    $panel.slideUp(300);
                } else {
                    // Close filters panel if open
                    $('#gos-filters-panel').slideUp(300);
                    $('#gos-toggle-filters-btn').attr('aria-expanded', 'false');
                    
                    this.renderStatisticsPanel();
                    $panel.slideDown(300);
                }
            });
            
            // Close statistics panel
            $container.on('click', '#gos-stats-close-btn', () => {
                $('#gos-stats-panel').slideUp(300);
            });
            
            // Export statistics
            $container.on('click', '#gos-stats-export-btn', async () => {
                const statsData = this.generateStatistics();
                const text = JSON.stringify(statsData, null, 2);
                
                try {
                    await navigator.clipboard.writeText(text);
                    this.showNotification('✅ Statistics data copied to clipboard', 'success');
                    
                    // Visual feedback
                    const $btn = $('#gos-stats-export-btn');
                    const originalText = $btn.html();
                    $btn.html(`<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#27ae60" stroke-width="2"><path d="M2 7l4 4 6-8"/></svg> Exported!`);
                    setTimeout(() => $btn.html(originalText), 2000);
                } catch (err) {
                    this.showNotification('❌ Failed to export. Please try again.', 'error');
                }
            });
            
            // Export button - toggle dropdown
            $container.on('click', '#gos-export-btn', (e) => {
                e.stopPropagation();
                const $dropdown = $('#gos-export-dropdown');
                const isVisible = $dropdown.is(':visible');
                
                // Close all other dropdowns
                $('.gos-export-dropdown').not($dropdown).hide();
                
                if (isVisible) {
                    $dropdown.slideUp(200);
                } else {
                    // Update selected count
                    const selectedCount = this.state.getState().selectedQuotes.size;
                    $('#gos-export-selected-count').text(`${selectedCount} quote${selectedCount !== 1 ? 's' : ''} selected`);
                    $dropdown.slideDown(200);
                }
            });
            
            // Close export dropdown when clicking outside
            $(document).on('click', (e) => {
                if (!$(e.target).closest('.gos-export-dropdown-wrapper').length) {
                    $('#gos-export-dropdown').slideUp(200);
                }
            });
            
            // Export option click
            $container.on('click', '.gos-export-option', async (e) => {
                const format = $(e.currentTarget).data('format');
                $('#gos-export-dropdown').slideUp(200);
                
                if (format === 'selected') {
                    // Show sub-menu for format selection
                    this.showExportFormatDialog();
                } else {
                    await this.handleExport(format, false);
                }
            });
            
            // Debounced search (300ms delay for performance)
            let searchTimeout;
            $container.on('input', '#gos-search-input', e => {
                clearTimeout(searchTimeout);
                const searchValue = e.target.value;
                searchTimeout = setTimeout(() => {
                    this.state.setState({
                        filters: { ...this.state.getState().filters, search: searchValue }
                    });
                }, 300);
            });
            
            // Sort
            $container.on('change', '#gos-sort-select', e => {
                this.state.setState({ sortBy: e.target.value });
            });
            
            // View mode
            $container.on('click', '.gos-view-btn', e => {
                const view = $(e.currentTarget).data('view');
                $('.gos-view-btn').removeClass('active');
                $(e.currentTarget).addClass('active');
                this.state.setState({ viewMode: view });
            });
            
            // Create quote - Open 3D Pricing Wizard Modal
            $container.on('click', '#gos-create-quote-btn, #gos-create-quote-empty-btn', () => {
                this.open3DPricingWizard();
            });
            
            // Quote card click (Grid view)
            $container.on('click', '.gos-quote-card', e => {
                // Don't open modal if clicking interactive elements
                if ($(e.target).closest('button, input, a, .gos-dual-status-pill, .gos-status-segment').length) return;
                const quoteId = $(e.currentTarget).data('quote-id');
                this.openQuoteModal(quoteId);
            });
            
            // Kanban card click
            $container.on('click', '.gos-kanban-card', e => {
                // Don't open modal if clicking checkbox or any button
                if ($(e.target).closest('button, input, a, .gos-kanban-card-checkbox').length) return;
                const quoteId = $(e.currentTarget).data('quote-id');
                this.openQuoteModal(quoteId);
            });
            
            // Checkbox click - prevent card click from firing
            $container.on('click', '.gos-quote-checkbox', e => {
                e.stopPropagation();
            });
            
            // Checkbox selection (works for both grid and kanban)
            $container.on('change', '.gos-quote-checkbox', e => {
                e.stopPropagation();
                const quoteId = parseInt($(e.target).data('quote-id'));
                this.state.toggleQuoteSelection(quoteId);
            });
            
            // Status segment click - inline status changer
            $container.on('click', '.gos-status-segment', e => {
                console.log('Status segment clicked!', e.currentTarget);
                e.stopPropagation();
                e.preventDefault();
                const $btn = $(e.currentTarget);
                const quoteId = parseInt($btn.data('quote-id'));
                const statusType = $btn.data('status-type'); // 'lead' or 'install'
                const currentStatus = $btn.data('current-status');
                
                console.log('Status data:', { quoteId, statusType, currentStatus });
                this.showInlineStatusSelector($btn, quoteId, statusType, currentStatus);
            });
            
            // Quick actions
            $container.on('click', '.gos-action-btn', e => {
                e.stopPropagation();
                const action = $(e.currentTarget).data('action');
                const quoteId = parseInt($(e.currentTarget).data('quote-id'));
                this.handleQuickAction(action, quoteId);
            });
            
            // Retry
            $container.on('click', '#gos-retry-btn', () => {
                this.loadQuotes();
            });
            
            // Clear filters
            $container.on('click', '#gos-clear-filters-btn', () => {
                this.state.resetFilters();
            });

            // Toggle filters panel
            $container.on('click', '#gos-toggle-filters-btn', () => {
                this.toggleFiltersPanel();
            });

            // Clear all filters
            $container.on('click', '#gos-clear-all-filters', () => {
                this.state.resetFilters();
                this.renderFiltersPanel();
            });

            // Date presets
            $container.on('click', '.gos-preset-btn', e => {
                const preset = $(e.currentTarget).data('preset');
                this.applyDatePreset(preset);
            });

            // Date range inputs
            $container.on('change', '#gos-start-date, #gos-end-date', () => {
                const startDate = $('#gos-start-date').val();
                const endDate = $('#gos-end-date').val();
                this.state.setState({
                    filters: { 
                        ...this.state.getState().filters, 
                        startDate, 
                        endDate 
                    }
                });
                this.updateActiveFiltersDisplay();
            });

            // Status checkboxes
            $container.on('change', '.gos-filter-checkbox', e => {
                const filterType = $(e.target).data('filter');
                const value = $(e.target).val();
                const checked = $(e.target).is(':checked');
                
                const filters = this.state.getState().filters;
                let filterArray;
                
                if (filterType === 'leadStatus') {
                    filterArray = [...filters.leadStatuses];
                } else if (filterType === 'installStatus') {
                    filterArray = [...filters.installStatuses];
                }
                
                if (checked) {
                    if (!filterArray.includes(value)) {
                        filterArray.push(value);
                    }
                } else {
                    const index = filterArray.indexOf(value);
                    if (index > -1) {
                        filterArray.splice(index, 1);
                    }
                }
                
                this.state.setState({
                    filters: {
                        ...filters,
                        [filterType === 'leadStatus' ? 'leadStatuses' : 'installStatuses']: filterArray
                    }
                });
                this.updateActiveFiltersDisplay();
            });

            // Price inputs
            $container.on('change', '#gos-min-price, #gos-max-price', () => {
                const minPrice = $('#gos-min-price').val() || null;
                const maxPrice = $('#gos-max-price').val() || null;
                this.state.setState({
                    filters: { 
                        ...this.state.getState().filters, 
                        minPrice: minPrice ? parseFloat(minPrice) : null,
                        maxPrice: maxPrice ? parseFloat(maxPrice) : null
                    }
                });
                this.updateActiveFiltersDisplay();
            });

            // Price slider
            $container.on('input', '#gos-price-slider', e => {
                const value = $(e.target).val();
                $('#gos-max-price').val(value);
            });

            $container.on('change', '#gos-price-slider', () => {
                const maxPrice = $('#gos-price-slider').val();
                this.state.setState({
                    filters: { 
                        ...this.state.getState().filters, 
                        maxPrice: parseFloat(maxPrice)
                    }
                });
                this.updateActiveFiltersDisplay();
            });

            // Remove individual filter
            $container.on('click', '.gos-remove-filter', e => {
                e.stopPropagation();
                const filterType = $(e.currentTarget).data('filter-type');
                this.removeFilter(filterType);
            });

            // Save filter preset
            $container.on('click', '#gos-save-preset-btn', () => {
                this.saveFilterPreset();
            });

            // Load filter preset
            $container.on('click', '.gos-preset-item', e => {
                const presetName = $(e.currentTarget).data('preset');
                this.loadFilterPreset(presetName);
            });

            // Delete filter preset
            $container.on('click', '.gos-delete-preset', e => {
                e.stopPropagation();
                const presetName = $(e.currentTarget).closest('.gos-preset-item').data('preset');
                this.deleteFilterPreset(presetName);
            });

            // Bulk Actions
            // Select all checkbox
            $container.on('change', '#gos-select-all-checkbox', e => {
                const isChecked = $(e.target).is(':checked');
                if (isChecked) {
                    this.selectAllVisibleQuotes();
                } else {
                    this.state.deselectAllQuotes();
                }
            });

            // Deselect all button
            $container.on('click', '#gos-deselect-all', () => {
                this.state.deselectAllQuotes();
                $('#gos-select-all-checkbox').prop('checked', false);
            });

            // Bulk status change
            $container.on('change', '#gos-bulk-status-select', e => {
                const value = $(e.target).val();
                if (!value) return;
                
                this.bulkChangeStatus(value);
                $(e.target).val(''); // Reset select
            });

            // Bulk export
            $container.on('click', '.gos-bulk-export', () => {
                this.bulkExportCSV();
            });

            // Bulk delete
            $container.on('click', '.gos-bulk-delete', () => {
                this.bulkDelete();
            });

            // Keyboard shortcuts
            $(document).on('keydown', e => {
                // Only when quotes panel is active
                if (!this.$container.is(':visible')) return;

                // Ctrl+A - Select all
                if (e.ctrlKey && e.key === 'a' && !$(e.target).is('input, textarea')) {
                    e.preventDefault();
                    this.selectAllVisibleQuotes();
                    $('#gos-select-all-checkbox').prop('checked', true);
                }

                // Delete key - Bulk delete
                if (e.key === 'Delete' && !$(e.target).is('input, textarea, select')) {
                    const selectedCount = this.state.getState().selectedQuotes.size;
                    if (selectedCount > 0) {
                        e.preventDefault();
                        this.bulkDelete();
                    }
                }

                // Escape - Clear selection
                if (e.key === 'Escape') {
                    this.state.deselectAllQuotes();
                    $('#gos-select-all-checkbox').prop('checked', false);
                }
            });
            
            // Page size selector
            $container.on('change', '#gos-page-size-select', (e) => {
                const pageSize = parseInt($(e.target).val());
                this.state.setState({ 
                    itemsPerPage: pageSize,
                    currentPage: 1 // Reset to first page when changing page size
                });
                this.render();
            });
            
            // Pagination buttons
            $container.on('click', '.gos-page-btn:not([disabled])', (e) => {
                const page = parseInt($(e.currentTarget).data('page'));
                if (!isNaN(page) && page > 0) {
                    this.state.setState({ currentPage: page });
                    this.render();
                    // Scroll to top of quotes list
                    $('#gos-quotes-body')[0]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        toggleFiltersPanel() {
            const $panel = $('#gos-filters-panel');
            const $btn = $('#gos-toggle-filters-btn');
            const isOpen = $panel.is(':visible');

            if (isOpen) {
                $panel.slideUp(300);
                $btn.attr('aria-expanded', 'false');
            } else {
                // Close stats panel if open
                $('#gos-stats-panel').slideUp(300);
                
                // Render if not already rendered
                if ($panel.children().length === 0) {
                    this.renderFiltersPanel();
                }
                $panel.slideDown(300);
                $btn.attr('aria-expanded', 'true');
            }
        }

        applyDatePreset(preset) {
            const today = new Date();
            let startDate, endDate;

            switch (preset) {
                case 'today':
                    startDate = endDate = this.formatDateInput(today);
                    break;
                case 'week':
                    startDate = this.formatDateInput(this.getStartOfWeek(today));
                    endDate = this.formatDateInput(today);
                    break;
                case 'month':
                    startDate = this.formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
                    endDate = this.formatDateInput(today);
                    break;
                case 'quarter':
                    const quarter = Math.floor(today.getMonth() / 3);
                    startDate = this.formatDateInput(new Date(today.getFullYear(), quarter * 3, 1));
                    endDate = this.formatDateInput(today);
                    break;
                case 'year':
                    startDate = this.formatDateInput(new Date(today.getFullYear(), 0, 1));
                    endDate = this.formatDateInput(today);
                    break;
            }

            // Update inputs
            $('#gos-start-date').val(startDate);
            $('#gos-end-date').val(endDate);

            // Update state
            this.state.setState({
                filters: {
                    ...this.state.getState().filters,
                    startDate,
                    endDate
                }
            });
            this.updateActiveFiltersDisplay();
        }

        getStartOfWeek(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
            return new Date(d.setDate(diff));
        }

        formatDateInput(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        removeFilter(filterType) {
            const filters = { ...this.state.getState().filters };

            switch (filterType) {
                case 'search':
                    filters.search = '';
                    $('#gos-search-input').val('');
                    break;
                case 'dateRange':
                    filters.startDate = null;
                    filters.endDate = null;
                    $('#gos-start-date, #gos-end-date').val('');
                    break;
                case 'leadStatus':
                    filters.leadStatuses = [];
                    $('.gos-filter-checkbox[data-filter="leadStatus"]').prop('checked', false);
                    break;
                case 'installStatus':
                    filters.installStatuses = [];
                    $('.gos-filter-checkbox[data-filter="installStatus"]').prop('checked', false);
                    break;
                case 'priceRange':
                    filters.minPrice = null;
                    filters.maxPrice = null;
                    $('#gos-min-price, #gos-max-price').val('');
                    $('#gos-price-slider').val(10000);
                    break;
            }

            this.state.setState({ filters });
            this.updateActiveFiltersDisplay();
        }

        saveFilterPreset() {
            const name = prompt('Enter a name for this filter preset:');
            if (!name) return;

            const filters = this.state.getState().filters;
            const presets = JSON.parse(localStorage.getItem('gos_filter_presets') || '{}');
            presets[name] = filters;
            localStorage.setItem('gos_filter_presets', JSON.stringify(presets));

            this.showNotification(`Filter preset "${name}" saved`, 'success');
            this.renderFilterPresets();
        }

        loadFilterPreset(name) {
            const presets = JSON.parse(localStorage.getItem('gos_filter_presets') || '{}');
            const filters = presets[name];
            
            if (!filters) {
                this.showNotification('Filter preset not found', 'error');
                return;
            }

            this.state.setState({ filters });
            this.renderFiltersPanel();
            this.showNotification(`Filter preset "${name}" loaded`, 'success');
        }

        deleteFilterPreset(name) {
            if (!confirm(`Delete filter preset "${name}"?`)) return;

            const presets = JSON.parse(localStorage.getItem('gos_filter_presets') || '{}');
            delete presets[name];
            localStorage.setItem('gos_filter_presets', JSON.stringify(presets));

            this.showNotification(`Filter preset "${name}" deleted`, 'success');
            this.renderFilterPresets();
        }

        renderFilterPresets() {
            const presets = JSON.parse(localStorage.getItem('gos_filter_presets') || '{}');
            const $list = $('#gos-presets-list');
            
            if (Object.keys(presets).length === 0) {
                $list.html('<p class="gos-empty-presets">No saved presets</p>');
                return;
            }

            const html = Object.keys(presets).map(name => `
                <div class="gos-preset-item" data-preset="${name}">
                    <span class="gos-preset-name">${name}</span>
                    <button class="gos-delete-preset" aria-label="Delete preset">
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor"/></svg>
                    </button>
                </div>
            `).join('');

            $list.html(html);
        }

        showInlineStatusSelector($btn, quoteId, statusType, currentStatus) {
            console.log('showInlineStatusSelector called', { quoteId, statusType, currentStatus });
            
            // Close any existing status selectors
            $('.gos-inline-status-selector').remove();
            
            // Get the available statuses
            const statuses = statusType === 'lead' ? CONFIG.STATUSES.lead : CONFIG.STATUSES.install;
            console.log('Available statuses:', statuses);
            
            // Create dropdown HTML
            const options = statuses.map(status => `
                <div class="gos-status-option ${status.value === currentStatus ? 'active' : ''}" 
                     data-status-value="${status.value}"
                     style="border-left: 4px solid ${status.color};">
                    <span class="gos-status-option-label">${status.label}</span>
                    ${status.value === currentStatus ? '<span class="gos-status-check">✓</span>' : ''}
                </div>
            `).join('');
            
            const selector = $(`
                <div class="gos-inline-status-selector" data-quote-id="${quoteId}" data-status-type="${statusType}">
                    <div class="gos-status-selector-header">
                        ${statusType === 'lead' ? 'Lead Status' : 'Install Status'}
                    </div>
                    <div class="gos-status-selector-options">
                        ${options}
                    </div>
                </div>
            `);
            
            // Position the selector below the button
            const btnOffset = $btn.offset();
            const btnHeight = $btn.outerHeight();
            const btnWidth = $btn.outerWidth();
            
            console.log('Button position:', { 
                top: btnOffset.top, 
                left: btnOffset.left, 
                height: btnHeight,
                width: btnWidth 
            });
            
            selector.css({
                position: 'fixed',  // Changed from absolute to fixed for better positioning
                top: btnOffset.top + btnHeight + 5,
                left: btnOffset.left,
                minWidth: btnWidth,
                zIndex: 99999  // Very high z-index to ensure it's on top
            });
            
            // Add to body
            $('body').append(selector);
            
            console.log('Selector appended to body');
            console.log('Selector element:', selector[0]);
            
            // Handle option click
            selector.find('.gos-status-option').on('click', async (e) => {
                e.stopPropagation();
                const newStatus = $(e.currentTarget).data('status-value');
                console.log('Status option clicked:', newStatus);
                
                if (newStatus === currentStatus) {
                    selector.remove();
                    return;
                }
                
                // Update status via API
                const result = await this.api.updateQuoteStatus(quoteId, newStatus, statusType);
                
                if (result.success) {
                    this.showNotification(`✅ Status updated to ${statuses.find(s => s.value === newStatus).label}`, 'success');
                    await this.loadQuotes();
                } else {
                    this.showNotification(`❌ Failed to update status: ${result.error}`, 'error');
                }
                
                selector.remove();
            });
            
            // Close on outside click
            setTimeout(() => {
                $(document).one('click', () => {
                    console.log('Outside click, removing selector');
                    selector.remove();
                });
            }, 100);
        }

        handleQuickAction(action, quoteId) {
            switch (action) {
                case 'view':
                    this.openQuoteModal(quoteId);
                    break;
                case 'clone':
                    this.cloneQuote(quoteId);
                    break;
                case 'edit':
                    window.selectedJobId = quoteId;
                    $(document).trigger('gsa:activate:panel', ['quote-detail']);
                    break;
                case 'delete':
                    this.deleteQuote(quoteId);
                    break;
            }
        }

        async cloneQuote(quoteId) {
            const quote = this.state.getState().quotes.find(q => q.id === quoteId);
            if (!quote) {
                this.showNotification('❌ Quote not found', 'error');
                return;
            }

            // Confirm clone
            const customerName = `${quote.first_name || ''} ${quote.last_name || ''}`.trim() || 'No name';
            const confirmMessage = `Clone quote #${quote.id} for ${customerName}?\n\nThis will create a duplicate with all product details and customer information.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }

            // Show loading notification
            const loadingNotification = this.showNotification('⏳ Cloning quote...', 'info', 0); // 0 = don't auto-hide

            try {
                // Prepare cloned quote data
                const clonedData = {
                    // Customer info
                    first_name: quote.first_name,
                    last_name: quote.last_name,
                    email: quote.email,
                    phone: quote.phone,
                    address: quote.address,
                    
                    // Product details
                    type: quote.type || quote.product_type || 'Window',
                    width: parseFloat(quote.width || 0),
                    height: parseFloat(quote.height || 0),
                    material: quote.material || '',
                    glazing: quote.glazing || '',
                    color: quote.color || '',
                    
                    // Pricing
                    price: parseFloat(quote.price || 0),
                    
                    // Status - reset to 'new' for cloned quotes
                    lead_status: 'new',
                    install_status: 'pending',
                    
                    // Meta
                    notes: quote.notes ? `[CLONED FROM #${quote.id}]\n${quote.notes}` : `[CLONED FROM #${quote.id}]`,
                    
                    // Configuration data (if exists)
                    config: quote.config || {}
                };

                // Save the cloned quote
                const result = await this.api.createQuote(clonedData);

                // Hide loading notification
                this.hideNotification(loadingNotification);

                if (result.success && result.data) {
                    const newQuoteId = result.data.id || result.data.ID;
                    this.showNotification(`✅ Successfully cloned quote #${quote.id} → #${newQuoteId}`, 'success');
                    
                    // Reload quotes to show the new one
                    await this.loadQuotes();
                    
                    // Open the cloned quote in preview
                    setTimeout(() => {
                        if (newQuoteId) {
                            this.openQuoteModal(newQuoteId);
                        }
                    }, 500);
                } else {
                    throw new Error(result.message || result.error || 'Failed to create cloned quote');
                }
            } catch (error) {
                console.error('Clone error:', error);
                this.hideNotification(loadingNotification);
                
                // Show error with retry option
                const retry = confirm(`❌ Failed to clone quote: ${error.message}\n\nWould you like to try again?`);
                if (retry) {
                    this.cloneQuote(quoteId);
                }
            }
        }

        async deleteQuote(quoteId) {
            if (!confirm('Are you sure you want to delete this quote? This cannot be undone.')) {
                return;
            }

            const result = await this.api.deleteQuote(quoteId);
            
            if (result.success) {
                this.showNotification('Quote deleted successfully', 'success');
                this.loadQuotes();
            } else {
                this.showNotification('Failed to delete quote', 'error');
            }
        }

        // ========================================
        // BULK ACTIONS
        // ========================================

        selectAllVisibleQuotes() {
            const quotes = this.state.getState().filteredQuotes;
            this.state.selectAllQuotes(quotes);
            this.updateBulkToolbar();
        }

        async bulkDelete() {
            const selectedIds = Array.from(this.state.getState().selectedQuotes);
            const count = selectedIds.length;

            if (count === 0) {
                this.showNotification('No quotes selected', 'warning');
                return;
            }

            // Confirmation modal
            const confirmed = await this.showBulkDeleteModal(count);
            if (!confirmed) return;

            // Save to undo stack
            this.saveBulkActionUndo('delete', selectedIds);

            // Show progress
            this.showNotification(`Deleting ${count} quote(s)...`, 'info');

            let successCount = 0;
            let failCount = 0;

            // Delete in parallel (max 5 at a time to avoid server overload)
            const chunks = this.chunkArray(selectedIds, 5);
            for (const chunk of chunks) {
                const promises = chunk.map(id => this.api.deleteQuote(id));
                const results = await Promise.all(promises);
                
                results.forEach(result => {
                    if (result.success) successCount++;
                    else failCount++;
                });
            }

            // Clear selection
            this.state.deselectAllQuotes();
            $('#gos-select-all-checkbox').prop('checked', false);

            // Refresh list
            await this.loadQuotes();

            // Show result
            if (failCount === 0) {
                this.showNotification(`Successfully deleted ${successCount} quote(s)`, 'success');
            } else {
                this.showNotification(`Deleted ${successCount}, failed ${failCount}`, 'warning');
            }
        }

        async bulkChangeStatus(statusValue) {
            const selectedIds = Array.from(this.state.getState().selectedQuotes);
            const count = selectedIds.length;

            if (count === 0) {
                this.showNotification('No quotes selected', 'warning');
                return;
            }

            const [type, value] = statusValue.split(':');
            const statusLabel = type === 'lead' 
                ? CONFIG.STATUSES.lead.find(s => s.value === value)?.label 
                : CONFIG.STATUSES.install.find(s => s.value === value)?.label;

            if (!confirm(`Change ${type} status to "${statusLabel}" for ${count} quote(s)?`)) {
                return;
            }

            this.showNotification(`Updating ${count} quote(s)...`, 'info');

            let successCount = 0;
            let failCount = 0;

            // Update in parallel
            const chunks = this.chunkArray(selectedIds, 5);
            for (const chunk of chunks) {
                const promises = chunk.map(id => 
                    this.api.updateQuote(id, {
                        [type === 'lead' ? 'lead_status' : 'install_status']: value
                    })
                );
                const results = await Promise.all(promises);
                
                results.forEach(result => {
                    if (result.success) successCount++;
                    else failCount++;
                });
            }

            // Clear selection
            this.state.deselectAllQuotes();
            $('#gos-select-all-checkbox').prop('checked', false);

            // Refresh list
            await this.loadQuotes();

            // Show result
            if (failCount === 0) {
                this.showNotification(`Successfully updated ${successCount} quote(s)`, 'success');
            } else {
                this.showNotification(`Updated ${successCount}, failed ${failCount}`, 'warning');
            }
        }

        bulkExportCSV() {
            const selectedIds = Array.from(this.state.getState().selectedQuotes);
            
            if (selectedIds.length === 0) {
                this.showNotification('No quotes selected', 'warning');
                return;
            }

            const quotes = this.state.getState().filteredQuotes.filter(q => selectedIds.includes(q.id));
            
            // Generate CSV
            const headers = ['ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Type', 'Width (m)', 'Height (m)', 'Price (£)', 'Lead Status', 'Install Status'];
            const rows = quotes.map(q => [
                q.id,
                this.formatDate(q.date),
                `${q.first_name} ${q.last_name}`,
                q.email || '',
                q.phone || '',
                q.type || 'Window',
                q.width?.toFixed(2) || '0.00',
                q.height?.toFixed(2) || '0.00',
                parseFloat(q.price || 0).toFixed(2),
                q.lead_status || 'new',
                q.install_status || 'pending'
            ]);

            const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().split('T')[0];
            
            link.setAttribute('href', url);
            link.setAttribute('download', `glazieros-quotes-${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification(`Exported ${quotes.length} quote(s) to CSV`, 'success');
            
            // Clear selection
            this.state.deselectAllQuotes();
            $('#gos-select-all-checkbox').prop('checked', false);
        }

        showBulkDeleteModal(count) {
            return new Promise(resolve => {
                const $modal = $(`
                    <div class="gos-modal-overlay" id="gos-bulk-delete-modal">
                        <div class="gos-modal-dialog">
                            <div class="gos-modal-header">
                                <h3>Confirm Bulk Delete</h3>
                                <button class="gos-modal-close" aria-label="Close">&times;</button>
                            </div>
                            <div class="gos-modal-body">
                                <div class="gos-warning-icon">⚠️</div>
                                <p>Are you sure you want to delete <strong>${count}</strong> quote(s)?</p>
                                <p class="gos-warning-text">This action cannot be undone.</p>
                            </div>
                            <div class="gos-modal-footer">
                                <button class="gos-button-secondary gos-modal-cancel">Cancel</button>
                                <button class="gos-button-danger gos-modal-confirm">Delete ${count} Quote(s)</button>
                            </div>
                        </div>
                    </div>
                `);

                $('body').append($modal);
                setTimeout(() => $modal.addClass('show'), 10);

                const close = (result) => {
                    $modal.removeClass('show');
                    setTimeout(() => {
                        $modal.remove();
                        resolve(result);
                    }, 300);
                };

                $modal.on('click', '.gos-modal-close, .gos-modal-cancel, .gos-modal-overlay', e => {
                    if (e.target === e.currentTarget) close(false);
                });

                $modal.on('click', '.gos-modal-confirm', () => close(true));
            });
        }

        saveBulkActionUndo(action, data) {
            // Save to localStorage for undo functionality
            const undo = {
                action,
                data,
                timestamp: Date.now()
            };
            localStorage.setItem('gos_last_bulk_action', JSON.stringify(undo));
        }

        chunkArray(array, size) {
            const chunks = [];
            for (let i = 0; i < array.length; i += size) {
                chunks.push(array.slice(i, i + size));
            }
            return chunks;
        }

        openQuoteModal(quoteId) {
            const quote = this.state.getState().quotes.find(q => q.id === quoteId);
            if (!quote) {
                this.showNotification('Quote not found', 'error');
                return;
            }

            const modal = new QuotePreviewModal(quote, this);
            modal.open();
        }

        open3DPricingWizard() {
            const modal = new PricingWizardModal(this);
            modal.open();
        }

        showNotification(message, type = 'info', duration = 3000) {
            // Simple toast notification
            const toastId = `gos-toast-${Date.now()}`;
            const $toast = $(`
                <div class="gos-toast gos-toast-${type}" id="${toastId}">
                    <div class="gos-toast-content">
                        ${message}
                    </div>
                    ${duration === 0 ? '<button class="gos-toast-close" aria-label="Close">&times;</button>' : ''}
                </div>
            `);
            
            $('body').append($toast);
            
            // Close button handler
            $toast.find('.gos-toast-close').on('click', () => {
                this.hideNotification(toastId);
            });
            
            setTimeout(() => $toast.addClass('show'), 10);
            
            // Auto-hide if duration > 0
            if (duration > 0) {
                setTimeout(() => {
                    this.hideNotification(toastId);
                }, duration);
            }
            
            return toastId; // Return ID for manual hiding
        }

        hideNotification(toastId) {
            const $toast = $(`#${toastId}`);
            if ($toast.length) {
                $toast.removeClass('show');
                setTimeout(() => $toast.remove(), 300);
            }
        }

        async refresh() {
            await this.loadQuotes();
        }

        handleFilterChange() {
            const filtered = this.filterManager.applyFilters(this.state.getState().quotes);
            const sorted = this.filterManager.sortQuotes(filtered, this.state.getState().sortBy);
            this.state.setState({ filteredQuotes: sorted });
        }

        injectStyles() {
            if ($('#gos-quotes-v2-styles').length) return;
            
            const css = `
                /* Core Layout */
                .gos-quotes-v2 {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #f5f6fa;
                }
                
                /* Header */
                .gos-quotes-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    background: #fff;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-header-left {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                
                .gos-quotes-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .gos-quotes-stats {
                    display: flex;
                    gap: 1rem;
                }
                
                .gos-stat-badge {
                    padding: 0.5rem 1rem;
                    background: #f8f9fa;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    color: #495057;
                }
                
                .gos-stat-badge strong {
                    color: #2c3e50;
                    font-weight: 600;
                }
                
                .gos-header-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                /* View Switcher */
                .gos-view-switcher {
                    display: flex;
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 0.25rem;
                }
                
                .gos-view-btn {
                    padding: 0.5rem 0.75rem;
                    border: none;
                    background: transparent;
                    color: #6c757d;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .gos-view-btn:hover {
                    background: #e9ecef;
                    color: #495057;
                }
                
                .gos-view-btn.active {
                    background: #fff;
                    color: #4e73df;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                /* Buttons */
                .gos-button-primary,
                .gos-button-secondary {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1.25rem;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-button-primary {
                    background: #4e73df;
                    color: #fff;
                }
                
                .gos-button-primary:hover {
                    background: #2e59d9;
                }
                
                .gos-button-secondary {
                    background: #fff;
                    color: #4e73df;
                    border: 1px solid #e1e4e8;
                }
                
                .gos-button-secondary:hover {
                    background: #f8f9fa;
                    border-color: #4e73df;
                }
                
                /* Filters Bar */
                .gos-filters-bar {
                    display: flex;
                    gap: 1rem;
                    padding: 1rem 2rem;
                    background: #fff;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-search-wrapper {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }
                
                .gos-search-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6c757d;
                }
                
                .gos-search-input {
                    width: 100%;
                    padding: 0.625rem 1rem 0.625rem 2.75rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    font-size: 0.875rem;
                }
                
                .gos-search-input:focus {
                    outline: none;
                    border-color: #4e73df;
                    box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.1);
                }
                
                .gos-select {
                    padding: 0.625rem 2.5rem 0.625rem 1rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    background: #fff;
                    cursor: pointer;
                }
                
                /* Quote Cards Grid */
                .gos-quotes-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem 2rem;
                }
                
                .gos-quotes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 1.5rem;
                }
                
                .gos-quote-card {
                    position: relative;
                    background: #fff;
                    border: 1px solid #e1e4e8;
                    border-radius: 8px;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                
                .gos-quote-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    border-color: #4e73df;
                    transform: translateY(-2px);
                }
                
                .gos-quote-card.selected {
                    border-color: #4e73df;
                    box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.1);
                }
                
                .gos-card-checkbox {
                    position: absolute;
                    top: 0.75rem;
                    left: 0.75rem;
                    z-index: 1;
                }
                
                .gos-quote-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .gos-card-header {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    padding: 1rem 1.25rem 1rem 2.75rem;
                    border-bottom: 1px solid #f8f9fa;
                }
                
                .gos-card-title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .gos-card-title-left {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .gos-quote-id {
                    font-weight: 600;
                    color: #2c3e50;
                    font-size: 1rem;
                }
                
                .gos-quote-type {
                    font-size: 0.875rem;
                    color: #6c757d;
                    text-transform: capitalize;
                }
                
                /* Dual-Segment Status Pill */
                .gos-dual-status-pill {
                    display: inline-flex;
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                
                .gos-status-segment {
                    padding: 0.4rem 0.875rem;
                    border: none;
                    color: white;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                    min-width: 85px;
                }
                
                .gos-status-segment:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .gos-status-segment:active {
                    transform: translateY(0);
                }
                
                .gos-status-lead {
                    border-radius: 6px 0 0 6px;
                }
                
                .gos-status-install {
                    border-radius: 0 6px 6px 0;
                    border-left: 2px solid rgba(255, 255, 255, 0.3);
                }
                
                .gos-card-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .gos-meta-date {
                    font-size: 0.8125rem;
                    color: #64748b;
                    font-weight: 500;
                }
                
                .gos-card-body {
                    padding: 1.25rem;
                }
                
                .gos-customer-info {
                    margin-bottom: 1rem;
                }
                
                .gos-customer-name {
                    font-weight: 500;
                    color: #2c3e50;
                    margin-bottom: 0.25rem;
                }
                
                .gos-customer-contact {
                    font-size: 0.875rem;
                    color: #6c757d;
                }
                
                .gos-quote-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .gos-detail-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.875rem;
                }
                
                .gos-detail-label {
                    color: #6c757d;
                }
                
                .gos-detail-value {
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .gos-price {
                    color: #28a745;
                    font-weight: 600;
                }
                
                .gos-card-footer {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    padding: 0.75rem 1.25rem;
                    background: #f8f9fa;
                    border-top: 1px solid #e1e4e8;
                }
                
                .gos-card-actions {
                    display: flex;
                    gap: 0.5rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .gos-quote-card:hover .gos-card-actions {
                    opacity: 1;
                }
                
                .gos-action-btn {
                    padding: 0.375rem;
                    border: none;
                    background: #fff;
                    color: #6c757d;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-action-btn:hover {
                    background: #e9ecef;
                    color: #495057;
                }
                
                .gos-action-delete:hover {
                    background: #dc3545;
                    color: #fff;
                }
                
                /* Empty State */
                .gos-empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }
                
                .gos-empty-icon {
                    color: #adb5bd;
                    margin-bottom: 1.5rem;
                }
                
                .gos-empty-state h3 {
                    margin: 0 0 0.5rem 0;
                    color: #2c3e50;
                }
                
                .gos-empty-state p {
                    margin: 0 0 1.5rem 0;
                    color: #6c757d;
                }
                
                /* Loading Skeleton */
                .gos-loading-skeleton {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 1.5rem;
                }
                
                .gos-skeleton-card {
                    background: #fff;
                    border: 1px solid #e1e4e8;
                    border-radius: 8px;
                    padding: 1.25rem;
                }
                
                .gos-skeleton-header,
                .gos-skeleton-line {
                    background: linear-gradient(90deg, #f8f9fa 25%, #e9ecef 50%, #f8f9fa 75%);
                    background-size: 200% 100%;
                    animation: skeleton-loading 1.5s infinite;
                    border-radius: 4px;
                }
                
                .gos-skeleton-header {
                    height: 20px;
                    width: 60%;
                    margin-bottom: 1rem;
                }
                
                .gos-skeleton-line {
                    height: 14px;
                    margin-bottom: 0.75rem;
                }
                
                .gos-skeleton-line.short {
                    width: 50%;
                }
                
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                /* Toast Notifications */
                .gos-toast {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    padding: 1rem 1.5rem;
                    background: #2c3e50;
                    color: #fff;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    opacity: 0;
                    transform: translateY(1rem);
                    transition: all 0.3s;
                    z-index: 10000;
                }
                
                .gos-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .gos-toast-success {
                    background: #28a745;
                }
                
                .gos-toast-error {
                    background: #dc3545;
                }
                
                /* Advanced Filters Panel */
                .gos-filters-panel {
                    background: #fff;
                    border-bottom: 1px solid #e1e4e8;
                    overflow: hidden;
                }
                
                .gos-filters-content {
                    padding: 1.5rem 2rem;
                }
                
                .gos-filters-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .gos-filters-header h3 {
                    margin: 0;
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .gos-button-text {
                    padding: 0.5rem 1rem;
                    border: none;
                    background: transparent;
                    color: #4e73df;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .gos-button-text:hover {
                    background: rgba(78, 115, 223, 0.1);
                }
                
                .gos-filters-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .gos-filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .gos-filter-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #495057;
                }
                
                /* Date Filters */
                .gos-date-presets {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .gos-preset-btn {
                    padding: 0.375rem 0.75rem;
                    border: 1px solid #e1e4e8;
                    background: #fff;
                    color: #495057;
                    font-size: 0.75rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-preset-btn:hover {
                    border-color: #4e73df;
                    color: #4e73df;
                    background: rgba(78, 115, 223, 0.05);
                }
                
                .gos-date-inputs {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .gos-date-input {
                    flex: 1;
                    padding: 0.5rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 4px;
                    font-size: 0.875rem;
                }
                
                .gos-date-input:focus {
                    outline: none;
                    border-color: #4e73df;
                }
                
                .gos-date-separator {
                    color: #6c757d;
                    font-size: 0.875rem;
                }
                
                /* Checkbox Filters */
                .gos-checkbox-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .gos-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    padding: 0.375rem 0.5rem;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .gos-checkbox-label:hover {
                    background: #f8f9fa;
                }
                
                .gos-filter-checkbox {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                }
                
                .gos-checkbox-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: #495057;
                }
                
                .gos-status-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }
                
                /* Price Range Filters */
                .gos-price-inputs {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .gos-input-wrapper {
                    position: relative;
                    flex: 1;
                }
                
                .gos-input-prefix {
                    position: absolute;
                    left: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #6c757d;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                
                .gos-price-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem 0.5rem 2rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 4px;
                    font-size: 0.875rem;
                }
                
                .gos-price-input:focus {
                    outline: none;
                    border-color: #4e73df;
                }
                
                .gos-price-separator {
                    color: #6c757d;
                    font-size: 0.875rem;
                }
                
                .gos-price-range-visual {
                    margin-top: 0.5rem;
                }
                
                .gos-range-slider {
                    width: 100%;
                    height: 4px;
                    -webkit-appearance: none;
                    appearance: none;
                    background: linear-gradient(to right, #4e73df 0%, #4e73df 100%, #e1e4e8 100%);
                    border-radius: 2px;
                    outline: none;
                }
                
                .gos-range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4e73df;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .gos-range-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #4e73df;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                
                .gos-range-labels {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 0.25rem;
                    font-size: 0.75rem;
                    color: #6c757d;
                }
                
                /* Multi-select */
                .gos-multiselect {
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    min-height: 80px;
                }
                
                .gos-multiselect:focus {
                    outline: none;
                    border-color: #4e73df;
                }
                
                /* Active Filters Display */
                .gos-active-filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                }
                
                .gos-active-filter-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.375rem 0.75rem;
                    background: #fff;
                    border: 1px solid #e1e4e8;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    color: #495057;
                }
                
                .gos-remove-filter {
                    padding: 0;
                    width: 16px;
                    height: 16px;
                    border: none;
                    background: #6c757d;
                    color: #fff;
                    border-radius: 50%;
                    font-size: 1rem;
                    line-height: 1;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .gos-remove-filter:hover {
                    background: #dc3545;
                }
                
                /* Filter Presets */
                .gos-filter-presets {
                    padding-top: 1rem;
                    border-top: 1px solid #e1e4e8;
                }
                
                .gos-presets-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                
                .gos-presets-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #495057;
                }
                
                .gos-presets-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .gos-preset-item {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    background: #fff;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-preset-item:hover {
                    border-color: #4e73df;
                    box-shadow: 0 2px 4px rgba(78, 115, 223, 0.1);
                }
                
                .gos-preset-name {
                    font-size: 0.875rem;
                    color: #495057;
                }
                
                .gos-delete-preset {
                    padding: 0.25rem;
                    border: none;
                    background: transparent;
                    color: #6c757d;
                    cursor: pointer;
                    line-height: 0;
                    transition: color 0.2s;
                }
                
                .gos-delete-preset:hover {
                    color: #dc3545;
                }
                
                .gos-empty-presets {
                    margin: 0;
                    padding: 1rem;
                    text-align: center;
                    color: #6c757d;
                    font-size: 0.875rem;
                    font-style: italic;
                }
                
                /* Filter Count Badge */
                .gos-filter-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 20px;
                    height: 20px;
                    padding: 0 0.5rem;
                    background: #dc3545;
                    color: #fff;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 10px;
                    margin-left: 0.5rem;
                }
                
                /* Bulk Actions Toolbar */
                .gos-bulk-toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                    animation: slideDown 0.3s ease;
                }
                
                @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .gos-bulk-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .gos-select-all-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    margin: 0;
                }
                
                .gos-select-all-wrapper input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .gos-select-all-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                
                #gos-selected-count {
                    font-weight: 700;
                    font-size: 1.125rem;
                }
                
                .gos-bulk-deselect {
                    padding: 0.375rem;
                    border: 1px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                }
                
                .gos-bulk-deselect:hover {
                    background: rgba(255,255,255,0.2);
                    border-color: rgba(255,255,255,0.5);
                }
                
                .gos-bulk-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .gos-bulk-action-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .gos-bulk-label {
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                
                .gos-bulk-select {
                    padding: 0.5rem 2rem 0.5rem 0.75rem;
                    border: 1px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    cursor: pointer;
                    min-width: 180px;
                }
                
                .gos-bulk-select option {
                    background: #2c3e50;
                    color: #fff;
                }
                
                .gos-bulk-select optgroup {
                    background: #1a252f;
                    color: #aaa;
                    font-weight: 600;
                }
                
                .gos-bulk-action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: 1px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-bulk-action-btn:hover {
                    background: rgba(255,255,255,0.2);
                    border-color: rgba(255,255,255,0.5);
                    transform: translateY(-1px);
                }
                
                .gos-bulk-delete:hover {
                    background: #dc3545;
                    border-color: #dc3545;
                }
                
                .gos-bulk-export:hover {
                    background: #28a745;
                    border-color: #28a745;
                }
                
                /* Bulk Delete Modal */
                .gos-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100000;
                    opacity: 0;
                    transition: opacity 0.3s;
                }
                
                .gos-modal-overlay.show {
                    opacity: 1;
                }
                
                .gos-modal-dialog {
                    background: #fff;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    transform: scale(0.9);
                    transition: transform 0.3s;
                }
                
                .gos-modal-overlay.show .gos-modal-dialog {
                    transform: scale(1);
                }
                
                .gos-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #2c3e50;
                }
                
                .gos-modal-close {
                    padding: 0;
                    border: none;
                    background: transparent;
                    font-size: 1.5rem;
                    color: #6c757d;
                    cursor: pointer;
                    line-height: 1;
                    width: 30px;
                    height: 30px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .gos-modal-close:hover {
                    background: #f8f9fa;
                    color: #2c3e50;
                }
                
                .gos-modal-body {
                    padding: 2rem 1.5rem;
                    text-align: center;
                }
                
                .gos-warning-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .gos-modal-body p {
                    margin: 0.5rem 0;
                    font-size: 1rem;
                    color: #495057;
                }
                
                .gos-warning-text {
                    color: #dc3545 !important;
                    font-weight: 500;
                    font-size: 0.875rem !important;
                }
                
                .gos-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid #e1e4e8;
                    background: #f8f9fa;
                    border-radius: 0 0 8px 8px;
                }
                
                .gos-button-danger {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1.25rem;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #dc3545;
                    color: #fff;
                }
                
                .gos-button-danger:hover {
                    background: #c82333;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
                }
                
                /* Quote Preview Modal */
                .gos-preview-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100001;
                    opacity: 0;
                    transition: opacity 0.3s;
                    padding: 2rem;
                }
                
                .gos-preview-overlay.show {
                    opacity: 1;
                }
                
                .gos-preview-dialog {
                    background: #fff;
                    border-radius: 12px;
                    max-width: 1200px;
                    width: 100%;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    transform: scale(0.9);
                    transition: transform 0.3s;
                    overflow: hidden;
                }
                
                .gos-preview-overlay.show .gos-preview-dialog {
                    transform: scale(1);
                }
                
                .gos-preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                    border-bottom: 1px solid rgba(255,255,255,0.2);
                }
                
                .gos-preview-title-section h2 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.75rem;
                    font-weight: 700;
                }
                
                .gos-preview-meta {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    font-size: 0.875rem;
                }
                
                .gos-preview-date {
                    opacity: 0.9;
                }
                
                .gos-preview-actions-header {
                    display: flex;
                    gap: 0.5rem;
                    align-items: center;
                }
                
                .gos-nav-btn {
                    width: 40px;
                    height: 40px;
                    border: 2px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    border-radius: 50%;
                    font-size: 1.25rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .gos-nav-btn:hover {
                    background: rgba(255,255,255,0.2);
                    border-color: rgba(255,255,255,0.5);
                    transform: scale(1.1);
                }
                
                .gos-preview-close {
                    width: 40px;
                    height: 40px;
                    border: 2px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                    border-radius: 50%;
                    font-size: 2rem;
                    line-height: 1;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 0;
                }
                
                .gos-preview-close:hover {
                    background: rgba(255,255,255,0.2);
                    border-color: rgba(255,255,255,0.5);
                    transform: rotate(90deg);
                }
                
                .gos-preview-body {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 2rem;
                    padding: 2rem;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .gos-preview-left,
                .gos-preview-right {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .gos-preview-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 1.5rem;
                    border: 1px solid #e1e4e8;
                }
                
                .gos-section-title {
                    margin: 0 0 1rem 0;
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: #2c3e50;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .gos-section-title svg {
                    stroke: #667eea;
                    stroke-width: 1.5;
                }
                
                .gos-info-grid {
                    display: grid;
                    gap: 1rem;
                }
                
                .gos-info-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-info-item:last-child {
                    border-bottom: none;
                }
                
                .gos-info-label {
                    font-size: 0.875rem;
                    color: #6c757d;
                    font-weight: 500;
                }
                
                .gos-info-value {
                    font-size: 0.875rem;
                    color: #2c3e50;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .gos-color-swatch {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 2px solid #e1e4e8;
                    display: inline-block;
                }
                
                .gos-price-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .gos-price-table td {
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #e1e4e8;
                    font-size: 0.875rem;
                }
                
                .gos-price-table td:last-child {
                    text-align: right;
                }
                
                .gos-price-amount {
                    color: #667eea;
                    font-weight: 600;
                }
                
                .gos-price-total {
                    border-top: 2px solid #667eea !important;
                    font-size: 1.125rem !important;
                }
                
                .gos-price-total td {
                    padding-top: 1rem;
                    border-bottom: none;
                }
                
                .gos-notes-content {
                    font-size: 0.875rem;
                    color: #495057;
                    line-height: 1.6;
                    white-space: pre-wrap;
                }
                
                .gos-notes-content em {
                    color: #6c757d;
                }
                
                .gos-3d-preview-container {
                    background: #fff;
                    border-radius: 8px;
                    padding: 1rem;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: 2px solid #e1e4e8;
                }
                
                .gos-preview-svg {
                    border-radius: 4px;
                }
                
                .gos-quick-actions {
                    display: grid;
                    gap: 0.75rem;
                }
                
                .gos-action-button {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.875rem 1rem;
                    border: 2px solid #e1e4e8;
                    background: #fff;
                    color: #495057;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                
                .gos-action-button:hover {
                    border-color: #667eea;
                    color: #667eea;
                    transform: translateX(4px);
                    box-shadow: -4px 0 0 #667eea;
                }
                
                .gos-action-button svg {
                    stroke: currentColor;
                    stroke-width: 1.5;
                    flex-shrink: 0;
                }
                
                .gos-action-delete {
                    border-color: #dc3545;
                    color: #dc3545;
                }
                
                .gos-action-delete:hover {
                    background: #dc3545;
                    color: #fff;
                    box-shadow: -4px 0 0 #dc3545;
                }
                
                .gos-action-edit:hover {
                    background: #667eea;
                    color: #fff;
                }
                
                .gos-action-clone {
                    border-color: #17a2b8;
                    color: #17a2b8;
                }
                
                .gos-action-clone:hover {
                    background: #17a2b8;
                    color: #fff;
                    border-color: #17a2b8;
                    box-shadow: -4px 0 0 #17a2b8;
                }
                
                .gos-action-print:hover {
                    background: #28a745;
                    color: #fff;
                    border-color: #28a745;
                    box-shadow: -4px 0 0 #28a745;
                }
                
                /* Notes Section */
                .gos-section-title {
                    position: relative;
                }
                
                .gos-edit-notes-btn {
                    position: absolute;
                    right: 0;
                    top: 50%;
                    transform: translateY(-50%);
                    background: #f3f4f6;
                    border: 1px solid #e5e7eb;
                    padding: 6px 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .gos-edit-notes-btn:hover {
                    background: #667eea;
                    border-color: #667eea;
                    color: white;
                }
                
                .gos-edit-notes-btn svg {
                    stroke: currentColor;
                }
                
                .gos-notes-container {
                    margin-top: 12px;
                }
                
                .gos-notes-content {
                    background: #f9fafb;
                    padding: 12px 16px;
                    border-radius: 8px;
                    min-height: 60px;
                    border: 1px solid #e5e7eb;
                    line-height: 1.6;
                    color: #374151;
                }
                
                .gos-notes-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    font-family: inherit;
                    line-height: 1.6;
                    resize: vertical;
                    min-height: 100px;
                    transition: border-color 0.2s;
                }
                
                .gos-notes-textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                
                .gos-notes-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                    margin-top: 12px;
                }
                
                .gos-notes-actions button {
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                /* ========================================
                   KANBAN VIEW
                   ======================================== */
                .gos-kanban-container {
                    display: flex;
                    gap: 20px;
                    padding: 20px;
                    height: calc(100vh - 250px);
                    overflow-x: auto;
                    overflow-y: hidden;
                    background: #f5f6fa;
                }
                
                .gos-kanban-column {
                    flex: 1;
                    min-width: 300px;
                    max-width: 350px;
                    display: flex;
                    flex-direction: column;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    overflow: hidden;
                }
                
                .gos-kanban-column-header {
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: #fff;
                    font-weight: 600;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .gos-kanban-header-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 15px;
                }
                
                .gos-kanban-icon {
                    font-size: 18px;
                }
                
                .gos-kanban-count {
                    background: rgba(255,255,255,0.25);
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 13px;
                    font-weight: 700;
                }
                
                .gos-kanban-column-body {
                    flex: 1;
                    padding: 16px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: background 0.2s;
                }
                
                .gos-kanban-column-body.gos-drag-over {
                    background: linear-gradient(135deg, #f0f4ff 0%, #e6f0ff 100%);
                    box-shadow: inset 0 0 0 3px #667eea;
                }
                
                .gos-kanban-column-body::-webkit-scrollbar {
                    width: 6px;
                }
                
                .gos-kanban-column-body::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .gos-kanban-column-body::-webkit-scrollbar-thumb {
                    background: #cbd5e0;
                    border-radius: 3px;
                }
                
                .gos-kanban-card {
                    background: #fff;
                    border: 1px solid #e1e4e8;
                    border-radius: 8px;
                    padding: 14px;
                    cursor: grab;
                    transition: all 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                    position: relative;
                }
                
                .gos-kanban-card.selected {
                    border-color: #667eea;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
                }
                
                .gos-kanban-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                    transform: translateY(-2px);
                    border-color: #667eea;
                }
                
                .gos-kanban-card.gos-dragging {
                    opacity: 0.5;
                    cursor: grabbing;
                    transform: rotate(3deg);
                }
                
                .gos-kanban-card-checkbox {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    z-index: 10;
                }
                
                .gos-kanban-card-checkbox input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }
                
                .gos-kanban-card-header {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 10px;
                    margin-left: 28px;
                }
                
                .gos-kanban-card-title {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .gos-kanban-card-id {
                    font-size: 12px;
                    font-weight: 600;
                    color: #667eea;
                    background: #f0f4ff;
                    padding: 3px 8px;
                    border-radius: 4px;
                }
                
                .gos-kanban-card-type {
                    font-size: 11px;
                    color: #6c757d;
                    background: #f8f9fa;
                    padding: 3px 8px;
                    border-radius: 4px;
                }
                
                .gos-dual-status-pill-small .gos-status-segment {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.65rem;
                    min-width: 60px;
                }
                
                .gos-kanban-card-customer {
                    font-size: 15px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 10px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .gos-kanban-card-details {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .gos-kanban-card-price {
                    font-size: 18px;
                    font-weight: 700;
                    color: #27ae60;
                }
                
                .gos-kanban-card-size {
                    font-size: 12px;
                    color: #6c757d;
                }
                
                .gos-kanban-card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .gos-kanban-install-pill {
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    border: 1px solid;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .gos-kanban-card-actions {
                    display: flex;
                    gap: 4px;
                }
                
                .gos-kanban-action-btn {
                    width: 28px;
                    height: 28px;
                    border: 1px solid #e1e4e8;
                    background: #fff;
                    border-radius: 4px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                
                .gos-kanban-action-btn:hover {
                    background: #667eea;
                    border-color: #667eea;
                    transform: scale(1.1);
                }
                
                .gos-kanban-action-btn:hover svg {
                    stroke: #fff;
                }
                
                .gos-kanban-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    color: #adb5bd;
                    text-align: center;
                }
                
                .gos-kanban-empty svg {
                    margin-bottom: 12px;
                    opacity: 0.5;
                }
                
                .gos-kanban-empty p {
                    margin: 0;
                    font-size: 14px;
                }
                
                /* Status Change Dialog */
                .gos-status-dialog {
                    grid-column: 1 / -1;
                    background: #fff;
                    border: 2px solid #667eea;
                    border-radius: 8px;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                    animation: slideInDown 0.3s;
                }
                
                @keyframes slideInDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .gos-status-dialog h4 {
                    margin: 0 0 1rem 0;
                    color: #2c3e50;
                    font-size: 1.125rem;
                }
                
                .gos-status-options {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                
                .gos-status-group-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #6c757d;
                    margin-bottom: 0.75rem;
                }
                
                .gos-status-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .gos-status-option {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    border: 2px solid #e1e4e8;
                    background: #fff;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #495057;
                }
                
                .gos-status-option:hover {
                    transform: translateX(4px);
                }
                
                .gos-status-option.active {
                    background: #f8f9fa;
                    border-width: 3px;
                }
                
                /* Print Styles */
                @media print {
                    .gos-preview-header,
                    .gos-preview-actions-header,
                    .gos-quick-actions,
                    .gos-status-dialog {
                        display: none !important;
                    }
                    
                    .gos-preview-dialog {
                        max-height: none;
                        box-shadow: none;
                    }
                    
                    .gos-preview-body {
                        overflow: visible;
                    }
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .gos-quotes-header {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: stretch;
                    }
                    
                    .gos-header-left,
                    .gos-header-right {
                        flex-direction: column;
                    }
                    
                    .gos-filters-bar {
                        flex-direction: column;
                    }
                    
                    .gos-search-wrapper {
                        max-width: none;
                    }
                    
                    .gos-quotes-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .gos-filters-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                /* ========================================
                   DIAGNOSTICS PANEL
                   ======================================== */
                .gos-debug-panel {
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border: 2px solid #667eea;
                    border-radius: 12px;
                    padding: 0;
                    margin: 20px 0;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
                }
                
                .gos-debug-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #fff;
                }
                
                .gos-debug-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .gos-debug-title svg {
                    stroke: #fff;
                }
                
                .gos-debug-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .gos-debug-copy-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 6px;
                    color: #fff;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-debug-copy-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                }
                
                .gos-debug-close-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 6px;
                    color: #fff;
                    font-size: 20px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-debug-close-btn:hover {
                    background: rgba(231, 76, 60, 0.8);
                    transform: rotate(90deg);
                }
                
                .gos-debug-content {
                    background: #1e1e1e;
                    color: #d4d4d4;
                    padding: 20px;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.6;
                    max-height: 500px;
                    overflow: auto;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    border-top: 1px solid #667eea;
                }
                
                .gos-debug-content::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                
                .gos-debug-content::-webkit-scrollbar-track {
                    background: #2d2d2d;
                }
                
                .gos-debug-content::-webkit-scrollbar-thumb {
                    background: #667eea;
                    border-radius: 5px;
                }
                
                .gos-debug-content::-webkit-scrollbar-thumb:hover {
                    background: #764ba2;
                }

                /* ===== STATISTICS PANEL ===== */
                .gos-stats-panel {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    margin: 20px 0;
                    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.2);
                    overflow: hidden;
                    animation: slideDown 0.3s ease-out;
                }
                
                .gos-stats-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                }
                
                .gos-stats-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: white;
                    font-weight: 600;
                    font-size: 16px;
                }
                
                .gos-stats-title svg {
                    stroke: white;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                }
                
                .gos-stats-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .gos-stats-export-btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .gos-stats-export-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-1px);
                }
                
                .gos-stats-close-btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    font-size: 20px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                }
                
                .gos-stats-close-btn:hover {
                    background: rgba(255, 77, 79, 0.3);
                    border-color: rgba(255, 77, 79, 0.5);
                    transform: rotate(90deg);
                }
                
                .gos-stats-content {
                    padding: 24px;
                    background: white;
                }
                
                .gos-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                
                .gos-stat-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    border: 1px solid #e5e7eb;
                    transition: all 0.3s;
                    position: relative;
                    overflow: hidden;
                }
                
                .gos-stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, #667eea, #764ba2);
                }
                
                .gos-stat-card-revenue::before {
                    background: linear-gradient(90deg, #667eea, #764ba2);
                }
                
                .gos-stat-card-quotes::before {
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                }
                
                .gos-stat-card-conversion::before {
                    background: linear-gradient(90deg, #10b981, #059669);
                }
                
                .gos-stat-card-won::before {
                    background: linear-gradient(90deg, #f59e0b, #d97706);
                }
                
                .gos-stat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
                }
                
                .gos-stat-card-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 12px;
                }
                
                .gos-stat-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }
                
                .gos-stat-card-quotes .gos-stat-icon {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                }
                
                .gos-stat-card-conversion .gos-stat-icon {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                }
                
                .gos-stat-card-won .gos-stat-icon {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                }
                
                .gos-stat-label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .gos-stat-value {
                    font-size: 32px;
                    font-weight: 700;
                    color: #111827;
                    line-height: 1.2;
                    margin-bottom: 4px;
                }
                
                .gos-stat-subtitle {
                    font-size: 13px;
                    color: #9ca3af;
                }
                
                .gos-stats-section {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border: 1px solid #e5e7eb;
                }
                
                .gos-stats-section:last-child {
                    margin-bottom: 0;
                }
                
                .gos-stats-section-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #111827;
                    margin: 0 0 16px 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .gos-stats-section-title svg {
                    stroke: #667eea;
                }
                
                .gos-funnel {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .gos-funnel-stage {
                    display: grid;
                    grid-template-columns: 120px 1fr 60px;
                    gap: 12px;
                    align-items: center;
                }
                
                .gos-funnel-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                
                .gos-funnel-count {
                    font-weight: 600;
                    color: #667eea;
                }
                
                .gos-funnel-bar-container {
                    height: 32px;
                    background: #f3f4f6;
                    border-radius: 8px;
                    overflow: hidden;
                    position: relative;
                }
                
                .gos-funnel-bar {
                    height: 100%;
                    border-radius: 8px;
                    transition: width 0.6s ease-out;
                    position: relative;
                    overflow: hidden;
                }
                
                .gos-funnel-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                .gos-funnel-percentage {
                    font-size: 14px;
                    font-weight: 600;
                    color: #6b7280;
                    text-align: right;
                }
                
                .gos-product-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }
                
                .gos-product-item {
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s;
                }
                
                .gos-product-item:hover {
                    background: #f3f4f6;
                    border-color: #667eea;
                }
                
                .gos-product-type {
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                
                .gos-product-count {
                    font-size: 16px;
                    font-weight: 700;
                    color: #667eea;
                    background: white;
                    padding: 4px 10px;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .gos-stats-btn-primary {
                    position: relative;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: #fff !important;
                    border: none !important;
                }
                
                .gos-stats-btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4) !important;
                }
                
                /* ===== EXPORT DROPDOWN ===== */
                .gos-export-dropdown-wrapper {
                    position: relative;
                    display: inline-block;
                }
                
                #gos-export-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .gos-dropdown-arrow {
                    margin-left: 2px;
                    transition: transform 0.2s;
                }
                
                #gos-export-btn:hover .gos-dropdown-arrow {
                    transform: translateY(2px);
                }
                
                .gos-export-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                    min-width: 280px;
                    z-index: 1000;
                    overflow: hidden;
                    animation: dropdownSlideIn 0.2s ease-out;
                }
                
                @keyframes dropdownSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .gos-export-option {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 12px 16px;
                    background: white;
                    border: none;
                    border-bottom: 1px solid #f3f4f6;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                
                .gos-export-option:last-child {
                    border-bottom: none;
                }
                
                .gos-export-option:hover {
                    background: #f9fafb;
                    padding-left: 20px;
                }
                
                .gos-export-option svg {
                    flex-shrink: 0;
                    stroke: #667eea;
                }
                
                .gos-export-option:hover svg {
                    stroke: #764ba2;
                }
                
                .gos-export-option-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .gos-export-option-title {
                    font-size: 14px;
                    font-weight: 500;
                    color: #111827;
                }
                
                .gos-export-option-desc {
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .gos-export-divider {
                    height: 1px;
                    background: #e5e7eb;
                    margin: 4px 0;
                }
                
                .gos-export-option[data-format="selected"] {
                    background: #f8f9ff;
                }
                
                .gos-export-option[data-format="selected"]:hover {
                    background: #eff1ff;
                }
                
                .gos-export-option[data-format="selected"] svg {
                    stroke: #10b981;
                }
                
                /* Page Size Selector */
                .gos-page-size-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: auto;
                }
                
                .gos-page-size-label {
                    font-size: 0.875rem;
                    color: #64748b;
                    font-weight: 500;
                }
                
                .gos-page-size-select {
                    min-width: 80px;
                }
                
                /* Pagination */
                .gos-pagination {
                    background: white;
                    border-top: 1px solid #e1e4e8;
                    padding: 1rem 2rem;
                }
                
                .gos-pagination-wrapper {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 2rem;
                }
                
                .gos-pagination-info {
                    font-size: 0.875rem;
                    color: #64748b;
                }
                
                .gos-pagination-info strong {
                    color: #1e293b;
                    font-weight: 600;
                }
                
                .gos-pagination-controls {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .gos-page-btn {
                    min-width: 36px;
                    height: 36px;
                    padding: 0 10px;
                    border: 1px solid #e1e4e8;
                    background: white;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .gos-page-btn:hover:not([disabled]) {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #1e293b;
                }
                
                .gos-page-btn.active {
                    background: #3b82f6;
                    border-color: #3b82f6;
                    color: white;
                    font-weight: 600;
                }
                
                .gos-page-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                
                .gos-page-btn svg {
                    stroke: currentColor;
                }
                
                .gos-page-ellipsis {
                    padding: 0 8px;
                    color: #94a3b8;
                    font-weight: 600;
                    user-select: none;
                }
                
                /* Inline Status Selector */
                .gos-inline-status-selector {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                    min-width: 200px;
                    overflow: hidden;
                    animation: slideDown 0.2s ease;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .gos-status-selector-header {
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-weight: 600;
                    font-size: 0.875rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .gos-status-selector-options {
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .gos-status-option {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.15s ease;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .gos-status-option:hover {
                    background: #f8f9fa;
                    padding-left: 20px;
                }
                
                .gos-status-option.active {
                    background: #f0f4ff;
                    font-weight: 600;
                }
                
                .gos-status-option-label {
                    font-size: 0.875rem;
                    color: #2c3e50;
                }
                
                .gos-status-check {
                    color: #27ae60;
                    font-weight: bold;
                    font-size: 1rem;
                }
                
                /* Responsive pagination */
                @media (max-width: 768px) {
                    .gos-pagination-wrapper {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .gos-pagination-info {
                        order: 2;
                    }
                    
                    .gos-pagination-controls {
                        order: 1;
                    }
                }
            `;
            
            $('<style id="gos-quotes-v2-styles"></style>').text(css).appendTo('head');
        }
    }

    /**
     * ========================================
     * QUOTE PREVIEW MODAL
     * ========================================
     */
    class QuotePreviewModal {
        constructor(quote, quotesManager) {
            this.quote = quote;
            this.quotesManager = quotesManager;
            this.allQuotes = quotesManager.state.getState().filteredQuotes;
            this.currentIndex = this.allQuotes.findIndex(q => q.id === quote.id);
        }

        open() {
            this.render();
            this.attachEventListeners();
            
            // Show with animation
            setTimeout(() => {
                $('#gos-quote-preview-modal').addClass('show');
            }, 10);

            // Prevent body scroll
            $('body').css('overflow', 'hidden');
        }

        close() {
            $(document).off('keydown.quotePreview');
            $('#gos-quote-preview-modal').removeClass('show');
            setTimeout(() => {
                $('#gos-quote-preview-modal').remove();
                $('body').css('overflow', '');
            }, 300);
        }

        render() {
            const customerName = [this.quote.first_name, this.quote.last_name].filter(Boolean).join(' ') || 'No name';
            const leadStatus = CONFIG.STATUSES.lead.find(s => s.value === this.quote.lead_status) || CONFIG.STATUSES.lead[0];
            const installStatus = CONFIG.STATUSES.install.find(s => s.value === this.quote.install_status) || CONFIG.STATUSES.install[0];
            
            const html = `
                <div class="gos-preview-overlay" id="gos-quote-preview-modal">
                    <div class="gos-preview-dialog">
                        <!-- Header -->
                        <div class="gos-preview-header">
                            <div class="gos-preview-title-section">
                                <h2>Quote #${this.quote.id}</h2>
                                <div class="gos-preview-meta">
                                    <span class="gos-preview-date">${this.quotesManager.formatDate(this.quote.date)}</span>
                                    <div class="gos-dual-status-pill" data-quote-id="${this.quote.id}">
                                        <button class="gos-status-segment gos-status-lead" 
                                                data-quote-id="${this.quote.id}"
                                                data-status-type="lead"
                                                data-current-status="${this.quote.lead_status}"
                                                style="background-color: ${leadStatus.color};"
                                                title="Lead Status: ${leadStatus.label} (click to change)">
                                            ${leadStatus.label}
                                        </button>
                                        <button class="gos-status-segment gos-status-install" 
                                                data-quote-id="${this.quote.id}"
                                                data-status-type="install"
                                                data-current-status="${this.quote.install_status}"
                                                style="background-color: ${installStatus.color};"
                                                title="Install Status: ${installStatus.label} (click to change)">
                                            ${installStatus.label}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="gos-preview-actions-header">
                                ${this.currentIndex > 0 ? '<button class="gos-nav-btn" id="gos-prev-quote" title="Previous quote (←)">←</button>' : ''}
                                ${this.currentIndex < this.allQuotes.length - 1 ? '<button class="gos-nav-btn" id="gos-next-quote" title="Next quote (→)">→</button>' : ''}
                                <button class="gos-preview-close" id="gos-close-preview" title="Close (Esc)">&times;</button>
                            </div>
                        </div>

                        <!-- Body -->
                        <div class="gos-preview-body">
                            <!-- Left Column -->
                            <div class="gos-preview-left">
                                <!-- Customer Info -->
                                <div class="gos-preview-section">
                                    <h3 class="gos-section-title">
                                        <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.5 2.5-6 6-6s6 2.5 6 6" fill="none" stroke="currentColor"/></svg>
                                        Customer Information
                                    </h3>
                                    <div class="gos-info-grid">
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Name</span>
                                            <span class="gos-info-value">${customerName}</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Email</span>
                                            <span class="gos-info-value">${this.quote.email || 'N/A'}</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Phone</span>
                                            <span class="gos-info-value">${this.quote.phone || 'N/A'}</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Address</span>
                                            <span class="gos-info-value">${this.quote.address || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Product Specifications -->
                                <div class="gos-preview-section">
                                    <h3 class="gos-section-title">
                                        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor"/></svg>
                                        Product Specifications
                                    </h3>
                                    <div class="gos-info-grid">
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Type</span>
                                            <span class="gos-info-value">${this.quote.type || 'Window'}</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Dimensions</span>
                                            <span class="gos-info-value">${this.quote.width?.toFixed(2) || '0.00'}m × ${this.quote.height?.toFixed(2) || '0.00'}m</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Material</span>
                                            <span class="gos-info-value">${this.quote.material || 'uPVC'}</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Glazing</span>
                                            <span class="gos-info-value">${this.quote.glazing_type || 'Double'}</span>
                                        </div>
                                        <div class="gos-info-item">
                                            <span class="gos-info-label">Color</span>
                                            <span class="gos-info-value">
                                                <span class="gos-color-swatch" style="background: ${this.quote.frame_color || '#ffffff'}"></span>
                                                ${this.quote.frame_color || 'White'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Price Breakdown -->
                                <div class="gos-preview-section">
                                    <h3 class="gos-section-title">
                                        <svg width="16" height="16" viewBox="0 0 16 16"><text x="2" y="12" font-size="12" fill="currentColor">£</text></svg>
                                        Price Breakdown
                                    </h3>
                                    ${this.getPriceBreakdownHTML()}
                                </div>

                                <!-- Notes -->
                                <div class="gos-preview-section">
                                    <h3 class="gos-section-title">
                                        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 2h8l3 3v9H3z" fill="none" stroke="currentColor"/><path d="M11 2v3h3" fill="none" stroke="currentColor"/></svg>
                                        Internal Notes
                                        <button class="gos-edit-notes-btn" id="gos-edit-notes-btn" title="Edit notes">
                                            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M9 1l3 3-7 7H2v-3z" fill="none" stroke="currentColor"/></svg>
                                        </button>
                                    </h3>
                                    <div class="gos-notes-container">
                                        <div class="gos-notes-content" id="gos-notes-display">
                                            ${this.quote.notes ? this.quote.notes.replace(/\n/g, '<br>') : '<em style="color: #9ca3af;">No notes added yet. Click edit to add notes...</em>'}
                                        </div>
                                        <div class="gos-notes-editor" id="gos-notes-editor" style="display: none;">
                                            <textarea 
                                                id="gos-notes-textarea" 
                                                class="gos-notes-textarea"
                                                placeholder="Add internal notes, reminders, or important details about this quote..."
                                                rows="4"
                                            >${this.quote.notes || ''}</textarea>
                                            <div class="gos-notes-actions">
                                                <button class="gos-button-secondary" id="gos-notes-cancel">Cancel</button>
                                                <button class="gos-button-primary" id="gos-notes-save">Save Notes</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column -->
                            <div class="gos-preview-right">
                                <!-- 3D Preview -->
                                <div class="gos-preview-section">
                                    <h3 class="gos-section-title">3D Preview</h3>
                                    <div class="gos-3d-preview-container">
                                        ${this.render3DPreview()}
                                    </div>
                                </div>

                                <!-- Quick Actions -->
                                <div class="gos-preview-section">
                                    <h3 class="gos-section-title">Quick Actions</h3>
                                    <div class="gos-quick-actions">
                                        <button class="gos-action-button gos-action-edit" data-action="edit">
                                            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M11 2l3 3-8 8H3v-3z" fill="none" stroke="currentColor"/></svg>
                                            Edit Quote
                                        </button>
                                        <button class="gos-action-button gos-action-clone" data-action="clone">
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                                                <rect x="5" y="5" width="9" height="9" rx="1"/>
                                                <path d="M3 11V3a1 1 0 0 1 1-1h8"/>
                                            </svg>
                                            Clone Quote
                                        </button>
                                        <button class="gos-action-button gos-action-print" data-action="print">
                                            <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="5" width="10" height="6" fill="none" stroke="currentColor"/><path d="M4 5V2h8v3M4 11v3h8v-3" stroke="currentColor" fill="none"/></svg>
                                            Print Quote
                                        </button>
                                        <button class="gos-action-button gos-action-email" data-action="email">
                                            <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="8" fill="none" stroke="currentColor"/><path d="M2 4l6 4 6-4" stroke="currentColor" fill="none"/></svg>
                                            Send Email
                                        </button>
                                        <button class="gos-action-button gos-action-delete" data-action="delete">
                                            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 4h10M5 4V2h6v2M5 6v6M8 6v6M11 6v6" stroke="currentColor" fill="none"/></svg>
                                            Delete Quote
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(html);
        }

        getPriceBreakdownHTML() {
            const basePrice = 250; // £250/m²
            const area = (this.quote.width || 1) * (this.quote.height || 1);
            const baseTotal = basePrice * area;

            // Material multipliers
            const materialMultipliers = {
                'uPVC': 1.0,
                'Aluminium': 1.4,
                'Timber': 1.6,
                'Composite': 1.5
            };
            const material = this.quote.material || 'uPVC';
            const materialMultiplier = materialMultipliers[material] || 1.0;
            const materialCost = baseTotal * (materialMultiplier - 1);

            // Glazing add-ons
            const glazingCosts = {
                'Double': 0,
                'Triple': 50 * area,
                'Acoustic': 75 * area
            };
            const glazing = this.quote.glazing_type || 'Double';
            const glazingCost = glazingCosts[glazing] || 0;

            const total = baseTotal * materialMultiplier + glazingCost;

            return `
                <table class="gos-price-table">
                    <tbody>
                        <tr>
                            <td>Base Price (£${basePrice}/m² × ${area.toFixed(2)}m²)</td>
                            <td class="gos-price-amount">£${baseTotal.toFixed(2)}</td>
                        </tr>
                        ${materialCost > 0 ? `
                        <tr>
                            <td>${material} Material (${((materialMultiplier - 1) * 100).toFixed(0)}% premium)</td>
                            <td class="gos-price-amount">£${materialCost.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        ${glazingCost > 0 ? `
                        <tr>
                            <td>${glazing} Glazing</td>
                            <td class="gos-price-amount">£${glazingCost.toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr class="gos-price-total">
                            <td><strong>Total Price</strong></td>
                            <td class="gos-price-amount"><strong>£${total.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        render3DPreview() {
            const width = this.quote.width || 1;
            const height = this.quote.height || 1;
            const color = this.quote.frame_color || '#ffffff';
            
            // Scale for display (max 300px)
            const scale = Math.min(250 / Math.max(width, height), 150);
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;
            
            return `
                <svg width="300" height="300" viewBox="0 0 300 300" class="gos-preview-svg">
                    <!-- Background -->
                    <rect width="300" height="300" fill="#f0f4f8"/>
                    
                    <!-- Window Frame -->
                    <g transform="translate(${150 - scaledWidth/2}, ${150 - scaledHeight/2})">
                        <!-- Outer frame -->
                        <rect x="0" y="0" 
                              width="${scaledWidth}" 
                              height="${scaledHeight}" 
                              fill="${color}" 
                              stroke="#333" 
                              stroke-width="2"/>
                        
                        <!-- Glass (inner) -->
                        <rect x="10" y="10" 
                              width="${scaledWidth - 20}" 
                              height="${scaledHeight - 20}" 
                              fill="rgba(135, 206, 235, 0.3)" 
                              stroke="#666" 
                              stroke-width="1"/>
                        
                        <!-- Mullion (vertical divider) -->
                        <line x1="${scaledWidth/2}" y1="10" 
                              x2="${scaledWidth/2}" y2="${scaledHeight - 10}" 
                              stroke="#666" 
                              stroke-width="2"/>
                        
                        <!-- Transom (horizontal divider) -->
                        <line x1="10" y1="${scaledHeight/2}" 
                              x2="${scaledWidth - 10}" y2="${scaledHeight/2}" 
                              stroke="#666" 
                              stroke-width="2"/>
                    </g>
                    
                    <!-- Dimensions -->
                    <text x="150" y="285" text-anchor="middle" font-size="12" fill="#666">
                        ${width.toFixed(2)}m × ${height.toFixed(2)}m
                    </text>
                </svg>
            `;
        }

        attachEventListeners() {
            const $modal = $('#gos-quote-preview-modal');

            // Close modal
            $modal.on('click', '#gos-close-preview', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.close();
            });
            
            $modal.on('click', '.gos-preview-overlay', (e) => {
                if (e.target === e.currentTarget) {
                    this.close();
                }
            });

            // Navigation
            $modal.on('click', '#gos-prev-quote', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.navigateQuote(-1);
            });
            
            $modal.on('click', '#gos-next-quote', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.navigateQuote(1);
            });

            // Action buttons
            $modal.on('click', '.gos-action-button', (e) => {
                e.stopPropagation();
                const action = $(e.currentTarget).data('action');
                this.handleAction(action);
            });

            // Notes editing
            $modal.on('click', '#gos-edit-notes-btn', (e) => {
                e.stopPropagation();
                $('#gos-notes-display').hide();
                $('#gos-notes-editor').show();
                $('#gos-notes-textarea').focus();
            });

            $modal.on('click', '#gos-notes-cancel', (e) => {
                e.stopPropagation();
                $('#gos-notes-editor').hide();
                $('#gos-notes-display').show();
            });

            $modal.on('click', '#gos-notes-save', async (e) => {
                e.stopPropagation();
                const notes = $('#gos-notes-textarea').val().trim();
                await this.saveNotes(notes);
            });

            // Status segment click - inline status changer
            $modal.on('click', '.gos-status-segment', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const $btn = $(e.currentTarget);
                const quoteId = parseInt($btn.data('quote-id'));
                const statusType = $btn.data('status-type');
                const currentStatus = $btn.data('current-status');
                
                this.quotesManager.showInlineStatusSelector($btn, quoteId, statusType, currentStatus);
            });

            // Quick actions (catch-all for data-action buttons)
            $modal.on('click', '[data-action]', (e) => {
                e.stopPropagation();
                const action = $(e.currentTarget).data('action');
                this.handleAction(action);
            });

            // Keyboard shortcuts
            $(document).on('keydown.quotePreview', (e) => {
                if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === 'ArrowLeft' && this.currentIndex > 0) {
                    this.navigateQuote(-1);
                } else if (e.key === 'ArrowRight' && this.currentIndex < this.allQuotes.length - 1) {
                    this.navigateQuote(1);
                } else if (e.key === 'p' && e.ctrlKey) {
                    e.preventDefault();
                    this.handleAction('print');
                }
            });
        }

        navigateQuote(direction) {
            const newIndex = this.currentIndex + direction;
            if (newIndex < 0 || newIndex >= this.allQuotes.length) return;

            this.currentIndex = newIndex;
            this.quote = this.allQuotes[newIndex];
            
            // Clean up old keyboard listeners and modal
            $(document).off('keydown.quotePreview');
            $('#gos-quote-preview-modal').remove();
            
            // Render new one
            this.render();
            this.attachEventListeners();
            setTimeout(() => $('#gos-quote-preview-modal').addClass('show'), 10);
        }

        async handleAction(action) {
            switch (action) {
                case 'edit':
                    this.close();
                    window.selectedJobId = this.quote.id;
                    $(document).trigger('gsa:activate:panel', ['quote-detail']);
                    break;

                case 'clone':
                    this.close();
                    await this.quotesManager.cloneQuote(this.quote.id);
                    break;

                case 'status':
                    this.showStatusChangeDialog();
                    break;

                case 'print':
                    window.print();
                    break;

                case 'email':
                    this.quotesManager.showNotification('Email feature coming soon', 'info');
                    break;

                case 'delete':
                    this.close();
                    await this.quotesManager.deleteQuote(this.quote.id);
                    break;
            }
        }

        async saveNotes(notes) {
            try {
                const $saveBtn = $('#gos-notes-save');
                $saveBtn.prop('disabled', true).text('Saving...');

                // Update quote with new notes
                const result = await this.quotesManager.api.updateQuote(this.quote.id, { notes });

                if (result.success) {
                    // Update local quote object
                    this.quote.notes = notes;

                    // Update display
                    const displayHTML = notes ? notes.replace(/\n/g, '<br>') : '<em style="color: #9ca3af;">No notes added yet. Click edit to add notes...</em>';
                    $('#gos-notes-display').html(displayHTML);

                    // Hide editor, show display
                    $('#gos-notes-editor').hide();
                    $('#gos-notes-display').show();

                    this.quotesManager.showNotification('✅ Notes saved successfully', 'success');

                    // Refresh quotes list to show updated data
                    await this.quotesManager.loadQuotes();
                } else {
                    throw new Error(result.message || 'Failed to save notes');
                }
            } catch (error) {
                console.error('Save notes error:', error);
                this.quotesManager.showNotification(`❌ Failed to save notes: ${error.message}`, 'error');
            } finally {
                $('#gos-notes-save').prop('disabled', false).text('Save Notes');
            }
        }

        showStatusChangeDialog() {
            const html = `
                <div class="gos-status-dialog">
                    <h4>Change Quote Status</h4>
                    <div class="gos-status-options">
                        <div class="gos-status-group">
                            <label class="gos-status-group-label">Lead Status</label>
                            ${CONFIG.STATUSES.lead.map(status => `
                                <button class="gos-status-option ${this.quote.lead_status === status.value ? 'active' : ''}" 
                                        data-type="lead" 
                                        data-value="${status.value}"
                                        style="border-color: ${status.color}">
                                    <span class="gos-status-dot" style="background: ${status.color}"></span>
                                    ${status.label}
                                </button>
                            `).join('')}
                        </div>
                        <div class="gos-status-group">
                            <label class="gos-status-group-label">Install Status</label>
                            ${CONFIG.STATUSES.install.map(status => `
                                <button class="gos-status-option ${this.quote.install_status === status.value ? 'active' : ''}" 
                                        data-type="install" 
                                        data-value="${status.value}"
                                        style="border-color: ${status.color}">
                                    <span class="gos-status-dot" style="background: ${status.color}"></span>
                                    ${status.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            $('.gos-preview-body').prepend(html);

            // Handle status change
            $('.gos-status-option').on('click', async (e) => {
                const $btn = $(e.currentTarget);
                const type = $btn.data('type');
                const value = $btn.data('value');

                const result = await this.quotesManager.api.updateQuote(this.quote.id, {
                    [type === 'lead' ? 'lead_status' : 'install_status']: value
                });

                if (result.success) {
                    this.quotesManager.showNotification('Status updated', 'success');
                    this.quotesManager.refresh();
                    this.close();
                } else {
                    this.quotesManager.showNotification('Failed to update status', 'error');
                }
            });
        }
    }

    /**
     * ========================================
     * 3D PRICING WIZARD MODAL
     * ========================================
     */
    class PricingWizardModal {
        constructor(quotesManager) {
            this.quotesManager = quotesManager;
            this.step = 1;
            this.config = {
                productType: 'uPVC Windows',
                material: 'uPVC',
                width: 1.5,
                height: 1.2,
                color: '#FFFFFF',
                glazingType: 'Double Glazed',
                frameStyle: 'Casement',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: ''
            };
            this.basePrice = 250; // £250 per sqm
            this._3dScene = null;
            this._3dCamera = null;
            this._3dRenderer = null;
            this._3dMesh = null;
            this._3dAnimId = null;
        }

        open() {
            this.render();
            this.attachHandlers();
            setTimeout(() => {
                $('#gos-pricing-wizard').addClass('show');
                this.renderProductThumbnails();
            }, 10);
        }

        close() {
            this.stop3D();
            $('#gos-pricing-wizard').removeClass('show');
            setTimeout(() => {
                $('#gos-pricing-wizard').remove();
            }, 300);
        }

        calculatePrice() {
            const area = this.config.width * this.config.height;
            let price = area * this.basePrice;
            
            // Material multipliers
            const materialMultipliers = {
                'uPVC': 1.0,
                'Aluminium': 1.4,
                'Timber': 1.6,
                'Composite': 1.5
            };
            
            price *= materialMultipliers[this.config.material] || 1.0;
            
            // Glazing add-ons
            if (this.config.glazingType === 'Triple Glazed') {
                price += area * 50;
            } else if (this.config.glazingType === 'Acoustic Glazed') {
                price += area * 75;
            }
            
            return price.toFixed(2);
        }

        render() {
            const html = `
                <div id="gos-pricing-wizard" class="gos-pricing-wizard">
                    <div class="gos-wizard-overlay" id="gos-wizard-overlay"></div>
                    <div class="gos-wizard-container">
                        <div class="gos-wizard-header">
                            <h2>3D Pricing Wizard</h2>
                            <button class="gos-wizard-close" id="gos-wizard-close" aria-label="Close">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="gos-wizard-progress">
                            <div class="gos-progress-step ${this.step >= 1 ? 'active' : ''}" data-step="1">
                                <div class="gos-progress-circle">1</div>
                                <span>Product</span>
                            </div>
                            <div class="gos-progress-line ${this.step >= 2 ? 'active' : ''}"></div>
                            <div class="gos-progress-step ${this.step >= 2 ? 'active' : ''}" data-step="2">
                                <div class="gos-progress-circle">2</div>
                                <span>Configure</span>
                            </div>
                            <div class="gos-progress-line ${this.step >= 3 ? 'active' : ''}"></div>
                            <div class="gos-progress-step ${this.step >= 3 ? 'active' : ''}" data-step="3">
                                <div class="gos-progress-circle">3</div>
                                <span>Customer</span>
                            </div>
                        </div>
                        
                        <div class="gos-wizard-body" id="gos-wizard-body">
                            ${this.renderStep()}
                        </div>
                        
                        <div class="gos-wizard-footer">
                            <div class="gos-wizard-price">
                                <span class="gos-price-label">Estimated Price:</span>
                                <span class="gos-price-value">£${this.calculatePrice()}</span>
                            </div>
                            <div class="gos-wizard-actions">
                                ${this.step > 1 ? '<button class="gos-button-secondary" id="gos-wizard-prev">Previous</button>' : ''}
                                ${this.step < 3 ? '<button class="gos-button-primary" id="gos-wizard-next">Next Step</button>' : 
                                  '<button class="gos-button-primary" id="gos-wizard-submit">Create Quote</button>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(html);
            this.inject3DStyles();
        }

        renderStep() {
            switch (this.step) {
                case 1:
                    return this.renderStep1_ProductSelection();
                case 2:
                    return this.renderStep2_Configuration();
                case 3:
                    return this.renderStep3_Customer();
                default:
                    return '';
            }
        }

        renderStep1_ProductSelection() {
            const products = [
                'Composite Doors', 'uPVC Windows', 'Sash Windows', 'Aluminium Windows',
                'uPVC Doors', 'uPVC French Doors', 'uPVC Sliding Patio Doors', 'Aluminium Bifolding Doors',
                'Aluminium Sliding Patio Doors', 'Heritage Aluminium Doors', 'Aluminium Doors',
                'Slide & Fold Doors', 'Replacement Glazed Units'
            ];
            return `
                <div class="gos-wizard-step">
                    <h3>Choose your product to get a free, no-obligation quote</h3>
                    <div class="gos-product-grid">
                        ${products.map(type => `
                            <div class="gos-product-card ${this.config.productType === type ? 'selected' : ''}" 
                                 data-product="${type}">
                                <div class="gos-product-icon" data-product-thumb="${type}"></div>
                                <div class="gos-product-name">${type}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        renderStep2_Configuration() {
            return `
                <div class="gos-wizard-step gos-wizard-step-2col">
                    <!-- 3D Preview Column -->
                    <div class="gos-3d-preview">
                        <div class="gos-3d-canvas" id="gos-3d-canvas">
                            ${this.render3DPreview()}
                        </div>
                        <div class="gos-preview-info">
                            <strong>${this.config.productType}</strong> - 
                            ${this.config.width.toFixed(2)}m × ${this.config.height.toFixed(2)}m
                            (${(this.config.width * this.config.height).toFixed(2)}m²)
                        </div>
                    </div>
                    
                    <!-- Configuration Column -->
                    <div class="gos-config-panel">
                        <h3>Configure Your ${this.config.productType}</h3>
                        
                        <div class="gos-config-group">
                            <label>Material</label>
                            <select id="gos-material" class="gos-config-input">
                                ${['uPVC', 'Aluminium', 'Timber', 'Composite'].map(mat => 
                                    `<option value="${mat}" ${this.config.material === mat ? 'selected' : ''}>${mat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Width (meters)</label>
                            <input type="range" id="gos-width" min="0.5" max="3.0" step="0.1" 
                                   value="${this.config.width}" class="gos-config-range">
                            <input type="number" id="gos-width-input" min="0.5" max="3.0" step="0.1" 
                                   value="${this.config.width}" class="gos-config-number">
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Height (meters)</label>
                            <input type="range" id="gos-height" min="0.5" max="3.0" step="0.1" 
                                   value="${this.config.height}" class="gos-config-range">
                            <input type="number" id="gos-height-input" min="0.5" max="3.0" step="0.1" 
                                   value="${this.config.height}" class="gos-config-number">
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Frame Color</label>
                            <div class="gos-color-picker">
                                <input type="color" id="gos-color" value="${this.config.color}" class="gos-config-color">
                                <div class="gos-color-presets">
                                    ${['#FFFFFF', '#000000', '#8B4513', '#708090', '#2F4F4F'].map(color => 
                                        `<button class="gos-color-preset" data-color="${color}" 
                                                style="background-color: ${color}" title="${color}"></button>`
                                    ).join('')}
                                </div>
                            </div>
                        </div>
                        
                        <div class="gos-config-group">
                            <label>Glazing Type</label>
                            <select id="gos-glazing" class="gos-config-input">
                                ${['Double Glazed', 'Triple Glazed', 'Acoustic Glazed'].map(glaz => 
                                    `<option value="${glaz}" ${this.config.glazingType === glaz ? 'selected' : ''}>${glaz}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        ${this.config.productType === 'Window' ? `
                            <div class="gos-config-group">
                                <label>Frame Style</label>
                                <select id="gos-frame-style" class="gos-config-input">
                                    ${['Casement', 'Sash', 'Tilt & Turn', 'Bay'].map(style => 
                                        `<option value="${style}" ${this.config.frameStyle === style ? 'selected' : ''}>${style}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        renderStep3_Customer() {
            return `
                <div class="gos-wizard-step">
                    <h3>Customer Information</h3>
                    <div class="gos-customer-form">
                        <div class="gos-form-row">
                            <div class="gos-form-field">
                                <label for="gos-first-name">First Name *</label>
                                <input type="text" id="gos-first-name" value="${this.config.firstName}" required>
                            </div>
                            <div class="gos-form-field">
                                <label for="gos-last-name">Last Name *</label>
                                <input type="text" id="gos-last-name" value="${this.config.lastName}" required>
                            </div>
                        </div>
                        
                        <div class="gos-form-row">
                            <div class="gos-form-field">
                                <label for="gos-email">Email *</label>
                                <input type="email" id="gos-email" value="${this.config.email}" required>
                            </div>
                            <div class="gos-form-field">
                                <label for="gos-phone">Phone *</label>
                                <input type="tel" id="gos-phone" value="${this.config.phone}" required>
                            </div>
                        </div>
                        
                        <div class="gos-form-field">
                            <label for="gos-address">Installation Address</label>
                            <textarea id="gos-address" rows="3">${this.config.address}</textarea>
                        </div>
                        
                        <div class="gos-quote-summary">
                            <h4>Quote Summary</h4>
                            <div class="gos-summary-row">
                                <span>Product:</span>
                                <strong>${this.config.productType}</strong>
                            </div>
                            <div class="gos-summary-row">
                                <span>Material:</span>
                                <strong>${this.config.material}</strong>
                            </div>
                            <div class="gos-summary-row">
                                <span>Dimensions:</span>
                                <strong>${this.config.width.toFixed(2)}m × ${this.config.height.toFixed(2)}m</strong>
                            </div>
                            <div class="gos-summary-row">
                                <span>Glazing:</span>
                                <strong>${this.config.glazingType}</strong>
                            </div>
                            <div class="gos-summary-row gos-summary-total">
                                <span>Total Price:</span>
                                <strong>£${this.calculatePrice()}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        render3DPreview() {
            // Placeholder container; actual Three.js canvas is injected by init3DPreview()
            return `<div id="gos-3d-live-canvas" style="width:100%;height:100%;min-height:300px;"></div>`;
        }

        init3DPreview() {
            const container = document.getElementById('gos-3d-live-canvas');
            if (!container || !window.THREE || !window.GOSBuilders) return;
            this.stop3D();

            const w = container.clientWidth || 400;
            const h = container.clientHeight || 400;

            this._3dScene = new THREE.Scene();
            this._3dCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
            this._3dRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this._3dRenderer.setSize(w, h);
            this._3dRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            container.innerHTML = '';
            container.appendChild(this._3dRenderer.domElement);

            // lighting
            var dLight = new THREE.DirectionalLight(0xffffff, 0.9);
            dLight.position.set(3, 4, 5);
            this._3dScene.add(dLight);
            this._3dScene.add(new THREE.AmbientLight(0xffffff, 0.5));

            this.update3DModel();

            const self = this;
            (function loop() {
                if (!self._3dRenderer) return;
                if (self._3dMesh) self._3dMesh.rotation.y += 0.005;
                self._3dRenderer.render(self._3dScene, self._3dCamera);
                self._3dAnimId = requestAnimationFrame(loop);
            })();
        }

        update3DModel() {
            if (!this._3dScene) return;
            if (this._3dMesh) this._3dScene.remove(this._3dMesh);

            const builder = window.GOSBuilders.getBuilder(this.config.productType);
            if (!builder) return;

            const isDoor = this.config.productType.toLowerCase().indexOf('door') !== -1;
            const colorHex = parseInt(this.config.color.replace('#', ''), 16);
            const isAluminium = this.config.productType.indexOf('Aluminium') !== -1;

            this._3dMesh = builder({
                width: this.config.width,
                height: this.config.height,
                frameDepth: 0.07,
                frameThk: 0.045,
                frameColor: isAluminium ? 0x3a3a3a : (colorHex || 0xffffff),
                glassColor: 0xADD8E6,
                handleColor: 0x808080
            });

            this._3dScene.add(this._3dMesh);

            // auto-fit camera
            var box = new THREE.Box3().setFromObject(this._3dMesh);
            var center = box.getCenter(new THREE.Vector3());
            var bSize = box.getSize(new THREE.Vector3());
            var maxDim = Math.max(bSize.x, bSize.y, bSize.z);
            this._3dCamera.position.set(center.x, center.y, center.z + maxDim * 1.8);
            this._3dCamera.lookAt(center);
        }

        stop3D() {
            if (this._3dAnimId) cancelAnimationFrame(this._3dAnimId);
            if (this._3dRenderer) {
                this._3dRenderer.dispose();
                this._3dRenderer = null;
            }
            this._3dScene = null;
            this._3dMesh = null;
            this._3dAnimId = null;
        }

        renderProductThumbnails() {
            if (!window.GOSBuilders || !window.GOSBuilders.renderThumbnail) return;
            document.querySelectorAll('[data-product-thumb]').forEach(el => {
                const name = el.getAttribute('data-product-thumb');
                try {
                    const canvas = window.GOSBuilders.renderThumbnail(name, 140);
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    el.innerHTML = '';
                    el.appendChild(canvas);
                } catch (e) {
                    console.warn('Thumbnail failed for', name, e);
                    el.textContent = name.charAt(0);
                }
            });
        }

        getProductIcon(type) {
            // Fallback only - thumbnails are rendered by renderProductThumbnails()
            return '<span class="gos-product-emoji" style="font-size:2rem;color:#4e73df;">' + (type.charAt(0) || '?') + '</span>';
        }

        attachHandlers() {
            const $ = jQuery;
            
            // Close button
            $(document).on('click', '#gos-wizard-close, #gos-wizard-overlay', () => {
                if (confirm('Close wizard? Your progress will be lost.')) {
                    this.close();
                }
            });
            
            // Product selection
            $(document).on('click', '.gos-product-card', (e) => {
                const product = $(e.currentTarget).data('product');
                this.config.productType = product;
                this.updateStep();
            });
            
            // Configuration inputs - update 3D model without full re-render
            $(document).on('input', '#gos-width', (e) => {
                this.config.width = parseFloat(e.target.value);
                $('#gos-width-input').val(this.config.width);
                this.updateConfigPreview();
            });
            
            $(document).on('input', '#gos-width-input', (e) => {
                this.config.width = parseFloat(e.target.value);
                $('#gos-width').val(this.config.width);
                this.updateConfigPreview();
            });
            
            $(document).on('input', '#gos-height', (e) => {
                this.config.height = parseFloat(e.target.value);
                $('#gos-height-input').val(this.config.height);
                this.updateConfigPreview();
            });
            
            $(document).on('input', '#gos-height-input', (e) => {
                this.config.height = parseFloat(e.target.value);
                $('#gos-height').val(this.config.height);
                this.updateConfigPreview();
            });
            
            $(document).on('input change', '#gos-color', (e) => {
                this.config.color = e.target.value;
                this.updateConfigPreview();
            });
            
            $(document).on('click', '.gos-color-preset', (e) => {
                this.config.color = $(e.currentTarget).data('color');
                $('#gos-color').val(this.config.color);
                this.updateConfigPreview();
            });
            
            $(document).on('change', '#gos-material', (e) => {
                this.config.material = e.target.value;
                this.updateConfigPreview();
            });
            
            $(document).on('change', '#gos-glazing', (e) => {
                this.config.glazingType = e.target.value;
                this.updateConfigPreview();
            });
            
            $(document).on('change', '#gos-frame-style', (e) => {
                this.config.frameStyle = e.target.value;
            });
            
            // Customer inputs
            $(document).on('input', '#gos-first-name', (e) => this.config.firstName = e.target.value);
            $(document).on('input', '#gos-last-name', (e) => this.config.lastName = e.target.value);
            $(document).on('input', '#gos-email', (e) => this.config.email = e.target.value);
            $(document).on('input', '#gos-phone', (e) => this.config.phone = e.target.value);
            $(document).on('input', '#gos-address', (e) => this.config.address = e.target.value);
            
            // Navigation
            $(document).on('click', '#gos-wizard-next', () => {
                this.step++;
                this.updateStep();
            });
            
            $(document).on('click', '#gos-wizard-prev', () => {
                this.step--;
                this.updateStep();
            });
            
            // Submit
            $(document).on('click', '#gos-wizard-submit', () => {
                this.submitQuote();
            });
        }

        updateStep() {
            $('#gos-wizard-body').html(this.renderStep());
            $('.gos-wizard-price .gos-price-value').text('£' + this.calculatePrice());
            
            // Update progress
            $('.gos-progress-step').removeClass('active');
            $('.gos-progress-line').removeClass('active');
            for (let i = 1; i <= this.step; i++) {
                $(`.gos-progress-step[data-step="${i}"]`).addClass('active');
                if (i < this.step) {
                    $(`.gos-progress-line:nth-of-type(${i * 2})`).addClass('active');
                }
            }
            
            // Update buttons
            const $footer = $('.gos-wizard-actions');
            $footer.html(`
                ${this.step > 1 ? '<button class="gos-button-secondary" id="gos-wizard-prev">Previous</button>' : ''}
                ${this.step < 3 ? '<button class="gos-button-primary" id="gos-wizard-next">Next Step</button>' : 
                  '<button class="gos-button-primary" id="gos-wizard-submit">Create Quote</button>'}
            `);

            // Render Three.js product thumbnails for step 1
            if (this.step === 1) {
                this.stop3D();
                setTimeout(() => this.renderProductThumbnails(), 50);
            }
            // Initialize 3D preview for step 2
            if (this.step === 2) {
                setTimeout(() => this.init3DPreview(), 50);
            } else {
                this.stop3D();
            }
        }

        updateConfigPreview() {
            // Update the 3D model and price without re-rendering the full step HTML
            this.update3DModel();
            $('.gos-wizard-price .gos-price-value').text('£' + this.calculatePrice());
            // Update preview info text
            $('.gos-preview-info').html(
                '<strong>' + this.config.productType + '</strong> - ' +
                this.config.width.toFixed(2) + 'm × ' + this.config.height.toFixed(2) + 'm (' +
                (this.config.width * this.config.height).toFixed(2) + 'm²)'
            );
        }

        async submitQuote() {
            // Validation
            if (!this.config.firstName || !this.config.lastName || !this.config.email || !this.config.phone) {
                alert('Please fill in all required customer fields');
                return;
            }
            
            const quoteData = {
                first_name: this.config.firstName,
                last_name: this.config.lastName,
                email: this.config.email,
                phone: this.config.phone,
                address: this.config.address,
                type: this.config.productType,
                material: this.config.material,
                width: this.config.width,
                height: this.config.height,
                price: this.calculatePrice(),
                lead_status: 'New',
                install_status: 'Pending',
                notes: `Glazing: ${this.config.glazingType}\nFrame Color: ${this.config.color}${this.config.frameStyle ? `\nStyle: ${this.config.frameStyle}` : ''}`,
                date: new Date().toISOString()
            };
            
            try {
                const response = await fetch('/wp-json/glazieros/v1/quote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': wpApiSettings.nonce
                    },
                    body: JSON.stringify(quoteData)
                });
                
                if (!response.ok) throw new Error('Failed to create quote');
                
                const result = await response.json();
                
                // Extract ID from WordPress post object
                const quoteId = result.id || result.ID || result.post_id;
                
                this.close();
                this.quotesManager.showNotification('Quote created successfully!', 'success');
                jQuery(document).trigger('gsa:data:updated', ['quote', quoteId]);
                this.quotesManager.refresh();
                
            } catch (error) {
                console.error('Error creating quote:', error);
                alert('Failed to create quote. Please try again.');
            }
        }

        inject3DStyles() {
            if ($('#gos-wizard-styles').length) return;
            
            const css = `
                .gos-pricing-wizard {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 100000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                
                .gos-pricing-wizard.show {
                    opacity: 1;
                    pointer-events: all;
                }
                
                .gos-wizard-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                }
                
                .gos-wizard-container {
                    position: relative;
                    width: 90%;
                    max-width: 1200px;
                    max-height: 90vh;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                
                .gos-wizard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
                    color: #fff;
                }
                
                .gos-wizard-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                
                .gos-wizard-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: #fff;
                    padding: 0.5rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .gos-wizard-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .gos-wizard-progress {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background: #f8f9fa;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-progress-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    color: #6c757d;
                    transition: color 0.3s;
                }
                
                .gos-progress-step.active {
                    color: #4e73df;
                }
                
                .gos-progress-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #e1e4e8;
                    color: #6c757d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    transition: all 0.3s;
                }
                
                .gos-progress-step.active .gos-progress-circle {
                    background: #4e73df;
                    color: #fff;
                    transform: scale(1.1);
                }
                
                .gos-progress-line {
                    width: 80px;
                    height: 2px;
                    background: #e1e4e8;
                    transition: background 0.3s;
                }
                
                .gos-progress-line.active {
                    background: #4e73df;
                }
                
                .gos-wizard-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                }
                
                .gos-wizard-step h3 {
                    margin: 0 0 1.5rem 0;
                    color: #2c3e50;
                    font-size: 1.25rem;
                }
                
                .gos-product-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 1.25rem;
                    padding: 0.5rem;
                }
                
                .gos-product-card {
                    padding: 1rem 0.75rem;
                    border: 2px solid #e1e4e8;
                    border-radius: 8px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: #fff;
                }
                
                .gos-product-card:hover {
                    border-color: #4e73df;
                    box-shadow: 0 4px 12px rgba(78, 115, 223, 0.1);
                    transform: translateY(-2px);
                }
                
                .gos-product-card.selected {
                    border-color: #4e73df;
                    background: #f0f4ff;
                }
                
                .gos-product-icon {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 0.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                
                .gos-product-icon canvas {
                    display: block;
                    max-width: 100%;
                    max-height: 100%;
                }
                
                .gos-product-emoji {
                    font-size: 2rem;
                    color: #4e73df;
                }
                
                .gos-product-name {
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .gos-wizard-step-2col {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 2rem;
                }
                
                .gos-3d-preview {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 8px;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                
                .gos-3d-canvas {
                    width: 100%;
                    aspect-ratio: 1;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                    overflow: hidden;
                }
                
                .gos-3d-canvas canvas {
                    display: block;
                    max-width: 100%;
                    max-height: 100%;
                }
                
                .gos-3d-svg {
                    width: 100%;
                    height: 100%;
                }
                
                .gos-3d-rotate-hint {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 0.875rem;
                    text-align: center;
                }
                
                .gos-preview-info {
                    color: #fff;
                    text-align: center;
                }
                
                .gos-config-panel {
                    overflow-y: auto;
                }
                
                .gos-config-group {
                    margin-bottom: 1.5rem;
                }
                
                .gos-config-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #495057;
                    font-size: 0.875rem;
                }
                
                .gos-config-input,
                .gos-config-range,
                .gos-config-number {
                    width: 100%;
                    padding: 0.625rem 1rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    font-size: 0.875rem;
                }
                
                .gos-config-range {
                    padding: 0;
                    margin-bottom: 0.5rem;
                }
                
                .gos-color-picker {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .gos-config-color {
                    width: 100%;
                    height: 40px;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    cursor: pointer;
                }
                
                .gos-color-presets {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .gos-color-preset {
                    width: 32px;
                    height: 32px;
                    border: 2px solid #e1e4e8;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .gos-color-preset:hover {
                    border-color: #4e73df;
                    transform: scale(1.1);
                }
                
                .gos-customer-form {
                    max-width: 600px;
                    margin: 0 auto;
                }
                
                .gos-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .gos-form-field {
                    display: flex;
                    flex-direction: column;
                }
                
                .gos-form-field label {
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #495057;
                    font-size: 0.875rem;
                }
                
                .gos-form-field input,
                .gos-form-field textarea {
                    padding: 0.625rem 1rem;
                    border: 1px solid #e1e4e8;
                    border-radius: 6px;
                    font-size: 0.875rem;
                }
                
                .gos-quote-summary {
                    margin-top: 2rem;
                    padding: 1.5rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                }
                
                .gos-quote-summary h4 {
                    margin: 0 0 1rem 0;
                    color: #2c3e50;
                }
                
                .gos-summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #e1e4e8;
                }
                
                .gos-summary-total {
                    border-bottom: none;
                    padding-top: 1rem;
                    font-size: 1.125rem;
                    color: #4e73df;
                }
                
                .gos-wizard-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    background: #f8f9fa;
                    border-top: 1px solid #e1e4e8;
                }
                
                .gos-wizard-price {
                    display: flex;
                    flex-direction: column;
                }
                
                .gos-price-label {
                    font-size: 0.875rem;
                    color: #6c757d;
                }
                
                .gos-price-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #28a745;
                }
                
                .gos-wizard-actions {
                    display: flex;
                    gap: 1rem;
                }
                
                @media (max-width: 968px) {
                    .gos-wizard-step-2col {
                        grid-template-columns: 1fr;
                    }
                    
                    .gos-wizard-container {
                        width: 95%;
                        max-height: 95vh;
                    }
                }
            `;
            
            $('<style id="gos-wizard-styles"></style>').text(css).appendTo('head');
        }
    }

    /**
     * ========================================
     * INITIALIZATION
     * ========================================
     */
    $(document).on('gsa:panel:activated', (e, tab) => {
        console.log('Panel activated:', tab);
        if (tab !== 'quotes' && tab !== 'quotes-v2') return;

        const $panel = $('#gsa-quotes');
        console.log('Panel found:', $panel.length);
        
        // Initialize manager if not already done
        if (!$panel.data('quotesManager')) {
            console.log('Initializing QuotesManager...');
            const manager = new QuotesManager($panel);
            $panel.data('quotesManager', manager);
            manager.init();
        } else {
            // Refresh data when panel is re-activated
            console.log('Refreshing quotes...');
            $panel.data('quotesManager').refresh();
        }
    });

    // Listen for data updates from other panels
    $(document).on('gsa:data:updated', (e, type, id) => {
        if (type === 'quote') {
            const $panel = $('#gsa-quotes');
            const manager = $panel.data('quotesManager');
            if (manager && $panel.is(':visible')) {
                manager.refresh();
            }
        }
    });

})(jQuery, window, document);
