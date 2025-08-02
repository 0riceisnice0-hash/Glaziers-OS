// ⚙️ fitters.js loaded
jQuery(document).on('gsa:panel:activated', (e, tab) => {
  if (tab !== 'fitters') return;

  const $panel = jQuery('#gsa-fitters');
  if ($panel.data('init')) return;
  $panel.data('init', true);

  $panel.html('<p>Loading fitters…</p>');
  fetch('/wp-json/glazieros/v1/fitters')
    .then(r => r.json())
    .then(fitters => {
      let html = `<table class="gsa-table"><thead><tr>
          <th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Actions</th>
        </tr></thead><tbody>`;
      fitters.forEach(f => {
        // Use data attributes to easily access fitter info for editing
        html += `<tr data-id="${f.id}" data-name="${f.name}" data-email="${f.email || ''}" data-mobile="${f.mobile || ''}">
            <td>${f.id}</td>
            <td>${f.name}</td>
            <td>${f.email || ''}</td>
            <td>${f.mobile || ''}</td>
            <td>
                <button class="gsa-edit-fitter gos-button" data-id="${f.id}">Edit</button>
                <button class="gsa-delete-fitter gos-button" data-id="${f.id}">Delete</button>
            </td>
        </tr>`;
      });
      html += `</tbody></table>
        <h3 id="gsa-fitter-form-heading">Add Fitter</h3>
        <form id="gsa-fitter-form">
          <input type="hidden" name="id" value="">
          <input name="name" placeholder="Name" class="gos-input" required>
          <input name="email" placeholder="Email" class="gos-input">
          <input name="mobile" placeholder="Mobile" class="gos-input">
          <button type="submit" class="gos-button">Save Fitter</button>
          <button type="button" id="gsa-fitter-form-cancel" class="gos-button" style="display:none;">Cancel</button>
        </form>`;
      $panel.html(html);

      // Handle form submission (for both add and edit)
      $panel.find('#gsa-fitter-form').on('submit', e => {
        e.preventDefault();
        const form = e.target;
        const id = form.id.value;
        const d = {
            name: form.name.value,
            email: form.email.value,
            mobile: form.mobile.value,
        };
        
        const url = id ? `/wp-json/glazieros/v1/fitters/${id}` : '/wp-json/glazieros/v1/fitters';
        const method = 'POST'; // POST for both create and update

        fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) })
          .then(r => r.json())
          .then(() => {
            $panel.data('init', false); // Allow re-initialization
            jQuery(document).trigger('gsa:activate:panel', ['fitters']);
          });
      });

      // Handle Edit button click
      $panel.on('click', '.gsa-edit-fitter', function() {
          const row = jQuery(this).closest('tr');
          const form = $panel.find('#gsa-fitter-form')[0];
          $panel.find('#gsa-fitter-form-heading').text('Edit Fitter');
          form.id.value = row.data('id');
          form.name.value = row.data('name');
          form.email.value = row.data('email');
          form.mobile.value = row.data('mobile');
          $panel.find('#gsa-fitter-form-cancel').show();
      });

      // Handle Cancel button click
      $panel.on('click', '#gsa-fitter-form-cancel', function() {
          const form = $panel.find('#gsa-fitter-form')[0];
          $panel.find('#gsa-fitter-form-heading').text('Add Fitter');
          form.reset();
          form.id.value = '';
          jQuery(this).hide();
      });

      // Handle Delete button click
      $panel.on('click', '.gsa-delete-fitter', function() {
          if (!confirm('Are you sure you want to delete this fitter?')) return;
          
          const id = this.dataset.id;
          fetch(`/wp-json/glazieros/v1/fitters/${id}`, { method: 'DELETE' })
          .then(r => r.json())
          .then(res => {
              if (res.success) {
                $panel.data('init', false);
                jQuery(document).trigger('gsa:activate:panel', ['fitters']);
              } else {
                  alert('Error deleting fitter.');
              }
          });
      });
    });
});
