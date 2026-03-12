/**
 * GlazierOS Diary System v2.0.0 - Part 4
 * Event Handlers & Modal System
 * 
 * All event listeners, drag & drop, and modal interactions
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
    // EVENT LISTENERS
    // ============================================================================

    DiaryApp.prototype.attachEventListeners = function() {
        const $body = $('body');
        const $panel = $('#gsa-diary');
        
        // Navigation
        $panel.on('click', '#gos-diary-prev', () => this.navigatePrevious());
        $panel.on('click', '#gos-diary-next', () => this.navigateNext());
        $panel.on('click', '#gos-diary-today', () => this.navigateToToday());
        
        // View Switching - pill buttons with smooth transitions
        $panel.on('click', '.gos-view-btn, .gos-view-icon-btn, .gos-view-pill', (e) => {
            const $btn = $(e.currentTarget);
            const view = $btn.data('view');
            if (view) {
                // Add loading class for smooth transition
                $('#gos-diary-body').addClass('gos-view-loading');
                
                this.state.setState({ viewMode: view });
                
                // Remove loading class after transition
                setTimeout(() => {
                    $('#gos-diary-body').removeClass('gos-view-loading');
                }, 150);
            }
        });
        
        // Create Event
        $panel.on('click', '#gos-create-event-btn, [data-action="create-event"]', () => {
            this.openEventModal('create');
        });
        
        // Toggle Panels
        $panel.on('click', '#gos-toggle-filters-btn', () => this.toggleFiltersPanel());
        $panel.on('click', '#gos-toggle-stats-btn', () => this.toggleStatsPanel());
        
        // Filters
        $panel.on('input', '#gos-diary-search', DiaryUtils.debounce((e) => {
            this.updateFilter('search', e.target.value);
        }, CONFIG.SEARCH_DELAY));
        
        $panel.on('change', '#gos-filter-event-type', (e) => {
            this.updateFilter('eventType', e.target.value);
        });
        
        $panel.on('change', '#gos-filter-event-status', (e) => {
            this.updateFilter('eventStatus', e.target.value);
        });
        
        $panel.on('change', '#gos-filter-fitter', (e) => {
            this.updateFilter('fitter', e.target.value);
        });
        
        $panel.on('change', '#gos-filter-date-range', (e) => {
            this.updateFilter('dateRange', e.target.value);
        });
        
        $panel.on('click', '#gos-clear-filters-btn', () => this.clearFilters());
        
        // Bulk Actions
        $panel.on('click', '[data-action="export-selected"]', () => this.exportSelectedEvents());
        $panel.on('click', '[data-action="delete-selected"]', () => this.deleteSelectedEvents());
        $panel.on('click', '[data-action="clear-selection"]', () => this.clearSelection());
        
        // Selection
        $panel.on('change', '#gos-select-all-events', (e) => this.toggleSelectAll(e.target.checked));
        $panel.on('change', '.gos-event-checkbox', (e) => {
            const eventId = parseInt($(e.target).data('event-id'));
            this.toggleEventSelection(eventId, e.target.checked);
        });
        
        // Event Actions (List View)
        $panel.on('click', '[data-action="view"]', (e) => {
            const eventId = parseInt($(e.currentTarget).data('event-id'));
            this.openEventModal('view', eventId);
        });
        
        $panel.on('click', '[data-action="edit"]', (e) => {
            const eventId = parseInt($(e.currentTarget).data('event-id'));
            this.openEventModal('edit', eventId);
        });
        
        $panel.on('click', '[data-action="delete"]', async (e) => {
            const eventId = parseInt($(e.currentTarget).data('event-id'));
            await this.deleteEvent(eventId);
        });
        
        // Pagination
        $panel.on('click', '.gos-page-btn', (e) => {
            const page = parseInt($(e.currentTarget).data('page'));
            if (!isNaN(page)) {
                this.state.setState({ currentPage: page });
            }
        });
    };

    /**
     * Attach view-specific listeners
     */
    DiaryApp.prototype.attachViewListeners = function() {
        const $panel = $('#gsa-diary');
        const state = this.state.getState();
        
        // Click on events (all views) - use actual rendered class names
        $panel.on('click', '.gos-month-event-pill, .gos-week-event-pill, .gos-day-event-card, .gos-timeline-event-block', (e) => {
            const eventId = parseInt($(e.currentTarget).data('event-id'));
            this.openEventModal('view', eventId);
        });
        
        // Click on cells to create events - use actual rendered class names
        $panel.on('click', '.gos-week-day-cell, .gos-day-hour-cell, .gos-month-cell-modern', (e) => {
            // Don't trigger if clicking on an event
            if ($(e.target).closest('.gos-week-event-pill, .gos-day-event-card, .gos-month-event-pill').length) {
                return;
            }
            
            const $cell = $(e.currentTarget);
            const fitter = $cell.data('fitter');
            const date = $cell.data('date');
            const time = $cell.data('time') || '09:00';
            
            this.openEventModal('create', null, { fitter, date, time });
        });
        
        // Drag and drop (Week & Day views)
        if (state.viewMode === CONFIG.VIEW_MODES.WEEK || state.viewMode === CONFIG.VIEW_MODES.DAY) {
            this.initializeDragAndDrop();
        }
    };

    /**
     * Initialize drag and drop
     */
    DiaryApp.prototype.initializeDragAndDrop = function() {
        const $panel = $('#gsa-diary');
        
        // Make events draggable
        $panel.find('.gos-week-event-pill, .gos-day-event-card').each((index, element) => {
            element.setAttribute('draggable', 'true');
        });
        
        // Drag start
        $panel.on('dragstart', '.gos-week-event-pill, .gos-day-event-card', (e) => {
            const eventId = parseInt($(e.currentTarget).data('event-id'));
            this.draggedEvent = eventId;
            $(e.currentTarget).addClass('gos-dragging');
            e.originalEvent.dataTransfer.effectAllowed = 'move';
        });
        
        // Drag end
        $panel.on('dragend', '.gos-week-event-pill, .gos-day-event-card', (e) => {
            $(e.currentTarget).removeClass('gos-dragging');
            this.draggedEvent = null;
        });
        
        // Drag over
        $panel.on('dragover', '.gos-week-day-cell, .gos-day-hour-cell', (e) => {
            e.preventDefault();
            $(e.currentTarget).addClass('gos-drag-over');
        });
        
        // Drag leave
        $panel.on('dragleave', '.gos-week-day-cell, .gos-day-hour-cell', (e) => {
            $(e.currentTarget).removeClass('gos-drag-over');
        });
        
        // Drop
        $panel.on('drop', '.gos-week-day-cell, .gos-day-hour-cell', async (e) => {
            e.preventDefault();
            $(e.currentTarget).removeClass('gos-drag-over');
            
            if (!this.draggedEvent) return;
            
            const $cell = $(e.currentTarget);
            const newFitter = $cell.data('fitter');
            const newDate = $cell.data('date');
            const newTime = $cell.data('time') || '09:00';
            
            await this.moveEvent(this.draggedEvent, newFitter, newDate, newTime);
        });
    };

    // ============================================================================
    // NAVIGATION METHODS
    // ============================================================================

    DiaryApp.prototype.navigatePrevious = function() {
        const state = this.state.getState();
        const currentDate = new Date(state.currentDate);
        
        switch(state.viewMode) {
            case CONFIG.VIEW_MODES.MONTH:
                currentDate.setMonth(currentDate.getMonth() - 1);
                break;
            case CONFIG.VIEW_MODES.WEEK:
                currentDate.setDate(currentDate.getDate() - 7);
                break;
            case CONFIG.VIEW_MODES.DAY:
                currentDate.setDate(currentDate.getDate() - 1);
                break;
            default:
                currentDate.setDate(currentDate.getDate() - 7);
        }
        
        this.state.setState({ currentDate });
    };

    DiaryApp.prototype.navigateNext = function() {
        const state = this.state.getState();
        const currentDate = new Date(state.currentDate);
        
        switch(state.viewMode) {
            case CONFIG.VIEW_MODES.MONTH:
                currentDate.setMonth(currentDate.getMonth() + 1);
                break;
            case CONFIG.VIEW_MODES.WEEK:
                currentDate.setDate(currentDate.getDate() + 7);
                break;
            case CONFIG.VIEW_MODES.DAY:
                currentDate.setDate(currentDate.getDate() + 1);
                break;
            default:
                currentDate.setDate(currentDate.getDate() + 7);
        }
        
        this.state.setState({ currentDate });
    };

    DiaryApp.prototype.navigateToToday = function() {
        this.state.setState({ currentDate: new Date() });
    };

    // ============================================================================
    // FILTER METHODS
    // ============================================================================

    DiaryApp.prototype.updateFilter = function(filterKey, value) {
        const state = this.state.getState();
        const newFilters = { ...state.filters, [filterKey]: value };
        this.state.setState({ filters: newFilters, currentPage: 1 });
    };

    DiaryApp.prototype.clearFilters = function() {
        this.state.setState({
            filters: {
                search: '',
                eventType: 'all',
                eventStatus: 'all',
                fitter: 'all',
                dateRange: 'all'
            },
            currentPage: 1
        });
        
        // Clear input fields
        $('#gos-diary-search').val('');
        $('#gos-filter-event-type').val('all');
        $('#gos-filter-event-status').val('all');
        $('#gos-filter-fitter').val('all');
        $('#gos-filter-date-range').val('all');
    };

    DiaryApp.prototype.toggleFiltersPanel = function() {
        $('#gos-diary-filters-panel').slideToggle(200);
    };

    DiaryApp.prototype.toggleStatsPanel = function() {
        $('#gos-diary-stats-panel').slideToggle(200);
    };

    // ============================================================================
    // SELECTION METHODS
    // ============================================================================

    DiaryApp.prototype.toggleSelectAll = function(checked) {
        const state = this.state.getState();
        const selectedEvents = checked ? 
            new Set(state.filteredEvents.map(e => e.id)) : 
            new Set();
        
        this.state.setState({ selectedEvents });
        
        // Update checkboxes
        $('.gos-event-checkbox').prop('checked', checked);
    };

    DiaryApp.prototype.toggleEventSelection = function(eventId, checked) {
        const state = this.state.getState();
        const selectedEvents = new Set(state.selectedEvents);
        
        if (checked) {
            selectedEvents.add(eventId);
        } else {
            selectedEvents.delete(eventId);
        }
        
        this.state.setState({ selectedEvents });
        
        // Update select all checkbox
        const allSelected = state.filteredEvents.length > 0 && 
                           selectedEvents.size === state.filteredEvents.length;
        $('#gos-select-all-events').prop('checked', allSelected);
    };

    DiaryApp.prototype.clearSelection = function() {
        this.state.setState({ selectedEvents: new Set() });
        $('.gos-event-checkbox').prop('checked', false);
        $('#gos-select-all-events').prop('checked', false);
    };

    // ============================================================================
    // KEYBOARD SHORTCUTS
    // ============================================================================

    DiaryApp.prototype.initKeyboardShortcuts = function() {
        $(document).on('keydown', (e) => {
            // Don't trigger when typing in inputs
            if ($(e.target).is('input, textarea, select')) {
                return;
            }
            
            const isCtrl = e.ctrlKey || e.metaKey;
            const isAlt = e.altKey;
            
            // Ctrl shortcuts
            if (isCtrl && e.key === 'n') {
                e.preventDefault();
                this.openEventModal('create');
            }
            
            if (isCtrl && e.key === 'f') {
                e.preventDefault();
                $('#gos-diary-search').focus();
            }
            
            if (isCtrl && e.key === 'd') {
                e.preventDefault();
                this.deleteSelectedEvents();
            }
            
            if (isCtrl && e.key === 'e') {
                e.preventDefault();
                this.exportSelectedEvents();
            }
            
            // Alt + Number for view switching
            if (isAlt && ['1', '2', '3', '4', '5'].includes(e.key)) {
                e.preventDefault();
                const views = [
                    CONFIG.VIEW_MODES.MONTH,
                    CONFIG.VIEW_MODES.WEEK,
                    CONFIG.VIEW_MODES.DAY,
                    CONFIG.VIEW_MODES.TIMELINE,
                    CONFIG.VIEW_MODES.LIST
                ];
                this.state.setState({ viewMode: views[parseInt(e.key) - 1] });
            }
            
            // Navigation
            if (e.key === 'T' || e.key === 't') {
                e.preventDefault();
                this.navigateToToday();
            }
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigatePrevious();
            }
            
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateNext();
            }
            
            // Escape to close modal
            if (e.key === 'Escape') {
                if ($('#gos-event-modal').length) {
                    this.closeEventModal();
                } else {
                    this.clearSelection();
                }
            }
        });
    };

    // ============================================================================
    // NOTIFICATION SYSTEM
    // ============================================================================

    DiaryApp.prototype.showNotification = function(message, type = 'info', duration = 3000) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const $notification = $(`
            <div class="gos-notification gos-notification-${type}">
                <span class="gos-notification-icon">${icons[type]}</span>
                <span class="gos-notification-message">${message}</span>
                <button class="gos-notification-close">×</button>
            </div>
        `);
        
        // Add to container
        let $container = $('#gos-diary-notifications');
        if (!$container.length) {
            $container = $('<div id="gos-diary-notifications"></div>');
            $('body').append($container);
        }
        
        $container.append($notification);
        
        // Animate in
        setTimeout(() => $notification.addClass('gos-notification-show'), 10);
        
        // Auto-dismiss
        const timeoutId = setTimeout(() => {
            $notification.removeClass('gos-notification-show');
            setTimeout(() => $notification.remove(), 300);
        }, duration);
        
        // Manual close
        $notification.find('.gos-notification-close').on('click', () => {
            clearTimeout(timeoutId);
            $notification.removeClass('gos-notification-show');
            setTimeout(() => $notification.remove(), 300);
        });
    };

    console.log('✅ Diary v2.0.0 - Event handlers loaded');

})(jQuery);
