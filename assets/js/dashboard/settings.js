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
        statuses:    { lead: [], install: [] },
        form_fields: []
    };

    function render() {
        // Main layout with inner tabs
        $panel.html(`
            <div class="gsa-settings-header">
                <h2 class="gsa-panel-title">Settings</h2>
            </div>
            <div class="gsa-settings-layout">
                <nav class="gsa-settings-tabs">
                    <a href="#pricing"  class="gsa-settings-tab active">Pricing</a>
                    <a href="#statuses" class="gsa-settings-tab">Statuses</a>
                    <a href="#form"     class="gsa-settings-tab">Contact Form</a>
                </nav>
                <div class="gsa-settings-content">
                    <div id="gsa-settings-pricing"  class="gsa-settings-panel active"></div>
                    <div id="gsa-settings-statuses" class="gsa-settings-panel"></div>
                    <div id="gsa-settings-form"     class="gsa-settings-panel"></div>
                </div>
            </div>
        `);

        renderPricing();
        renderStatuses();
        renderForm();
        attachTabHandlers();
    }

    function attachTabHandlers() {
        $panel.on('click', '.gsa-settings-tab', function(e) {
            e.preventDefault();
            const target = $(this).attr('href').substring(1); // "pricing", "statuses", or "form"

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

    // --- Statuses Tab ---
    function renderStatuses() {
        const $c = $('#gsa-settings-statuses');
        $c.html(`
            <h3>Quote Statuses</h3>
            <div class="gsa-inner-tabs">
                <button class="gsa-inner-tab-btn active" data-target="lead">Lead Statuses</button>
                <button class="gsa-inner-tab-btn" data-target="install">Install Statuses</button>
            </div>
            <div id="gsa-status-content-lead"    class="gsa-inner-tab-content active"></div>
            <div id="gsa-status-content-install" class="gsa-inner-tab-content"></div>
            <hr>
            <button id="save-statuses" class="gos-button">Save All Statuses</button>
            <div id="statuses-feedback" class="gsa-feedback-message-inline"></div>
        `);
        renderStatusList('lead');
        renderStatusList('install');
    }
    function renderStatusList(type) {
        const rows = (settingsData.statuses[type] || []).map((st,i) => `
            <div class="gsa-status-row" data-index="${i}">
                <input type="text"  class="gos-input status-label" value="${st.label}">
                <input type="color" class="gos-input status-color" value="${st.color}">
                <button class="gos-button-icon remove-status">&times;</button>
            </div>
        `).join('');
        $(`#gsa-status-content-${type}`).html(`
            <div class="gsa-status-list">${rows}</div>
            <button class="gos-button add-status-btn" data-type="${type}">
              Add ${type.charAt(0).toUpperCase()+type.slice(1)} Status
            </button>
        `);
    }

    // --- Form Fields Tab ---
    function renderForm() {
        const $c = $('#gsa-settings-form');

        // Build existing fields
        const fieldsHtml = settingsData.form_fields.map(fld => {
            const isStd = !fld.id.startsWith('custom_');
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

    // Load all settings from the REST API
    async function loadAllSettings() {
        try {
            const [pr, sr, fr] = await Promise.all([
                fetch('/wp-json/glazieros/v1/settings/pricing'),
                fetch('/wp-json/glazieros/v1/settings/statuses'),
                fetch('/wp-json/glazieros/v1/settings/form')
            ]);
            if (!pr.ok||!sr.ok||!fr.ok) throw new Error('Failed to load settings');

            settingsData.pricing     = await pr.json();
            settingsData.statuses    = await sr.json();
            const fetchedFormFields  = await fr.json();

            settingsData.form_fields = Array.isArray(fetchedFormFields) && fetchedFormFields.length>0
              ? fetchedFormFields
              : DEFAULT_FIELDS;

            render();
            attachSaveHandlers();
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
                    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
                });
                if (!res.ok) throw new Error(await res.text());
                $('#pricing-feedback').text('✅ Saved').show().delay(2000).fadeOut();
            } catch(e) {
                $('#pricing-feedback').text(`⚠️ ${e.message}`).show();
            }
        });

        // Statuses handlers…
        $panel.on('click', '.gsa-inner-tab-btn', function() {
            const t = $(this).data('target');
            $('.gsa-inner-tab-btn').removeClass('active');
            $(this).addClass('active');
            $('.gsa-inner-tab-content').removeClass('active');
            $(`#gsa-status-content-${t}`).addClass('active');
        });
        $panel.on('click', '.add-status-btn', function() {
            const t = $(this).data('type');
            $(`#gsa-status-content-${t} .gsa-status-list`).append(`
              <div class="gsa-status-row">
                <input type="text" class="gos-input status-label" value="New Status">
                <input type="color" class="gos-input status-color" value="#cccccc">
                <button class="gos-button-icon remove-status">&times;</button>
              </div>`);
        });
        $panel.on('click', '.remove-status', function() {
            $(this).closest('.gsa-status-row').remove();
        });
        $panel.on('click', '#save-statuses', async () => {
            const newS = { lead: [], install: [] };
            $('#gsa-status-content-lead .gsa-status-row').each(function() {
                newS.lead.push({
                    label: $(this).find('.status-label').val(),
                    color: $(this).find('.status-color').val()
                });
            });
            $('#gsa-status-content-install .gsa-status-row').each(function() {
                newS.install.push({
                    label: $(this).find('.status-label').val(),
                    color: $(this).find('.status-color').val()
                });
            });
            try {
                const res = await fetch('/wp-json/glazieros/v1/settings/statuses', {
                    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(newS)
                });
                if (!res.ok) throw new Error(await res.text());
                settingsData.statuses = newS;
                $('#statuses-feedback').text('✅ Saved').show().delay(2000).fadeOut();
            } catch(e) {
                $('#statuses-feedback').text(`⚠️ ${e.message}`).show();
            }
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
                    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(updated)
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
            .gsa-settings-tab.active { border-left-color:#4e73df;background:#fff;color:#222;font-weight:600; }
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
        $panel.html('<p>Loading settings…</p>');
        loadAllSettings();
    });
});
