/**
 * GlazierOS Diary System v2.0.0 - Part 5
 * Modal System & API Actions
 * 
 * Event modal, CRUD operations, and bulk actions
 * 
 * @package GlazierOS
 * @version 2.0.0
 */

(function($) {
    'use strict';

    const DiaryApp = window.GOS_DIARY_V2.DiaryApp;
    const CONFIG = window.GOS_DIARY_V2.CONFIG;
    const DiaryUtils = window.GOS_DIARY_V2.DiaryUtils;

    // ============================================================================
    // EVENT MODAL SYSTEM
    // ============================================================================

    /**
     * Open event modal
     */
    DiaryApp.prototype.openEventModal = function(mode, eventId = null, prefill = {}) {
        const state = this.state.getState();
        let event = null;
        
        if (eventId) {
            event = state.events.find(e => e.id === eventId);
            if (!event) {
                this.showNotification('❌ Event not found', 'error');
                return;
            }
        }
        
        const modalHtml = this.renderEventModal(mode, event, prefill);
        $('body').append(modalHtml);
        $('body').addClass('gos-modal-open');
        
        this.state.setState({ isModalOpen: true, modalMode: mode });
        this.currentEditingEvent = event;
        
        // Attach modal listeners
        this.attachModalListeners();
        
        // Focus first input
        setTimeout(() => {
            $('#gos-event-modal').find('input, select, textarea').first().focus();
        }, 100);
    };

    /**
     * Render event modal
     */
    DiaryApp.prototype.renderEventModal = function(mode, event = null, prefill = {}) {
        const state = this.state.getState();
        const isViewMode = mode === 'view';
        const isEditMode = mode === 'edit';
        const isCreateMode = mode === 'create';
        
        // Get event data or use prefill
        const eventData = event || {
            type: prefill.type || CONFIG.DEFAULTS.EVENT_TYPE,
            status: prefill.status || CONFIG.DEFAULTS.EVENT_STATUS,
            fitter: prefill.fitter || '',
            datetime: prefill.date ? `${prefill.date}T${prefill.time || '09:00'}` : new Date().toISOString().slice(0, 16),
            duration: CONFIG.DEFAULTS.EVENT_DURATION,
            job_id: '',
            notes: '',
            ...prefill
        };
        
        const job = event?.job || {};
        const type = DiaryUtils.getEventType(eventData.type);
        const status = DiaryUtils.getEventStatus(eventData.status);
        const datetime = new Date(eventData.datetime);
        const dateStr = datetime.toISOString().slice(0, 10);
        const timeStr = datetime.toTimeString().slice(0, 5);
        
        return `
            <div class="gos-modal-overlay" id="gos-event-modal">
                <div class="gos-modal-container gos-modal-large">
                    <!-- Modal Header -->
                    <div class="gos-modal-header">
                        <div class="gos-modal-title">
                            <h2>
                                ${isViewMode ? '👁️ View Event' : ''}
                                ${isEditMode ? '✏️ Edit Event' : ''}
                                ${isCreateMode ? '➕ Create Event' : ''}
                            </h2>
                            ${event ? `<span class="gos-modal-subtitle">#${event.id}</span>` : ''}
                        </div>
                        <div class="gos-modal-header-actions">
                            ${isViewMode ? `
                                <button class="gos-modal-action-btn" data-modal-action="edit">
                                    ✏️ Edit
                                </button>
                            ` : ''}
                            ${event ? `
                                <button class="gos-modal-action-btn gos-modal-action-danger" data-modal-action="delete">
                                    🗑️ Delete
                                </button>
                            ` : ''}
                            <button class="gos-modal-close" id="gos-modal-close-btn" title="Close (Esc)">
                                ×
                            </button>
                        </div>
                    </div>
                    
                    <!-- Modal Body -->
                    <div class="gos-modal-body">
                        <form id="gos-event-form" class="gos-event-form">
                            <!-- Event Type & Status -->
                            <div class="gos-modal-section">
                                <h3 class="gos-modal-section-title">📋 Event Details</h3>
                                <div class="gos-modal-grid">
                                    <div class="gos-modal-field">
                                        <label class="gos-modal-label">Event Type *</label>
                                        ${isViewMode ? `
                                            <div class="gos-modal-value">
                                                <span style="color: ${type.color}">${type.icon}</span>
                                                ${type.label}
                                            </div>
                                        ` : `
                                            <select class="gos-modal-select" name="type" required ${isViewMode ? 'disabled' : ''}>
                                                ${CONFIG.EVENT_TYPES.map(t => `
                                                    <option value="${t.value}" ${eventData.type === t.value ? 'selected' : ''}>
                                                        ${t.icon} ${t.label}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        `}
                                    </div>
                                    
                                    <div class="gos-modal-field">
                                        <label class="gos-modal-label">Status *</label>
                                        ${isViewMode ? `
                                            <div class="gos-modal-value">
                                                <span style="color: ${status.color}">${status.icon}</span>
                                                ${status.label}
                                            </div>
                                        ` : `
                                            <select class="gos-modal-select" name="status" required ${isViewMode ? 'disabled' : ''}>
                                                ${CONFIG.EVENT_STATUSES.map(s => `
                                                    <option value="${s.value}" ${eventData.status === s.value ? 'selected' : ''}>
                                                        ${s.icon} ${s.label}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        `}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Date & Time -->
                            <div class="gos-modal-section">
                                <h3 class="gos-modal-section-title">📅 Schedule</h3>
                                <div class="gos-modal-grid">
                                    <div class="gos-modal-field">
                                        <label class="gos-modal-label">Date *</label>
                                        ${isViewMode ? `
                                            <div class="gos-modal-value">${DiaryUtils.formatDate(datetime, 'long')}</div>
                                        ` : `
                                            <input type="date" 
                                                   class="gos-modal-input" 
                                                   name="date" 
                                                   value="${dateStr}"
                                                   required 
                                                   ${isViewMode ? 'readonly' : ''}>
                                        `}
                                    </div>
                                    
                                    <div class="gos-modal-field">
                                        <label class="gos-modal-label">Time *</label>
                                        ${isViewMode ? `
                                            <div class="gos-modal-value">${DiaryUtils.formatTime(datetime)}</div>
                                        ` : `
                                            <select class="gos-modal-select" name="time" required ${isViewMode ? 'disabled' : ''}>
                                                ${CONFIG.TIME_SLOTS.map(slot => `
                                                    <option value="${slot.value}" ${timeStr === slot.value ? 'selected' : ''}>
                                                        ${slot.label}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        `}
                                    </div>
                                    
                                    <div class="gos-modal-field">
                                        <label class="gos-modal-label">Duration (hours) *</label>
                                        ${isViewMode ? `
                                            <div class="gos-modal-value">${eventData.duration}h</div>
                                        ` : `
                                            <select class="gos-modal-select" name="duration" required ${isViewMode ? 'disabled' : ''}>
                                                ${CONFIG.DURATION_PRESETS.map(preset => `
                                                    <option value="${preset.value}" ${parseFloat(eventData.duration) === preset.value ? 'selected' : ''}>
                                                        ${preset.label}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        `}
                                    </div>
                                    
                                    <div class="gos-modal-field">
                                        <label class="gos-modal-label">Fitter *</label>
                                        ${isViewMode ? `
                                            <div class="gos-modal-value">${eventData.fitter || 'Unassigned'}</div>
                                        ` : `
                                            <select class="gos-modal-select" name="fitter" required ${isViewMode ? 'disabled' : ''}>
                                                <option value="">Select fitter...</option>
                                                ${state.fitters.map(f => `
                                                    <option value="${f.name}" ${eventData.fitter === f.name ? 'selected' : ''}>
                                                        ${f.name}
                                                    </option>
                                                `).join('')}
                                            </select>
                                        `}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Job/Customer -->
                            <div class="gos-modal-section">
                                <h3 class="gos-modal-section-title">👤 Customer</h3>
                                <div class="gos-modal-grid">
                                    <div class="gos-modal-field gos-modal-field-full">
                                        <label class="gos-modal-label">Quote/Job</label>
                                        ${isViewMode ? `
                                            ${job.id ? `
                                                <div class="gos-modal-value">
                                                    <strong>#${job.id}</strong> - 
                                                    ${job.first_name} ${job.last_name}
                                                    ${job.type ? `(${job.type})` : ''}
                                                </div>
                                            ` : '<div class="gos-modal-value">No job assigned</div>'}
                                        ` : `
                                            <select class="gos-modal-select" name="job_id" ${isViewMode ? 'disabled' : ''}>
                                                <option value="">None (standalone event)</option>
                                                ${state.jobs.sort((a, b) => b.id - a.id).map(j => `
                                                    <option value="${j.id}" ${eventData.job_id == j.id ? 'selected' : ''}>
                                                        #${j.id} - ${j.first_name} ${j.last_name} (${j.type || 'Window'})
                                                    </option>
                                                `).join('')}
                                            </select>
                                        `}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Notes -->
                            <div class="gos-modal-section">
                                <h3 class="gos-modal-section-title">📝 Notes</h3>
                                <div class="gos-modal-field">
                                    ${isViewMode ? `
                                        <div class="gos-modal-value">${eventData.notes || 'No notes'}</div>
                                    ` : `
                                        <textarea class="gos-modal-textarea" 
                                                  name="notes" 
                                                  rows="4" 
                                                  placeholder="Add any additional notes..."
                                                  ${isViewMode ? 'readonly' : ''}>${eventData.notes || ''}</textarea>
                                    `}
                                </div>
                            </div>
                            
                            ${event && !isViewMode ? `
                                <!-- Conflict Detection -->
                                <div class="gos-modal-section" id="gos-conflict-check">
                                    <!-- Will be populated dynamically -->
                                </div>
                            ` : ''}
                        </form>
                    </div>
                    
                    <!-- Modal Footer -->
                    <div class="gos-modal-footer">
                        <button type="button" class="gos-btn-secondary" id="gos-modal-cancel-btn">
                            ${isViewMode ? 'Close' : 'Cancel'}
                        </button>
                        ${!isViewMode ? `
                            <button type="submit" form="gos-event-form" class="gos-btn-primary" id="gos-modal-save-btn">
                                ${isEditMode ? '💾 Save Changes' : '➕ Create Event'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Attach modal event listeners
     */
    DiaryApp.prototype.attachModalListeners = function() {
        const $modal = $('#gos-event-modal');
        
        // Close modal
        $modal.on('click', '#gos-modal-close-btn, #gos-modal-cancel-btn', () => {
            this.closeEventModal();
        });
        
        // Close on overlay click
        $modal.on('click', (e) => {
            if (e.target.id === 'gos-event-modal') {
                this.closeEventModal();
            }
        });
        
        // Switch to edit mode
        $modal.on('click', '[data-modal-action="edit"]', () => {
            this.closeEventModal();
            if (this.currentEditingEvent) {
                this.openEventModal('edit', this.currentEditingEvent.id);
            }
        });
        
        // Delete from modal
        $modal.on('click', '[data-modal-action="delete"]', async () => {
            if (this.currentEditingEvent) {
                await this.deleteEvent(this.currentEditingEvent.id);
                this.closeEventModal();
            }
        });
        
        // Form submission
        $modal.on('submit', '#gos-event-form', async (e) => {
            e.preventDefault();
            await this.saveEvent();
        });
        
        // Real-time conflict detection
        $modal.on('change', 'select[name="fitter"], input[name="date"], select[name="time"], select[name="duration"]', () => {
            this.checkConflicts();
        });
    };

    /**
     * Close event modal
     */
    DiaryApp.prototype.closeEventModal = function() {
        $('#gos-event-modal').fadeOut(200, function() {
            $(this).remove();
        });
        $('body').removeClass('gos-modal-open');
        this.state.setState({ isModalOpen: false, modalMode: null });
        this.currentEditingEvent = null;
    };

    /**
     * Check for scheduling conflicts
     */
    DiaryApp.prototype.checkConflicts = function() {
        const $form = $('#gos-event-form');
        const formData = {
            fitter: $form.find('[name="fitter"]').val(),
            date: $form.find('[name="date"]').val(),
            time: $form.find('[name="time"]').val(),
            duration: parseFloat($form.find('[name="duration"]').val())
        };
        
        if (!formData.fitter || !formData.date || !formData.time) {
            return;
        }
        
        const datetime = `${formData.date}T${formData.time}:00`;
        const state = this.state.getState();
        
        // Create temporary event for conflict check
        const tempEvent = {
            id: this.currentEditingEvent?.id || -1,
            datetime,
            duration: formData.duration,
            fitter: formData.fitter
        };
        
        const conflicts = DiaryUtils.getEventConflicts(tempEvent, state.events);
        
        const $conflictCheck = $('#gos-conflict-check');
        if (conflicts.length > 0) {
            $conflictCheck.html(`
                <div class="gos-conflict-warning">
                    <div class="gos-conflict-header">
                        <span class="gos-conflict-icon">⚠️</span>
                        <strong>Scheduling Conflict Detected!</strong>
                    </div>
                    <div class="gos-conflict-list">
                        ${conflicts.map(conflict => {
                            const type = DiaryUtils.getEventType(conflict.type);
                            const job = conflict.job || {};
                            return `
                                <div class="gos-conflict-item">
                                    <span style="color: ${type.color}">${type.icon}</span>
                                    ${DiaryUtils.formatTime(conflict.datetime)} - 
                                    ${type.label} - 
                                    #${job.id} ${job.first_name} ${job.last_name}
                                    (${conflict.duration}h)
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <p class="gos-conflict-message">
                        This event overlaps with ${conflicts.length} existing event${conflicts.length > 1 ? 's' : ''}.
                        You can still create it, but the fitter may be double-booked.
                    </p>
                </div>
            `);
        } else {
            $conflictCheck.html(`
                <div class="gos-conflict-ok">
                    <span class="gos-conflict-icon">✅</span>
                    <strong>No conflicts - slot is available!</strong>
                </div>
            `);
        }
    };

    // ============================================================================
    // API ACTIONS - CRUD OPERATIONS
    // ============================================================================

    /**
     * Save event (create or update)
     */
    DiaryApp.prototype.saveEvent = async function() {
        const $form = $('#gos-event-form');
        const state = this.state.getState();
        const isEdit = state.modalMode === 'edit';
        
        // Collect form data
        const formData = {
            type: $form.find('[name="type"]').val(),
            status: $form.find('[name="status"]').val(),
            fitter: $form.find('[name="fitter"]').val(),
            date: $form.find('[name="date"]').val(),
            time: $form.find('[name="time"]').val(),
            duration: parseFloat($form.find('[name="duration"]').val()),
            job_id: $form.find('[name="job_id"]').val() || null,
            notes: $form.find('[name="notes"]').val()
        };
        
        // Combine date and time
        const datetime = `${formData.date}T${formData.time}:00`;
        
        const eventData = {
            type: formData.type,
            status: formData.status,
            fitter: formData.fitter,
            datetime,
            duration: formData.duration,
            job_id: formData.job_id,
            notes: formData.notes
        };
        
        // Show loading
        $('#gos-modal-save-btn').prop('disabled', true).text('⏳ Saving...');
        
        try {
            let result;
            
            if (isEdit && this.currentEditingEvent) {
                // Update existing event
                result = await this.api.updateEvent(this.currentEditingEvent.id, eventData);
            } else {
                // Create new event
                result = await this.api.createEvent(eventData);
            }
            
            if (result.success) {
                this.showNotification(
                    `✅ Event ${isEdit ? 'updated' : 'created'} successfully`,
                    'success'
                );
                this.closeEventModal();
                await this.reloadEvents();
            } else {
                this.showNotification(`❌ Failed to ${isEdit ? 'update' : 'create'} event`, 'error');
                $('#gos-modal-save-btn').prop('disabled', false).text(isEdit ? '💾 Save Changes' : '➕ Create Event');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            this.showNotification('❌ An error occurred', 'error');
            $('#gos-modal-save-btn').prop('disabled', false).text(isEdit ? '💾 Save Changes' : '➕ Create Event');
        }
    };

    /**
     * Delete single event
     */
    DiaryApp.prototype.deleteEvent = async function(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }
        
        const result = await this.api.deleteEvent(eventId);
        
        if (result.success) {
            this.showNotification('✅ Event deleted successfully', 'success');
            await this.reloadEvents();
        } else {
            this.showNotification('❌ Failed to delete event', 'error');
        }
    };

    /**
     * Delete selected events (bulk)
     */
    DiaryApp.prototype.deleteSelectedEvents = async function() {
        const state = this.state.getState();
        const selectedIds = Array.from(state.selectedEvents);
        
        if (selectedIds.length === 0) {
            this.showNotification('⚠️ No events selected', 'warning');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} event${selectedIds.length > 1 ? 's' : ''}?`)) {
            return;
        }
        
        const result = await this.api.bulkDeleteEvents(selectedIds);
        
        if (result.success) {
            this.showNotification(`✅ Deleted ${selectedIds.length} event${selectedIds.length > 1 ? 's' : ''}`, 'success');
            this.clearSelection();
            await this.reloadEvents();
        } else {
            this.showNotification('❌ Failed to delete events', 'error');
        }
    };

    /**
     * Move event (drag & drop)
     */
    DiaryApp.prototype.moveEvent = async function(eventId, newFitter, newDate, newTime) {
        const state = this.state.getState();
        const event = state.events.find(e => e.id === eventId);
        
        if (!event) return;
        
        const newDatetime = `${newDate}T${newTime}:00`;
        
        // Optimistic update
        const updatedEvents = state.events.map(e => 
            e.id === eventId ? { ...e, fitter: newFitter, datetime: newDatetime } : e
        );
        this.state.setState({ events: updatedEvents });
        
        // Update via API
        const result = await this.api.updateEvent(eventId, {
            ...event,
            fitter: newFitter,
            datetime: newDatetime
        });
        
        if (result.success) {
            this.showNotification('✅ Event moved successfully', 'success');
        } else {
            this.showNotification('❌ Failed to move event', 'error');
            await this.reloadEvents(); // Revert on failure
        }
    };

    /**
     * Export selected events to CSV
     */
    DiaryApp.prototype.exportSelectedEvents = function() {
        const state = this.state.getState();
        const selectedIds = Array.from(state.selectedEvents);
        
        if (selectedIds.length === 0) {
            this.showNotification('⚠️ No events selected', 'warning');
            return;
        }
        
        const events = state.events.filter(e => selectedIds.includes(e.id));
        this.exportEventsToCSV(events);
    };

    /**
     * Export events to CSV
     */
    DiaryApp.prototype.exportEventsToCSV = function(events) {
        const headers = [
            'ID', 'Type', 'Status', 'Date', 'Time', 'Duration', 'Fitter', 
            'Job ID', 'Customer', 'Notes'
        ];
        
        const rows = events.map(e => {
            const datetime = new Date(e.datetime);
            const job = e.job || {};
            const customerName = [job.first_name, job.last_name].filter(Boolean).join(' ');
            
            return [
                e.id,
                e.type || '',
                e.status || '',
                DiaryUtils.formatDate(datetime, 'iso'),
                DiaryUtils.formatTime(datetime),
                e.duration || '',
                e.fitter || '',
                e.job_id || '',
                customerName || '',
                (e.notes || '').replace(/"/g, '""')
            ];
        });
        
        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `diary-events-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`✅ Exported ${events.length} event${events.length > 1 ? 's' : ''}`, 'success');
    };

    console.log('✅ Diary v2.0.0 - Modal system & API actions loaded');

})(jQuery);
