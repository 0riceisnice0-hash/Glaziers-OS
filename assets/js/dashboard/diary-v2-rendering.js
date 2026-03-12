/**
 * GlazierOS Diary System v2.0.0 - Part 2
 * Rendering Methods & Event Handlers
 * 
 * This file continues the DiaryApp class with all rendering methods
 * and event handlers. Include this AFTER diary-v2.js
 * 
 * @package GlazierOS
 * @version 2.0.0
 */

(function($) {
    'use strict';

    // Extend the DiaryApp class with rendering methods
    const DiaryApp = window.GOS_DIARY_V2.DiaryApp;
    const CONFIG = window.GOS_DIARY_V2.CONFIG;
    const DiaryUtils = window.GOS_DIARY_V2.DiaryUtils;

    // ============================================================================
    // RENDERING METHODS (CONTINUED)
    // ============================================================================

    /**
     * Render filters panel
     */
    DiaryApp.prototype.renderFiltersPanel = function() {
        const state = this.state.getState();
        const filters = state.filters;
        const fitters = state.fitters;
        
        return `
            <div class="gos-filters-content">
                <!-- Search -->
                <div class="gos-filter-group">
                    <label class="gos-filter-label">🔍 Search</label>
                    <input type="text" 
                           id="gos-diary-search" 
                           class="gos-filter-input" 
                           placeholder="Search events, customers, fitters..."
                           value="${filters.search}">
                </div>
                
                <!-- Event Type -->
                <div class="gos-filter-group">
                    <label class="gos-filter-label">📋 Event Type</label>
                    <select id="gos-filter-event-type" class="gos-filter-select">
                        <option value="all">All Types</option>
                        ${CONFIG.EVENT_TYPES.map(type => `
                            <option value="${type.value}" ${filters.eventType === type.value ? 'selected' : ''}>
                                ${type.icon} ${type.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <!-- Event Status -->
                <div class="gos-filter-group">
                    <label class="gos-filter-label">✅ Status</label>
                    <select id="gos-filter-event-status" class="gos-filter-select">
                        <option value="all">All Statuses</option>
                        ${CONFIG.EVENT_STATUSES.map(status => `
                            <option value="${status.value}" ${filters.eventStatus === status.value ? 'selected' : ''}>
                                ${status.icon} ${status.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <!-- Fitter -->
                <div class="gos-filter-group">
                    <label class="gos-filter-label">👷 Fitter</label>
                    <select id="gos-filter-fitter" class="gos-filter-select">
                        <option value="all">All Fitters</option>
                        ${fitters.map(fitter => `
                            <option value="${fitter.name}" ${filters.fitter === fitter.name ? 'selected' : ''}>
                                ${fitter.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <!-- Date Range -->
                <div class="gos-filter-group">
                    <label class="gos-filter-label">📅 Date Range</label>
                    <select id="gos-filter-date-range" class="gos-filter-select">
                        <option value="all">All Dates</option>
                        <option value="today" ${filters.dateRange === 'today' ? 'selected' : ''}>Today</option>
                        <option value="tomorrow" ${filters.dateRange === 'tomorrow' ? 'selected' : ''}>Tomorrow</option>
                        <option value="this_week" ${filters.dateRange === 'this_week' ? 'selected' : ''}>This Week</option>
                        <option value="next_week" ${filters.dateRange === 'next_week' ? 'selected' : ''}>Next Week</option>
                        <option value="this_month" ${filters.dateRange === 'this_month' ? 'selected' : ''}>This Month</option>
                        <option value="past" ${filters.dateRange === 'past' ? 'selected' : ''}>Past Events</option>
                        <option value="future" ${filters.dateRange === 'future' ? 'selected' : ''}>Future Events</option>
                    </select>
                </div>
                
                <!-- Actions -->
                <div class="gos-filter-actions">
                    <button class="gos-btn-secondary" id="gos-clear-filters-btn">Clear All Filters</button>
                </div>
            </div>
        `;
    };

    /**
     * Render statistics panel
     */
    DiaryApp.prototype.renderStatisticsPanel = function() {
        const stats = this.calculateStatistics();
        
        return `
            <div class="gos-stats-content">
                <!-- Key Metrics -->
                <div class="gos-stats-grid">
                    <div class="gos-stat-card gos-stat-primary">
                        <div class="gos-stat-icon">📋</div>
                        <div class="gos-stat-details">
                            <div class="gos-stat-value">${stats.totalEvents}</div>
                            <div class="gos-stat-label">Total Events</div>
                        </div>
                    </div>
                    
                    <div class="gos-stat-card gos-stat-success">
                        <div class="gos-stat-icon">✅</div>
                        <div class="gos-stat-details">
                            <div class="gos-stat-value">${stats.upcomingEvents}</div>
                            <div class="gos-stat-label">Upcoming</div>
                        </div>
                    </div>
                    
                    <div class="gos-stat-card gos-stat-warning">
                        <div class="gos-stat-icon">📅</div>
                        <div class="gos-stat-details">
                            <div class="gos-stat-value">${stats.todayEvents}</div>
                            <div class="gos-stat-label">Today</div>
                        </div>
                    </div>
                    
                    <div class="gos-stat-card gos-stat-info">
                        <div class="gos-stat-icon">👷</div>
                        <div class="gos-stat-details">
                            <div class="gos-stat-value">${stats.activeFitters}</div>
                            <div class="gos-stat-label">Active Fitters</div>
                        </div>
                    </div>
                </div>
                
                <!-- Event Type Breakdown -->
                <div class="gos-stats-section">
                    <h3>Event Types</h3>
                    <div class="gos-chart-bars">
                        ${stats.eventTypeBreakdown.map(item => {
                            const percentage = (item.count / stats.totalEvents * 100) || 0;
                            const type = DiaryUtils.getEventType(item.type);
                            return `
                                <div class="gos-chart-bar-row">
                                    <div class="gos-chart-label">
                                        <span style="color: ${type.color}">${type.icon}</span>
                                        ${type.label}
                                    </div>
                                    <div class="gos-chart-bar-wrapper">
                                        <div class="gos-chart-bar" 
                                             style="width: ${percentage}%; background: ${type.color}">
                                        </div>
                                    </div>
                                    <div class="gos-chart-value">
                                        ${item.count} <span class="gos-chart-percentage">(${percentage.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Fitter Utilization -->
                <div class="gos-stats-section">
                    <h3>Fitter Utilization (This Week)</h3>
                    <div class="gos-chart-bars">
                        ${stats.fitterUtilization.map(item => `
                            <div class="gos-chart-bar-row">
                                <div class="gos-chart-label">${item.fitter}</div>
                                <div class="gos-chart-bar-wrapper">
                                    <div class="gos-chart-bar" 
                                         style="width: ${item.percentage}%; background: ${item.percentage > 80 ? '#ef4444' : item.percentage > 60 ? '#f59e0b' : '#10b981'}">
                                    </div>
                                </div>
                                <div class="gos-chart-value">
                                    ${item.hours.toFixed(1)}h <span class="gos-chart-percentage">(${item.percentage.toFixed(0)}%)</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Calculate statistics
     */
    DiaryApp.prototype.calculateStatistics = function() {
        const state = this.state.getState();
        const events = state.events;
        const fitters = state.fitters;
        const now = new Date();
        const today = now.toDateString();
        
        // Total events
        const totalEvents = events.length;
        
        // Today's events
        const todayEvents = events.filter(e => new Date(e.datetime).toDateString() === today).length;
        
        // Upcoming events (future)
        const upcomingEvents = events.filter(e => new Date(e.datetime) >= now).length;
        
        // Active fitters (fitters with events)
        const fittersWithEvents = new Set(events.map(e => e.fitter));
        const activeFitters = fittersWithEvents.size;
        
        // Event type breakdown
        const eventTypeCounts = {};
        events.forEach(e => {
            const type = e.type || 'other';
            eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
        });
        
        const eventTypeBreakdown = Object.entries(eventTypeCounts).map(([type, count]) => ({
            type,
            count
        })).sort((a, b) => b.count - a.count);
        
        // Fitter utilization (this week)
        const weekStart = DiaryUtils.getStartOfWeek(now);
        const weekEnd = DiaryUtils.getEndOfWeek(now);
        const weekEvents = events.filter(e => {
            const eventDate = new Date(e.datetime);
            return eventDate >= weekStart && eventDate <= weekEnd;
        });
        
        const fitterHours = {};
        weekEvents.forEach(e => {
            const fitter = e.fitter || 'Unassigned';
            const duration = parseFloat(e.duration || 0);
            fitterHours[fitter] = (fitterHours[fitter] || 0) + duration;
        });
        
        const workingHoursPerWeek = (CONFIG.WORKING_HOURS.END - CONFIG.WORKING_HOURS.START) * 5; // 5 days
        const fitterUtilization = Object.entries(fitterHours).map(([fitter, hours]) => ({
            fitter,
            hours,
            percentage: (hours / workingHoursPerWeek) * 100
        })).sort((a, b) => b.hours - a.hours);
        
        return {
            totalEvents,
            todayEvents,
            upcomingEvents,
            activeFitters,
            eventTypeBreakdown,
            fitterUtilization
        };
    };

    /**
     * Render sidebar
     */
    DiaryApp.prototype.renderSidebar = function() {
        return `
            <div class="gos-sidebar-content">
                <h3>Quick Actions</h3>
                <button class="gos-btn-primary gos-btn-block" data-action="create-event">
                    ➕ New Event
                </button>
                <button class="gos-btn-secondary gos-btn-block" data-action="export-all">
                    📤 Export All
                </button>
            </div>
        `;
    };

    /**
     * Render current view based on viewMode
     */
    DiaryApp.prototype.renderCurrentView = function() {
        const state = this.state.getState();
        const $body = $('#gos-diary-body');
        
        if ($body.length === 0) return;
        
        switch(state.viewMode) {
            case CONFIG.VIEW_MODES.MONTH:
                $body.html(this.renderMonthView());
                break;
            case CONFIG.VIEW_MODES.WEEK:
                $body.html(this.renderWeekView());
                break;
            case CONFIG.VIEW_MODES.DAY:
                $body.html(this.renderDayView());
                break;
            case CONFIG.VIEW_MODES.TIMELINE:
                $body.html(this.renderTimelineView());
                break;
            case CONFIG.VIEW_MODES.LIST:
                $body.html(this.renderListView());
                break;
            default:
                $body.html(this.renderWeekView());
        }
        
        // Attach view-specific listeners
        this.attachViewListeners();
    };

    /**
     * Render events (called after view structure is ready)
     */
    DiaryApp.prototype.renderEvents = function() {
        // This will be called when filtered events change
        // Re-render current view
        this.renderCurrentView();
        // Update inline stats
        this.updateInlineStats();
    };

    /**
     * Update inline stats pills in header
     */
    DiaryApp.prototype.updateInlineStats = function() {
        const stats = this.calculateStatistics();
        const $statsInline = $('#gos-diary-stats-inline');
        
        if ($statsInline.length) {
            $statsInline.html(`
                <span class="gos-stat-pill gos-stat-today" title="Events scheduled for today">
                    ${stats.todayEvents}
                </span>
                <span class="gos-stat-pill gos-stat-upcoming" title="Upcoming events">
                    ${stats.upcomingEvents}
                </span>
            `);
        }
    };

    console.log('✅ Diary v2.0.0 - Rendering methods loaded');

})(jQuery);
