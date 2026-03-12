/**
 * GlazierOS Diary System v2.0.0 - Part 3
 * View Rendering Methods
 * 
 * Month, Week, Day, Timeline, and List views
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
    // MONTH VIEW
    // ============================================================================

    DiaryApp.prototype.renderMonthView = function() {
        const state = this.state.getState();
        const currentDate = state.currentDate;
        const events = state.filteredEvents;
        const fitters = state.fitters;
        
        // Get month boundaries
        const monthStart = DiaryUtils.getStartOfMonth(currentDate);
        const monthEnd = DiaryUtils.getEndOfMonth(currentDate);
        
        // Get calendar start (Monday of first week)
        const calendarStart = DiaryUtils.getStartOfWeek(monthStart);
        
        // Build calendar grid (6 weeks max)
        const weeks = [];
        let currentDay = new Date(calendarStart);
        
        for (let week = 0; week < 6; week++) {
            const days = [];
            for (let day = 0; day < 7; day++) {
                const dateStr = DiaryUtils.formatDate(currentDay, 'iso');
                const dayEvents = events.filter(e => 
                    DiaryUtils.formatDate(new Date(e.datetime), 'iso') === dateStr
                );
                
                days.push({
                    date: new Date(currentDay),
                    dateStr,
                    isCurrentMonth: currentDay.getMonth() === currentDate.getMonth(),
                    isToday: DiaryUtils.isToday(currentDay),
                    events: dayEvents
                });
                
                currentDay.setDate(currentDay.getDate() + 1);
            }
            weeks.push(days);
            
            // Stop if we've passed the month end
            if (currentDay > monthEnd) break;
        }
        
        return `
            <div class="gos-month-view">
                <!-- Month Grid -->
                <div class="gos-month-calendar">
                    <!-- Day Headers -->
                    <div class="gos-month-header">
                        <div class="gos-month-day-header">Mon</div>
                        <div class="gos-month-day-header">Tue</div>
                        <div class="gos-month-day-header">Wed</div>
                        <div class="gos-month-day-header">Thu</div>
                        <div class="gos-month-day-header">Fri</div>
                        <div class="gos-month-day-header">Sat</div>
                        <div class="gos-month-day-header">Sun</div>
                    </div>
                    
                    <!-- Calendar Body -->
                    <div class="gos-month-body">
                        ${weeks.map(week => `
                            <div class="gos-month-week">
                                ${week.map(day => this.renderMonthDay(day)).join('')}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Render Month Day Cell - MODERN CALENDAR STYLE
     * Rounded corners, shadows on hover, "+ Add" button if empty
     */
    DiaryApp.prototype.renderMonthDay = function(day) {
        const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
        const hasEvents = day.events.length > 0;
        
        return `
            <div class="gos-month-cell-modern 
                        ${day.isCurrentMonth ? '' : 'gos-month-cell-other'} 
                        ${day.isToday ? 'gos-month-cell-today' : ''}
                        ${isWeekend ? 'gos-month-cell-weekend' : ''}
                        ${hasEvents ? 'has-events' : 'is-empty'}"
                 data-date="${day.dateStr}"
                 data-clickable="true">
                
                <div class="gos-month-cell-header">
                    <span class="gos-month-day-number">${day.date.getDate()}</span>
                    ${!hasEvents ? `
                        <button class="gos-month-add-btn" data-action="create-event" data-date="${day.dateStr}" title="Add event">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                
                <div class="gos-month-cell-events">
                    ${hasEvents ? day.events.slice(0, 3).map(event => {
                        const type = DiaryUtils.getEventType(event.type);
                        const time = DiaryUtils.formatTime(event.datetime);
                        const job = event.job || {};
                        const customerName = [job.first_name, job.last_name].filter(Boolean).join(' ') || 'Event';
                        
                        return `
                            <div class="gos-month-event-pill event-type-${event.type || 'other'}" 
                                 data-event-id="${event.id}"
                                 data-clickable="true"
                                 title="${type.label} - ${customerName} at ${time}">
                                <span class="event-time">${time}</span>
                                <span class="event-title">${customerName}</span>
                                <span class="event-type">${type.label}</span>
                            </div>
                        `;
                    }).join('') : ''}
                    
                    ${day.events.length > 3 ? `
                        <button class="gos-month-view-more" data-date="${day.dateStr}">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="19" cy="12" r="1"></circle>
                                <circle cx="5" cy="12" r="1"></circle>
                            </svg>
                            ${day.events.length - 3} more
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    };

    // ============================================================================
    // WEEK VIEW
    // ============================================================================
    // WEEK VIEW - MODERN LAYOUT (Each Row = Fitter, Days as Columns)
    // ============================================================================

    /**
     * Render Week View - Each FITTER is a ROW, DAYS are COLUMNS
     * Fixed overlap bug - clean pill-style events
     */
    DiaryApp.prototype.renderWeekView = function() {
        const state = this.state.getState();
        const currentDate = state.currentDate;
        const events = state.filteredEvents;
        const fitters = state.fitters;
        
        // Get week boundaries (Mon-Fri)
        const weekStart = DiaryUtils.getStartOfWeek(currentDate);
        const weekDays = [];
        
        for (let i = 0; i < 5; i++) { // Mon-Fri only
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            weekDays.push(day);
        }
        
        return `
            <div class="gos-week-view-calendar">
                <!-- Week Header: Day Labels -->
                <div class="gos-week-header-modern">
                    <div class="gos-week-corner-cell">Fitter</div>
                    ${weekDays.map(day => {
                        const isToday = DiaryUtils.isToday(day);
                        return `
                            <div class="gos-week-day-header ${isToday ? 'is-today' : ''}" data-date="${DiaryUtils.formatDate(day, 'iso')}">
                                <div class="day-name">${day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                <div class="day-date">${day.getDate()}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Week Body: Each Fitter = Row -->
                <div class="gos-week-body-modern">
                    ${fitters.map(fitter => this.renderWeekFitterRow(fitter, weekDays, events)).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Render single fitter row in week view
     */
    DiaryApp.prototype.renderWeekFitterRow = function(fitter, weekDays, events) {
        return `
            <div class="gos-week-fitter-row" data-fitter="${fitter.name}">
                <!-- Fitter Name Cell -->
                <div class="gos-week-fitter-cell">
                    <div class="fitter-name">${fitter.name}</div>
                    <div class="fitter-meta">${this.getWeekFitterStats(fitter, weekDays, events)}</div>
                </div>
                
                <!-- Day Cells (clickable, show events as pills) -->
                ${weekDays.map(day => {
                    const isToday = DiaryUtils.isToday(day);
                    const dateStr = DiaryUtils.formatDate(day, 'iso');
                    
                    // Get events for this fitter on this day
                    const dayEvents = events.filter(e => {
                        const eventDate = new Date(e.datetime);
                        return e.fitter === fitter.name && 
                               eventDate.toDateString() === day.toDateString();
                    }).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
                    
                    return `
                        <div class="gos-week-day-cell ${isToday ? 'is-today' : ''} ${dayEvents.length > 0 ? 'has-events' : 'is-empty'}" 
                             data-fitter="${fitter.name}" 
                             data-date="${dateStr}"
                             data-clickable="true"
                             data-droppable="true">
                            ${dayEvents.map(event => this.renderWeekEventPill(event)).join('')}
                            ${dayEvents.length === 0 ? `
                                <button class="gos-week-add-btn" data-action="create-event" data-fitter="${fitter.name}" data-date="${dateStr}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    /**
     * Render event pill for week view
     */
    DiaryApp.prototype.renderWeekEventPill = function(event) {
        const type = DiaryUtils.getEventType(event.type);
        const status = DiaryUtils.getEventStatus(event.status || 'scheduled');
        const time = DiaryUtils.formatTime(event.datetime);
        const job = event.job || {};
        const customerName = [job.first_name, job.last_name].filter(Boolean).join(' ') || 'Event';
        
        return `
            <div class="gos-week-event-pill event-type-${event.type || 'other'} event-status-${event.status || 'scheduled'}" 
                 data-event-id="${event.id}"
                 data-type="${event.type}"
                 data-status="${event.status}"
                 draggable="true"
                 data-clickable="true"
                 title="${type.label} - ${customerName} - ${time}">
                <div class="event-time">${time}</div>
                <div class="event-title">${customerName}</div>
                <div class="event-meta">
                    <span class="event-type-badge">${type.label}</span>
                    <span class="event-duration">${event.duration}h</span>
                </div>
                <div class="event-status-indicator" title="${status.label}"></div>
            </div>
        `;
    };

    /**
     * Get fitter stats for week header
     */
    DiaryApp.prototype.getWeekFitterStats = function(fitter, weekDays, events) {
        const fitterEvents = events.filter(e => {
            const eventDate = new Date(e.datetime);
            return e.fitter === fitter.name && 
                   weekDays.some(day => day.toDateString() === eventDate.toDateString());
        });
        
        const totalHours = fitterEvents.reduce((sum, e) => sum + parseFloat(e.duration || 0), 0);
        const eventCount = fitterEvents.length;
        
        return `${eventCount} events, ${totalHours.toFixed(1)}h`;
    };

    // ============================================================================
    // DAY VIEW - FULL-HEIGHT WITH STICKY HEADERS
    // ============================================================================

    /**
     * Render Day View - Full-height calendar with sticky time/fitter headers
     * Layout: Vertical time column (8am-5pm), Fitter columns with events
     */
    DiaryApp.prototype.renderDayView = function() {
        const state = this.state.getState();
        const currentDate = state.currentDate;
        const events = state.filteredEvents;
        const fitters = state.fitters;
        
        // Filter events for this day
        const dayEvents = events.filter(e => {
            const eventDate = new Date(e.datetime);
            return eventDate.toDateString() === currentDate.toDateString();
        });
        
        // Working hours config
        const startHour = CONFIG.WORKING_HOURS.START; // e.g., 8
        const endHour = CONFIG.WORKING_HOURS.END; // e.g., 17
        const hourSlots = [];
        
        for (let hour = startHour; hour <= endHour; hour++) {
            hourSlots.push(hour);
        }
        
        return `
            <div class="gos-day-view-modern">
                <!-- Sticky Header: Fitter Columns -->
                <div class="gos-day-sticky-header">
                    <div class="gos-day-time-corner">Time</div>
                    ${fitters.map(fitter => `
                        <div class="gos-day-fitter-header">
                            <div class="fitter-name">${fitter.name}</div>
                            <div class="fitter-stats">${this.getDayFitterStats(fitter, dayEvents)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Full-Height Scrollable Grid -->
                <div class="gos-day-grid-container">
                    ${hourSlots.map(hour => this.renderDayHourRow(hour, fitters, dayEvents)).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Render single hour row in day view
     */
    DiaryApp.prototype.renderDayHourRow = function(hour, fitters, dayEvents) {
        const timeLabel = `${String(hour).padStart(2, '0')}:00`;
        const currentHour = new Date().getHours();
        const isCurrentHour = hour === currentHour;
        
        return `
            <div class="gos-day-hour-row ${isCurrentHour ? 'is-current' : ''}" data-hour="${hour}">
                <!-- Time Label (Sticky) -->
                <div class="gos-day-time-label">${timeLabel}</div>
                
                <!-- Fitter Columns -->
                ${fitters.map(fitter => {
                    // Get events for this fitter in this hour
                    const hourEvents = dayEvents.filter(e => {
                        const eventDate = new Date(e.datetime);
                        const eventHour = eventDate.getHours();
                        return e.fitter === fitter.name && eventHour === hour;
                    }).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
                    
                    return `
                        <div class="gos-day-hour-cell ${hourEvents.length > 0 ? 'has-events' : 'is-empty'}"
                             data-fitter="${fitter.name}"
                             data-hour="${hour}"
                             data-clickable="true"
                             data-droppable="true">
                            ${hourEvents.map(event => this.renderDayEventCard(event)).join('')}
                            ${hourEvents.length === 0 ? `
                                <button class="gos-day-add-btn" data-action="create-event" data-fitter="${fitter.name}" data-hour="${hour}">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Add
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    /**
     * Render event card for day view
     */
    DiaryApp.prototype.renderDayEventCard = function(event) {
        const type = DiaryUtils.getEventType(event.type);
        const status = DiaryUtils.getEventStatus(event.status || 'scheduled');
        const time = DiaryUtils.formatTime(event.datetime);
        const job = event.job || {};
        const customerName = [job.first_name, job.last_name].filter(Boolean).join(' ') || 'Event';
        
        // Calculate height based on duration (1 hour = 80px)
        const durationHours = parseFloat(event.duration || 1);
        const height = Math.max(durationHours * 80, 60); // Min 60px
        
        return `
            <div class="gos-day-event-card event-type-${event.type || 'other'} event-status-${event.status || 'scheduled'}" 
                 data-event-id="${event.id}"
                 data-type="${event.type}"
                 data-status="${event.status}"
                 style="height: ${height}px;"
                 draggable="true"
                 data-clickable="true"
                 title="${type.label} - ${customerName}">
                <div class="event-header">
                    <span class="event-time">${time}</span>
                    <span class="event-duration">${event.duration}h</span>
                </div>
                <div class="event-customer">${customerName}</div>
                <div class="event-type-badge">
                    ${type.label}
                </div>
                <div class="event-status-indicator" title="${status.label}"></div>
            </div>
        `;
    };

    /**
     * Get fitter stats for day view header
     */
    DiaryApp.prototype.getDayFitterStats = function(fitter, dayEvents) {
        const fitterEvents = dayEvents.filter(e => e.fitter === fitter.name);
        const totalHours = fitterEvents.reduce((sum, e) => sum + parseFloat(e.duration || 0), 0);
        const workingHours = CONFIG.WORKING_HOURS.END - CONFIG.WORKING_HOURS.START;
        const utilization = workingHours > 0 ? (totalHours / workingHours) * 100 : 0;
        
        const color = utilization > 80 ? '#ef4444' : utilization > 60 ? '#f59e0b' : '#10b981';
        
        return `
            <span>${fitterEvents.length} events</span>
            <span style="color: ${color}">${utilization.toFixed(0)}%</span>
        `;
    };

    // ============================================================================
    // TIMELINE VIEW - HORIZONTAL GANTT CHART
    // ============================================================================

    /**
     * Render Timeline View - Horizontal Gantt chart showing jobs across time
     * Layout: Fitters as rows, Days as columns, Events as pills
     */
    DiaryApp.prototype.renderTimelineView = function() {
        const state = this.state.getState();
        const events = state.filteredEvents;
        const fitters = state.fitters;
        
        // Get current week or month range based on state
        const currentDate = state.currentDate;
        const rangeStart = DiaryUtils.getStartOfWeek(currentDate);
        const rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 14); // 2 weeks
        
        // Generate day columns
        const dayColumns = [];
        let currentDay = new Date(rangeStart);
        
        while (currentDay <= rangeEnd) {
            dayColumns.push(new Date(currentDay));
            currentDay.setDate(currentDay.getDate() + 1);
        }
        
        return `
            <div class="gos-timeline-view-modern">
                <!-- Timeline Header: Day Labels -->
                <div class="gos-timeline-header">
                    <div class="gos-timeline-corner">Fitter</div>
                    ${dayColumns.map(day => {
                        const isToday = DiaryUtils.isToday(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return `
                            <div class="gos-timeline-day-header ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}" 
                                 data-date="${DiaryUtils.formatDate(day, 'iso')}">
                                <div class="day-name">${day.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                <div class="day-date">${day.getDate()}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Timeline Body: Gantt Rows -->
                <div class="gos-timeline-body">
                    ${fitters.map(fitter => this.renderTimelineFitterRow(fitter, dayColumns, events)).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Render single fitter row in timeline (Gantt)
     */
    DiaryApp.prototype.renderTimelineFitterRow = function(fitter, dayColumns, events) {
        return `
            <div class="gos-timeline-fitter-row" data-fitter="${fitter.name}">
                <!-- Fitter Name -->
                <div class="gos-timeline-fitter-label">
                    <div class="fitter-name">${fitter.name}</div>
                </div>
                
                <!-- Gantt Track -->
                <div class="gos-timeline-gantt-track">
                    ${dayColumns.map(day => {
                        const isToday = DiaryUtils.isToday(day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const dateStr = DiaryUtils.formatDate(day, 'iso');
                        
                        // Get events for this fitter on this day
                        const dayEvents = events.filter(e => {
                            const eventDate = new Date(e.datetime);
                            return e.fitter === fitter.name && 
                                   DiaryUtils.formatDate(eventDate, 'iso') === dateStr;
                        }).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
                        
                        return `
                            <div class="gos-timeline-day-cell ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}" 
                                 data-fitter="${fitter.name}" 
                                 data-date="${dateStr}">
                                ${dayEvents.map(event => this.renderTimelineEventBlock(event)).join('')}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Render event block for timeline Gantt chart
     */
    DiaryApp.prototype.renderTimelineEventBlock = function(event) {
        const type = DiaryUtils.getEventType(event.type);
        const status = DiaryUtils.getEventStatus(event.status || 'scheduled');
        const job = event.job || {};
        const customerName = [job.first_name, job.last_name].filter(Boolean).join(' ') || 'Event';
        
        return `
            <div class="gos-timeline-event-block event-type-${event.type || 'other'} event-status-${event.status || 'scheduled'}" 
                 data-event-id="${event.id}"
                 data-type="${event.type}"
                 data-clickable="true"
                 draggable="true"
                 title="${type.label} - ${customerName} - ${event.duration}h">
                <div class="event-ref">#${job.id || event.id}</div>
                <div class="event-type-icon">${type.icon || type.label.charAt(0)}</div>
                <div class="event-status-dot"></div>
            </div>
        `;
    };

    // ============================================================================
    // LIST VIEW - SIMPLIFIED TABLE
    // ============================================================================

    /**
     * Render List View - Clean sortable table with alternating rows
     */
    DiaryApp.prototype.renderListView = function() {
        const state = this.state.getState();
        const events = state.filteredEvents;
        
        if (events.length === 0) {
            return this.renderEmptyState();
        }
        
        return `
            <div class="gos-list-view-modern">
                <div class="gos-list-table-container">
                    <table class="gos-list-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort="datetime">
                                    <div class="th-content">
                                        <span>Date & Time</span>
                                        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M6 3l3 3H3l3-3zM6 9l-3-3h6l-3 3z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </th>
                                <th class="sortable" data-sort="fitter">
                                    <div class="th-content">
                                        <span>Fitter</span>
                                        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M6 3l3 3H3l3-3zM6 9l-3-3h6l-3 3z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </th>
                                <th class="sortable" data-sort="type">
                                    <div class="th-content">
                                        <span>Type</span>
                                        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M6 3l3 3H3l3-3zM6 9l-3-3h6l-3 3z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </th>
                                <th class="sortable" data-sort="status">
                                    <div class="th-content">
                                        <span>Status</span>
                                        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M6 3l3 3H3l3-3zM6 9l-3-3h6l-3 3z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </th>
                                <th class="sortable" data-sort="duration">
                                    <div class="th-content">
                                        <span>Duration</span>
                                        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M6 3l3 3H3l3-3zM6 9l-3-3h6l-3 3z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </th>
                                <th class="sortable" data-sort="customer">
                                    <div class="th-content">
                                        <span>Customer</span>
                                        <svg class="sort-icon" width="12" height="12" viewBox="0 0 12 12">
                                            <path d="M6 3l3 3H3l3-3zM6 9l-3-3h6l-3 3z" fill="currentColor"/>
                                        </svg>
                                    </div>
                                </th>
                                <th class="actions-col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${events.map(event => this.renderListTableRow(event)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    /**
     * Render single table row for list view
     */
    DiaryApp.prototype.renderListTableRow = function(event) {
        const type = DiaryUtils.getEventType(event.type);
        const status = DiaryUtils.getEventStatus(event.status || 'scheduled');
        const job = event.job || {};
        const customerName = [job.first_name, job.last_name].filter(Boolean).join(' ') || 'No customer';
        const eventDate = new Date(event.datetime);
        const dateStr = eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = DiaryUtils.formatTime(event.datetime);
        
        return `
            <tr class="gos-list-table-row" 
                data-event-id="${event.id}" 
                data-clickable="true">
                <td class="date-col">
                    <div class="date-time-group">
                        <div class="date-label">${dateStr}</div>
                        <div class="time-label">${timeStr}</div>
                    </div>
                </td>
                <td class="fitter-col">
                    <div class="fitter-badge">${event.fitter}</div>
                </td>
                <td class="type-col">
                    <div class="type-badge event-type-${event.type || 'other'}">
                        <span class="type-icon">${type.icon || '●'}</span>
                        <span class="type-label">${type.label}</span>
                    </div>
                </td>
                <td class="status-col">
                    <div class="status-badge event-status-${event.status || 'scheduled'}">
                        <span class="status-indicator"></span>
                        <span class="status-label">${status.label}</span>
                    </div>
                </td>
                <td class="duration-col">
                    <span class="duration-value">${event.duration}h</span>
                </td>
                <td class="customer-col">
                    <div class="customer-info">
                        <div class="customer-name">${customerName}</div>
                        ${job.id ? `<div class="job-ref">#${job.id}</div>` : ''}
                    </div>
                </td>
                <td class="actions-col">
                    <div class="action-buttons">
                        <button class="action-btn-icon" data-action="edit" data-event-id="${event.id}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                        <button class="action-btn-icon" data-action="delete" data-event-id="${event.id}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    };

    // ============================================================================
    // PAGINATION
    // ============================================================================

    DiaryApp.prototype.renderPagination = function() {
        const state = this.state.getState();
        const { currentPage, totalPages, filteredEvents, itemsPerPage } = state;
        
        if (totalPages <= 1) return '';
        
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, filteredEvents.length);
        
        return `
            <div class="gos-pagination">
                <div class="gos-pagination-info">
                    Showing ${startItem}-${endItem} of ${filteredEvents.length} events
                </div>
                <div class="gos-pagination-controls">
                    <button class="gos-page-btn" 
                            data-page="${currentPage - 1}"
                            ${currentPage === 1 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <span class="gos-page-current">Page ${currentPage} of ${totalPages}</span>
                    <button class="gos-page-btn" 
                            data-page="${currentPage + 1}"
                            ${currentPage === totalPages ? 'disabled' : ''}>
                        Next →
                    </button>
                </div>
            </div>
        `;
    };

    // ============================================================================
    // LOADING & EMPTY STATES
    // ============================================================================

    DiaryApp.prototype.renderLoadingState = function() {
        $('#gsa-diary').html(`
            <div class="gos-loading-state">
                <div class="gos-spinner"></div>
                <div class="gos-loading-message">Loading diary events...</div>
            </div>
        `);
    };

    DiaryApp.prototype.renderEmptyState = function() {
        return `
            <div class="gos-empty-state">
                <div class="gos-empty-icon">📅</div>
                <h3 class="gos-empty-title">No events found</h3>
                <p class="gos-empty-message">Create your first event to get started</p>
                <button class="gos-btn-primary" data-action="create-event">
                    ➕ Create Event
                </button>
            </div>
        `;
    };

    DiaryApp.prototype.renderError = function(message) {
        $('#gsa-diary').html(`
            <div class="gos-error-state">
                <div class="gos-error-icon">⚠️</div>
                <h3 class="gos-error-title">Error</h3>
                <p class="gos-error-message">${message}</p>
                <button class="gos-btn-primary" onclick="location.reload()">
                    Reload Page
                </button>
            </div>
        `);
    };

    console.log('✅ Diary v2.0.0 - View rendering methods loaded');

})(jQuery);
