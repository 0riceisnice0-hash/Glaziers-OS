/**
 * DataStore.js - localStorage abstraction layer for GlazierOS static site
 * Replaces all WordPress REST API calls with localStorage CRUD operations.
 */
(function (window) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Storage key map
  // ---------------------------------------------------------------------------
  const KEYS = {
    jobs:         'gos_jobs',
    clients:      'gos_clients',
    fitters:      'gos_fitters',
    branches:     'gos_branches',
    settings:     'gos_settings',
    audit_logs:   'gos_audit_logs',
    invoices:     'gos_invoices',
    transactions: 'gos_transactions',
    diary_events: 'gos_diary_events',
    expenses:     'gos_expenses',
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function now() {
    return new Date().toISOString();
  }

  function read(type) {
    const key = KEYS[type] || ('gos_' + type);
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }

  function write(type, data) {
    const key = KEYS[type] || ('gos_' + type);
    localStorage.setItem(key, JSON.stringify(data));
  }

  function nextId(records) {
    if (!records.length) return 1;
    return Math.max(...records.map(function (r) { return Number(r.id) || 0; })) + 1;
  }

  function mockResponse(data, status, extraHeaders) {
    status = status || 200;
    var headerMap = Object.assign({
      'Content-Type':   'application/json',
      'X-WP-TotalPages': '1',
      'X-WP-Total':     Array.isArray(data) ? String(data.length) : '1',
    }, extraHeaders || {});
    return {
      ok:     status >= 200 && status < 300,
      status: status,
      headers: {
        get: function (name) { return headerMap[name] || null; },
      },
      json: function () { return Promise.resolve(data); },
      text: function () { return Promise.resolve(JSON.stringify(data)); },
    };
  }

  // ---------------------------------------------------------------------------
  // DataStore class
  // ---------------------------------------------------------------------------
  function DataStore() {}

  DataStore.prototype.getAll = function (type) {
    return read(type);
  };

  DataStore.prototype.getById = function (type, id) {
    var records = read(type);
    return records.find(function (r) { return String(r.id) === String(id); }) || null;
  };

  DataStore.prototype.create = function (type, data) {
    var records = read(type);
    var record = Object.assign({}, data, {
      id:         nextId(records),
      created_at: now(),
      updated_at: now(),
    });
    records.push(record);
    write(type, records);
    return record;
  };

  DataStore.prototype.update = function (type, id, data) {
    var records = read(type);
    var idx = records.findIndex(function (r) { return String(r.id) === String(id); });
    if (idx === -1) return null;
    records[idx] = Object.assign({}, records[idx], data, {
      id:         records[idx].id,
      updated_at: now(),
    });
    write(type, records);
    return records[idx];
  };

  DataStore.prototype.delete = function (type, id) {
    var records = read(type);
    var len = records.length;
    var filtered = records.filter(function (r) { return String(r.id) !== String(id); });
    if (filtered.length === len) return false;
    write(type, filtered);
    return true;
  };

  DataStore.prototype.query = function (type, filters) {
    var records = read(type);
    if (!filters || !Object.keys(filters).length) return records;
    return records.filter(function (record) {
      return Object.keys(filters).every(function (key) {
        return String(record[key]) === String(filters[key]);
      });
    });
  };

  // ---------------------------------------------------------------------------
  // Seed demo data
  // ---------------------------------------------------------------------------
  DataStore.prototype.seed = function () {
    if (localStorage.getItem('gos_seeded')) return;

    // Branches
    write('branches', [
      { id: 1, name: 'London HQ',          postcode: 'EC1A 1BB', created_at: now(), updated_at: now() },
      { id: 2, name: 'Manchester Branch',  postcode: 'M1 1AD',   created_at: now(), updated_at: now() },
      { id: 3, name: 'Birmingham Branch',  postcode: 'B1 1BB',   created_at: now(), updated_at: now() },
    ]);

    // Fitters / team members – includes fields expected by team.js
    write('fitters', [
      { id: 1, name: 'James Wilson',   email: 'james.wilson@glazieros.co.uk',   phone: '07700 900001', mobile: '07700 900001', branch_id: 1, branch: 'London HQ',   role: 'fitter',     job_title: 'Senior Fitter',   skills: ['window_install', 'door_install'], status: 'active', hourly_rate: 22, salary: 42000, start_date: '2022-03-15', contract_type: 'Full-time', pto_earned: 25, pto_taken: 8,  pto_remaining: 17, sick_days_used: 2, hours_this_week: 38, hours_this_month: 152, created_at: now(), updated_at: now() },
      { id: 2, name: 'Sarah Brown',    email: 'sarah.brown@glazieros.co.uk',    phone: '07700 900002', mobile: '07700 900002', branch_id: 1, branch: 'London HQ',   role: 'fitter',     job_title: 'Fitter',          skills: ['window_install'],                status: 'active', hourly_rate: 18, salary: 34000, start_date: '2023-01-10', contract_type: 'Full-time', pto_earned: 25, pto_taken: 5,  pto_remaining: 20, sick_days_used: 1, hours_this_week: 40, hours_this_month: 160, created_at: now(), updated_at: now() },
      { id: 3, name: 'Mike Davies',    email: 'mike.davies@glazieros.co.uk',    phone: '07700 900003', mobile: '07700 900003', branch_id: 2, branch: 'Manchester',  role: 'fitter',     job_title: 'Lead Fitter',     skills: ['window_install', 'door_install'], status: 'active', hourly_rate: 24, salary: 46000, start_date: '2021-06-01', contract_type: 'Full-time', pto_earned: 28, pto_taken: 12, pto_remaining: 16, sick_days_used: 0, hours_this_week: 36, hours_this_month: 144, created_at: now(), updated_at: now() },
      { id: 4, name: 'Emma Thompson',  email: 'emma.thompson@glazieros.co.uk',  phone: '07700 900004', mobile: '07700 900004', branch_id: 2, branch: 'Manchester',  role: 'surveyor',   job_title: 'Surveyor',        skills: ['door_install'],                  status: 'active', hourly_rate: 20, salary: 38000, start_date: '2023-09-20', contract_type: 'Full-time', pto_earned: 25, pto_taken: 3,  pto_remaining: 22, sick_days_used: 1, hours_this_week: 32, hours_this_month: 128, created_at: now(), updated_at: now() },
      { id: 5, name: 'Tom Harris',     email: 'tom.harris@glazieros.co.uk',     phone: '07700 900005', mobile: '07700 900005', branch_id: 3, branch: 'Birmingham',  role: 'apprentice', job_title: 'Apprentice Fitter', skills: ['window_install', 'door_install'], status: 'active', hourly_rate: 12, salary: 22000, start_date: '2024-02-01', contract_type: 'Full-time', pto_earned: 25, pto_taken: 2,  pto_remaining: 23, sick_days_used: 0, hours_this_week: 40, hours_this_month: 160, created_at: now(), updated_at: now() },
    ]);

    // Jobs (with embedded client data)
    // Field aliases: type=job_type, first_name/last_name split from client_name,
    //                email=client_email, phone=client_phone, date=created_at
    write('jobs', [
      {
        id: 1, post_status: 'publish',
        first_name: 'John', last_name: 'Smith',
        client_name: 'John Smith', email: 'john.smith@example.co.uk', client_email: 'john.smith@example.co.uk',
        phone: '07900 100001', client_phone: '07900 100001',
        address: '12 Oak Street, London, E1 4AB',
        type: 'window', job_type: 'window', width: 1.2, height: 1.5, price: 540,
        lead_status: 'Won', install_status: 'Completed',
        branch_id: 1, fitter_id: 1,
        notes: 'Double-glazed uPVC window, white frame.',
        date: '2024-11-01T09:00:00.000Z',
        created_at: '2024-11-01T09:00:00.000Z', updated_at: '2024-11-15T14:00:00.000Z',
      },
      {
        id: 2, post_status: 'publish',
        first_name: 'Sarah', last_name: 'Johnson',
        client_name: 'Sarah Johnson', email: 'sarah.johnson@example.co.uk', client_email: 'sarah.johnson@example.co.uk',
        phone: '07900 100002', client_phone: '07900 100002',
        address: '45 Elm Avenue, Manchester, M14 5AB',
        type: 'door', job_type: 'door', width: 0.9, height: 2.1, price: 630,
        lead_status: 'Quoted', install_status: 'Pending',
        branch_id: 2, fitter_id: null,
        notes: 'Composite front door, anthracite grey.',
        date: '2024-11-05T10:30:00.000Z',
        created_at: '2024-11-05T10:30:00.000Z', updated_at: '2024-11-05T10:30:00.000Z',
      },
      {
        id: 3, post_status: 'publish',
        first_name: 'Robert', last_name: 'Williams',
        client_name: 'Robert Williams', email: 'robert.williams@example.co.uk', client_email: 'robert.williams@example.co.uk',
        phone: '07900 100003', client_phone: '07900 100003',
        address: '8 Birch Lane, Birmingham, B12 9QP',
        type: 'window', job_type: 'window', width: 2.4, height: 1.2, price: 864,
        lead_status: 'New', install_status: 'Pending',
        branch_id: 3, fitter_id: null,
        notes: 'Bay window, triple glazed.',
        date: '2024-11-10T08:00:00.000Z',
        created_at: '2024-11-10T08:00:00.000Z', updated_at: '2024-11-10T08:00:00.000Z',
      },
      {
        id: 4, post_status: 'publish',
        first_name: 'Emily', last_name: 'Brown',
        client_name: 'Emily Brown', email: 'emily.brown@example.co.uk', client_email: 'emily.brown@example.co.uk',
        phone: '07900 100004', client_phone: '07900 100004',
        address: '23 Cedar Road, Leeds, LS6 2DT',
        type: 'door', job_type: 'door', width: 1.0, height: 2.2, price: 704,
        lead_status: 'Follow-up', install_status: 'Scheduled',
        branch_id: 2, fitter_id: 3,
        notes: 'Bi-fold door, aluminium, cream.',
        date: '2024-11-12T11:00:00.000Z',
        created_at: '2024-11-12T11:00:00.000Z', updated_at: '2024-11-18T09:00:00.000Z',
      },
      {
        id: 5, post_status: 'publish',
        first_name: 'David', last_name: 'Taylor',
        client_name: 'David Taylor', email: 'david.taylor@example.co.uk', client_email: 'david.taylor@example.co.uk',
        phone: '07900 100005', client_phone: '07900 100005',
        address: '67 Maple Drive, Bristol, BS1 4QT',
        type: 'window', job_type: 'window', width: 1.8, height: 1.5, price: 810,
        lead_status: 'Won', install_status: 'In Progress',
        branch_id: 1, fitter_id: 2,
        notes: 'Sash window replacement, painted finish.',
        date: '2024-11-14T13:00:00.000Z',
        created_at: '2024-11-14T13:00:00.000Z', updated_at: '2024-11-20T10:00:00.000Z',
      },
      {
        id: 6, post_status: 'publish',
        first_name: 'Linda', last_name: 'Anderson',
        client_name: 'Linda Anderson', email: 'linda.anderson@example.co.uk', client_email: 'linda.anderson@example.co.uk',
        phone: '07900 100006', client_phone: '07900 100006',
        address: '3 Pine Close, Sheffield, S1 2BQ',
        type: 'window', job_type: 'window', width: 1.0, height: 1.0, price: 300,
        lead_status: 'Lost', install_status: 'Pending',
        branch_id: 3, fitter_id: null,
        notes: 'Small bedroom window, standard clear glass.',
        date: '2024-11-16T15:00:00.000Z',
        created_at: '2024-11-16T15:00:00.000Z', updated_at: '2024-11-17T08:00:00.000Z',
      },
    ]);

    // Settings
    write('settings', [
      {
        id: 1,
        pricing: { window: 300, door: 350 },
        form_fields: [
          { id: 'client_name',  label: 'Client Name',  type: 'text',   required: true  },
          { id: 'client_email', label: 'Email',        type: 'email',  required: false },
          { id: 'client_phone', label: 'Phone',        type: 'tel',    required: false },
          { id: 'address',      label: 'Address',      type: 'text',   required: true  },
          { id: 'job_type',     label: 'Job Type',     type: 'select', required: true, options: ['window','door'] },
          { id: 'width',        label: 'Width (m)',    type: 'number', required: true  },
          { id: 'height',       label: 'Height (m)',   type: 'number', required: true  },
          { id: 'notes',        label: 'Notes',        type: 'textarea',required: false },
        ],
        pricing_rules: [
          { id: 1, product_type: 'Standard Window', type: 'window', base_price: 300, price_per_sqm: 150 },
          { id: 2, product_type: 'Standard Door',   type: 'door',   base_price: 350, price_per_sqm: 200 },
        ],
        created_at: now(), updated_at: now(),
      },
    ]);

    // Audit logs — field names match audit-logs.js render expectations:
    // action, user, object_id, object_type, ip_address, date
    var auditBase = '2024-11-';
    write('audit_logs', [
      { id: 1, action: 'quote_created',     user: 'admin', object_id: 1, object_type: 'job', ip_address: '192.168.1.1', date: auditBase + '01T09:05:00.000Z', created_at: auditBase + '01T09:05:00.000Z', updated_at: auditBase + '01T09:05:00.000Z' },
      { id: 2, action: 'status_updated',    user: 'admin', object_id: 1, object_type: 'job', ip_address: '192.168.1.1', date: auditBase + '10T11:00:00.000Z', created_at: auditBase + '10T11:00:00.000Z', updated_at: auditBase + '10T11:00:00.000Z' },
      { id: 3, action: 'invoice_generated', user: 'admin', object_id: 1, object_type: 'job', ip_address: '192.168.1.1', date: auditBase + '15T14:05:00.000Z', created_at: auditBase + '15T14:05:00.000Z', updated_at: auditBase + '15T14:05:00.000Z' },
      { id: 4, action: 'quote_created',     user: 'admin', object_id: 2, object_type: 'job', ip_address: '192.168.1.2', date: auditBase + '05T10:35:00.000Z', created_at: auditBase + '05T10:35:00.000Z', updated_at: auditBase + '05T10:35:00.000Z' },
      { id: 5, action: 'quote_created',     user: 'admin', object_id: 3, object_type: 'job', ip_address: '192.168.1.2', date: auditBase + '10T08:10:00.000Z', created_at: auditBase + '10T08:10:00.000Z', updated_at: auditBase + '10T08:10:00.000Z' },
      { id: 6, action: 'status_updated',    user: 'admin', object_id: 4, object_type: 'job', ip_address: '192.168.1.3', date: auditBase + '18T09:05:00.000Z', created_at: auditBase + '18T09:05:00.000Z', updated_at: auditBase + '18T09:05:00.000Z' },
      { id: 7, action: 'status_updated',    user: 'admin', object_id: 5, object_type: 'job', ip_address: '192.168.1.3', date: auditBase + '20T10:05:00.000Z', created_at: auditBase + '20T10:05:00.000Z', updated_at: auditBase + '20T10:05:00.000Z' },
      { id: 8, action: 'invoice_generated', user: 'admin', object_id: 5, object_type: 'job', ip_address: '192.168.1.4', date: auditBase + '20T10:10:00.000Z', created_at: auditBase + '20T10:10:00.000Z', updated_at: auditBase + '20T10:10:00.000Z' },
    ]);

    // Invoices
    // Invoices – fields match finance.js expectations (customer_name, total_amount, balance_due)
    write('invoices', [
      { id: 1, invoice_number: 'INV-0001', job_id: 1, customer_name: 'John Smith',  client_name: 'John Smith',  amount: 540, total_amount: 540, balance_due: 0,   vat_rate: 20, status: 'paid',   issued_date: '2024-11-15', due_date: '2024-11-29', created_at: now(), updated_at: now() },
      { id: 2, invoice_number: 'INV-0002', job_id: 5, customer_name: 'David Taylor', client_name: 'David Taylor', amount: 810, total_amount: 810, balance_due: 810, vat_rate: 20, status: 'unpaid', issued_date: '2024-11-20', due_date: '2024-12-04', created_at: now(), updated_at: now() },
    ]);

    // Expenses – fields match finance.js expectations (total_amount alias)
    write('expenses', [
      { id: 1, category: 'materials',  description: 'uPVC profiles x 20m',     amount: 180.00, total_amount: 180.00, date: '2024-11-01', created_at: now(), updated_at: now() },
      { id: 2, category: 'fuel',       description: 'Fuel – London runs',      amount:  45.50, total_amount:  45.50, date: '2024-11-12', created_at: now(), updated_at: now() },
      { id: 3, category: 'tools',      description: 'Glass cutter replacement', amount:  22.99, total_amount:  22.99, date: '2024-11-18', created_at: now(), updated_at: now() },
    ]);

    // Diary events
    write('diary_events', [
      { id: 1, title: 'Install – John Smith',    job_id: 1, fitter_id: 1, start: '2024-11-15T09:00:00', end: '2024-11-15T13:00:00', color: '#28a745', status: 'completed', created_at: now(), updated_at: now() },
      { id: 2, title: 'Measure – Emily Brown',   job_id: 4, fitter_id: 3, start: '2024-11-21T10:00:00', end: '2024-11-21T11:00:00', color: '#007bff', status: 'scheduled', created_at: now(), updated_at: now() },
      { id: 3, title: 'Install – David Taylor',  job_id: 5, fitter_id: 2, start: '2024-11-22T08:00:00', end: '2024-11-22T14:00:00', color: '#ffc107', status: 'scheduled', created_at: now(), updated_at: now() },
    ]);

    localStorage.setItem('gos_seeded', '1');
  };

  // ---------------------------------------------------------------------------
  // Stats helper
  // ---------------------------------------------------------------------------
  DataStore.prototype._calcStats = function () {
    var jobs = this.getAll('jobs');
    var invoices = this.getAll('invoices');

    var byLead = {};
    var byInstall = {};
    var wonPrices = [];

    jobs.forEach(function (j) {
      byLead[j.lead_status]       = (byLead[j.lead_status]       || 0) + 1;
      byInstall[j.install_status] = (byInstall[j.install_status] || 0) + 1;
      if (j.lead_status === 'Won') wonPrices.push(Number(j.price) || 0);
    });

    var overdueCount = invoices.filter(function (inv) {
      return inv.status === 'unpaid' && new Date(inv.due_date) < new Date();
    }).length;

    return {
      total_jobs:        jobs.length,
      total_leads:       jobs.length,
      total_quotes:      jobs.filter(function (j) { return j.lead_status === 'Quoted'; }).length,
      active_jobs:       jobs.filter(function (j) { return j.install_status === 'In Progress'; }).length,
      overdue_invoices:  overdueCount,
      by_lead_status:    byLead,
      by_install_status: byInstall,
      won_jobs_prices:   wonPrices,
    };
  };

  // ---------------------------------------------------------------------------
  // Finance analytics helper
  // ---------------------------------------------------------------------------
  DataStore.prototype._financeAnalytics = function () {
    var invoices = this.getAll('invoices');
    var expenses = this.getAll('expenses');
    var totalRevenue  = invoices.reduce(function (s, i) { return s + (Number(i.total_amount) || Number(i.amount) || 0); }, 0);
    var paidRevenue   = invoices.filter(function (i) { return i.status === 'paid'; }).reduce(function (s, i) { return s + (Number(i.total_amount) || Number(i.amount) || 0); }, 0);
    var totalExpenses = expenses.reduce(function (s, e) { return s + (Number(e.total_amount) || Number(e.amount) || 0); }, 0);
    var netProfit = paidRevenue - totalExpenses;
    var profitMargin = paidRevenue > 0 ? ((netProfit / paidRevenue) * 100).toFixed(1) : '0.0';
    var overdueInvoices = invoices.filter(function (i) {
      return i.status !== 'paid' && new Date(i.due_date) < new Date();
    }).length;

    return {
      // Fields expected by finance.js renderAnalytics
      revenue:          totalRevenue,
      expenses:         totalExpenses,
      net_profit:       netProfit,
      profit_margin:    profitMargin,
      outstanding:      totalRevenue - paidRevenue,
      overdue_invoices: overdueInvoices,
      // Legacy aliases
      total_revenue:    totalRevenue,
      paid_revenue:     paidRevenue,
      total_expenses:   totalExpenses,
      invoice_count:    invoices.length,
      paid_count:       invoices.filter(function (i) { return i.status === 'paid'; }).length,
      unpaid_count:     invoices.filter(function (i) { return i.status === 'unpaid'; }).length,
    };
  };

  // ---------------------------------------------------------------------------
  // Singleton
  // ---------------------------------------------------------------------------
  var ds = new DataStore();
  ds.seed();
  window.DataStore = ds;

  // ---------------------------------------------------------------------------
  // WordPress API compatibility shim
  // ---------------------------------------------------------------------------
  window.wpApiSettings = { root: '/wp-json/', nonce: 'static-demo', siteurl: '' };

  // ---------------------------------------------------------------------------
  // jQuery utilities that WordPress / plugins used to provide
  // ---------------------------------------------------------------------------
  if (window.jQuery && !window.jQuery.debounce) {
    window.jQuery.debounce = function (delay, fn) {
      var timer;
      return function () {
        var args = arguments, ctx = this;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
      };
    };
  }

  // ---------------------------------------------------------------------------
  // fetch override – routes /wp-json/ calls to DataStore
  // ---------------------------------------------------------------------------
  var _nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (url, options) {
    var urlStr = (typeof url === 'string') ? url : (url.url || String(url));

    if (urlStr.indexOf('/wp-json/') === -1) {
      return _nativeFetch ? _nativeFetch(url, options) : Promise.reject(new Error('fetch not available'));
    }

    options  = options || {};
    var method  = (options.method || 'GET').toUpperCase();
    var body    = {};

    if (options.body) {
      try {
        body = (typeof options.body === 'string') ? JSON.parse(options.body) : options.body;
      } catch (e) {
        body = {};
      }
    }

    // Strip query string for pattern matching
    var path = urlStr.replace(/^https?:\/\/[^/]+/, '').split('?')[0];

    // -----------------------------------------------------------------------
    // Route matching helpers
    // -----------------------------------------------------------------------
    function seg(path) { return path.replace(/^\/wp-json/, '').replace(/\/$/, ''); }
    var p = seg(path);

    // Jobs
    if (p === '/glazieros/v1/jobs' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('jobs')));
    }
    if (p === '/glazieros/v1/jobs' && method === 'POST') {
      return Promise.resolve(mockResponse(ds.create('jobs', body)));
    }
    // Quote creation alias (quotes-v2.js POSTs to /quote singular)
    if (p === '/glazieros/v1/quote' && method === 'POST') {
      var newJob = ds.create('jobs', Object.assign({ post_status: 'publish', install_status: 'Pending' }, body));
      return Promise.resolve(mockResponse(newJob));
    }
    // Bulk delete jobs
    var jobsBulkDelete = p.match(/^\/glazieros\/v1\/jobs\/bulk-delete$/);
    if (jobsBulkDelete && method === 'POST') {
      var bulkIds = body.ids || [];
      bulkIds.forEach(function (id) { ds.delete('jobs', id); });
      return Promise.resolve(mockResponse({ success: true, deleted: bulkIds.length }));
    }
    var jobIdMatch = p.match(/^\/glazieros\/v1\/jobs\/(\d+)$/);
    if (jobIdMatch) {
      var jid = jobIdMatch[1];
      if (method === 'GET')    return Promise.resolve(mockResponse(ds.getById('jobs', jid)));
      if (method === 'POST' || method === 'PUT' || method === 'PATCH')
                               return Promise.resolve(mockResponse(ds.update('jobs', jid, body)));
      if (method === 'DELETE') return Promise.resolve(mockResponse({ deleted: ds.delete('jobs', jid) }));
    }
    var jobStatusMatch = p.match(/^\/glazieros\/v1\/jobs\/(\d+)\/status$/);
    if (jobStatusMatch && method === 'POST') {
      var jsid = jobStatusMatch[1];
      var statusUpdate = {};
      // quotes-v2.js sends { status, type } where type is 'lead' or 'install'
      if (body.type === 'lead')    statusUpdate.lead_status    = body.status;
      if (body.type === 'install') statusUpdate.install_status = body.status;
      // also accept direct field names as fallback
      if (body.lead_status)    statusUpdate.lead_status    = body.lead_status;
      if (body.install_status) statusUpdate.install_status = body.install_status;
      return Promise.resolve(mockResponse(ds.update('jobs', jsid, statusUpdate)));
    }
    var jobDetailsMatch = p.match(/^\/glazieros\/v1\/jobs\/(\d+)\/details$/);
    if (jobDetailsMatch && method === 'POST') {
      var jdid = jobDetailsMatch[1];
      var updated = ds.update('jobs', jdid, body);
      return Promise.resolve(mockResponse({ saved: true, job_id: jdid, job: updated }));
    }
    var jobInvoiceMatch = p.match(/^\/glazieros\/v1\/jobs\/(\d+)\/invoice$/);
    if (jobInvoiceMatch && method === 'POST') {
      var jiid   = jobInvoiceMatch[1];
      var allInv = ds.getAll('invoices');
      var invNum = 'INV-' + String(allInv.length + 1).padStart(4, '0');
      var job    = ds.getById('jobs', jiid);
      var invoiceAmount = job ? (Number(job.price) || 0) : 0;
      ds.create('invoices', {
        invoice_number: invNum,
        job_id:         jiid,
        client_name:    job ? (job.client_name || '') : '',
        customer_name:  job ? (job.client_name || '') : '',
        amount:         invoiceAmount,
        total_amount:   invoiceAmount,
        balance_due:    invoiceAmount,
        vat_rate:       20,
        status:         'unpaid',
        issued_date:    new Date().toISOString().slice(0, 10),
        due_date:       new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      });
      return Promise.resolve(mockResponse({ success: true, invoice_url: '#', invoice_number: invNum }));
    }
    var jobScheduleMatch = p.match(/^\/glazieros\/v1\/jobs\/(\d+)\/schedule$/);
    if (jobScheduleMatch) {
      var jscid = jobScheduleMatch[1];
      if (method === 'GET') {
        var sJob = ds.getById('jobs', jscid);
        return Promise.resolve(mockResponse({ job_id: jscid, schedule: sJob ? sJob.schedule || {} : {} }));
      }
      return Promise.resolve(mockResponse(ds.update('jobs', jscid, { schedule: body })));
    }

    // Quotes convert
    var quoteConvertMatch = p.match(/^\/glazieros\/v1\/quotes\/(\d+)\/convert$/);
    if (quoteConvertMatch && method === 'POST') {
      var qcid = quoteConvertMatch[1];
      ds.update('jobs', qcid, { post_status: 'publish', lead_status: 'Won' });
      return Promise.resolve(mockResponse({ success: true }));
    }

    // Team / fitters
    if (p === '/glazieros/v1/team' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('fitters')));
    }
    if (p === '/glazieros/v1/team' && method === 'POST') {
      return Promise.resolve(mockResponse(ds.create('fitters', body)));
    }
    if (p === '/glazieros/v1/team/documents') {
      return Promise.resolve(mockResponse([]));
    }
    var teamIdMatch = p.match(/^\/glazieros\/v1\/team\/(\d+)$/);
    if (teamIdMatch) {
      var tid = teamIdMatch[1];
      if (method === 'GET')    return Promise.resolve(mockResponse(ds.getById('fitters', tid)));
      if (method === 'POST' || method === 'PUT' || method === 'PATCH')
                               return Promise.resolve(mockResponse(ds.update('fitters', tid, body)));
      if (method === 'DELETE') return Promise.resolve(mockResponse({ deleted: ds.delete('fitters', tid) }));
    }
    var teamAvailMatch = p.match(/^\/glazieros\/v1\/team\/(\d+)\/availability$/);
    if (teamAvailMatch && method === 'POST') {
      return Promise.resolve(mockResponse({ success: true }));
    }

    // Fitters alias
    if (p === '/glazieros/v1/fitters' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('fitters')));
    }

    // Branches (WP CPT REST style)
    if (p === '/wp/v2/gos_branch' && method === 'GET') {
      var branches = ds.getAll('branches');
      var formatted = branches.map(function (b) {
        return { id: b.id, title: { rendered: b.name }, slug: b.name, postcode: b.postcode, meta: b };
      });
      return Promise.resolve(mockResponse(formatted));
    }
    if (p === '/wp/v2/gos_branch' && method === 'POST') {
      var nb = ds.create('branches', { name: body.title || body.name, postcode: body.postcode || '' });
      return Promise.resolve(mockResponse({ id: nb.id, title: { rendered: nb.name }, meta: nb }));
    }
    var branchIdMatch = p.match(/^\/wp\/v2\/gos_branch\/(\d+)$/);
    if (branchIdMatch) {
      var bid = branchIdMatch[1];
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        var ub = ds.update('branches', bid, { name: body.title || body.name || undefined, postcode: body.postcode || undefined });
        return Promise.resolve(mockResponse({ id: ub.id, title: { rendered: ub.name }, meta: ub }));
      }
      if (method === 'DELETE') return Promise.resolve(mockResponse({ deleted: ds.delete('branches', bid) }));
    }

    // Settings – pricing
    if (p === '/glazieros/v1/settings/pricing') {
      if (method === 'GET') {
        var sArr = ds.getAll('settings');
        return Promise.resolve(mockResponse((sArr[0] && sArr[0].pricing) || { window: 300, door: 350 }));
      }
      if (method === 'POST') {
        var curSettings = ds.getAll('settings');
        if (curSettings.length) {
          ds.update('settings', curSettings[0].id, { pricing: body });
        } else {
          ds.create('settings', { pricing: body });
        }
        return Promise.resolve(mockResponse({ success: true, pricing: body }));
      }
    }

    // Settings – form fields
    if (p === '/glazieros/v1/settings/form') {
      var sArr2 = ds.getAll('settings');
      if (method === 'GET') {
        return Promise.resolve(mockResponse((sArr2[0] && sArr2[0].form_fields) || []));
      }
      if (method === 'POST') {
        if (sArr2.length) ds.update('settings', sArr2[0].id, { form_fields: body });
        return Promise.resolve(mockResponse({ success: true }));
      }
    }

    // Pricing rules
    if (p === '/glazieros/v1/pricing-rules') {
      var sArr3 = ds.getAll('settings');
      if (method === 'GET') {
        return Promise.resolve(mockResponse((sArr3[0] && sArr3[0].pricing_rules) || []));
      }
      if (method === 'POST') {
        if (sArr3.length) ds.update('settings', sArr3[0].id, { pricing_rules: body });
        return Promise.resolve(mockResponse({ success: true }));
      }
    }

    // Stats
    if (p === '/glazieros/v1/stats' && method === 'GET') {
      return Promise.resolve(mockResponse(ds._calcStats()));
    }

    // Audit logs
    if (p === '/glazieros/v1/audit-logs' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('audit_logs')));
    }

    // Finance analytics
    if (p === '/glazieros/v1/finance/analytics' && method === 'GET') {
      return Promise.resolve(mockResponse(ds._financeAnalytics()));
    }

    // Invoices
    if (p === '/glazieros/v1/invoices' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('invoices')));
    }
    if (p === '/glazieros/v1/invoices' && method === 'POST') {
      return Promise.resolve(mockResponse(ds.create('invoices', body)));
    }
    var invoiceIdMatch = p.match(/^\/glazieros\/v1\/invoices\/(\d+)$/);
    if (invoiceIdMatch) {
      var iid = invoiceIdMatch[1];
      if (method === 'POST' || method === 'PUT' || method === 'PATCH')
                               return Promise.resolve(mockResponse(ds.update('invoices', iid, body)));
      if (method === 'DELETE') return Promise.resolve(mockResponse({ deleted: ds.delete('invoices', iid) }));
    }
    var invoiceSendMatch = p.match(/^\/glazieros\/v1\/invoices\/(\d+)\/send$/);
    if (invoiceSendMatch && method === 'POST') {
      return Promise.resolve(mockResponse({ success: true }));
    }
    var invoicePdfMatch = p.match(/^\/glazieros\/v1\/invoices\/(\d+)\/generate-pdf$/);
    if (invoicePdfMatch && method === 'POST') {
      return Promise.resolve(mockResponse({ success: true, pdf_url: '#' }));
    }
    var invoicePayMatch = p.match(/^\/glazieros\/v1\/invoices\/(\d+)\/payment$/);
    if (invoicePayMatch && method === 'POST') {
      ds.update('invoices', invoicePayMatch[1], { status: 'paid' });
      return Promise.resolve(mockResponse({ success: true }));
    }

    // Expenses
    if (p === '/glazieros/v1/expenses' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('expenses')));
    }
    if (p === '/glazieros/v1/expenses' && method === 'POST') {
      return Promise.resolve(mockResponse(ds.create('expenses', body)));
    }
    var expenseIdMatch = p.match(/^\/glazieros\/v1\/expenses\/(\d+)$/);
    if (expenseIdMatch) {
      var eid = expenseIdMatch[1];
      if (method === 'POST' || method === 'PUT' || method === 'PATCH')
                               return Promise.resolve(mockResponse(ds.update('expenses', eid, body)));
      if (method === 'DELETE') return Promise.resolve(mockResponse({ deleted: ds.delete('expenses', eid) }));
    }

    // Diary events
    if (p === '/glazieros/v1/diary/events' && method === 'GET') {
      return Promise.resolve(mockResponse(ds.getAll('diary_events')));
    }
    if (p === '/glazieros/v1/diary/events' && method === 'POST') {
      return Promise.resolve(mockResponse(ds.create('diary_events', body)));
    }
    var diaryBulkMatch = p.match(/^\/glazieros\/v1\/diary\/events\/bulk-delete$/);
    if (diaryBulkMatch && method === 'POST') {
      var ids = body.ids || [];
      ids.forEach(function (id) { ds.delete('diary_events', id); });
      return Promise.resolve(mockResponse({ success: true, deleted: ids.length }));
    }
    var diaryIdMatch = p.match(/^\/glazieros\/v1\/diary\/events\/(\d+)$/);
    if (diaryIdMatch) {
      var did = diaryIdMatch[1];
      if (method === 'GET')    return Promise.resolve(mockResponse(ds.getById('diary_events', did)));
      if (method === 'POST' || method === 'PUT' || method === 'PATCH')
                               return Promise.resolve(mockResponse(ds.update('diary_events', did, body)));
      if (method === 'DELETE') return Promise.resolve(mockResponse({ deleted: ds.delete('diary_events', did) }));
    }

    // Customers – virtual endpoint; extracts unique customers from jobs
    if (p === '/glazieros/v1/customers' && method === 'GET') {
      var allJobs = ds.getAll('jobs');
      var custMap = {};
      allJobs.forEach(function (j) {
        var key = (j.email || j.client_email || j.client_name || '').toLowerCase().trim();
        if (!key) return;
        if (!custMap[key]) {
          custMap[key] = {
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
            last_activity: j.updated_at || j.created_at || '',
          };
        }
        custMap[key].jobs.push(j);
        custMap[key].total_spend += Number(j.price) || 0;
        var jDate = j.updated_at || j.created_at || '';
        if (jDate > custMap[key].last_activity) custMap[key].last_activity = jDate;
      });
      return Promise.resolve(mockResponse(Object.values(custMap)));
    }
    var custIdMatch = p.match(/^\/glazieros\/v1\/customers\/([^/]+)$/);
    if (custIdMatch && method === 'GET') {
      var cKey = decodeURIComponent(custIdMatch[1]).toLowerCase().trim();
      var cJobs = ds.getAll('jobs').filter(function (j) {
        return ((j.email || j.client_email || j.client_name || '').toLowerCase().trim()) === cKey;
      });
      if (cJobs.length) {
        var cFirst = cJobs[0];
        var cSpend = cJobs.reduce(function (s, j) { return s + (Number(j.price) || 0); }, 0);
        var cLast = cJobs.reduce(function (d, j) { var t = j.updated_at || j.created_at || ''; return t > d ? t : d; }, '');
        return Promise.resolve(mockResponse({
          id: cKey,
          first_name: cFirst.first_name || '',
          last_name: cFirst.last_name || '',
          client_name: cFirst.client_name || '',
          email: cFirst.email || cFirst.client_email || '',
          phone: cFirst.phone || cFirst.client_phone || '',
          address: cFirst.address || '',
          postcode: cFirst.postcode || '',
          jobs: cJobs,
          total_spend: cSpend,
          last_activity: cLast,
        }));
      }
      return Promise.resolve(mockResponse(null, 404));
    }
    if (p === '/glazieros/v1/customers' && method === 'POST') {
      var custJob = ds.create('jobs', Object.assign({
        post_status: 'draft',
        lead_status: 'New',
        install_status: 'Pending',
        type: 'window',
        job_type: 'window',
        price: 0,
      }, {
        first_name: body.first_name || '',
        last_name: body.last_name || '',
        client_name: ((body.first_name || '') + ' ' + (body.last_name || '')).trim() || body.client_name || '',
        email: body.email || '',
        client_email: body.email || '',
        phone: body.phone || '',
        client_phone: body.phone || '',
        address: body.address || '',
        postcode: body.postcode || '',
        date: new Date().toISOString(),
      }));
      return Promise.resolve(mockResponse(custJob));
    }

    // Search — handle both ?term= (dashboard-app.js) and ?q= query params
    if (p === '/glazieros/v1/search' && method === 'GET') {
      var rawQ = (urlStr.match(/[?&]term=([^&]*)/) || [])[1] ||
                 (urlStr.match(/[?&]q=([^&]*)/)    || [])[1] || '';
      var qLower = decodeURIComponent(rawQ).toLowerCase();
      var results = [];
      if (qLower) {
        ds.getAll('jobs').forEach(function (j) {
          if ((j.client_name || '').toLowerCase().indexOf(qLower) !== -1 ||
              (j.address    || '').toLowerCase().indexOf(qLower) !== -1) {
            results.push({ id: j.id, type: 'Job', title: j.client_name + ' – ' + (j.address || '') });
          }
        });
        ds.getAll('fitters').forEach(function (f) {
          if ((f.name || '').toLowerCase().indexOf(qLower) !== -1) {
            results.push({ id: f.id, type: 'Fitter', title: f.name });
          }
        });
        ds.getAll('branches').forEach(function (b) {
          if ((b.name || '').toLowerCase().indexOf(qLower) !== -1) {
            results.push({ id: b.id, type: 'Branch', title: b.name });
          }
        });
      }
      return Promise.resolve(mockResponse(results));
    }

    // Fallback – unknown /wp-json/ endpoint
    return Promise.resolve(mockResponse({ success: true, data: [] }));
  };

  // ---------------------------------------------------------------------------
  // jQuery $.ajax interceptor — routes $.ajax(/wp-json/...) through our fetch
  // override, enabling finance.js (which uses $.ajax) to work without a server.
  // ---------------------------------------------------------------------------
  if (window.jQuery) {
    window.jQuery.ajaxTransport('+*', function (options) {
      var urlStr = options.url || '';
      if (urlStr.indexOf('/wp-json/') === -1) return; // not our business

      return {
        send: function (headers, completeCallback) {
          var fetchOptions = {
            method: (options.type || 'GET').toUpperCase(),
          };
          if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
            var body = options.data;
            if (body && typeof body === 'object' && !(body instanceof FormData)) {
              body = JSON.stringify(body);
            }
            fetchOptions.body = body || undefined;
          }

          // Call our (already-overridden) window.fetch
          window.fetch(urlStr, fetchOptions).then(function (resp) {
            return resp.json().then(function (data) {
              // jQuery transport completeCallback(status, statusText, {text:...}, headers)
              completeCallback(resp.status, 'OK', { json: data, text: JSON.stringify(data) }, '');
            });
          }).catch(function (err) {
            completeCallback(500, 'Error', { text: err.message }, '');
          });
        },
        abort: function () {},
      };
    });
  }

}(window));
