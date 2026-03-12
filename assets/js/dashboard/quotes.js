// assets/js/dashboard/quotes.js
console.log('⚙️ quotes.js loaded');

jQuery(function($) {
    const $panel = $('#gsa-quotes');
    let state = {
        currentPage: 1,
        totalPages: 1,
        searchTerm: '',
        sortBy: 'date_desc',
    };

    let allJobs = []; // This will hold the master list of jobs for the session.
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

    /**
     * Renders the quotes list based on the current search and sort values.
     */
    function renderQuotes() {
        const $listContainer = $panel.find('#gsa-quotes-list');

        if (!allJobs || allJobs.length === 0) {
            $listContainer.html(`
                <div class="gsa-empty-state">
                    <h3>No quotes yet!</h3>
                    <p>Get started by creating your first quote.</p>
                    <button id="gsa-create-new-quote-btn-empty" class="gos-button">Create New Quote</button>
                </div>`);
            return;
        }
        const html = allJobs.map(j => {
            const leadStatus = statusSettings.lead.find(s => s.label === j.lead_status) || { label: j.lead_status, color: '#cccccc' };
            const installStatus = statusSettings.install.find(s => s.label === j.install_status) || { label: j.install_status, color: '#cccccc' };
            const customerName = [j.first_name, j.last_name].filter(Boolean).join(' ');

            return `
                <div class="gsa-quote-card" data-id="${j.id}" tabindex="0" role="button" aria-label="View details for quote #${j.id}">
                    <div class="gsa-quote-card-header">
                        <h3 class="gsa-quote-title">#${j.id} - ${j.type}</h3>
                        <div class="gsa-dual-status-wrapper">
                            <div class="gsa-dual-status">
                                <div class="gsa-status-part lead-status" style="background-color:${leadStatus.color}" data-type="lead" data-current-status="${leadStatus.label}">
                                    <span>${leadStatus.label}</span>
                                    <div class="gsa-status-menu">
                                        ${statusSettings.lead.map(s => `<a href="#" class="gsa-status-option" data-status="${s.label}">${s.label}</a>`).join('')}
                                    </div>
                                </div>
                                <div class="gsa-status-part install-status" style="background-color:${installStatus.color}" data-type="install" data-current-status="${installStatus.label}">
                                    <span>${installStatus.label}</span>
                                    <div class="gsa-status-menu">
                                        ${statusSettings.install.map(s => `<a href="#" class="gsa-status-option" data-status="${s.label}">${s.label}</a>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="gsa-quote-card-body">
                        <div class="gsa-quote-customer-info">
                            <p><strong>Customer:</strong> ${customerName || 'N/A'}</p>
                            <p><strong>Contact:</strong> ${j.email || j.phone || 'N/A'}</p>
                        </div>
                        <div class="gsa-quote-job-details">
                            <p><strong>Size:</strong> ${j.width.toFixed(2)}m × ${j.height.toFixed(2)}m</p>
                            <p><strong>Price:</strong> £${j.price.toFixed(2)}</p>
                        </div>
                    </div>
                    <div class="gsa-quote-card-footer">
                        <span>${new Date(j.date).toLocaleString()}</span>
                        <div class="gsa-card-actions">
                            <span class="gsa-view-details-hint">View Details &rarr;</span>
                            <button class="gsa-delete-quote-btn" data-id="${j.id}" title="Delete Quote" aria-label="Delete quote #${j.id}">&times;</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        $listContainer.html(html);
    }

    /**
     * Fetches fresh job data from the server and triggers a re-render.
     */
    function loadAndRenderQuotes() {
        const $listContainer = $panel.find('#gsa-quotes-list');
        $listContainer.html('<p class="gsa-no-data-message">Loading quotes…</p>');

        const url = new URL(window.location.origin + '/wp-json/glazieros/v1/jobs');
        url.searchParams.set('page', state.currentPage);
        url.searchParams.set('search', state.searchTerm);
        url.searchParams.set('sort', state.sortBy);

        fetch(url, {
            headers: { 'X-WP-Nonce': wpApiSettings.nonce }
        })
            .then(res => {
                state.totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
                return res.json();
            })
            .then(jobs => {
                allJobs = Array.isArray(jobs) ? jobs : []; // Ensure it's an array
                renderQuotes();
                renderPagination();
            })
            .catch(err => {
                console.error('Error fetching jobs:', err);
                $listContainer.html(`<p class="gos-error">Error loading quotes. Please try again.</p>`);
            });
    }
    
    function renderPagination() {
        // Pagination rendering logic would go here
        // For MVP, we'll keep it simple and just reload.
    }
    /**
     * Injects CSS rules for status colors into the document head.
     * This is more efficient than using inline styles on every element.
     */
    function injectStatusStyles() {
        if ($('#gsa-dynamic-status-styles').length) return; // Don't inject twice

        let css = '';
        const allStatuses = [...statusSettings.lead, ...statusSettings.install];
        allStatuses.forEach(status => {
            const className = 'status-' + status.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
            css += `.${className} { background-color: ${status.color}; }\n`;
        });
        $('<style id="gsa-dynamic-status-styles"></style>').text(css).appendTo('head');
    }

    /**
     * Sets up the initial UI structure and event listeners for the panel.
     * This runs only once.
     */
    function setupPanel() {
        $panel.data('init', true);

        $panel.html(`
            <div class="gsa-quotes-header">
                <h2 class="gsa-panel-title">Quotes</h2>
                <div class="gsa-quotes-controls">
                    <input type="search" id="gsa-quote-search" placeholder="Search by name, email, ID..." class="gos-input">
                    <select id="gsa-quote-sort" class="gos-input">
                        <option value="date_desc">Newest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="price_asc">Price: Low to High</option>
                    </select>
                    <button id="gsa-create-new-quote-btn" class="gos-button">Create New Quote</button>
                </div>
            </div>
            <div id="gsa-quotes-list" class="gsa-quotes-list-container"></div>
        `);

        // Inject CSS for the new UI - PREMIUM GRADIENT STYLING
        const css = `
            /* Premium Gradient Header */
            .gsa-quotes-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                padding: 1.5rem 2rem; 
                border-bottom: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
                position: relative;
                overflow: hidden;
            }
            
            .gsa-quotes-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
                opacity: 0.3;
                pointer-events: none;
            }
            
            .gsa-panel-title { 
                margin: 0; 
                font-size: 1.75rem; 
                font-weight: 700; 
                color: #ffffff;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                position: relative;
                z-index: 1;
            }
            
            .gsa-quotes-controls { 
                display: flex; 
                gap: 1rem; 
                align-items: center;
                position: relative;
                z-index: 1;
            }
            
            /* Premium Glass Input Fields */
            .gsa-quotes-controls .gos-input { 
                padding: 0.75rem 1rem; 
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px; 
                min-width: 200px;
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                color: #ffffff;
                font-size: 0.9375rem;
                transition: all 0.2s ease;
            }
            
            .gsa-quotes-controls .gos-input:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.6);
                background: rgba(255, 255, 255, 0.25);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            }
            
            .gsa-quotes-controls .gos-input::placeholder {
                color: rgba(255, 255, 255, 0.7);
            }
            
            .gsa-quotes-controls .gos-input option {
                background: #667eea;
                color: #ffffff;
            }
            
            /* Premium List Container */
            .gsa-quotes-list-container { 
                padding: 2rem; 
                display: grid; 
                grid-template-columns: repeat(auto-fill, minmax(380px, 400px)); 
                justify-content: start; 
                gap: 1.5rem; 
                background: linear-gradient(135deg, #f5f6fa 0%, #e8eaf6 100%);
            }
            
            /* Premium Quote Cards with Top Gradient Bar */
            .gsa-quote-card { 
                border: 1px solid #e5e7eb;
                border-radius: 12px; 
                background-color: #fff; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.08); 
                transition: all 0.3s ease; 
                cursor: pointer; 
                display: flex; 
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }
            
            .gsa-quote-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #667eea, #764ba2);
            }
            
            .gsa-quote-card:hover, .gsa-quote-card:focus-within { 
                box-shadow: 0 12px 32px rgba(102, 126, 234, 0.2);
                transform: translateY(-6px); 
                border-color: #667eea;
            }
            
            .gsa-quote-card:focus-within { outline: none; }
            .gsa-quote-card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem 0.75rem; border-bottom: 1px solid #f3f4f6; }
            .gsa-quote-title { margin: 0; font-size: 1.1rem; font-weight: 600; text-transform: capitalize; color: #333; flex-shrink: 0; margin-right: 1rem; }
            .gsa-dual-status-wrapper { position: relative; }
            .gsa-dual-status { display: flex; border-radius: 12px; overflow: hidden; cursor: pointer; }
            .gsa-status-part { position: relative; font-size: 0.75rem; font-weight: bold; padding: 0.3rem 0.7rem; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; transition: filter 0.2s; }
            .gsa-status-part:hover { filter: brightness(1.1); }
            .gsa-status-part.lead-status { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
            .gsa-status-part.install-status { border-top-right-radius: 12px; border-bottom-right-radius: 12px; border-left: 1px solid rgba(255,255,255,0.3); }
            .gsa-status-menu { display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; background-color: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; min-width: 120px; padding: 0.5rem 0; }
            .gsa-status-menu.visible { display: block; }
            .gsa-status-option { display: block; padding: 0.5rem 1rem; color: #333; text-decoration: none; font-size: 0.9rem; white-space: nowrap; }
            .gsa-status-option:hover { background-color: #f5f5f5; }
            .gsa-quote-card-body { padding: 1.25rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; flex-grow: 1; }
            .gsa-quote-card-body p { margin: 0 0 0.25rem 0; font-size: 0.9rem; color: #666; }
            .gsa-quote-card-body p strong { color: #333; font-weight: 500; }
            .gsa-quote-card-footer { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; background-color: #fdfdfd; border-top: 1px solid #eee; font-size: 0.8rem; color: #888; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
            .gsa-card-actions { display: flex; align-items: center; gap: 0.5rem; }
            .gsa-view-details-hint { font-weight: 500; color: #06b6d4; opacity: 0; transition: opacity 0.2s ease-in-out; }
            .gsa-quote-card:hover .gsa-view-details-hint, .gsa-quote-card:focus-within .gsa-view-details-hint { opacity: 1; }
            .gsa-delete-quote-btn { background: #fbebeb; color: #e74a3b; border: 1px solid #f5c6cb; border-radius: 50%; width: 24px; height: 24px; font-size: 1.2rem; line-height: 22px; text-align: center; padding: 0; cursor: pointer; opacity: 0; transition: all 0.2s ease; }
            .gsa-quote-card:hover .gsa-delete-quote-btn { opacity: 1; }
            .gsa-delete-quote-btn:hover { background: #e74a3b; color: #fff; }
            .gsa-delete-quote-btn:disabled { background: #ccc; color: #fff; cursor: not-allowed; }
            .gsa-no-data-message { text-align: center; padding: 3rem; color: #777; grid-column: 1 / -1; }
            .gsa-empty-state { text-align: center; padding: 4rem 2rem; background: #fff; border: 2px dashed #e0e0e0; border-radius: 8px; grid-column: 1 / -1; }
        `;
        if (!$('#gsa-quotes-styles').length) {
            $('<style id="gsa-quotes-styles"></style>').text(css).appendTo('head');
        }

        // Attach event handlers (delegated to the panel)
        $panel.on('input', '#gsa-quote-search', renderQuotes);
        $panel.on('change', '#gsa-quote-sort', function() {
            state.sortBy = $(this).val();
            loadAndRenderQuotes();
        });
        $panel.on('input', '#gsa-quote-search', $.debounce(500, function() {
            state.searchTerm = $(this).val();
            loadAndRenderQuotes();
        }));
        $panel.on('click', '#gsa-create-new-quote-btn, #gsa-create-new-quote-btn-empty', function() {
            // This will trigger the dashboard-app.js to show the 'new-quote' panel
            $(document).trigger('gsa:activate:panel', ['new-quote']);
        });

        $panel.on('click keydown', '.gsa-quote-card', function(e) {
            // If the click or keypress was on a button or link, let their specific handlers manage it.
            if ($(e.target).closest('button, a').length > 0) {
                return;
            }

            if (e.type === 'click' || (e.type === 'keydown' && e.key === 'Enter')) {
                e.preventDefault();
                const id = this.dataset.id;
                window.selectedJobId = id;
                $(document).trigger('gsa:activate:panel', ['quote-detail']);
            }
        });

        // Handler for opening the status menu
        $panel.on('click', '.gsa-status-part', function(e) {
            e.stopPropagation();
            // Close any other open menus first
            $('.gsa-status-menu').removeClass('visible');
            // Toggle the current one
            const $menu = $(this).find('.gsa-status-menu');
            $menu.addClass('visible');

            // Add a one-time click handler to the document to close the menu
            if ($menu.hasClass('visible')) {
                $(document).one('click', () => $menu.removeClass('visible'));
            }
        });

        // Handler for selecting a new status
        $panel.on('click', '.gsa-status-option', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $link = $(this);
            const $statusPart = $link.closest('.gsa-status-part');
            const $menu = $link.closest('.gsa-status-menu');
            const $card = $link.closest('.gsa-quote-card');

            const jobId = $card.data('id');
            const statusType = $statusPart.data('type');
            const newStatus = $link.data('status');
            const currentStatus = $statusPart.data('current-status');

            if (newStatus === currentStatus) {
                $menu.removeClass('visible');
                return;
            }

            $statusPart.find('span').text('...');
            $menu.removeClass('visible');

            fetch(`/wp-json/glazieros/v1/jobs/${jobId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': wpApiSettings.nonce
                },
                body: JSON.stringify({ status: newStatus, type: statusType })
            })
            .then(r => {
                if (!r.ok) throw new Error('Failed to update status');
                return r.json();
            })
            .then(updatedJob => {
                // Update the master data array
                const jobIndex = allJobs.findIndex(j => j.id == updatedJob.id);
                if (jobIndex > -1) {
                    allJobs[jobIndex] = updatedJob;
                }
                // Directly update the UI of the specific card
                const newStatusLabel = statusType === 'lead' ? updatedJob.lead_status : updatedJob.install_status;
                const newStatusInfo = statusSettings[statusType].find(s => s.label === newStatusLabel);
                $statusPart.find('span').text(newStatusLabel);
                $statusPart.data('current-status', newStatusLabel);
                $statusPart.css('background-color', newStatusInfo ? newStatusInfo.color : '#cccccc');
            })
            .catch(err => {
                console.error('Error updating status:', err);
                alert('Could not update status. Please try again.');
                // Revert the UI by reloading the data
                loadAndRenderQuotes();
            });
        });

        // Handler for deleting a quote
        $panel.on('click', '.gsa-delete-quote-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (!confirm('Are you sure you want to permanently delete this quote? This cannot be undone.')) {
                return;
            }

            const $button = $(this);
            const jobId = $button.data('id');
            $button.prop('disabled', true).html('...');

            fetch(`/wp-json/glazieros/v1/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': wpApiSettings.nonce }
            })
            .then(r => {
                if (!r.ok) throw new Error('Failed to delete quote.');
                return r.json();
            })
            .then(response => {
                if (response.success) {
                    // Refresh the list from the server to ensure data is current.
                    loadAndRenderQuotes();
                } else {
                    throw new Error('Deletion was not successful on the server.');
                }
            })
            .catch(err => {
                console.error('Error deleting quote:', err);
                alert('Could not delete quote. Please try again.');
                renderQuotes(); // Re-render to restore button state
            });
        });
    }

    // Main activation listener
    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'quotes') return;

        // Setup the panel on first activation
        if (!$panel.data('init')) {
            injectStatusStyles();
            setupPanel();
        }

        // Always refresh data when panel is activated
        loadAndRenderQuotes();
    });

    // Listen for data updates from other panels
    $(document).on('gsa:data:updated', (e, type, id) => {
        if (type === 'quote' && $panel.is(':visible')) {
            loadAndRenderQuotes();
        }
    });
});
