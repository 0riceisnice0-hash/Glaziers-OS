// assets/js/dashboard/branches.js
console.log('⚙️ branches.js loaded');

jQuery(function($) {
    const $panel = $('#gsa-branches');

    function render(branches) {
        let tableHtml = `
            <table class="gsa-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        branches.forEach(branch => {
            tableHtml += `
                <tr data-id="${branch.id}">
                    <td>${branch.title.rendered}</td>
                    <td>
                        <button class="gos-button gos-button-edit">Edit</button>
                        <button class="gos-button gos-button-delete">Delete</button>
                    </td>
                </tr>
            `;
        });

        tableHtml += '</tbody></table>';

        $panel.html(`
            <div class="gsa-reports-header">
                <h2 class="gsa-panel-title">Branches</h2>
                <button class="gos-button" id="gsa-add-branch">Add New Branch</button>
            </div>
            <div class="gsa-table-container">
                ${tableHtml}
            </div>
            <div id="gsa-branch-modal" style="display:none;">
                <form id="gsa-branch-form">
                    <input type="hidden" id="gsa-branch-id">
                    <div>
                        <label for="gsa-branch-name">Branch Name</label>
                        <input type="text" id="gsa-branch-name" required>
                    </div>
                    <button type="submit">Save</button>
                    <button type="button" id="gsa-branch-modal-close">Cancel</button>
                </form>
            </div>
        `);
    }

    function loadBranches() {
        $panel.html('<p>Loading branches...</p>');
        fetch('/wp-json/wp/v2/gos_branch', {
            headers: { 'X-WP-Nonce': wpApiSettings.nonce }
        })
            .then(res => res.json())
            .then(branches => {
                render(branches);
            })
            .catch(err => {
                $panel.html(`<p class="gos-error">Error loading branches: ${err.message}</p>`);
            });
    }

    function openModal(branch = {}) {
        $('#gsa-branch-id').val(branch.id || '');
        $('#gsa-branch-name').val(branch.title ? branch.title.rendered : '');
        $('#gsa-branch-modal').show();
    }

    function closeModal() {
        $('#gsa-branch-modal').hide();
    }

    $panel.on('click', '#gsa-add-branch', () => openModal());
    $panel.on('click', '#gsa-branch-modal-close', () => closeModal());

    $panel.on('submit', '#gsa-branch-form', function(e) {
        e.preventDefault();
        const id = $('#gsa-branch-id').val();
        const name = $('#gsa-branch-name').val();
        const method = id ? 'POST' : 'POST';
        const url = id ? `/wp-json/wp/v2/gos_branch/${id}` : '/wp-json/wp/v2/gos_branch';

        fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-WP-Nonce': wpApiSettings.nonce
            },
            body: JSON.stringify({ title: name, status: 'publish' })
        }).then(() => {
            closeModal();
            loadBranches();
        });
    });

    $panel.on('click', '.gos-button-edit', function() {
        const id = $(this).closest('tr').data('id');
        fetch(`/wp-json/wp/v2/gos_branch/${id}`, {
            headers: { 'X-WP-Nonce': wpApiSettings.nonce }
        })
            .then(res => res.json())
            .then(branch => openModal(branch));
    });

    $panel.on('click', '.gos-button-delete', function() {
        const id = $(this).closest('tr').data('id');
        if (confirm('Are you sure you want to delete this branch?')) {
            fetch(`/wp-json/wp/v2/gos_branch/${id}`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': wpApiSettings.nonce }
            }).then(() => loadBranches());
        }
    });

    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'branches') return;
        loadBranches();
    });
});
