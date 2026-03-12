/**
 * New Quote Panel - Simple Form Version
 * (React pricing tool will replace this later)
 */
console.log('⚙️ new.js loaded');

jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'new') return;

  const $ = jQuery;
  const $panel = $('#gsa-new');
  
  if ($panel.data('init')) {
    return; // Already initialized
  }
  $panel.data('init', true);

  renderQuoteForm($panel);
  attachFormHandlers($panel);
});

function renderQuoteForm($panel) {
  const $ = jQuery;
  
  const html = `
    <div class="gos-new-quote-container">
      <div class="gos-form-header">
        <h2>Create New Quote</h2>
        <p>Fill in the customer and product details below</p>
      </div>

      <form id="gos-new-quote-form">
        <!-- Customer Information -->
        <div class="gos-form-section">
          <h3>Customer Information</h3>
          <div class="gos-form-row">
            <div class="gos-form-field">
              <label for="first_name">First Name <span class="required">*</span></label>
              <input type="text" id="first_name" name="first_name" required>
            </div>
            <div class="gos-form-field">
              <label for="last_name">Last Name <span class="required">*</span></label>
              <input type="text" id="last_name" name="last_name" required>
            </div>
          </div>
          
          <div class="gos-form-row">
            <div class="gos-form-field">
              <label for="email">Email <span class="required">*</span></label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="gos-form-field">
              <label for="phone">Phone <span class="required">*</span></label>
              <input type="tel" id="phone" name="phone" required>
            </div>
          </div>
          
          <div class="gos-form-row">
            <div class="gos-form-field full-width">
              <label for="address">Address</label>
              <textarea id="address" name="address" rows="2"></textarea>
            </div>
          </div>
        </div>

        <!-- Product Details -->
        <div class="gos-form-section">
          <h3>Product Details</h3>
          <div class="gos-form-row">
            <div class="gos-form-field">
              <label for="type">Product Type <span class="required">*</span></label>
              <select id="type" name="type" required>
                <option value="">Select type...</option>
                <option value="Window">Window</option>
                <option value="Door">Door</option>
                <option value="Conservatory">Conservatory</option>
                <option value="Bifold">Bifold Doors</option>
                <option value="Patio">Patio Doors</option>
              </select>
            </div>
            <div class="gos-form-field">
              <label for="material">Material</label>
              <select id="material" name="material">
                <option value="">Select material...</option>
                <option value="uPVC">uPVC</option>
                <option value="Aluminium">Aluminium</option>
                <option value="Timber">Timber</option>
                <option value="Composite">Composite</option>
              </select>
            </div>
          </div>
          
          <div class="gos-form-row">
            <div class="gos-form-field">
              <label for="width">Width (m) <span class="required">*</span></label>
              <input type="number" id="width" name="width" step="0.01" min="0.1" required>
            </div>
            <div class="gos-form-field">
              <label for="height">Height (m) <span class="required">*</span></label>
              <input type="number" id="height" name="height" step="0.01" min="0.1" required>
            </div>
          </div>
          
          <div class="gos-form-row">
            <div class="gos-form-field">
              <label for="price">Price (£) <span class="required">*</span></label>
              <input type="number" id="price" name="price" step="0.01" min="0" required>
            </div>
            <div class="gos-form-field">
              <label for="lead_status">Lead Status</label>
              <select id="lead_status" name="lead_status">
                <option value="New" selected>New</option>
                <option value="Quoted">Quoted</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>
          
          <div class="gos-form-row">
            <div class="gos-form-field full-width">
              <label for="notes">Notes</label>
              <textarea id="notes" name="notes" rows="3" placeholder="Additional notes about this quote..."></textarea>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="gos-form-actions">
          <button type="button" class="gos-button-secondary" id="gos-cancel-quote">Cancel</button>
          <button type="submit" class="gos-button-primary" id="gos-save-quote">
            <svg width="14" height="14" viewBox="0 0 14 14" style="margin-right: 0.5rem;">
              <path d="M1 7l4 4 8-8" stroke="currentColor" fill="none" stroke-width="2"/>
            </svg>
            Create Quote
          </button>
        </div>
      </form>

      <!-- Loading Overlay -->
      <div id="gos-form-loading" class="gos-form-loading" style="display: none;">
        <div class="gos-spinner"></div>
        <p>Creating quote...</p>
      </div>
    </div>
  `;
  
  $panel.html(html);
  injectFormStyles();
}

function attachFormHandlers($panel) {
  const $ = jQuery;
  
  // Cancel button
  $panel.on('click', '#gos-cancel-quote', () => {
    if (confirm('Discard this quote?')) {
      $(document).trigger('gsa:activate:panel', ['quotes']);
    }
  });
  
  // Form submission
  $panel.on('submit', '#gos-new-quote-form', async (e) => {
    e.preventDefault();
    
    const $form = $(e.target);
    const $loading = $('#gos-form-loading');
    const $submitBtn = $('#gos-save-quote');
    
    // Gather form data
    const formData = {
      first_name: $('#first_name').val().trim(),
      last_name: $('#last_name').val().trim(),
      email: $('#email').val().trim(),
      phone: $('#phone').val().trim(),
      address: $('#address').val().trim(),
      type: $('#type').val(),
      material: $('#material').val(),
      width: parseFloat($('#width').val()),
      height: parseFloat($('#height').val()),
      price: parseFloat($('#price').val()),
      lead_status: $('#lead_status').val(),
      install_status: 'Pending',
      notes: $('#notes').val().trim(),
      date: new Date().toISOString(),
    };
    
    // Show loading
    $loading.show();
    $submitBtn.prop('disabled', true);
    
    try {
      const response = await fetch('/wp-json/glazieros/v1/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': wpApiSettings.nonce
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create quote');
      }
      
      const result = await response.json();
      
      // Success!
      showNotification('Quote created successfully!', 'success');
      
      // Trigger data update event
      $(document).trigger('gsa:data:updated', ['quote', result.id]);
      
      // Wait a moment then redirect to quotes
      setTimeout(() => {
        $(document).trigger('gsa:activate:panel', ['quotes']);
      }, 1000);
      
    } catch (error) {
      console.error('Error creating quote:', error);
      showNotification('Failed to create quote. Please try again.', 'error');
      $loading.hide();
      $submitBtn.prop('disabled', false);
    }
  });
  
  // Auto-calculate area when dimensions change
  $panel.on('input', '#width, #height', () => {
    const width = parseFloat($('#width').val()) || 0;
    const height = parseFloat($('#height').val()) || 0;
    const area = width * height;
    
    if (area > 0) {
      // Auto-suggest price based on area (£250 per sq meter as example)
      const suggestedPrice = (area * 250).toFixed(2);
      if (!$('#price').val()) {
        $('#price').val(suggestedPrice);
      }
    }
  });
}

function showNotification(message, type = 'info') {
  const $ = jQuery;
  const $toast = $(`
    <div class="gos-toast gos-toast-${type}">
      ${message}
    </div>
  `);
  
  $('body').append($toast);
  setTimeout(() => $toast.addClass('show'), 10);
  setTimeout(() => {
    $toast.removeClass('show');
    setTimeout(() => $toast.remove(), 300);
  }, 3000);
}

function injectFormStyles() {
  if (jQuery('#gos-new-quote-styles').length) return;
  
  const css = `
    .gos-new-quote-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #fff;
      min-height: 100%;
    }
    
    .gos-form-header {
      margin-bottom: 2rem;
      border-bottom: 2px solid #4e73df;
      padding-bottom: 1rem;
    }
    
    .gos-form-header h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
    }
    
    .gos-form-header p {
      margin: 0;
      color: #6c757d;
    }
    
    .gos-form-section {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .gos-form-section h3 {
      margin: 0 0 1.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .gos-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .gos-form-row:last-child {
      margin-bottom: 0;
    }
    
    .gos-form-field {
      display: flex;
      flex-direction: column;
    }
    
    .gos-form-field.full-width {
      grid-column: 1 / -1;
    }
    
    .gos-form-field label {
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #495057;
      font-size: 0.875rem;
    }
    
    .gos-form-field .required {
      color: #dc3545;
    }
    
    .gos-form-field input,
    .gos-form-field select,
    .gos-form-field textarea {
      padding: 0.625rem 1rem;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      font-size: 0.875rem;
      transition: all 0.2s;
    }
    
    .gos-form-field input:focus,
    .gos-form-field select:focus,
    .gos-form-field textarea:focus {
      outline: none;
      border-color: #4e73df;
      box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.1);
    }
    
    .gos-form-field textarea {
      resize: vertical;
      font-family: inherit;
    }
    
    .gos-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e1e4e8;
    }
    
    .gos-button-primary,
    .gos-button-secondary {
      display: inline-flex;
      align-items: center;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .gos-button-primary {
      background: #06b6d4;
      color: #fff;
    }
    
    .gos-button-primary:hover:not(:disabled) {
      background: #0891b2;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3);
    }
    
    .gos-button-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .gos-button-secondary {
      background: #fff;
      color: #6c757d;
      border: 1px solid #e1e4e8;
    }
    
    .gos-button-secondary:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
    }
    
    .gos-form-loading {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .gos-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #f8f9fa;
      border-top-color: #4e73df;
      border-radius: 50%;
      animation: gos-spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }
    
    @keyframes gos-spin {
      to { transform: rotate(360deg); }
    }
    
    .gos-form-loading p {
      color: #6c757d;
      font-size: 1rem;
      margin: 0;
    }
    
    .gos-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
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
    
    @media (max-width: 768px) {
      .gos-new-quote-container {
        padding: 1rem;
      }
      
      .gos-form-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .gos-form-actions {
        flex-direction: column;
      }
      
      .gos-button-primary,
      .gos-button-secondary {
        width: 100%;
        justify-content: center;
      }
    }
  `;
  
  jQuery('<style id="gos-new-quote-styles"></style>').text(css).appendTo('head');
}
