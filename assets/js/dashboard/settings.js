// assets/js/dashboard/settings.js
jQuery(function($) {
    const $panel = $('#gsa-settings');

    // Default preset fields for "All Information"
    const DEFAULT_FIELDS = [
      { id: 'name',    label: 'Name',    type: 'text',     required: true },
      { id: 'phone',   label: 'Phone',   type: 'tel',      required: false },
      { id: 'email',   label: 'Email',   type: 'email',    required: true },
      { id: 'address', label: 'Address', type: 'textarea', required: false }
    ];

    // Complete product catalog grouped by category
    const PRODUCT_CATALOG = {
      'Windows': [
        'uPVC Windows',
        'Sash Windows',
        'Aluminium Windows'
      ],
      'Doors': [
        'Composite Doors',
        'uPVC Doors',
        'Aluminium Doors',
        'Heritage Aluminium Doors'
      ],
      'French & Patio Doors': [
        'uPVC French Doors',
        'uPVC Sliding Patio Doors',
        'Aluminium Sliding Patio Doors'
      ],
      'Bifolding & Folding Doors': [
        'Aluminium Bifolding Doors',
        'Slide & Fold Doors'
      ],
      'Glazing': [
        'Replacement Glazed Units'
      ]
    };

    // Initial settings data, will be populated from the REST endpoints
    let settingsData = {
        pricing:     { window: 0, door: 0 },
        form_fields: [],
        pricing_rules: [],
        product_catalog: null   // null = all enabled
    };

    function render() {
        // Main layout with inner tabs
        $panel.html(`
            <div class="gsa-settings-header">
                <h2 class="gsa-panel-title">Settings</h2>
            </div>
            <div class="gsa-settings-layout">
                <nav class="gsa-settings-tabs">
                    <a href="#product-catalog" class="gsa-settings-tab active">Product Catalog</a>
                    <a href="#pricing"  class="gsa-settings-tab">Simple Pricing</a>
                    <a href="#pricing-rules" class="gsa-settings-tab">Pricing Rules</a>
                    <a href="#form"     class="gsa-settings-tab">Contact Form</a>
                </nav>
                <div class="gsa-settings-content">
                    <div id="gsa-settings-product-catalog" class="gsa-settings-panel active"></div>
                    <div id="gsa-settings-pricing"  class="gsa-settings-panel"></div>
                    <div id="gsa-settings-pricing-rules" class="gsa-settings-panel"></div>
                    <div id="gsa-settings-form"     class="gsa-settings-panel"></div>
                </div>
            </div>
        `);

        renderProductCatalog();
        renderPricing();
        renderPricingRules();
        renderForm();
        attachTabHandlers();
    }

    function attachTabHandlers() {
        $panel.on('click', '.gsa-settings-tab', function(e) {
            e.preventDefault();
            const target = $(this).attr('href').substring(1);

            $panel.find('.gsa-settings-tab').removeClass('active');
            $(this).addClass('active');

            $panel.find('.gsa-settings-panel').removeClass('active');
            $(`#gsa-settings-${target}`).addClass('active');
        });
    }

    // --- Product Catalog Tab ---
    function getEnabledProducts() {
        // Returns a Set of enabled product names. If null/undefined, all are enabled.
        const catalog = settingsData.product_catalog;
        if (!catalog || !Array.isArray(catalog.enabled)) {
            // All products by default
            const all = [];
            Object.values(PRODUCT_CATALOG).forEach(arr => arr.forEach(p => all.push(p)));
            return new Set(all);
        }
        return new Set(catalog.enabled);
    }

    function renderProductCatalog() {
        const $c = $('#gsa-settings-product-catalog');
        const enabled = getEnabledProducts();
        const allProducts = [];
        Object.values(PRODUCT_CATALOG).forEach(arr => arr.forEach(p => allProducts.push(p)));

        const groupsHtml = Object.entries(PRODUCT_CATALOG).map(([group, products]) => {
            const allChecked = products.every(p => enabled.has(p));
            const someChecked = products.some(p => enabled.has(p));
            return `
            <div class="gsa-catalog-group">
                <div class="gsa-catalog-group-header">
                    <label class="gsa-catalog-group-toggle">
                        <input type="checkbox" class="catalog-group-checkbox" data-group="${group}"
                               ${allChecked ? 'checked' : ''} ${!allChecked && someChecked ? 'indeterminate' : ''}>
                        <span class="gsa-catalog-group-name">${group}</span>
                    </label>
                    <span class="gsa-catalog-count">${products.filter(p=>enabled.has(p)).length}/${products.length}</span>
                </div>
                <div class="gsa-catalog-items">
                    ${products.map(product => `
                        <label class="gsa-catalog-item">
                            <input type="checkbox" class="catalog-product-checkbox" 
                                   data-product="${product}" data-group="${group}"
                                   ${enabled.has(product) ? 'checked' : ''}>
                            <span class="gsa-catalog-item-name">${product}</span>
                        </label>
                    `).join('')}
                </div>
            </div>`;
        }).join('');

        $c.html(`
            <div class="gsa-catalog-header-bar">
                <div>
                    <h3>Product Catalog</h3>
                    <p class="gsa-catalog-desc">Select which products are displayed in the quoting tool. Products are grouped by category.</p>
                </div>
                <div class="gsa-catalog-quick-actions">
                    <button id="catalog-select-all" class="gos-button-sm">Select All</button>
                    <button id="catalog-deselect-all" class="gos-button-sm gos-button-sm-outline">Deselect All</button>
                </div>
            </div>
            <div class="gsa-catalog-groups">${groupsHtml}</div>
            <div class="gsa-catalog-footer">
                <button id="save-product-catalog" class="gos-button">Save Catalog Settings</button>
                <div id="catalog-feedback" class="gsa-feedback-message-inline"></div>
            </div>
        `);

        // Set indeterminate state on group checkboxes
        $c.find('.catalog-group-checkbox').each(function() {
            const group = $(this).data('group');
            const products = PRODUCT_CATALOG[group];
            const checkedCount = products.filter(p => enabled.has(p)).length;
            if (checkedCount > 0 && checkedCount < products.length) {
                this.indeterminate = true;
            }
        });
    }

    // --- Pricing Tab ---
    function renderPricing() {
        const $c = $('#gsa-settings-pricing');
        $c.html(`
            <h3>Pricing per Square Meter</h3>
            <div class="gsa-form-section">
                <label>Window price (£/m²):
                  <input id="price-window" type="number" class="gos-input" value="${settingsData.pricing.window}">
                </label>
                <label>Door price (£/m²):
                  <input id="price-door" type="number" class="gos-input" value="${settingsData.pricing.door}">
                </label>
                <button id="save-pricing" class="gos-button">Save Pricing</button>
                <div id="pricing-feedback" class="gsa-feedback-message-inline"></div>
            </div>
        `);
    }

    // --- Pricing Rules Tab ---
    function renderPricingRules() {
        const $c = $('#gsa-settings-pricing-rules');
        const rulesHtml = settingsData.pricing_rules.map((rule, index) => `
            <tr data-index="${index}">
                <td><input type="text" class="gos-input rule-product-type" value="${rule.product_type}"></td>
                <td><input type="number" class="gos-input rule-base-price" value="${rule.base_price}"></td>
                <td><input type="number" class="gos-input rule-price-per-sqm" value="${rule.price_per_sqm}"></td>
                <td><button class="gos-button-icon remove-rule">&times;</button></td>
            </tr>
        `).join('');

        $c.html(`
            <h3>Pricing Rules</h3>
            <table class="gsa-table">
                <thead>
                    <tr>
                        <th>Product Type</th>
                        <th>Base Price (£)</th>
                        <th>Price per m² (£)</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rulesHtml}</tbody>
            </table>
            <button id="add-rule" class="gos-button">Add Rule</button>
            <hr>
            <button id="save-pricing-rules" class="gos-button">Save Rules</button>
            <div id="pricing-rules-feedback" class="gsa-feedback-message-inline"></div>
        `);
    }

    // --- Form Fields Tab ---
    function renderForm() {
        const $c = $('#gsa-settings-form');

        // Build existing fields
        const fieldsHtml = settingsData.form_fields.map(fld => {
            const isStd = !fld.id || !fld.id.startsWith('custom_');
            const rmBtn = isStd
                ? `<button class="gos-button-icon" disabled title="Standard fields cannot be removed">&times;</button>`
                : `<button class="gos-button-icon remove-form-field">&times;</button>`;
            return `
            <div class="gsa-form-field-row" data-id="${fld.id}">
              <div class="field-prop">
                <label>Label</label>
                <input type="text" class="gos-input field-label-input" value="${fld.label}">
              </div>
              <div class="field-prop">
                <label>Type</label>
                <input type="text" class="gos-input" value="${fld.type}" disabled>
              </div>
              <div class="field-prop field-prop-checkbox">
                <label>Required</label>
                <input type="checkbox" class="field-required-checkbox" ${fld.required?'checked':''}>
              </div>
              <div class="field-prop field-prop-action">
                ${rmBtn}
              </div>
            </div>`;
        }).join('');

        // Render presets + list + add-new UI
        $c.html(`
            <h3>Contact Form Fields</h3>
            <p>Add or remove fields that customers fill out on the quote form.</p>

            <div class="gsa-presets" style="margin-bottom:1rem">
              <h4>Presets</h4>
              <button id="preset-all-info" class="gos-button">All Information</button>
            </div>

            <div id="gsa-form-field-list">${fieldsHtml}</div>
            <hr>

            <div id="gsa-add-field-form-wrapper">
              <h4>Add New Field</h4>
              <div class="gsa-form-grid-condensed">
                <input type="text"  id="new-field-label"   placeholder="Field Label" class="gos-input">
                <select      id="new-field-type"    class="gos-input">
                  <option value="text">Text</option>
                  <option value="textarea">Text Area</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="dropdown">Dropdown</option>
                </select>
                <input type="text"  id="new-field-options" placeholder="Comma-separated options" class="gos-input" style="display:none">
              </div>
              <label class="inline-label">
                <input type="checkbox" id="new-field-required"> Required
              </label>
              <button id="add-new-field-btn" class="gos-button">Add Field</button>
            </div>

            <hr>
            <button id="save-form-fields" class="gos-button">Save Form Settings</button>
            <div id="form-feedback" class="gsa-feedback-message-inline"></div>
        `);
    }

    // Load all settings from DataStore (via fetch interceptor)
    async function loadAllSettings() {
        try {
            const [pr, fr, prr, pc] = await Promise.all([
                fetch('/wp-json/glazieros/v1/settings/pricing'),
                fetch('/wp-json/glazieros/v1/settings/form'),
                fetch('/wp-json/glazieros/v1/pricing-rules'),
                fetch('/wp-json/glazieros/v1/settings/product-catalog')
            ]);
            if (!pr.ok||!fr.ok||!prr.ok) throw new Error('Failed to load settings');

            settingsData.pricing     = await pr.json();
            const fetchedFormFields  = await fr.json();
            settingsData.pricing_rules = await prr.json();
            if (pc.ok) {
                const catalogData = await pc.json();
                settingsData.product_catalog = catalogData;
            }

            settingsData.form_fields = Array.isArray(fetchedFormFields) && fetchedFormFields.length>0
              ? fetchedFormFields
              : DEFAULT_FIELDS;

            render();
        } catch (err) {
            $panel.html(`<p class="gos-error">Error loading settings: ${err.message}</p>`);
        }
    }

    function attachSaveHandlers() {
        // --- Product Catalog handlers ---
        $panel.on('change', '.catalog-group-checkbox', function() {
            const group = $(this).data('group');
            const isChecked = $(this).is(':checked');
            $panel.find(`.catalog-product-checkbox[data-group="${group}"]`).prop('checked', isChecked);
            this.indeterminate = false;
            updateCatalogCounts();
        });

        $panel.on('change', '.catalog-product-checkbox', function() {
            const group = $(this).data('group');
            const products = PRODUCT_CATALOG[group];
            const $items = $panel.find(`.catalog-product-checkbox[data-group="${group}"]`);
            const checkedCount = $items.filter(':checked').length;
            const $groupCb = $panel.find(`.catalog-group-checkbox[data-group="${group}"]`);
            $groupCb.prop('checked', checkedCount === products.length);
            $groupCb[0].indeterminate = checkedCount > 0 && checkedCount < products.length;
            updateCatalogCounts();
        });

        function updateCatalogCounts() {
            Object.entries(PRODUCT_CATALOG).forEach(([group, products]) => {
                const checked = $panel.find(`.catalog-product-checkbox[data-group="${group}"]:checked`).length;
                $panel.find(`.catalog-group-checkbox[data-group="${group}"]`).closest('.gsa-catalog-group')
                    .find('.gsa-catalog-count').text(`${checked}/${products.length}`);
            });
        }

        $panel.on('click', '#catalog-select-all', () => {
            $panel.find('.catalog-product-checkbox, .catalog-group-checkbox').prop('checked', true);
            $panel.find('.catalog-group-checkbox').each(function() { this.indeterminate = false; });
            updateCatalogCounts();
        });

        $panel.on('click', '#catalog-deselect-all', () => {
            $panel.find('.catalog-product-checkbox, .catalog-group-checkbox').prop('checked', false);
            $panel.find('.catalog-group-checkbox').each(function() { this.indeterminate = false; });
            updateCatalogCounts();
        });

        $panel.on('click', '#save-product-catalog', async () => {
            const enabled = [];
            $panel.find('.catalog-product-checkbox:checked').each(function() {
                enabled.push($(this).data('product'));
            });
            const payload = { enabled: enabled };
            try {
                const res = await fetch('/wp-json/glazieros/v1/settings/product-catalog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error(await res.text());
                settingsData.product_catalog = payload;
                $('#catalog-feedback').text('✅ Catalog saved').show().delay(2000).fadeOut();
            } catch(e) {
                $('#catalog-feedback').text(`⚠️ ${e.message}`).show();
            }
        });

        // Save Pricing…
        $panel.on('click', '#save-pricing', async () => {
            const body = { 
              window: Number($('#price-window').val()), 
              door:   Number($('#price-door').val())
            };
            try {
                const res = await fetch('/wp-json/glazieros/v1/settings/pricing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (!res.ok) throw new Error(await res.text());
                $('#pricing-feedback').text('✅ Saved').show().delay(2000).fadeOut();
            } catch(e) {
                $('#pricing-feedback').text(`⚠️ ${e.message}`).show();
            }
        });

        // Save Pricing Rules
        $panel.on('click', '#save-pricing-rules', async () => {
            const rules = [];
            $('#gsa-settings-pricing-rules tbody tr').each(function() {
                const $row = $(this);
                rules.push({
                    product_type: $row.find('.rule-product-type').val(),
                    base_price: Number($row.find('.rule-base-price').val()),
                    price_per_sqm: Number($row.find('.rule-price-per-sqm').val()),
                });
            });
            try {
                const res = await fetch('/wp-json/glazieros/v1/pricing-rules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rules)
                });
                if (!res.ok) throw new Error(await res.text());
                $('#pricing-rules-feedback').text('✅ Saved').show().delay(2000).fadeOut();
            } catch(e) {
                $('#pricing-rules-feedback').text(`⚠️ ${e.message}`).show();
            }
        });

        $panel.on('click', '#add-rule', () => {
            settingsData.pricing_rules.push({ product_type: '', base_price: 0, price_per_sqm: 0 });
            renderPricingRules();
        });

        $panel.on('click', '.remove-rule', function() {
            const index = $(this).closest('tr').data('index');
            settingsData.pricing_rules.splice(index, 1);
            renderPricingRules();
        });

        // Preset: All Information
        $panel.on('click', '#preset-all-info', () => {
            settingsData.form_fields = DEFAULT_FIELDS.slice();
            renderForm();
        });

        // Form‐fields: toggle options input
        $panel.on('change', '#new-field-type', function() {
            $('#new-field-options').toggle($(this).val() === 'dropdown');
        });
        // Add custom field
        $panel.on('click', '#add-new-field-btn', () => {
            const lbl  = $('#new-field-label').val().trim();
            if (!lbl) { alert('Enter a label'); return; }
            const typ  = $('#new-field-type').val();
            const fld  = {
                id:       `custom_${Date.now()}`,
                label:    lbl,
                type:     typ,
                required: $('#new-field-required').is(':checked'),
                options:  typ==='dropdown'? $('#new-field-options').val() : ''
            };
            settingsData.form_fields.push(fld);
            renderForm();
        });
        // Remove custom field
        $panel.on('click', '.remove-form-field', function() {
            const id = $(this).closest('.gsa-form-field-row').data('id');
            settingsData.form_fields = settingsData.form_fields.filter(f=>f.id!==id);
            renderForm();
        });
        // Save form‐fields
        $panel.on('click', '#save-form-fields', async () => {
            const updated = settingsData.form_fields.map(f => {
                const $row = $(`#gsa-form-field-list .gsa-form-field-row[data-id="${f.id}"]`);
                return {
                    ...f,
                    label:    $row.find('.field-label-input').val(),
                    required: $row.find('.field-required-checkbox').is(':checked')
                };
            });
            try {
                const res = await fetch('/wp-json/glazieros/v1/settings/form', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated)
                });
                if (!res.ok) throw new Error(await res.text());
                settingsData.form_fields = updated;
                $('#form-feedback').text('✅ Saved').show().delay(2000).fadeOut();
            } catch(e) {
                $('#form-feedback').text(`⚠️ ${e.message}`).show();
            }
        });
    }

    // Inject minimal CSS for this panel
    function injectCSS() {
        const css = `
            .gsa-settings-header { padding:1rem 1.5rem;border-bottom:1px solid #e0e0e0;background:#fff; }
            .gsa-settings-layout { display:flex;height:100%; }
            .gsa-settings-tabs { width:200px;background:#f8f9fa;border-right:1px solid #e0e0e0;padding-top:1rem; }
            .gsa-settings-tab { display:block;padding:.75rem 1.5rem;color:#555;text-decoration:none;border-left:3px solid transparent;font-size:.875rem; }
            .gsa-settings-tab.active { border-left-color:#06b6d4;background:#fff;color:#222;font-weight:600; }
            .gsa-settings-content { flex:1;padding:2rem;overflow-y:auto;background:#fff; }
            .gsa-settings-panel { display:none; }
            .gsa-settings-panel.active { display:block; }
            .gsa-presets { padding:.75rem; background:#f1f1f1; border:1px dashed #ccc; border-radius:4px; }
            .gsa-form-field-row { display:grid;grid-template-columns:2fr 1fr min-content min-content;gap:1rem;padding:.75rem;border-bottom:1px solid #eee; }
            .gsa-form-grid-condensed { display:grid;grid-template-columns:2fr 1fr 2fr;gap:1rem;margin-bottom:1rem; }
            .field-prop-checkbox { text-align:center; }
            .field-prop-action { text-align:right; }
            .gos-button-icon { border-radius:50%;width:24px;height:24px;line-height:22px;text-align:center; }

            /* Product Catalog styles */
            .gsa-catalog-header-bar { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem; }
            .gsa-catalog-header-bar h3 { margin:0 0 .25rem 0;font-size:1.25rem;color:#1a1a2e; }
            .gsa-catalog-desc { margin:0;color:#6b7280;font-size:.875rem; }
            .gsa-catalog-quick-actions { display:flex;gap:.5rem; }
            .gos-button-sm { padding:.375rem .75rem;font-size:.75rem;border-radius:4px;cursor:pointer;border:1px solid #d1d5db;background:#fff;color:#374151;font-weight:500;transition:all .15s; }
            .gos-button-sm:hover { background:#f3f4f6;border-color:#9ca3af; }
            .gos-button-sm-outline { background:transparent; }
            .gsa-catalog-groups { display:flex;flex-direction:column;gap:1rem; }
            .gsa-catalog-group { border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff; }
            .gsa-catalog-group-header { display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;background:#f8fafc;border-bottom:1px solid #e5e7eb; }
            .gsa-catalog-group-toggle { display:flex;align-items:center;gap:.625rem;cursor:pointer;font-weight:600;color:#1e293b;font-size:.9rem; }
            .gsa-catalog-group-toggle input[type="checkbox"] { width:18px;height:18px;accent-color:#4e73df;cursor:pointer; }
            .gsa-catalog-count { font-size:.75rem;color:#6b7280;background:#e5e7eb;padding:2px 8px;border-radius:10px; }
            .gsa-catalog-items { padding:.5rem 1rem .75rem 2.5rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.375rem; }
            .gsa-catalog-item { display:flex;align-items:center;gap:.5rem;padding:.375rem .5rem;border-radius:4px;cursor:pointer;font-size:.85rem;color:#374151;transition:background .15s; }
            .gsa-catalog-item:hover { background:#f1f5f9; }
            .gsa-catalog-item input[type="checkbox"] { width:16px;height:16px;accent-color:#4e73df;cursor:pointer; }
            .gsa-catalog-item-name { user-select:none; }
            .gsa-catalog-footer { margin-top:1.5rem;display:flex;align-items:center;gap:1rem; }
        `;
        if (!$('#gsa-settings-styles').length) {
            $('<style id="gsa-settings-styles"></style>').text(css).appendTo('head');
        }
    }

    // Initialize when Settings panel is shown
    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'settings') return;
        if ($panel.data('initialized')) return;
        $panel.data('initialized', true);

        injectCSS();
        attachSaveHandlers();
        $panel.html('<p>Loading settings…</p>');
        loadAllSettings();
    });

    // Expose product catalog globally for PricingWizardModal and frontend wizard
    window.GOSProductCatalog = {
        GROUPS: PRODUCT_CATALOG,
        getAllProducts: function() {
            var all = [];
            Object.values(PRODUCT_CATALOG).forEach(function(arr) { arr.forEach(function(p) { all.push(p); }); });
            return all;
        },
        /**
         * Fetch enabled products from DataStore settings.
         * Returns a Promise that resolves to an array of product name strings.
         */
        fetchEnabled: function() {
            return fetch('/wp-json/glazieros/v1/settings/product-catalog')
                .then(function(r) { return r.ok ? r.json() : null; })
                .then(function(data) {
                    if (data && Array.isArray(data.enabled)) return data.enabled;
                    // All products enabled by default
                    return window.GOSProductCatalog.getAllProducts();
                })
                .catch(function() {
                    return window.GOSProductCatalog.getAllProducts();
                });
        }
    };
});