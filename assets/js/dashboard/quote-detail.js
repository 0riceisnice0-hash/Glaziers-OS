// assets/js/dashboard/quote-detail.js
console.log('⚙️ quote-detail.js loaded');

jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'quote-detail') return;

  const $panel = jQuery('#gsa-quote-detail');
  // No init check here, as this panel should always re-render with new data
  // when activated (e.g., when a different quote is selected).

  const id = window.selectedJobId; // This should be set by the quotes panel
  if (!id) {
    return $panel.html('<p style="color:red">No quote selected. Please select a quote from the "Quotes" tab.</p>');
  }
  $panel.html('<p>Loading details…</p>');

  // Helper to escape HTML to prevent XSS when setting input values
  const escapeHTML = str => String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);

  // Hardcoded statuses, removing the need for a settings API call.
  const statusSettings = {
      lead: [
          { label: 'New', color: '#3498db' },
          { label: 'Quoted', color: '#f1c40f' },
          { label: 'Follow-up', color: '#e67e22' },
          { label: 'Won', color: '#2ecc71' },
          { label: 'Lost', color: '#e74c3c' }
      ],
      install: [
          { label: 'Pending', color: '#95a5a6' },
          { label: 'Scheduled', color: '#8e44ad' },
          { label: 'In Progress', color: '#3498db' },
          { label: 'Completed', color: '#27ae60' }
      ]
  };

  fetch(`/wp-json/glazieros/v1/jobs/${id}`)
    .then(async (jobRes) => {
      if (!jobRes.ok) {
        const err = await jobRes.json();
        throw new Error(err.message || 'Quote not found.');
      }

      const job = await jobRes.json();

      const leadStatusOptions = (statusSettings.lead || []).map(s => 
        `<option value="${s.label}" ${job.lead_status === s.label ? 'selected' : ''}>${s.label}</option>`
      ).join('');
      const installStatusOptions = (statusSettings.install || []).map(s => 
        `<option value="${s.label}" ${job.install_status === s.label ? 'selected' : ''}>${s.label}</option>`
      ).join('');

      let invoiceButtonHtml = '';
      if (job.invoice_url) {
        invoiceButtonHtml = `<a href="${job.invoice_url}" target="_blank" class="gos-button gos-button-secondary">Download Invoice (${job.invoice_number})</a>`;
      } else if (job.lead_status === 'Won') {
        invoiceButtonHtml = `<button id="gsa-generate-invoice-btn" class="gos-button gos-button-secondary">Generate Invoice</button>`;
      }

      let convertButtonHtml = '';
      if (job.post_status === 'draft') {
        convertButtonHtml = `<button id="gsa-convert-to-job-btn" class="gos-button">Convert to Job</button>`;
      }

      // Render editable form
      $panel.html(`
        <div class="gsa-detail-header">
            <h2>Edit Quote #${job.id}</h2>
            <div id="gsa-detail-feedback" class="gsa-feedback-message"></div>
        </div>
        <div class="gsa-detail-layout">
            <div class="gsa-detail-form-wrapper">
                <form id="gsa-quote-detail-form" data-job-id="${job.id}">
                    <div class="gsa-form-section">
                        <h3>Customer Details</h3>
                        <div class="gsa-form-grid">
                            <label>First Name <input name="first_name" value="${escapeHTML(job.first_name)}" class="gos-input"></label>
                            <label>Last Name <input name="last_name" value="${escapeHTML(job.last_name)}" class="gos-input"></label>
                            <label>Email <input type="email" name="email" value="${escapeHTML(job.email)}" class="gos-input"></label>
                            <label>Phone <input type="tel" name="phone" value="${escapeHTML(job.phone)}" class="gos-input"></label>
                        </div>
                        <label>Address <textarea name="address" class="gos-input" rows="3">${escapeHTML(job.address)}</textarea></label>
                    </div>
                    <div class="gsa-form-section">
                        <h3>Job Details & Notes</h3>
                        <div class="gsa-form-grid">
                            <label>Lead Status
                                <select name="lead_status" id="gsa-detail-lead-status-select" class="gos-input">${leadStatusOptions}</select>
                            </label>
                            <label>Install Status
                                <select name="install_status" id="gsa-detail-install-status-select" class="gos-input">${installStatusOptions}</select>
                            </label>
                            <div class="gsa-static-details">
                                <strong>Type:</strong> ${job.type || 'N/A'}<br>
                                <strong>Size:</strong> ${job.width ? (job.width*1000).toFixed(0) : '?'}×${job.height ? (job.height*1000).toFixed(0) : '?'} mm<br>
                                <strong>Price:</strong> £${(Number(job.price) || 0).toFixed(2)}
                            </div>
                        </div>
                        <label>Notes <textarea name="notes" class="gos-input" rows="5">${escapeHTML(job.notes)}</textarea></label>
                    </div>
                    <div class="gsa-form-actions">
                        <button type="submit" class="gos-button">Save Changes</button>
                        ${convertButtonHtml}
                        ${invoiceButtonHtml}
                    </div>
                </form>
            </div>
            <div class="gsa-detail-sidebar">
                <div id="gsa-detail-3d" style="width:100%;height:300px; background-color: #f0f0f0; border-radius: 8px;"></div>
            </div>
        </div>
      `);

      // Inject CSS for this view
      const css = `
        .gsa-detail-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; }
        .gsa-detail-header h2 { margin: 0; font-size: 1.5rem; }
        .gsa-feedback-message { padding: 0.5rem 1rem; border-radius: 4px; color: #155724; background-color: #d4edda; opacity: 0; transition: opacity 0.3s; }
        .gsa-feedback-message.visible { opacity: 1; }
        .gsa-detail-layout { display: flex; flex-wrap: wrap; padding: 1.5rem; gap: 1.5rem; }
        .gsa-detail-form-wrapper { flex: 2; min-width: 350px; }
        .gsa-detail-sidebar { flex: 1; min-width: 300px; }
        #gsa-quote-detail-form .gsa-form-section { margin-bottom: 2rem; }
        #gsa-quote-detail-form h3 { font-size: 1.2rem; margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
        #gsa-quote-detail-form .gsa-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        #gsa-quote-detail-form label { display: block; font-weight: 500; color: #555; }
        #gsa-quote-detail-form .gos-input { width: 100%; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        #gsa-quote-detail-form .gsa-form-actions { text-align: right; }
        #gsa-detail-lead-status-select, #gsa-detail-install-status-select { font-weight: bold; text-transform: capitalize; }
        .gsa-static-details { background: #f8f9fc; padding: 0.6rem; border-radius: 4px; font-size: 0.9em; line-height: 1.6; }
      `;
      if (!jQuery('#gsa-quote-detail-styles').length) {
        jQuery('<style id="gsa-quote-detail-styles"></style>').text(css).appendTo('head');
      }

      // Dynamically add status colors
      let statusColorCss = '';
      [...statusSettings.lead, ...statusSettings.install].forEach(s => {
        statusColorCss += `#gsa-quote-detail-form select option[value="${s.label}"] { background-color: ${s.color}; color: #fff; }`;
      });
      if (!jQuery('#gsa-dynamic-detail-styles').length) {
        jQuery('<style id="gsa-dynamic-detail-styles"></style>').text(statusColorCss).appendTo('head');
      }

      // --- Event Handlers ---
      const $statusSelect = jQuery('#gsa-detail-lead-status-select, #gsa-detail-install-status-select');
      const updateStatusColor = () => {
        $statusSelect.each(function() { // Use jQuery.each()
            const selectedStatusLabel = jQuery(this).val(); // Use jQuery(this)
            const allStatuses = [...statusSettings.lead, ...statusSettings.install];
            const statusInfo = allStatuses.find(s => s.label === selectedStatusLabel);
            jQuery(this).css({ 'background-color': statusInfo ? statusInfo.color : '#fff', 'color': statusInfo ? '#fff' : '#000' });
        });
      };
      $statusSelect.on('change', updateStatusColor);
      updateStatusColor(); // Set initial color

      jQuery('#gsa-quote-detail-form').on('submit', function(e) {
        e.preventDefault();
        const $form = jQuery(this);
        const $button = $form.find('button[type="submit"]');
        const originalButtonText = $button.text();
        $button.prop('disabled', true).text('Saving...');

        const formData = {
          first_name: $form.find('[name="first_name"]').val(),
          last_name: $form.find('[name="last_name"]').val(),
          email: $form.find('[name="email"]').val(),
          phone: $form.find('[name="phone"]').val(),
          address: $form.find('[name="address"]').val(),
          notes: $form.find('[name="notes"]').val(),
          lead_status: $form.find('[name="lead_status"]').val(),
          install_status: $form.find('[name="install_status"]').val(),
        };

        fetch(`/wp-json/glazieros/v1/jobs/${id}/details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        .then(r => {
          if (!r.ok) throw new Error('Save failed');
          return r.json();
        })
        .then(res => {
          if (res.saved) {
            const $feedback = jQuery('#gsa-detail-feedback');
            $feedback.text('✅ Changes Saved!').addClass('visible');
            setTimeout(() => $feedback.removeClass('visible'), 3000);
            // Notify other panels (like quotes) that data has changed
            jQuery(document).trigger('gsa:data:updated', ['quote', res.job_id]);
          } else {
            throw new Error('Save was not successful.');
          }
        })
        .catch(err => {
          alert('Error saving changes: ' + err.message);
        })
        .finally(() => {
          $button.prop('disabled', false).text(originalButtonText);
        });
      });

      // --- Invoice Generation ---
      jQuery('#gsa-generate-invoice-btn').on('click', function(e) {
        e.preventDefault();
        const $btn = jQuery(this);
        if (!confirm('This will generate a final invoice for this job. Continue?')) return;

        $btn.prop('disabled', true).text('Generating...');

        fetch(`/wp-json/glazieros/v1/jobs/${id}/invoice`, {
          method: 'POST'
        })
        .then(res => {
          if (!res.ok) throw new Error('Invoice generation failed.');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            // Replace button with a download link
            $btn.replaceWith(`<a href="${data.invoice_url}" target="_blank" class="gos-button gos-button-secondary">Download Invoice (${data.invoice_number})</a>`);
            jQuery(document).trigger('gsa:data:updated', ['invoice', id]);
          } else {
            throw new Error(data.message || 'An unknown error occurred.');
          }
        })
        .catch(err => {
          alert('Error: ' + err.message);
          $btn.prop('disabled', false).text('Generate Invoice');
        });
      });

      // --- Convert to Job ---
      jQuery('#gsa-convert-to-job-btn').on('click', function(e) {
        e.preventDefault();
        const $btn = jQuery(this);
        if (!confirm('Are you sure you want to convert this quote to a job?')) return;

        $btn.prop('disabled', true).text('Converting...');

        fetch(`/wp-json/glazieros/v1/quotes/${id}/convert`, {
          method: 'POST'
        })
        .then(res => {
          if (!res.ok) throw new Error('Conversion failed.');
          return res.json();
        })
        .then(data => {
          if (data.success) {
            // Reload the panel to show the updated status
            jQuery(document).trigger('gsa:panel:activated', ['quote-detail']);
          } else {
            throw new Error(data.message || 'An unknown error occurred.');
          }
        })
        .catch(err => {
          alert('Error: ' + err.message);
          $btn.prop('disabled', false).text('Convert to Job');
        });
      });

      // Three.js 3D preview
      if (window.GOSBuilders && window.THREE) {
        const container = document.getElementById('gsa-detail-3d');
        const scene = new THREE.Scene();
        const aspect = container.clientWidth / (container.clientHeight || 300); // Use actual height, default to 300 if not set
        const cam = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        cam.position.z = 2;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, 300);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 5, 5);
        scene.add(light, new THREE.AmbientLight(0x404040));
        const builder = (window.GOSBuilders.getBuilder && window.GOSBuilders.getBuilder(job.type))
          || ((job.type && job.type.toLowerCase().indexOf('door') !== -1 && window.GOSBuilders.testdoor)
              ? window.GOSBuilders.testdoor : window.GOSBuilders.testwindow);
        const mesh = builder({
          width: Number(job.width) || 0.9,
          height: Number(job.height) || 1.2,
          frameDepth: 0.1,
          frameThk: 0.05,
          frameColor: 0xffffff,
          glassColor: 0xADD8E6, // Light blue for glass
          handleColor: 0x808080 // Grey for handle
        });
        scene.add(mesh);

        (function animate() {
          requestAnimationFrame(animate);
          mesh.rotation.y += 0.01;
          renderer.render(scene, cam);
        })();
      }
    }).catch(err => {
      console.error('Detail load error:', err);
      $panel.html(`<p style="color:red">Error: ${err.message}</p>`);
    });
});