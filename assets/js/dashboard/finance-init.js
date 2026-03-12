/**
 * GlazierOS Finance Module - Initialization
 * 
 * Sets up the Finance panel HTML structure when activated
 * 
 * @package    GlazierOS
 * @subpackage Finance
 * @version    0.6.0
 */

(function($) {
    'use strict';
    
    // Initialize Finance Panel HTML on first activation
    $(document).on('gsa:panel:activated', function(e, panelId) {
        if (panelId !== 'invoices') return;
        
        const $panel = $('#gsa-invoices');
        
        // Only initialize once
        if ($panel.data('finance-initialized')) return;
        $panel.data('finance-initialized', true);
        
        console.log('💰 Initializing Finance Module UI...');
        
        // Build Finance Module HTML Structure
        const financeHTML = `
            <div id="gos-finance-container" class="gos-finance-dashboard">
                <!-- Header -->
                <div class="gos-finance-header">
                    <h1>Finance & Invoicing</h1>
                    <div class="gos-finance-header-actions">
                        <select class="gos-finance-date-filter">
                            <option value="this_month">This Month</option>
                            <option value="this_week">This Week</option>
                            <option value="today">Today</option>
                            <option value="this_year">This Year</option>
                            <option value="all">All Time</option>
                        </select>
                        <button class="gos-btn gos-btn-secondary gos-export-csv-btn">
                            Export CSV
                        </button>
                        <button class="gos-btn gos-btn-primary gos-new-invoice-btn">
                            + New Invoice
                        </button>
                        <button class="gos-btn gos-btn-secondary gos-new-expense-btn" style="display: none;">
                            + New Expense
                        </button>
                    </div>
                </div>
                
                <!-- Tabs -->
                <div class="gos-finance-tabs">
                    <button class="gos-finance-tab active" data-tab="invoices">Invoices</button>
                    <button class="gos-finance-tab" data-tab="expenses">Expenses</button>
                    <button class="gos-finance-tab" data-tab="payments">Payments</button>
                </div>
                
                <!-- Analytics Metrics -->
                <div class="gos-finance-metrics">
                    <div class="gos-finance-loading">
                        <div class="gos-finance-spinner"></div>
                    </div>
                </div>
                
                <!-- Tab Content: Invoices -->
                <div id="gos-finance-tab-invoices" class="gos-finance-tab-content active">
                    <!-- Filters & Search -->
                    <div class="gos-finance-filters">
                        <div class="gos-finance-search">
                            <input type="text" placeholder="Search invoices..." />
                        </div>
                        <select class="gos-finance-status-filter">
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="viewed">Viewed</option>
                            <option value="paid">Paid</option>
                            <option value="partial">Partially Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    
                    <!-- Invoice Table -->
                    <div class="gos-finance-table-container">
                        <div class="gos-finance-loading">
                            <div class="gos-finance-spinner"></div>
                        </div>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="gos-finance-pagination"></div>
                </div>
                
                <!-- Tab Content: Expenses -->
                <div id="gos-finance-tab-expenses" class="gos-finance-tab-content">
                    <!-- Filters & Search -->
                    <div class="gos-finance-filters">
                        <div class="gos-finance-search">
                            <input type="text" placeholder="Search expenses..." />
                        </div>
                        <select class="gos-finance-category-filter">
                            <option value="all">All Categories</option>
                            <option value="materials">Materials</option>
                            <option value="fuel">Fuel</option>
                            <option value="tools">Tools & Equipment</option>
                            <option value="subcontractor">Subcontractor</option>
                            <option value="utilities">Utilities</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <!-- Expense Table -->
                    <div class="gos-expense-table-container">
                        <div class="gos-finance-loading">
                            <div class="gos-finance-spinner"></div>
                        </div>
                    </div>
                    
                    <!-- Pagination -->
                    <div class="gos-expense-pagination"></div>
                </div>
                
                <!-- Tab Content: Payments -->
                <div id="gos-finance-tab-payments" class="gos-finance-tab-content">
                    <div class="gos-finance-filters">
                        <div class="gos-finance-search">
                            <input type="text" placeholder="Search payments..." />
                        </div>
                    </div>
                    <div class="gos-payment-table-container">
                        <div class="gos-finance-loading">
                            <div class="gos-finance-spinner"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $panel.html(financeHTML);
        console.log('✅ Finance Module UI Ready');
        
        // Trigger a custom event to notify finance.js that UI is ready
        $(document).trigger('gos:finance:ui-ready');
    });
    
})(jQuery);
