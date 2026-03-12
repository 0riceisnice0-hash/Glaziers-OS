/**
 * customers.js — CRM-like Customer Management Panel for GlazierOS
 *
 * Mounts on #gsa-customers, activates via gsa:panel:activated → 'customers'.
 * Extracts unique customers from DataStore jobs grouped by email/client_name.
 */
(function ($, window, document) {
  'use strict';

  console.log('👥 customers.js loaded');

  // ==========================================================================
  // 1. CONFIGURATION
  // ==========================================================================
  var CONFIG = {
    API_BASE: '/wp-json/glazieros/v1',
    DEBOUNCE_DELAY: 300,
    NOTES_STORAGE_KEY: 'gos_customer_notes',
    PREFS_STORAGE_KEY: 'gos_customer_prefs',
    INACTIVE_DAYS: 90
  };

  // ==========================================================================
  // 2. UTILITIES
  // ==========================================================================
  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < (str || '').length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  var AVATAR_COLORS = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe',
    '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#fbc2eb',
    '#ff9a9e', '#fad0c4', '#ffecd2', '#0ba360', '#3cba92',
    '#30cfd0', '#e78baf', '#6a85b6', '#f6d365', '#ec6f66'
  ];

  function avatarColor(name) {
    return AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length];
  }

  function initials(firstName, lastName) {
    var f = (firstName || '').charAt(0).toUpperCase();
    var l = (lastName || '').charAt(0).toUpperCase();
    return (f + l) || '?';
  }

  function formatCurrency(val) {
    return '£' + (Number(val) || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateLong(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function isActiveCustomer(lastActivity) {
    if (!lastActivity) return false;
    var diff = Date.now() - new Date(lastActivity).getTime();
    return diff < CONFIG.INACTIVE_DAYS * 86400000;
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function getNotes() {
    try { return JSON.parse(localStorage.getItem(CONFIG.NOTES_STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function saveNote(customerId, text) {
    var notes = getNotes();
    notes[customerId] = text;
    localStorage.setItem(CONFIG.NOTES_STORAGE_KEY, JSON.stringify(notes));
  }

  // ==========================================================================
  // 3. CUSTOMER EXTRACTION
  // ==========================================================================
  function extractCustomers() {
    var jobs = window.DataStore ? window.DataStore.getAll('jobs') : [];
    var map = {};

    jobs.forEach(function (j) {
      var key = (j.email || j.client_email || '').toLowerCase().trim();
      if (!key) key = (j.client_name || '').toLowerCase().trim();
      if (!key) return;

      if (!map[key]) {
        map[key] = {
          id: key,
          first_name: j.first_name || '',
          last_name: j.last_name || '',
          client_name: j.client_name || ((j.first_name || '') + ' ' + (j.last_name || '')).trim(),
          email: j.email || j.client_email || '',
          phone: j.phone || j.client_phone || '',
          address: j.address || '',
          postcode: j.postcode || '',
          jobs: [],
          total_spend: 0,
          last_activity: ''
        };
      }
      map[key].jobs.push(j);
      map[key].total_spend += Number(j.price) || 0;
      var jDate = j.updated_at || j.created_at || '';
      if (jDate > map[key].last_activity) map[key].last_activity = jDate;
    });

    return Object.values(map);
  }

  // ==========================================================================
  // 4. CUSTOMER MANAGER CLASS
  // ==========================================================================
  function CustomerManager($container) {
    this.$container = $container;
    this.customers = [];
    this.filtered = [];
    this.searchTerm = '';
    this.filterStatus = 'all';
    this.initialized = false;
  }

  // --------------------------------------------------------------------------
  // init
  // --------------------------------------------------------------------------
  CustomerManager.prototype.init = function () {
    if (this.initialized) { this.refresh(); return; }
    this.initialized = true;
    this.injectCSS();
    this.renderShell();
    this.attachEvents();
    this.loadData();
  };

  // --------------------------------------------------------------------------
  // refresh
  // --------------------------------------------------------------------------
  CustomerManager.prototype.refresh = function () {
    this.loadData();
  };

  // --------------------------------------------------------------------------
  // loadData
  // --------------------------------------------------------------------------
  CustomerManager.prototype.loadData = function () {
    this.customers = extractCustomers();
    this.applyFilters();
    this.renderStats();
    this.renderList();
  };

  // --------------------------------------------------------------------------
  // applyFilters
  // --------------------------------------------------------------------------
  CustomerManager.prototype.applyFilters = function () {
    var self = this;
    var term = this.searchTerm.toLowerCase();
    this.filtered = this.customers.filter(function (c) {
      // Status filter
      if (self.filterStatus === 'active' && !isActiveCustomer(c.last_activity)) return false;
      if (self.filterStatus === 'inactive' && isActiveCustomer(c.last_activity)) return false;
      // Search
      if (!term) return true;
      return (c.client_name || '').toLowerCase().indexOf(term) !== -1 ||
             (c.email || '').toLowerCase().indexOf(term) !== -1 ||
             (c.phone || '').toLowerCase().indexOf(term) !== -1 ||
             (c.address || '').toLowerCase().indexOf(term) !== -1;
    });
  };

  // --------------------------------------------------------------------------
  // renderShell
  // --------------------------------------------------------------------------
  CustomerManager.prototype.renderShell = function () {
    this.$container.html(
      '<div class="gcm-wrap">' +
        '<div class="gcm-header">' +
          '<div class="gcm-header-left">' +
            '<h1 class="gcm-title">👥 Customer Management</h1>' +
          '</div>' +
          '<div class="gcm-header-right">' +
            '<div class="gcm-search-box">' +
              '<svg class="gcm-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
              '<input type="text" class="gcm-search-input" placeholder="Search customers…" />' +
            '</div>' +
            '<select class="gcm-filter-select">' +
              '<option value="all">All Customers</option>' +
              '<option value="active">Active</option>' +
              '<option value="inactive">Inactive</option>' +
            '</select>' +
            '<button class="gcm-btn gcm-btn-primary gcm-add-btn">+ Add Customer</button>' +
          '</div>' +
        '</div>' +
        '<div class="gcm-stats-bar"></div>' +
        '<div class="gcm-list-area"></div>' +
      '</div>'
    );
  };

  // --------------------------------------------------------------------------
  // renderStats
  // --------------------------------------------------------------------------
  CustomerManager.prototype.renderStats = function () {
    var total = this.customers.length;
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    var activeThisMonth = this.customers.filter(function (c) {
      return c.last_activity >= monthStart;
    }).length;
    var totalSpend = this.customers.reduce(function (s, c) { return s + c.total_spend; }, 0);
    var avgRevenue = total > 0 ? totalSpend / total : 0;
    var repeatCustomers = this.customers.filter(function (c) { return c.jobs.length > 1; }).length;

    this.$container.find('.gcm-stats-bar').html(
      '<div class="gcm-stat-card">' +
        '<div class="gcm-stat-icon gcm-stat-icon--blue">👥</div>' +
        '<div class="gcm-stat-info">' +
          '<span class="gcm-stat-value">' + total + '</span>' +
          '<span class="gcm-stat-label">Total Customers</span>' +
        '</div>' +
      '</div>' +
      '<div class="gcm-stat-card">' +
        '<div class="gcm-stat-icon gcm-stat-icon--green">📈</div>' +
        '<div class="gcm-stat-info">' +
          '<span class="gcm-stat-value">' + activeThisMonth + '</span>' +
          '<span class="gcm-stat-label">Active This Month</span>' +
        '</div>' +
      '</div>' +
      '<div class="gcm-stat-card">' +
        '<div class="gcm-stat-icon gcm-stat-icon--purple">💷</div>' +
        '<div class="gcm-stat-info">' +
          '<span class="gcm-stat-value">' + formatCurrency(avgRevenue) + '</span>' +
          '<span class="gcm-stat-label">Avg Revenue / Customer</span>' +
        '</div>' +
      '</div>' +
      '<div class="gcm-stat-card">' +
        '<div class="gcm-stat-icon gcm-stat-icon--orange">🔁</div>' +
        '<div class="gcm-stat-info">' +
          '<span class="gcm-stat-value">' + repeatCustomers + '</span>' +
          '<span class="gcm-stat-label">Repeat Customers</span>' +
        '</div>' +
      '</div>'
    );
  };

  // --------------------------------------------------------------------------
  // renderList
  // --------------------------------------------------------------------------
  CustomerManager.prototype.renderList = function () {
    var area = this.$container.find('.gcm-list-area');
    if (!this.filtered.length) {
      area.html(
        '<div class="gcm-empty">' +
          '<div class="gcm-empty-icon">📋</div>' +
          '<h3>No customers found</h3>' +
          '<p>Add your first customer or adjust your search filters.</p>' +
        '</div>'
      );
      return;
    }

    var cards = this.filtered.map(function (c) {
      var active = isActiveCustomer(c.last_activity);
      var color = avatarColor(c.client_name);
      var ini = initials(c.first_name, c.last_name);

      return (
        '<div class="gcm-card" data-customer-id="' + escHtml(c.id) + '">' +
          '<div class="gcm-card-top">' +
            '<div class="gcm-avatar" style="background:' + color + '">' + escHtml(ini) + '</div>' +
            '<div class="gcm-card-info">' +
              '<h3 class="gcm-card-name">' + escHtml(c.client_name) + '</h3>' +
              (c.email ? '<p class="gcm-card-detail">✉️ ' + escHtml(c.email) + '</p>' : '') +
              (c.phone ? '<p class="gcm-card-detail">📞 ' + escHtml(c.phone) + '</p>' : '') +
            '</div>' +
            '<span class="gcm-badge ' + (active ? 'gcm-badge--active' : 'gcm-badge--inactive') + '">' +
              (active ? 'Active' : 'Inactive') +
            '</span>' +
          '</div>' +
          (c.address ? '<p class="gcm-card-address">📍 ' + escHtml(c.address) + '</p>' : '') +
          '<div class="gcm-card-metrics">' +
            '<div class="gcm-metric"><span class="gcm-metric-val">' + c.jobs.length + '</span><span class="gcm-metric-lbl">Quotes/Jobs</span></div>' +
            '<div class="gcm-metric"><span class="gcm-metric-val">' + formatCurrency(c.total_spend) + '</span><span class="gcm-metric-lbl">Total Spend</span></div>' +
            '<div class="gcm-metric"><span class="gcm-metric-val">' + formatDate(c.last_activity) + '</span><span class="gcm-metric-lbl">Last Activity</span></div>' +
          '</div>' +
          '<div class="gcm-card-actions">' +
            '<button class="gcm-btn gcm-btn-sm gcm-btn-outline gcm-view-btn" data-id="' + escHtml(c.id) + '">👁️ View</button>' +
            '<button class="gcm-btn gcm-btn-sm gcm-btn-outline gcm-edit-btn" data-id="' + escHtml(c.id) + '">✏️ Edit</button>' +
            '<button class="gcm-btn gcm-btn-sm gcm-btn-primary gcm-newquote-btn" data-id="' + escHtml(c.id) + '">📝 New Quote</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    area.html('<div class="gcm-grid">' + cards + '</div>');
  };

  // --------------------------------------------------------------------------
  // attachEvents
  // --------------------------------------------------------------------------
  CustomerManager.prototype.attachEvents = function () {
    var self = this;
    var $c = this.$container;

    // Search
    $c.on('input', '.gcm-search-input', debounce(function () {
      self.searchTerm = $(this).val();
      self.applyFilters();
      self.renderList();
    }, CONFIG.DEBOUNCE_DELAY));

    // Filter dropdown
    $c.on('change', '.gcm-filter-select', function () {
      self.filterStatus = $(this).val();
      self.applyFilters();
      self.renderList();
    });

    // Add Customer
    $c.on('click', '.gcm-add-btn', function () {
      self.openFormModal(null);
    });

    // View
    $c.on('click', '.gcm-view-btn', function (e) {
      e.stopPropagation();
      self.openDetailModal($(this).data('id'));
    });

    // Edit
    $c.on('click', '.gcm-edit-btn', function (e) {
      e.stopPropagation();
      var cust = self.findCustomer($(this).data('id'));
      if (cust) self.openFormModal(cust);
    });

    // New Quote
    $c.on('click', '.gcm-newquote-btn', function (e) {
      e.stopPropagation();
      self.createQuoteForCustomer($(this).data('id'));
    });

    // Card click → View
    $c.on('click', '.gcm-card', function (e) {
      if ($(e.target).closest('.gcm-btn').length) return;
      var id = $(this).data('customer-id');
      if (id) self.openDetailModal(id);
    });

    // Modal close (delegated to body)
    $(document).on('click', '.gcm-modal-overlay', function (e) {
      if (e.target === this) $(this).remove();
    });
    $(document).on('click', '.gcm-modal-close', function () {
      $(this).closest('.gcm-modal-overlay').remove();
    });
    $(document).on('keydown.gcm-modal', function (e) {
      if (e.key === 'Escape') $('.gcm-modal-overlay').remove();
    });
  };

  // --------------------------------------------------------------------------
  // findCustomer
  // --------------------------------------------------------------------------
  CustomerManager.prototype.findCustomer = function (id) {
    return this.customers.find(function (c) { return c.id === id; }) || null;
  };

  // --------------------------------------------------------------------------
  // openDetailModal
  // --------------------------------------------------------------------------
  CustomerManager.prototype.openDetailModal = function (id) {
    var c = this.findCustomer(id);
    if (!c) return;

    var self = this;
    var active = isActiveCustomer(c.last_activity);
    var color = avatarColor(c.client_name);
    var ini = initials(c.first_name, c.last_name);
    var notes = getNotes()[c.id] || '';

    var STATUS_COLORS = {
      'New': '#3498db', 'Quoted': '#f1c40f', 'Follow-up': '#e67e22',
      'Won': '#2ecc71', 'Lost': '#e74c3c', 'Completed': '#2ecc71',
      'In Progress': '#f39c12', 'Pending': '#95a5a6', 'Scheduled': '#3498db'
    };

    var timelineHtml = c.jobs.map(function (j) {
      var leadColor = STATUS_COLORS[j.lead_status] || '#6b7280';
      var installColor = STATUS_COLORS[j.install_status] || '#6b7280';
      return (
        '<div class="gcm-timeline-item">' +
          '<div class="gcm-timeline-dot" style="background:' + leadColor + '"></div>' +
          '<div class="gcm-timeline-content">' +
            '<div class="gcm-timeline-header">' +
              '<strong>' + escHtml(j.job_type || j.type || 'Job') + ' #' + j.id + '</strong>' +
              '<span class="gcm-timeline-date">' + formatDate(j.created_at || j.date) + '</span>' +
            '</div>' +
            '<div class="gcm-timeline-tags">' +
              '<span class="gcm-tag" style="background:' + leadColor + '20;color:' + leadColor + '">' + escHtml(j.lead_status || '—') + '</span>' +
              '<span class="gcm-tag" style="background:' + installColor + '20;color:' + installColor + '">' + escHtml(j.install_status || '—') + '</span>' +
              '<span class="gcm-tag gcm-tag--price">' + formatCurrency(j.price) + '</span>' +
            '</div>' +
            (j.notes ? '<p class="gcm-timeline-notes">' + escHtml(j.notes) + '</p>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('');

    var html =
      '<div class="gcm-modal-overlay">' +
        '<div class="gcm-modal gcm-modal--detail">' +
          '<div class="gcm-modal-head">' +
            '<h2>Customer Details</h2>' +
            '<button class="gcm-modal-close" title="Close (Esc)">×</button>' +
          '</div>' +
          '<div class="gcm-modal-body">' +
            '<div class="gcm-detail-profile">' +
              '<div class="gcm-detail-avatar" style="background:' + color + '">' + escHtml(ini) + '</div>' +
              '<div class="gcm-detail-info">' +
                '<h2>' + escHtml(c.client_name) + '</h2>' +
                '<span class="gcm-badge ' + (active ? 'gcm-badge--active' : 'gcm-badge--inactive') + '">' + (active ? 'Active' : 'Inactive') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="gcm-detail-grid">' +
              '<div class="gcm-detail-field"><span class="gcm-field-label">Email</span><span class="gcm-field-value">' + escHtml(c.email || '—') + '</span></div>' +
              '<div class="gcm-detail-field"><span class="gcm-field-label">Phone</span><span class="gcm-field-value">' + escHtml(c.phone || '—') + '</span></div>' +
              '<div class="gcm-detail-field"><span class="gcm-field-label">Address</span><span class="gcm-field-value">' + escHtml(c.address || '—') + '</span></div>' +
              '<div class="gcm-detail-field"><span class="gcm-field-label">Postcode</span><span class="gcm-field-value">' + escHtml(c.postcode || '—') + '</span></div>' +
              '<div class="gcm-detail-field"><span class="gcm-field-label">Total Spent</span><span class="gcm-field-value gcm-field-value--highlight">' + formatCurrency(c.total_spend) + '</span></div>' +
              '<div class="gcm-detail-field"><span class="gcm-field-label">Jobs / Quotes</span><span class="gcm-field-value">' + c.jobs.length + '</span></div>' +
            '</div>' +

            '<div class="gcm-detail-section">' +
              '<h3>📝 Notes</h3>' +
              '<textarea class="gcm-notes-textarea" data-cust-id="' + escHtml(c.id) + '" placeholder="Add notes about this customer…">' + escHtml(notes) + '</textarea>' +
              '<button class="gcm-btn gcm-btn-sm gcm-btn-outline gcm-save-notes-btn" data-cust-id="' + escHtml(c.id) + '">💾 Save Notes</button>' +
            '</div>' +

            '<div class="gcm-detail-section">' +
              '<h3>📋 Job Timeline</h3>' +
              (timelineHtml || '<p class="gcm-muted">No jobs recorded yet.</p>') +
            '</div>' +
          '</div>' +
          '<div class="gcm-modal-foot">' +
            '<button class="gcm-btn gcm-btn-outline gcm-modal-close">Close</button>' +
            '<button class="gcm-btn gcm-btn-primary gcm-detail-newquote-btn" data-id="' + escHtml(c.id) + '">📝 Create Quote</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    // Save notes handler
    $(document).on('click.gcm-notes', '.gcm-save-notes-btn', function () {
      var cid = $(this).data('cust-id');
      var txt = $(this).closest('.gcm-detail-section').find('.gcm-notes-textarea').val();
      saveNote(cid, txt);
      $(this).text('✅ Saved!');
      var btn = $(this);
      setTimeout(function () { btn.text('💾 Save Notes'); }, 1500);
    });

    // Create Quote from detail
    $(document).on('click.gcm-detailquote', '.gcm-detail-newquote-btn', function () {
      var custId = $(this).data('id');
      $('.gcm-modal-overlay').remove();
      self.createQuoteForCustomer(custId);
    });
  };

  // --------------------------------------------------------------------------
  // openFormModal (Add / Edit)
  // --------------------------------------------------------------------------
  CustomerManager.prototype.openFormModal = function (customer) {
    var self = this;
    var isEdit = !!customer;
    var title = isEdit ? '✏️ Edit Customer' : '➕ Add Customer';

    var html =
      '<div class="gcm-modal-overlay">' +
        '<div class="gcm-modal gcm-modal--form">' +
          '<div class="gcm-modal-head">' +
            '<h2>' + title + '</h2>' +
            '<button class="gcm-modal-close" title="Close (Esc)">×</button>' +
          '</div>' +
          '<form class="gcm-customer-form" autocomplete="off">' +
            '<div class="gcm-modal-body">' +
              '<div class="gcm-form-row">' +
                '<div class="gcm-form-group">' +
                  '<label>First Name *</label>' +
                  '<input type="text" name="first_name" class="gcm-input" required value="' + escHtml(isEdit ? customer.first_name : '') + '" />' +
                '</div>' +
                '<div class="gcm-form-group">' +
                  '<label>Last Name *</label>' +
                  '<input type="text" name="last_name" class="gcm-input" required value="' + escHtml(isEdit ? customer.last_name : '') + '" />' +
                '</div>' +
              '</div>' +
              '<div class="gcm-form-row">' +
                '<div class="gcm-form-group">' +
                  '<label>Email</label>' +
                  '<input type="email" name="email" class="gcm-input" value="' + escHtml(isEdit ? customer.email : '') + '" />' +
                '</div>' +
                '<div class="gcm-form-group">' +
                  '<label>Phone</label>' +
                  '<input type="tel" name="phone" class="gcm-input" value="' + escHtml(isEdit ? customer.phone : '') + '" />' +
                '</div>' +
              '</div>' +
              '<div class="gcm-form-group">' +
                '<label>Address</label>' +
                '<input type="text" name="address" class="gcm-input" value="' + escHtml(isEdit ? customer.address : '') + '" />' +
              '</div>' +
              '<div class="gcm-form-group">' +
                '<label>Postcode</label>' +
                '<input type="text" name="postcode" class="gcm-input gcm-input--short" value="' + escHtml(isEdit ? customer.postcode : '') + '" />' +
              '</div>' +
            '</div>' +
            '<div class="gcm-modal-foot">' +
              '<button type="button" class="gcm-btn gcm-btn-outline gcm-modal-close">Cancel</button>' +
              '<button type="submit" class="gcm-btn gcm-btn-primary">' + (isEdit ? '💾 Save Changes' : '➕ Add Customer') + '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';

    $('body').append(html);

    var editId = isEdit ? customer.id : null;

    $(document).on('submit.gcm-form', '.gcm-customer-form', function (e) {
      e.preventDefault();
      var formData = {};
      $(this).serializeArray().forEach(function (f) { formData[f.name] = f.value; });

      if (isEdit) {
        self.updateCustomer(editId, formData);
      } else {
        self.addCustomer(formData);
      }

      $(document).off('submit.gcm-form');
      $('.gcm-modal-overlay').remove();
    });

    setTimeout(function () { $('.gcm-customer-form input:first').trigger('focus'); }, 100);
  };

  // --------------------------------------------------------------------------
  // addCustomer
  // --------------------------------------------------------------------------
  CustomerManager.prototype.addCustomer = function (data) {
    var ds = window.DataStore;
    if (!ds) return;

    var clientName = ((data.first_name || '') + ' ' + (data.last_name || '')).trim();
    ds.create('jobs', {
      post_status: 'draft',
      lead_status: 'New',
      install_status: 'Pending',
      type: 'window',
      job_type: 'window',
      price: 0,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      client_name: clientName,
      email: data.email || '',
      client_email: data.email || '',
      phone: data.phone || '',
      client_phone: data.phone || '',
      address: data.address || '',
      postcode: data.postcode || '',
      date: new Date().toISOString()
    });

    this.loadData();
  };

  // --------------------------------------------------------------------------
  // updateCustomer — updates all jobs belonging to customer
  // --------------------------------------------------------------------------
  CustomerManager.prototype.updateCustomer = function (id, data) {
    var ds = window.DataStore;
    if (!ds) return;
    var cust = this.findCustomer(id);
    if (!cust) return;

    var clientName = ((data.first_name || '') + ' ' + (data.last_name || '')).trim();
    cust.jobs.forEach(function (j) {
      ds.update('jobs', j.id, {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        client_name: clientName,
        email: data.email || '',
        client_email: data.email || '',
        phone: data.phone || '',
        client_phone: data.phone || '',
        address: data.address || '',
        postcode: data.postcode || ''
      });
    });

    this.loadData();
  };

  // --------------------------------------------------------------------------
  // createQuoteForCustomer — switches to quotes panel
  // --------------------------------------------------------------------------
  CustomerManager.prototype.createQuoteForCustomer = function (id) {
    var c = this.findCustomer(id);
    if (!c) return;

    // Store prefill data for quotes panel to pick up
    window._gosPrefillQuote = {
      client_name: c.client_name,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      postcode: c.postcode
    };

    // Switch to quotes tab
    var $tab = $('.gsa-tab[data-tab="quotes"]');
    if ($tab.length) {
      $tab.trigger('click');
    } else {
      $(document).trigger('gsa:panel:activated', ['quotes']);
    }
  };

  // ==========================================================================
  // 5. CSS INJECTION
  // ==========================================================================
  CustomerManager.prototype.injectCSS = function () {
    if ($('#gcm-styles').length) return;

    var css = [
      // Wrapper
      '.gcm-wrap { padding: 24px 28px; height: 100%; display: flex; flex-direction: column; overflow: hidden; }',

      // Header
      '.gcm-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; flex-shrink: 0; }',
      '.gcm-header-left { display: flex; align-items: center; gap: 12px; }',
      '.gcm-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }',
      '.gcm-title { margin: 0; font-size: 22px; font-weight: 700; color: #1f2937; }',

      // Search box
      '.gcm-search-box { position: relative; }',
      '.gcm-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }',
      '.gcm-search-input { padding: 9px 14px 9px 36px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 13.5px; width: 240px; outline: none; transition: border-color .2s, box-shadow .2s; background: #fff; }',
      '.gcm-search-input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,.15); }',

      // Filter select
      '.gcm-filter-select { padding: 9px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 13.5px; outline: none; background: #fff; cursor: pointer; transition: border-color .2s; }',
      '.gcm-filter-select:focus { border-color: #667eea; }',

      // Buttons
      '.gcm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border: none; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .2s; text-decoration: none; }',
      '.gcm-btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; box-shadow: 0 2px 8px rgba(102,126,234,.25); }',
      '.gcm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(102,126,234,.35); }',
      '.gcm-btn-outline { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }',
      '.gcm-btn-outline:hover { border-color: #667eea; color: #667eea; background: #f0f2ff; }',
      '.gcm-btn-sm { padding: 6px 12px; font-size: 12.5px; border-radius: 8px; }',

      // Stats bar
      '.gcm-stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; flex-shrink: 0; }',
      '.gcm-stat-card { background: #fff; border-radius: 14px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f5; transition: transform .2s, box-shadow .2s; }',
      '.gcm-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }',
      '.gcm-stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }',
      '.gcm-stat-icon--blue { background: rgba(102,126,234,.12); }',
      '.gcm-stat-icon--green { background: rgba(16,185,129,.12); }',
      '.gcm-stat-icon--purple { background: rgba(118,75,162,.12); }',
      '.gcm-stat-icon--orange { background: rgba(245,158,11,.12); }',
      '.gcm-stat-info { display: flex; flex-direction: column; }',
      '.gcm-stat-value { font-size: 20px; font-weight: 700; color: #1f2937; line-height: 1.2; }',
      '.gcm-stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }',

      // List area
      '.gcm-list-area { flex: 1; overflow-y: auto; min-height: 0; padding-right: 4px; }',
      '.gcm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding-bottom: 20px; }',

      // Card
      '.gcm-card { background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.05); border: 1.5px solid #f0f0f5; cursor: pointer; transition: all .2s; }',
      '.gcm-card:hover { border-color: #667eea; box-shadow: 0 4px 20px rgba(102,126,234,.12); transform: translateY(-2px); }',
      '.gcm-card-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px; }',

      // Avatar
      '.gcm-avatar { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 16px; flex-shrink: 0; text-transform: uppercase; }',
      '.gcm-card-info { flex: 1; min-width: 0; }',
      '.gcm-card-name { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.gcm-card-detail { margin: 0; font-size: 12.5px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',

      // Badge
      '.gcm-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; flex-shrink: 0; }',
      '.gcm-badge--active { background: rgba(16,185,129,.12); color: #059669; }',
      '.gcm-badge--inactive { background: rgba(107,114,128,.1); color: #6b7280; }',

      // Address
      '.gcm-card-address { margin: 0 0 12px; font-size: 12.5px; color: #6b7280; }',

      // Metrics
      '.gcm-card-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 0; border-top: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6; margin-bottom: 12px; }',
      '.gcm-metric { text-align: center; }',
      '.gcm-metric-val { display: block; font-size: 13.5px; font-weight: 700; color: #1f2937; }',
      '.gcm-metric-lbl { display: block; font-size: 10.5px; color: #9ca3af; margin-top: 2px; }',

      // Card actions
      '.gcm-card-actions { display: flex; gap: 8px; }',
      '.gcm-card-actions .gcm-btn { flex: 1; justify-content: center; }',

      // Empty state
      '.gcm-empty { text-align: center; padding: 60px 20px; color: #6b7280; }',
      '.gcm-empty-icon { font-size: 48px; margin-bottom: 12px; }',
      '.gcm-empty h3 { margin: 0 0 8px; color: #374151; }',
      '.gcm-empty p { margin: 0; font-size: 14px; }',

      // Modal overlay
      '.gcm-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: gcmFadeIn .2s ease; }',
      '@keyframes gcmFadeIn { from { opacity: 0; } to { opacity: 1; } }',

      // Modal
      '.gcm-modal { background: #fff; border-radius: 18px; width: 94%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.18); animation: gcmSlideUp .25s ease; overflow: hidden; }',
      '.gcm-modal--detail { max-width: 720px; }',
      '@keyframes gcmSlideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }',
      '.gcm-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }',
      '.gcm-modal-head h2 { margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; }',
      '.gcm-modal-close { width: 34px; height: 34px; border-radius: 10px; border: none; background: #f3f4f6; color: #6b7280; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }',
      '.gcm-modal-close:hover { background: #fee2e2; color: #ef4444; }',
      '.gcm-modal-body { padding: 24px; overflow-y: auto; flex: 1; }',
      '.gcm-modal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f3f4f6; flex-shrink: 0; }',

      // Detail profile header
      '.gcm-detail-profile { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }',
      '.gcm-detail-avatar { width: 60px; height: 60px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 22px; flex-shrink: 0; }',
      '.gcm-detail-info h2 { margin: 0 0 6px; font-size: 20px; color: #1f2937; }',

      // Detail grid
      '.gcm-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }',
      '.gcm-detail-field { background: #f8f9fb; border-radius: 10px; padding: 12px 16px; }',
      '.gcm-field-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #9ca3af; margin-bottom: 4px; font-weight: 600; }',
      '.gcm-field-value { display: block; font-size: 14px; color: #1f2937; font-weight: 500; }',
      '.gcm-field-value--highlight { color: #667eea; font-weight: 700; }',

      // Detail sections
      '.gcm-detail-section { margin-bottom: 20px; }',
      '.gcm-detail-section h3 { font-size: 15px; font-weight: 700; color: #374151; margin: 0 0 12px; }',

      // Notes textarea
      '.gcm-notes-textarea { width: 100%; min-height: 80px; padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 13.5px; font-family: inherit; outline: none; resize: vertical; transition: border-color .2s; margin-bottom: 8px; }',
      '.gcm-notes-textarea:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,.1); }',

      // Timeline
      '.gcm-timeline-item { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }',
      '.gcm-timeline-item:last-child { border-bottom: none; }',
      '.gcm-timeline-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }',
      '.gcm-timeline-content { flex: 1; min-width: 0; }',
      '.gcm-timeline-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }',
      '.gcm-timeline-header strong { font-size: 13.5px; color: #1f2937; text-transform: capitalize; }',
      '.gcm-timeline-date { font-size: 12px; color: #9ca3af; }',
      '.gcm-timeline-tags { display: flex; gap: 6px; flex-wrap: wrap; }',
      '.gcm-tag { padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }',
      '.gcm-tag--price { background: rgba(102,126,234,.1); color: #667eea; }',
      '.gcm-timeline-notes { margin: 6px 0 0; font-size: 12.5px; color: #6b7280; }',
      '.gcm-muted { color: #9ca3af; font-size: 13px; }',

      // Form
      '.gcm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }',
      '.gcm-form-group { margin-bottom: 16px; }',
      '.gcm-form-group label { display: block; font-size: 12.5px; font-weight: 600; color: #374151; margin-bottom: 6px; }',
      '.gcm-input { width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-family: inherit; outline: none; transition: border-color .2s, box-shadow .2s; }',
      '.gcm-input:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,.12); }',
      '.gcm-input--short { max-width: 200px; }',

      // Responsive
      '@media (max-width: 900px) {',
      '  .gcm-grid { grid-template-columns: 1fr; }',
      '  .gcm-stats-bar { grid-template-columns: repeat(2, 1fr); }',
      '  .gcm-header { flex-direction: column; align-items: flex-start; }',
      '  .gcm-detail-grid { grid-template-columns: 1fr; }',
      '}',
      '@media (max-width: 600px) {',
      '  .gcm-stats-bar { grid-template-columns: 1fr; }',
      '  .gcm-wrap { padding: 16px; }',
      '  .gcm-search-input { width: 180px; }',
      '}'
    ].join('\n');

    $('<style id="gcm-styles"></style>').text(css).appendTo('head');
  };

  // ==========================================================================
  // 6. INITIALIZATION
  // ==========================================================================
  $(document).on('gsa:panel:activated', function (e, tab) {
    if (tab !== 'customers') return;

    var $panel = $('#gsa-customers');
    if (!$panel.length) return;

    if (!$panel.data('customerManager')) {
      var manager = new CustomerManager($panel);
      $panel.data('customerManager', manager);
      manager.init();
    } else {
      $panel.data('customerManager').refresh();
    }
  });

})(jQuery, window, document);
