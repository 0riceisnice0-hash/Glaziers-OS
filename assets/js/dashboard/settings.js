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

    // Initial settings data, will be populated from the REST endpoints
    let settingsData = {
        pricing:     { window: 0, door: 0 },
        form_fields: [],
        pricing_rules: []
    };

    function render() {
        // Main layout with inner tabs
        $panel.html(`
            <div class="gsa-settings-header">
                <h2 class="gsa-panel-title">Settings</h2>
            </div>
            <div class="gsa-settings-layout">
                <nav class="gsa-settings-tabs">
                    <a href="#pricing"  class="gsa-settings-tab active">Simple Pricing</a>
                    <a href="#pricing-rules" class="gsa-settings-tab">Pricing Rules</a>
                    <a href="#form"     class="gsa-settings-tab">Contact Form</a>
                </nav>
                <div class="gsa-settings-content">
                    <div id="gsa-settings-pricing"  class="gsa-settings-panel active"></div>
                    <div id="gsa-settings-pricing-rules" class="gsa-settings-panel"></div>
                    <div id="gsa-settings-form"     class="gsa-settings-panel"></div>
                </div>
            </div>
        `);

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
            const [pr, fr, prr] = await Promise.all([
                fetch('/wp-json/glazieros/v1/settings/pricing'),
                fetch('/wp-json/glazieros/v1/settings/form'),
                fetch('/wp-json/glazieros/v1/pricing-rules')
            ]);
            if (!pr.ok||!fr.ok||!prr.ok) throw new Error('Failed to load settings');

            settingsData.pricing     = await pr.json();
            const fetchedFormFields  = await fr.json();
            settingsData.pricing_rules = await prr.json();

            settingsData.form_fields = Array.isArray(fetchedFormFields) && fetchedFormFields.length>0
              ? fetchedFormFields
              : DEFAULT_FIELDS;

            render();
        } catch (err) {
            $panel.html(`<p class="gos-error">Error loading settings: ${err.message}</p>`);
        }
    }

    function attachSaveHandlers() {
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
            .gsa-settings-tab { display:block;padding:.75rem 1.5rem;color:#555;text-decoration:none;border-left:3px solid transparent; }
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
});