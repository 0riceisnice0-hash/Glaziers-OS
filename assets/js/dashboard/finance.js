/**
 * GlazierOS Finance Module - Main JavaScript
 * 
 * Handles invoice management, payments, analytics, and financial operations
 * 
 * @package    GlazierOS
 * @subpackage Finance
 * @version    0.6.0
 */

(function($) {
    'use strict';

    // Finance Module State
    const FinanceApp = {
        currentView: 'invoices',
        currentTab: 'invoices',
        currentPage: 1,
        perPage: 20,
        filters: {
            search: '',
            status: 'all',
            dateRange: 'all',
            category: 'all'
        },
        invoices: [],
        expenses: [],
        analytics: null,
        
        /**
         * Initialize Finance Module
         */
        init() {
            console.log('🏦 Finance Module Initializing...');
            
            this.setupEventListeners();
            this.loadAnalytics();
            this.loadInvoices();
            
            console.log('✅ Finance Module Ready');
        },
        
        /**
         * Setup Event Listeners
         */
        setupEventListeners() {
            // Use document delegation since container might not exist yet
            const $container = $(document);
            
            // New Invoice Button
            $container.on('click', '.gos-new-invoice-btn', (e) => {
                e.preventDefault();
                console.log('🆕 New Invoice button clicked');
                this.showInvoiceModal();
            });
            
            // Search Input
            $container.on('input', '.gos-finance-search input', 
                this.debounce((e) => {
                    this.filters.search = $(e.target).val();
                    this.loadInvoices();
                }, 300)
            );
            
            // Status Filter
            $container.on('change', '.gos-finance-status-filter', (e) => {
                this.filters.status = $(e.target).val();
                this.loadInvoices();
            });
            
            // Date Range Filter
            $container.on('change', '.gos-finance-date-filter', (e) => {
                this.filters.dateRange = $(e.target).val();
                this.loadAnalytics();
            });
            
            // Export CSV
            $container.on('click', '.gos-export-csv-btn', (e) => {
                e.preventDefault();
                this.exportCSV();
            });
            
            // View Invoice
            $container.on('click', '.gos-view-invoice-btn', (e) => {
                e.preventDefault();
                const invoiceId = $(e.currentTarget).data('invoice-id');
                this.viewInvoice(invoiceId);
            });
            
            // Edit Invoice
            $container.on('click', '.gos-edit-invoice-btn', (e) => {
                e.preventDefault();
                const invoiceId = $(e.currentTarget).data('invoice-id');
                this.editInvoice(invoiceId);
            });
            
            // Delete Invoice
            $container.on('click', '.gos-delete-invoice-btn', (e) => {
                e.preventDefault();
                const invoiceId = $(e.currentTarget).data('invoice-id');
                this.deleteInvoice(invoiceId);
            });
            
            // Send Invoice
            $container.on('click', '.gos-send-invoice-btn', (e) => {
                e.preventDefault();
                const invoiceId = $(e.currentTarget).data('invoice-id');
                this.sendInvoice(invoiceId);
            });
            
            // Record Payment
            $container.on('click', '.gos-record-payment-btn', (e) => {
                e.preventDefault();
                const invoiceId = $(e.currentTarget).data('invoice-id');
                this.recordPayment(invoiceId);
            });
            
            // Generate PDF
            $container.on('click', '.gos-generate-pdf-btn', (e) => {
                e.preventDefault();
                const invoiceId = $(e.currentTarget).data('invoice-id');
                this.generatePDF(invoiceId);
            });
            
            // Tab Switching
            $container.on('click', '.gos-finance-tab', (e) => {
                e.preventDefault();
                const tab = $(e.currentTarget).data('tab');
                this.switchTab(tab);
            });
            
            // New Expense Button
            $container.on('click', '.gos-new-expense-btn', (e) => {
                e.preventDefault();
                this.showExpenseModal();
            });
            
            // Category Filter (for expenses)
            $container.on('change', '.gos-finance-category-filter', (e) => {
                this.filters.category = $(e.target).val();
                this.loadExpenses();
            });
            
            // Add Line Item
            $container.on('click', '.gos-finance-add-item', (e) => {
                e.preventDefault();
                this.addLineItem();
            });
            
            // Remove Line Item
            $container.on('click', '.gos-finance-line-item-remove', (e) => {
                e.preventDefault();
                $(e.currentTarget).closest('.gos-finance-line-item').remove();
                this.calculateTotals();
            });
            
            // Calculate totals on input change
            $container.on('input', '.gos-line-item-input', () => {
                this.calculateTotals();
            });
            
            // Modal Close
            $container.on('click', '.gos-finance-modal-close, .gos-finance-modal-overlay', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeModal();
                }
            });
            
            // Save Invoice
            $container.on('click', '.gos-save-invoice-btn', (e) => {
                e.preventDefault();
                this.saveInvoice();
            });
            
            // Pagination
            $container.on('click', '.gos-finance-page-btn', (e) => {
                e.preventDefault();
                const page = $(e.currentTarget).data('page');
                if (page && !$(e.currentTarget).hasClass('active')) {
                    this.currentPage = page;
                    this.loadInvoices();
                }
            });
        },
        
        /**
         * Load Analytics Data
         */
        async loadAnalytics() {
            try {
                const dateRange = this.getDateRange(this.filters.dateRange);
                
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/finance/analytics',
                    method: 'GET',
                    data: dateRange,
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.analytics = response;
                this.renderAnalytics();
                
            } catch (error) {
                console.error('Failed to load analytics:', error);
                this.showNotification('Failed to load analytics', 'error');
            }
        },
        
        /**
         * Switch Tab
         */
        switchTab(tab) {
            this.currentTab = tab;
            
            // Update tab buttons
            $('.gos-finance-tab').removeClass('active');
            $(`.gos-finance-tab[data-tab="${tab}"]`).addClass('active');
            
            // Update tab content
            $('.gos-finance-tab-content').removeClass('active');
            $(`#gos-finance-tab-${tab}`).addClass('active');
            
            // Show/hide relevant buttons
            if (tab === 'invoices') {
                $('.gos-new-invoice-btn').show();
                $('.gos-new-expense-btn').hide();
                $('.gos-export-csv-btn').show();
            } else if (tab === 'expenses') {
                $('.gos-new-invoice-btn').hide();
                $('.gos-new-expense-btn').show();
                $('.gos-export-csv-btn').show();
                this.loadExpenses();
            } else if (tab === 'payments') {
                $('.gos-new-invoice-btn').hide();
                $('.gos-new-expense-btn').hide();
                $('.gos-export-csv-btn').hide();
                this.loadPayments();
            }
        },
        
        /**
         * Load Invoices
         */
        async loadInvoices() {
            try {
                this.showLoading('.gos-finance-table-container');
                
                const params = {
                    page: this.currentPage,
                    per_page: this.perPage,
                    search: this.filters.search,
                    status: this.filters.status !== 'all' ? this.filters.status : undefined
                };
                
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices',
                    method: 'GET',
                    data: params,
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.invoices = response;
                const totalPages = parseInt($('.gos-finance-table-container').data('total-pages') || 1);
                
                this.renderInvoices();
                this.renderPagination(totalPages);
                
            } catch (error) {
                console.error('Failed to load invoices:', error);
                this.showNotification('Failed to load invoices', 'error');
            }
        },
        
        /**
         * Render Analytics Dashboard
         */
        renderAnalytics() {
            const data = this.analytics;
            if (!data) return;
            
            const html = `
                <div class="gos-finance-metric-card">
                    <div class="gos-finance-metric-label">Revenue</div>
                    <div class="gos-finance-metric-value positive">£${this.formatCurrency(data.revenue)}</div>
                    <div class="gos-finance-metric-change">This Period</div>
                </div>
                <div class="gos-finance-metric-card">
                    <div class="gos-finance-metric-label">Expenses</div>
                    <div class="gos-finance-metric-value">£${this.formatCurrency(data.expenses)}</div>
                    <div class="gos-finance-metric-change">This Period</div>
                </div>
                <div class="gos-finance-metric-card">
                    <div class="gos-finance-metric-label">Net Profit</div>
                    <div class="gos-finance-metric-value ${data.net_profit >= 0 ? 'positive' : 'negative'}">
                        £${this.formatCurrency(data.net_profit)}
                    </div>
                    <div class="gos-finance-metric-change">${data.profit_margin}% Margin</div>
                </div>
                <div class="gos-finance-metric-card">
                    <div class="gos-finance-metric-label">Outstanding</div>
                    <div class="gos-finance-metric-value">£${this.formatCurrency(data.outstanding)}</div>
                    <div class="gos-finance-metric-change">${data.overdue_invoices} Overdue</div>
                </div>
            `;
            
            $('.gos-finance-metrics').html(html);
        },
        
        /**
         * Render Invoices Table
         */
        renderInvoices() {
            const $container = $('.gos-finance-table-container');
            
            if (this.invoices.length === 0) {
                $container.html(this.getEmptyState());
                return;
            }
            
            const rows = this.invoices.map(invoice => `
                <tr>
                    <td><strong>${this.escapeHtml(invoice.invoice_number)}</strong></td>
                    <td>${this.escapeHtml(invoice.customer_name)}</td>
                    <td>${this.formatDate(invoice.invoice_date || invoice.issued_date)}</td>
                    <td>${this.formatDate(invoice.due_date)}</td>
                    <td><strong>£${this.formatCurrency(invoice.total_amount || invoice.amount)}</strong></td>
                    <td>£${this.formatCurrency(invoice.balance_due != null ? invoice.balance_due : (invoice.total_amount || invoice.amount || 0))}</td>
                    <td><span class="gos-finance-status ${invoice.status}">${this.escapeHtml(invoice.status)}</span></td>
                    <td>
                        <div class="gos-finance-actions">
                            <button class="gos-finance-action-btn gos-view-invoice-btn" data-invoice-id="${invoice.id}">
                                View
                            </button>
                            <button class="gos-finance-action-btn gos-edit-invoice-btn" data-invoice-id="${invoice.id}">
                                Edit
                            </button>
                            ${invoice.status === 'draft' || invoice.status === 'sent' ? `
                                <button class="gos-finance-action-btn primary gos-send-invoice-btn" data-invoice-id="${invoice.id}">
                                    Send
                                </button>
                            ` : ''}
                            ${invoice.balance_due > 0 ? `
                                <button class="gos-finance-action-btn primary gos-record-payment-btn" data-invoice-id="${invoice.id}">
                                    Record Payment
                                </button>
                            ` : ''}
                            <button class="gos-finance-action-btn danger gos-delete-invoice-btn" data-invoice-id="${invoice.id}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            const html = `
                <table class="gos-finance-table">
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
            
            $container.html(html);
        },
        
        /**
         * Render Pagination
         */
        renderPagination(totalPages) {
            if (totalPages <= 1) {
                $('.gos-finance-pagination').html('');
                return;
            }
            
            const buttons = [];
            
            // Previous button
            buttons.push(`
                <button class="gos-finance-page-btn" data-page="${this.currentPage - 1}" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
            `);
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    buttons.push(`
                        <button class="gos-finance-page-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                            ${i}
                        </button>
                    `);
                } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                    buttons.push('<span>...</span>');
                }
            }
            
            // Next button
            buttons.push(`
                <button class="gos-finance-page-btn" data-page="${this.currentPage + 1}" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            `);
            
            $('.gos-finance-pagination').html(buttons.join(''));
        },
        
        /**
         * Load Expenses
         */
        async loadExpenses() {
            try {
                this.showLoading('.gos-expense-table-container');
                
                const params = {
                    page: this.currentPage,
                    per_page: this.perPage,
                    search: this.filters.search,
                    category: this.filters.category !== 'all' ? this.filters.category : undefined
                };
                
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/expenses',
                    method: 'GET',
                    data: params,
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.expenses = response.expenses || response || [];
                this.renderExpenses();
                
                const totalPages = Math.ceil((response.total || this.expenses.length) / this.perPage);
                this.renderExpensePagination(totalPages);
                
            } catch (error) {
                console.error('Failed to load expenses:', error);
                this.showNotification('Failed to load expenses', 'error');
                $('.gos-expense-table-container').html(this.getEmptyState('No expenses found'));
            }
        },
        
        /**
         * Load Payments (derived from paid invoices)
         */
        async loadPayments() {
            try {
                this.showLoading('.gos-payment-table-container');
                
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices',
                    method: 'GET',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                const invoices = response || [];
                const paidInvoices = invoices.filter(inv => inv.status === 'paid');
                const $container = $('.gos-payment-table-container');
                
                if (paidInvoices.length === 0) {
                    $container.html(`
                        <div class="gos-finance-empty">
                            <div class="gos-finance-empty-icon">💳</div>
                            <h3>No Payments Yet</h3>
                            <p>Payments will appear here when invoices are marked as paid</p>
                        </div>
                    `);
                    return;
                }
                
                const totalPaid = paidInvoices.reduce((s, inv) => s + (parseFloat(inv.total_amount) || parseFloat(inv.amount) || 0), 0);
                
                const rows = paidInvoices.map(inv => `
                    <tr>
                        <td><strong>${this.escapeHtml(inv.invoice_number || 'N/A')}</strong></td>
                        <td>${this.escapeHtml(inv.customer_name || inv.client_name || '-')}</td>
                        <td>${this.formatDate(inv.invoice_date || inv.issued_date)}</td>
                        <td><strong>£${this.formatCurrency(inv.total_amount || inv.amount)}</strong></td>
                        <td><span class="gos-finance-status paid">Paid</span></td>
                    </tr>
                `).join('');
                
                $container.html(`
                    <div style="padding: 16px 20px; background: #f0fdf4; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #166534; font-weight: 600;">Total Received</span>
                        <span style="color: #166534; font-size: 1.25rem; font-weight: 700;">£${this.formatCurrency(totalPaid)}</span>
                    </div>
                    <table class="gos-finance-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Payment Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                `);
            } catch (error) {
                console.error('Failed to load payments:', error);
                $('.gos-payment-table-container').html('<p style="padding:40px;text-align:center;color:#6b7280;">Failed to load payments</p>');
            }
        },
        renderExpenses() {
            const $container = $('.gos-expense-table-container');
            
            if (this.expenses.length === 0) {
                $container.html(this.getEmptyState('No expenses found'));
                return;
            }
            
            const rows = this.expenses.map(expense => `
                <tr>
                    <td>${this.formatDate(expense.expense_date || expense.date)}</td>
                    <td><strong>${this.escapeHtml(expense.description || expense.title)}</strong></td>
                    <td>${this.escapeHtml(expense.supplier_name || '-')}</td>
                    <td><span class="gos-finance-category-badge">${this.escapeHtml(expense.category || 'Other')}</span></td>
                    <td><strong>£${this.formatCurrency(expense.total_amount || expense.amount)}</strong></td>
                    <td><span class="gos-finance-status ${expense.payment_status || expense.status}">${this.escapeHtml(expense.payment_status || expense.status)}</span></td>
                    <td>
                        <div class="gos-finance-actions">
                            <button class="gos-finance-action-btn gos-view-expense-btn" data-expense-id="${expense.id}">
                                View
                            </button>
                            <button class="gos-finance-action-btn gos-edit-expense-btn" data-expense-id="${expense.id}">
                                Edit
                            </button>
                            <button class="gos-finance-action-btn danger gos-delete-expense-btn" data-expense-id="${expense.id}">
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
            
            const html = `
                <table class="gos-finance-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Supplier</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
            
            $container.html(html);
        },
        
        /**
         * Render Expense Pagination
         */
        renderExpensePagination(totalPages) {
            if (totalPages <= 1) {
                $('.gos-expense-pagination').html('');
                return;
            }
            
            const buttons = [];
            
            buttons.push(`
                <button class="gos-finance-page-btn" data-page="${this.currentPage - 1}" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
            `);
            
            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    buttons.push(`
                        <button class="gos-finance-page-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">
                            ${i}
                        </button>
                    `);
                } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                    buttons.push('<span>...</span>');
                }
            }
            
            buttons.push(`
                <button class="gos-finance-page-btn" data-page="${this.currentPage + 1}" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            `);
            
            $('.gos-expense-pagination').html(buttons.join(''));
        },
        
        /**
         * Show Expense Modal
         */
        showExpenseModal(expense = null) {
            const isEdit = expense !== null;
            
            const modal = `
                <div class="gos-finance-modal-overlay">
                    <div class="gos-finance-modal">
                        <div class="gos-finance-modal-header">
                            <h2>${isEdit ? 'Edit Expense' : 'New Expense'}</h2>
                            <button class="gos-finance-modal-close">×</button>
                        </div>
                        <div class="gos-finance-modal-body">
                            <form id="gos-expense-form">
                                <input type="hidden" name="id" value="${expense?.id || ''}">
                                
                                <div class="gos-finance-form-row">
                                    <div class="gos-finance-form-group">
                                        <label>Expense Date *</label>
                                        <input type="date" name="expense_date" value="${expense?.expense_date || this.getTodayDate()}" required>
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>Category *</label>
                                        <select name="category" required>
                                            <option value="">Select Category</option>
                                            <option value="materials" ${expense?.category === 'materials' ? 'selected' : ''}>Materials</option>
                                            <option value="fuel" ${expense?.category === 'fuel' ? 'selected' : ''}>Fuel</option>
                                            <option value="tools" ${expense?.category === 'tools' ? 'selected' : ''}>Tools & Equipment</option>
                                            <option value="subcontractor" ${expense?.category === 'subcontractor' ? 'selected' : ''}>Subcontractor</option>
                                            <option value="utilities" ${expense?.category === 'utilities' ? 'selected' : ''}>Utilities</option>
                                            <option value="other" ${expense?.category === 'other' ? 'selected' : ''}>Other</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="gos-finance-form-group">
                                    <label>Description *</label>
                                    <input type="text" name="description" placeholder="What was this expense for?" value="${expense?.description || ''}" required>
                                </div>
                                
                                <div class="gos-finance-form-group">
                                    <label>Supplier Name</label>
                                    <input type="text" name="supplier_name" placeholder="ABC Suppliers Ltd" value="${expense?.supplier_name || ''}">
                                </div>
                                
                                <div class="gos-finance-form-row">
                                    <div class="gos-finance-form-group">
                                        <label>Amount (£) *</label>
                                        <input type="number" name="amount" step="0.01" placeholder="0.00" value="${expense?.amount || ''}" required>
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>VAT Rate (%)</label>
                                        <input type="number" name="vat_rate" step="0.01" placeholder="20.00" value="${expense?.vat_rate || '20.00'}">
                                    </div>
                                </div>
                                
                                <div class="gos-finance-form-group">
                                    <label>Link to Job (Optional)</label>
                                    <select name="job_id" id="gos-expense-job-select">
                                        <option value="">-- Select Job (Optional) --</option>
                                    </select>
                                </div>
                                
                                <div class="gos-finance-form-group">
                                    <label>Notes</label>
                                    <textarea name="notes" rows="3" placeholder="Any additional notes...">${expense?.notes || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="gos-finance-modal-footer">
                            <button type="button" class="gos-btn gos-btn-secondary gos-finance-modal-close">Cancel</button>
                            <button type="submit" form="gos-expense-form" class="gos-btn gos-btn-primary">${isEdit ? 'Update' : 'Create'} Expense</button>
                        </div>
                    </div>
                </div>
            `;
            
            $('body').append(modal);
            
            // Load jobs for dropdown
            this.loadJobs('#gos-expense-job-select');
            
            // Handle form submit
            $('#gos-expense-form').on('submit', (e) => {
                e.preventDefault();
                this.saveExpense(isEdit);
            });
        },
        
        /**
         * Save Expense
         */
        async saveExpense(isEdit) {
            const formData = new FormData($('#gos-expense-form')[0]);
            const data = Object.fromEntries(formData.entries());
            
            // Calculate VAT and total
            const amount = parseFloat(data.amount);
            const vatRate = parseFloat(data.vat_rate || 0);
            data.vat_amount = (amount * vatRate / 100).toFixed(2);
            data.total_amount = (amount + parseFloat(data.vat_amount)).toFixed(2);
            
            try {
                const method = isEdit ? 'POST' : 'POST';
                const url = isEdit 
                    ? wpApiSettings.root + 'glazieros/v1/expenses/' + data.id
                    : wpApiSettings.root + 'glazieros/v1/expenses';
                
                await $.ajax({
                    url: url,
                    method: method,
                    contentType: 'application/json',
                    data: JSON.stringify(data),
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.showNotification(`Expense ${isEdit ? 'updated' : 'created'} successfully`, 'success');
                $('.gos-finance-modal-overlay').remove();
                this.loadExpenses();
                this.loadAnalytics();
                
            } catch (error) {
                console.error('Failed to save expense:', error);
                this.showNotification('Failed to save expense', 'error');
            }
        },
        
        /**
         * Show Invoice Modal
         */
        showInvoiceModal(invoice = null) {
            const isEdit = invoice !== null;
            
            const modal = `
                <div class="gos-finance-modal-overlay">
                    <div class="gos-finance-modal">
                        <div class="gos-finance-modal-header">
                            <h2>${isEdit ? 'Edit Invoice' : 'New Invoice'}</h2>
                            <button class="gos-finance-modal-close">×</button>
                        </div>
                        <div class="gos-finance-modal-body">
                            <form id="gos-invoice-form">
                                <input type="hidden" name="id" value="${invoice?.id || ''}">
                                
                                <div class="gos-finance-form-grid">
                                    <div class="gos-finance-form-group">
                                        <label class="required">Customer Name</label>
                                        <input type="text" name="customer_name" value="${invoice?.customer_name || ''}" required>
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label class="required">Customer Email</label>
                                        <input type="email" name="customer_email" value="${invoice?.customer_email || ''}" required>
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>Customer Phone</label>
                                        <input type="tel" name="customer_phone" value="${invoice?.customer_phone || ''}">
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>Invoice Date</label>
                                        <input type="date" name="invoice_date" value="${invoice?.invoice_date || this.getTodayDate()}">
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>Payment Terms</label>
                                        <select name="payment_terms">
                                            <option value="Net 30" ${invoice?.payment_terms === 'Net 30' ? 'selected' : ''}>Net 30</option>
                                            <option value="Net 15" ${invoice?.payment_terms === 'Net 15' ? 'selected' : ''}>Net 15</option>
                                            <option value="Due on Receipt" ${invoice?.payment_terms === 'Due on Receipt' ? 'selected' : ''}>Due on Receipt</option>
                                        </select>
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>Link to Job</label>
                                        <select name="job_id" id="gos-job-select">
                                            <option value="">-- Select Job (Optional) --</option>
                                            <option value="">Loading jobs...</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="gos-finance-form-grid full-width">
                                    <div class="gos-finance-form-group">
                                        <label>Customer Address</label>
                                        <textarea name="customer_address">${invoice?.customer_address || ''}</textarea>
                                    </div>
                                    <div class="gos-finance-form-group">
                                        <label>Notes (Internal)</label>
                                        <textarea name="notes">${invoice?.notes || ''}</textarea>
                                    </div>
                                </div>
                                
                                <div class="gos-finance-line-items">
                                    <h3>Line Items</h3>
                                    <div id="gos-line-items-container">
                                        ${this.renderLineItems(invoice?.items || [])}
                                    </div>
                                    <button type="button" class="gos-finance-add-item">+ Add Line Item</button>
                                </div>
                                
                                <div class="gos-finance-totals">
                                    <div class="gos-finance-total-row">
                                        <div class="gos-finance-total-label">Subtotal:</div>
                                        <div class="gos-finance-total-value" id="gos-subtotal">£0.00</div>
                                    </div>
                                    <div class="gos-finance-total-row">
                                        <div class="gos-finance-total-label">VAT (20%):</div>
                                        <div class="gos-finance-total-value" id="gos-vat">£0.00</div>
                                    </div>
                                    <div class="gos-finance-total-row grand-total">
                                        <div class="gos-finance-total-label">Total:</div>
                                        <div class="gos-finance-total-value" id="gos-total">£0.00</div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="gos-finance-modal-footer">
                            <button type="button" class="gos-btn gos-btn-secondary gos-finance-modal-close">Cancel</button>
                            <button type="button" class="gos-btn gos-btn-primary gos-save-invoice-btn">
                                ${isEdit ? 'Update Invoice' : 'Create Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            console.log('📝 Appending modal to body...');
            $('body').append(modal);
            
            // Load jobs into dropdown
            this.loadJobs();
            
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                console.log('✅ Modal should be visible now');
                console.log('Modal exists:', $('.gos-finance-modal-overlay').length);
                console.log('Modal visible:', $('.gos-finance-modal-overlay').is(':visible'));
                this.calculateTotals();
            }, 50);
        },
        
        /**
         * Render Line Items
         */
        renderLineItems(items) {
            if (items.length === 0) {
                items = [{ description: '', quantity: 1, unit_price: 0, vat_rate: 20 }];
            }
            
            return items.map(item => `
                <div class="gos-finance-line-item">
                    <div class="gos-finance-form-group">
                        <label>Description</label>
                        <input type="text" class="gos-line-item-input" name="item_description[]" 
                            value="${this.escapeHtml(item.description || '')}" placeholder="Window installation...">
                    </div>
                    <div class="gos-finance-form-group">
                        <label>Quantity</label>
                        <input type="number" class="gos-line-item-input" name="item_quantity[]" 
                            value="${item.quantity || 1}" min="0" step="0.01">
                    </div>
                    <div class="gos-finance-form-group">
                        <label>Unit Price</label>
                        <input type="number" class="gos-line-item-input" name="item_unit_price[]" 
                            value="${item.unit_price || 0}" min="0" step="0.01">
                    </div>
                    <div class="gos-finance-form-group">
                        <label>VAT Rate %</label>
                        <input type="number" class="gos-line-item-input" name="item_vat_rate[]" 
                            value="${item.vat_rate || 20}" min="0" step="0.01">
                    </div>
                    <button type="button" class="gos-finance-line-item-remove">Remove</button>
                </div>
            `).join('');
        },
        
        /**
         * Add Line Item
         */
        addLineItem() {
            const newItem = this.renderLineItems([{ description: '', quantity: 1, unit_price: 0, vat_rate: 20 }]);
            $('#gos-line-items-container').append(newItem);
        },
        
        /**
         * Calculate Totals
         */
        calculateTotals() {
            let subtotal = 0;
            let totalVat = 0;
            
            $('.gos-finance-line-item').each(function() {
                const quantity = parseFloat($(this).find('[name="item_quantity[]"]').val()) || 0;
                const unitPrice = parseFloat($(this).find('[name="item_unit_price[]"]').val()) || 0;
                const vatRate = parseFloat($(this).find('[name="item_vat_rate[]"]').val()) || 0;
                
                const lineSubtotal = quantity * unitPrice;
                const lineVat = lineSubtotal * (vatRate / 100);
                
                subtotal += lineSubtotal;
                totalVat += lineVat;
            });
            
            const total = subtotal + totalVat;
            
            $('#gos-subtotal').text('£' + this.formatCurrency(subtotal));
            $('#gos-vat').text('£' + this.formatCurrency(totalVat));
            $('#gos-total').text('£' + this.formatCurrency(total));
        },
        
        /**
         * Save Invoice
         */
        async saveInvoice() {
            try {
                const $form = $('#gos-invoice-form');
                const formData = new FormData($form[0]);
                
                // Build line items first so we can compute totals
                const descriptions = formData.getAll('item_description[]');
                const quantities = formData.getAll('item_quantity[]');
                const unitPrices = formData.getAll('item_unit_price[]');
                const vatRates = formData.getAll('item_vat_rate[]');
                
                const items = [];
                let subtotal = 0;
                let totalVat = 0;
                
                for (let i = 0; i < descriptions.length; i++) {
                    if (descriptions[i].trim()) {
                        const qty = parseFloat(quantities[i]) || 1;
                        const price = parseFloat(unitPrices[i]) || 0;
                        const vat = parseFloat(vatRates[i]) || 20;
                        const lineTotal = qty * price;
                        const lineVat = lineTotal * (vat / 100);
                        items.push({
                            description: descriptions[i],
                            quantity: qty,
                            unit_price: price,
                            vat_rate: vat,
                            total: lineTotal + lineVat
                        });
                        subtotal += lineTotal;
                        totalVat += lineVat;
                    }
                }
                
                const totalAmount = subtotal + totalVat;
                const invoiceDate = formData.get('invoice_date') || this.getTodayDate();
                const paymentTerms = formData.get('payment_terms') || 'Net 30';
                const termDays = paymentTerms === 'Due on Receipt' ? 0 : parseInt(paymentTerms.replace('Net ', '')) || 30;
                const dueDate = new Date(new Date(invoiceDate).getTime() + termDays * 86400000).toISOString().slice(0, 10);
                
                // Generate invoice number
                const allInv = this.invoices || [];
                const invNum = 'INV-' + String(allInv.length + 1).padStart(4, '0');
                
                // Build invoice data
                const invoiceData = {
                    invoice_number: invNum,
                    customer_name: formData.get('customer_name'),
                    customer_email: formData.get('customer_email'),
                    customer_phone: formData.get('customer_phone'),
                    customer_address: formData.get('customer_address'),
                    invoice_date: invoiceDate,
                    issued_date: invoiceDate,
                    due_date: dueDate,
                    payment_terms: paymentTerms,
                    job_id: formData.get('job_id'),
                    notes: formData.get('notes'),
                    items: items,
                    amount: subtotal,
                    total_amount: totalAmount,
                    balance_due: totalAmount,
                    vat_rate: 20,
                    status: 'draft'
                };
                
                const invoiceId = formData.get('id');
                const isEdit = invoiceId && invoiceId !== '';
                
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices' + (isEdit ? '/' + invoiceId : ''),
                    method: isEdit ? 'POST' : 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(invoiceData),
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.showNotification(isEdit ? 'Invoice updated successfully' : 'Invoice created successfully', 'success');
                this.closeModal();
                this.loadInvoices();
                this.loadAnalytics();
                
            } catch (error) {
                console.error('Failed to save invoice:', error);
                this.showNotification('Failed to save invoice', 'error');
            }
        },
        
        /**
         * View Invoice
         */
        async viewInvoice(invoiceId) {
            try {
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices/' + invoiceId,
                    method: 'GET',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                const invoice = response;
                const subtotal = invoice.total_amount / (1 + (invoice.vat_rate / 100));
                const vatAmount = invoice.total_amount - subtotal;
                
                const modal = `
                    <div class="gos-finance-modal-overlay">
                        <div class="gos-finance-modal">
                            <div class="gos-finance-modal-header">
                                <h2>Invoice ${invoice.invoice_number}</h2>
                                <button class="gos-finance-modal-close">×</button>
                            </div>
                            <div class="gos-finance-modal-body">
                                <div class="gos-invoice-view">
                                    <div class="gos-invoice-header">
                                        <div>
                                            <h3>${this.escapeHtml(invoice.customer_name)}</h3>
                                            <p>${this.escapeHtml(invoice.customer_email)}</p>
                                            ${invoice.customer_phone ? `<p>${this.escapeHtml(invoice.customer_phone)}</p>` : ''}
                                            ${invoice.customer_address ? `<p style="white-space: pre-line;">${this.escapeHtml(invoice.customer_address)}</p>` : ''}
                                        </div>
                                        <div style="text-align: right;">
                                            <p><strong>Invoice Date:</strong> ${this.formatDate(invoice.invoice_date)}</p>
                                            <p><strong>Due Date:</strong> ${this.formatDate(invoice.due_date)}</p>
                                            <p><strong>Status:</strong> <span class="gos-finance-status ${invoice.status}">${this.escapeHtml(invoice.status)}</span></p>
                                        </div>
                                    </div>
                                    
                                    <table class="gos-finance-table" style="margin-top: 24px;">
                                        <thead>
                                            <tr>
                                                <th>Description</th>
                                                <th>Quantity</th>
                                                <th>Unit Price</th>
                                                <th>VAT %</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${invoice.items ? invoice.items.map(item => `
                                                <tr>
                                                    <td>${this.escapeHtml(item.description)}</td>
                                                    <td>${item.quantity}</td>
                                                    <td>£${this.formatCurrency(item.unit_price)}</td>
                                                    <td>${item.vat_rate}%</td>
                                                    <td>£${this.formatCurrency(item.total)}</td>
                                                </tr>
                                            `).join('') : '<tr><td colspan="5">No items</td></tr>'}
                                        </tbody>
                                    </table>
                                    
                                    <div class="gos-finance-totals" style="margin-top: 24px;">
                                        <div class="gos-finance-total-row">
                                            <div class="gos-finance-total-label">Subtotal:</div>
                                            <div class="gos-finance-total-value">£${this.formatCurrency(subtotal)}</div>
                                        </div>
                                        <div class="gos-finance-total-row">
                                            <div class="gos-finance-total-label">VAT (${invoice.vat_rate}%):</div>
                                            <div class="gos-finance-total-value">£${this.formatCurrency(vatAmount)}</div>
                                        </div>
                                        <div class="gos-finance-total-row grand-total">
                                            <div class="gos-finance-total-label">Total:</div>
                                            <div class="gos-finance-total-value">£${this.formatCurrency(invoice.total_amount)}</div>
                                        </div>
                                        ${invoice.amount_paid > 0 ? `
                                            <div class="gos-finance-total-row">
                                                <div class="gos-finance-total-label">Amount Paid:</div>
                                                <div class="gos-finance-total-value" style="color: #10b981;">£${this.formatCurrency(invoice.amount_paid)}</div>
                                            </div>
                                            <div class="gos-finance-total-row">
                                                <div class="gos-finance-total-label">Balance Due:</div>
                                                <div class="gos-finance-total-value" style="color: #ef4444;">£${this.formatCurrency(invoice.balance_due)}</div>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    ${invoice.notes ? `
                                        <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
                                            <strong>Notes:</strong>
                                            <p style="margin: 8px 0 0 0; white-space: pre-line;">${this.escapeHtml(invoice.notes)}</p>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="gos-finance-modal-footer">
                                <button type="button" class="gos-btn gos-btn-secondary gos-finance-modal-close">Close</button>
                                <button type="button" class="gos-btn gos-btn-secondary gos-generate-pdf-btn" data-invoice-id="${invoice.id}">Generate PDF</button>
                                <button type="button" class="gos-btn gos-btn-primary" onclick="window.print()">Print</button>
                            </div>
                        </div>
                    </div>
                `;
                
                $('body').append(modal);
                
            } catch (error) {
                console.error('Failed to load invoice:', error);
                this.showNotification('Failed to load invoice', 'error');
            }
        },
        
        /**
         * Edit Invoice
         */
        async editInvoice(invoiceId) {
            try {
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices/' + invoiceId,
                    method: 'GET',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.showInvoiceModal(response);
                
            } catch (error) {
                console.error('Failed to load invoice:', error);
                this.showNotification('Failed to load invoice', 'error');
            }
        },
        
        /**
         * Delete Invoice
         */
        async deleteInvoice(invoiceId) {
            if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
                return;
            }
            
            try {
                await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices/' + invoiceId,
                    method: 'DELETE',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.showNotification('Invoice deleted successfully', 'success');
                this.loadInvoices();
                this.loadAnalytics();
                
            } catch (error) {
                console.error('Failed to delete invoice:', error);
                this.showNotification('Failed to delete invoice', 'error');
            }
        },
        
        /**
         * Send Invoice
         */
        async sendInvoice(invoiceId) {
            try {
                await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices/' + invoiceId + '/send',
                    method: 'POST',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.showNotification('Invoice sent successfully', 'success');
                this.loadInvoices();
                
            } catch (error) {
                console.error('Failed to send invoice:', error);
                this.showNotification('Failed to send invoice', 'error');
            }
        },
        
        /**
         * Generate PDF
         */
        async generatePDF(invoiceId) {
            try {
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices/' + invoiceId + '/generate-pdf',
                    method: 'POST',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                if (response.pdf_url) {
                    this.showNotification('PDF generated successfully', 'success');
                    // Open PDF in new tab
                    window.open(response.pdf_url, '_blank');
                }
                
            } catch (error) {
                console.error('Failed to generate PDF:', error);
                this.showNotification('Failed to generate PDF', 'error');
            }
        },
        
        /**
         * Record Payment
         */
        async recordPayment(invoiceId) {
            const amount = prompt('Enter payment amount:');
            if (!amount) return;
            
            const paymentData = {
                amount: parseFloat(amount),
                payment_date: this.getTodayDate(),
                payment_method: 'card',
                reference: ''
            };
            
            try {
                await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/invoices/' + invoiceId + '/payment',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(paymentData),
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                this.showNotification('Payment recorded successfully', 'success');
                this.loadInvoices();
                this.loadAnalytics();
                
            } catch (error) {
                console.error('Failed to record payment:', error);
                this.showNotification('Failed to record payment', 'error');
            }
        },
        
        /**
         * Close Modal
         */
        closeModal() {
            $('.gos-finance-modal-overlay').remove();
        },
        
        /**
         * Load Jobs for Dropdown
         */
        async loadJobs(selector = '#gos-job-select') {
            try {
                const response = await $.ajax({
                    url: wpApiSettings.root + 'glazieros/v1/jobs',
                    method: 'GET',
                    beforeSend: (xhr) => {
                        xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce);
                    }
                });
                
                const $select = $(selector);
                $select.html('<option value="">-- Select Job (Optional) --</option>');
                
                if (response && response.length > 0) {
                    response.forEach(job => {
                        // Try multiple possible customer name fields
                        const customerName = job.customer_name || job.customer || job.title || job.name || `Job #${job.id}`;
                        const address = job.address ? ` - ${job.address.substring(0, 40)}` : '';
                        $select.append(`<option value="${job.id}">${customerName}${address}</option>`);
                    });
                } else {
                    $select.append('<option value="">No jobs found</option>');
                }
            } catch (error) {
                console.error('Failed to load jobs:', error);
                $(selector).html('<option value="">-- Select Job (Optional) --</option>');
            }
        },
        
        /**
         * Show Loading
         */
        showLoading(selector) {
            $(selector).html('<div class="gos-finance-loading"><div class="gos-finance-spinner"></div></div>');
        },
        
        /**
         * Show Notification
         */
        showNotification(message, type = 'info') {
            // Create toast container if it doesn't exist
            if (!$('.gos-toast-container').length) {
                $('body').append('<div class="gos-toast-container"></div>');
            }
            
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            
            const toast = $(`
                <div class="gos-toast ${type}">
                    <div class="gos-toast-icon">${icons[type] || icons.info}</div>
                    <div class="gos-toast-content">
                        <p class="gos-toast-message">${this.escapeHtml(message)}</p>
                    </div>
                    <button class="gos-toast-close">×</button>
                </div>
            `);
            
            $('.gos-toast-container').append(toast);
            
            // Auto dismiss after 3 seconds
            const dismissTimer = setTimeout(() => {
                this.dismissToast(toast);
            }, 3000);
            
            // Manual close
            toast.find('.gos-toast-close').on('click', () => {
                clearTimeout(dismissTimer);
                this.dismissToast(toast);
            });
        },
        
        dismissToast(toast) {
            toast.addClass('hiding');
            setTimeout(() => {
                toast.remove();
                // Remove container if empty
                if (!$('.gos-toast-container .gos-toast').length) {
                    $('.gos-toast-container').remove();
                }
            }, 300);
        },
        
        /**
         * Get Empty State HTML
         */
        getEmptyState() {
            return `
                <div class="gos-finance-empty">
                    <div class="gos-finance-empty-icon">📄</div>
                    <h3>No Invoices Found</h3>
                    <p>Create your first invoice to get started</p>
                    <button class="gos-btn gos-btn-primary gos-new-invoice-btn">
                        Create Invoice
                    </button>
                </div>
            `;
        },
        
        /**
         * Get Date Range
         */
        getDateRange(range) {
            const today = new Date();
            let startDate, endDate;
            
            switch (range) {
                case 'today':
                    startDate = endDate = this.formatDateISO(today);
                    break;
                case 'this_week':
                    startDate = this.formatDateISO(this.getStartOfWeek(today));
                    endDate = this.formatDateISO(today);
                    break;
                case 'this_month':
                    startDate = this.formatDateISO(new Date(today.getFullYear(), today.getMonth(), 1));
                    endDate = this.formatDateISO(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                    break;
                case 'this_year':
                    startDate = this.formatDateISO(new Date(today.getFullYear(), 0, 1));
                    endDate = this.formatDateISO(new Date(today.getFullYear(), 11, 31));
                    break;
                default:
                    startDate = this.formatDateISO(new Date(today.getFullYear(), today.getMonth(), 1));
                    endDate = this.formatDateISO(new Date(today.getFullYear(), today.getMonth() + 1, 0));
            }
            
            return { start_date: startDate, end_date: endDate };
        },
        
        /**
         * Export CSV
         */
        exportCSV() {
            if (this.invoices.length === 0) {
                this.showNotification('No invoices to export', 'warning');
                return;
            }
            
            // CSV Headers
            const headers = ['Invoice Number', 'Customer', 'Invoice Date', 'Due Date', 'Total Amount', 'Amount Paid', 'Balance Due', 'Status'];
            
            // CSV Rows
            const rows = this.invoices.map(invoice => [
                invoice.invoice_number,
                invoice.customer_name,
                this.formatDate(invoice.invoice_date),
                this.formatDate(invoice.due_date),
                invoice.total_amount,
                invoice.amount_paid,
                invoice.balance_due,
                invoice.status
            ]);
            
            // Build CSV content
            let csvContent = headers.join(',') + '\n';
            rows.forEach(row => {
                csvContent += row.map(cell => {
                    // Escape cells containing commas or quotes
                    const cellStr = String(cell);
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return '"' + cellStr.replace(/"/g, '""') + '"';
                    }
                    return cellStr;
                }).join(',') + '\n';
            });
            
            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', 'invoices_' + this.getTodayDate() + '.csv');
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('CSV exported successfully', 'success');
        },
        
        /**
         * Helper: Format Currency
         */
        formatCurrency(amount) {
            return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },
        
        /**
         * Helper: Format Date
         */
        formatDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB');
        },
        
        /**
         * Helper: Format Date ISO
         */
        formatDateISO(date) {
            return date.toISOString().split('T')[0];
        },
        
        /**
         * Helper: Get Today's Date
         */
        getTodayDate() {
            return this.formatDateISO(new Date());
        },
        
        /**
         * Helper: Get Start of Week
         */
        getStartOfWeek(date) {
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        },
        
        /**
         * Helper: Escape HTML
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        /**
         * Helper: Debounce
         */
        debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    };

    // Initialize on panel activation
    $(document).on('gsa:panel:activated', function(e, panelId) {
        if (panelId === 'invoices') {
            console.log('📊 Finance panel activated, waiting for UI...');
            
            // Wait a moment for finance-init.js to create the HTML
            setTimeout(function() {
                if (!FinanceApp.initialized) {
                    console.log('🚀 Starting Finance App...');
                    FinanceApp.init();
                    FinanceApp.initialized = true;
                }
            }, 100);
        }
    });
    
    // Also listen for the UI ready event from finance-init.js
    $(document).on('gos:finance:ui-ready', function() {
        if (!FinanceApp.initialized) {
            console.log('🚀 Finance UI ready, initializing app...');
            FinanceApp.init();
            FinanceApp.initialized = true;
        }
    });

    // Export to window for debugging
    window.GlazierOSFinance = FinanceApp;

})(jQuery);
