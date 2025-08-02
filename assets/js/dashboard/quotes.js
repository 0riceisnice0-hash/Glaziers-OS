// assets/js/dashboard/quotes.js
console.log('⚙️ quotes.js loaded');

jQuery(function($) {
    const $panel = $('#gsa-quotes');
    let allJobs = []; // This will hold the master list of jobs for the session.
    let statusSettings = { lead: [], install: [] }; // To hold status colors and labels

    /**
     * Renders the quotes list based on the current search and sort values.
     */
    function renderQuotes() {
        const searchTerm = ($panel.find('#gsa-quote-search').val() || '').toLowerCase();
        const sortBy = $panel.find('#gsa-quote-sort').val();
        const $listContainer = $panel.find('#gsa-quotes-list');

        if (!allJobs || allJobs.length === 0) {
            $listContainer.html('<p class="gsa-no-data-message">No quotes found.</p>');
            return;
        }

        // 1. Filter jobs
        const filteredJobs = allJobs.filter(j => {
            const searchString = [
                j.id,
                j.first_name,
                j.last_name,
                j.email,
                j.address,
                `${j.first_name} ${j.last_name}`
            ].join(' ').toLowerCase();
            return searchString.includes(searchTerm);
        });

        // 2. Sort jobs
        filteredJobs.sort((a, b) => {
            switch (sortBy) {
                case 'price_desc': return b.price - a.price;
                case 'price_asc': return a.price - b.price;
                case 'date_asc': return new Date(a.date) - new Date(b.date);
                case 'date_desc':
                default:
                    return new Date(b.date) - new Date(a.date);
            }
        });

        // 3. Generate and render HTML
        if (filteredJobs.length === 0) {
            $listContainer.html('<p class="gsa-no-data-message">No quotes match your search.</p>');
            return;
        }

        const html = filteredJobs.map(j => {
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
        $panel.find('#gsa-quotes-list').html('<p class="gsa-no-data-message">Loading quotes…</p>');

        Promise.all([
            fetch('/wp-json/glazieros/v1/jobs').then(r => r.json()),
            fetch('/wp-json/glazieros/v1/settings/statuses').then(r => r.json())
        ])
            .then(([jobs, statuses]) => {
                allJobs = Array.isArray(jobs) ? jobs : []; // Ensure it's an array
                statusSettings = statuses;
                renderQuotes();
                // After rendering, inject dynamic styles for statuses
                injectStatusStyles();
            })
            .catch(err => {
                console.error('Error fetching jobs:', err);
                $listContainer.html(`<p class="gos-error">Error loading quotes. Please try again.</p>`);
            });
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
                </div>
            </div>
            <div id="gsa-quotes-list" class="gsa-quotes-list-container"></div>
        `);

        // Inject CSS for the new UI
        const css = `
            .gsa-quotes-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; background-color: #f8f9fa; }
            .gsa-panel-title { margin: 0; font-size: 1.5rem; font-weight: 500; }
            .gsa-quotes-controls { display: flex; gap: 1rem; }
            .gsa-quotes-controls .gos-input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; min-width: 200px; }
            .gsa-quotes-list-container { padding: 1.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; background-color: #f1f2f6; }
            .gsa-quote-card { border: 1px solid #e0e0e0; border-radius: 8px; background-color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.06); transition: all 0.2s ease-in-out; cursor: pointer; display: flex; flex-direction: column; }
            .gsa-quote-card:hover, .gsa-quote-card:focus-within { box-shadow: 0 5px 15px rgba(0,0,0,0.1); transform: translateY(-4px); border-color: #4e73df; }
            .gsa-quote-card:focus-within { outline: none; }
            .gsa-quote-card-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1.25rem; border-bottom: 1px solid #eee; }
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
            .gsa-view-details-hint { font-weight: 500; color: #4e73df; opacity: 0; transition: opacity 0.2s ease-in-out; }
            .gsa-quote-card:hover .gsa-view-details-hint, .gsa-quote-card:focus-within .gsa-view-details-hint { opacity: 1; }
            .gsa-delete-quote-btn { background: #fbebeb; color: #e74a3b; border: 1px solid #f5c6cb; border-radius: 50%; width: 24px; height: 24px; font-size: 1.2rem; line-height: 22px; text-align: center; padding: 0; cursor: pointer; opacity: 0; transition: all 0.2s ease; }
            .gsa-quote-card:hover .gsa-delete-quote-btn { opacity: 1; }
            .gsa-delete-quote-btn:hover { background: #e74a3b; color: #fff; }
            .gsa-delete-quote-btn:disabled { background: #ccc; color: #fff; cursor: not-allowed; }
            .gsa-no-data-message { text-align: center; padding: 3rem; color: #777; grid-column: 1 / -1; }
        `;
        if (!$('#gsa-quotes-styles').length) {
            $('<style id="gsa-quotes-styles"></style>').text(css).appendTo('head');
        }

        // Attach event handlers (delegated to the panel)
        $panel.on('input', '#gsa-quote-search', renderQuotes);
        $panel.on('change', '#gsa-quote-sort', renderQuotes);

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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, type: statusType })
            })
            .then(r => {
                if (!r.ok) throw new Error('Failed to update status');
                return r.json();
            })
            .then(response => {
                if (response.success) {
                    // Update the master data array
                    const jobIndex = allJobs.findIndex(j => j.id == jobId);
                    if (jobIndex > -1) {
                        if (response.type === 'lead') {
                            allJobs[jobIndex].lead_status = response.new_status;
                        } else if (response.type === 'install') {
                            allJobs[jobIndex].install_status = response.new_status;
                        }
                    }
                    // Re-render the whole list from the updated local data
                    renderQuotes();
                } else {
                    throw new Error('Update was not successful.');
                }
            })
            .catch(err => {
                console.error('Error updating status:', err);
                alert('Could not update status. Please try again.');
                // Re-render to revert the "Saving..." text
                renderQuotes();
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
                method: 'DELETE'
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
            setupPanel();
        }

        // Always refresh data when panel is activated
        loadAndRenderQuotes();
    });
});
