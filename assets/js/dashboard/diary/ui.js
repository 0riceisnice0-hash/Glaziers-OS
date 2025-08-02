// assets/js/dashboard/diary/ui.js
window.GOS_DIARY = window.GOS_DIARY || {};

window.GOS_DIARY.ui = {
    /**
     * Renders the static parts of the diary panel, including controls and the scheduling form.
     */
    renderLayout: function($panel, jobs, fitters) {
        // Generates <option> tags for the Quotes dropdown.
        const getJobOptions = () => {
            const sortedJobs = [...jobs].sort((a, b) => b.id - a.id);
            return sortedJobs.map(j => {
                const customer = [j.first_name, j.last_name].filter(Boolean).join(' ');
                return `<option value="${j.id}">#${j.id} ${j.type} ${customer ? `- ${customer}` : ''}</option>`;
            }).join('');
        };

        // Generates <option> tags for the Time dropdown.
        const timeOptions = Array.from({ length: 22 }, (_, i) => (i + 7) * 0.5)
            .map(hr => {
                const h = Math.floor(hr);
                const m = (hr % 1) * 60;
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                return `<option value="${time}">${time}</option>`;
            }).join('');

        $panel.html(`
            <div class="gsa-diary-container">
                <div class="gsa-diary-controls">
                    <button id="gsa-diary-prev" class="gos-button">&lt; Prev</button>
                    <button id="gsa-diary-today" class="gos-button">Today</button>
                    <button id="gsa-diary-next" class="gos-button">Next &gt;</button>
                    <div class="gsa-view-toggle-group">
                        <button id="gsa-view-day" class="gsa-view-btn">Day</button>
                        <button id="gsa-view-week" class="gsa-view-btn active">Week</button>
                    </div>
                    <h2 id="gsa-diary-date-display"></h2>
                    <button id="gsa-add-new-job-btn" class="gos-button">Schedule New Job</button>
                </div>
                <div id="gsa-scheduler-container">
                    <div class="gsa-scheduler-grid"></div>
                </div>
                <div id="gsa-form-overlay" style="display:none;"></div>
                <div id="gsa-feedback-message" style="display:none; position:fixed; bottom:20px; right:20px; background-color:#4CAF50; color:white; padding:10px 20px; border-radius:5px; z-index:1001;"></div>
            </div>
            <div id="gsa-newjob-form">
                <h3>Schedule Job</h3>
                <form id="gsa-newjob">
                    <input type="hidden" name="originalDatetime" value="">
                    <div class="form-field">
                        <label for="gsa-form-jobId">Quote:</label>
                        <select id="gsa-form-jobId" name="jobId" class="gos-input" required>${getJobOptions()}</select>
                    </div>
                    <div class="form-field">
                        <label for="gsa-form-type">Type:</label>
                        <select id="gsa-form-type" name="type" class="gos-input"><option>Visit</option><option>Delivery</option><option>Install</option></select>
                    </div>
                    <div class="form-field">
                        <label for="gsa-form-date">Date:</label>
                        <input id="gsa-form-date" name="date" type="date" class="gos-input" required>
                    </div>
                    <div class="form-field">
                        <label for="gsa-form-time">Time:</label>
                        <select id="gsa-form-time" name="time" class="gos-input" required>${timeOptions}</select>
                    </div>
                    <div class="form-field">
                        <label for="gsa-form-duration">Duration (hrs):</label>
                        <input id="gsa-form-duration" name="duration" type="number" class="gos-input" step="0.5" value="1" required>
                    </div>
                    <div class="form-field">
                        <label>Fitter(s):</label>
                        <div id="gsa-form-fitters-checkboxes" class="gos-checkbox-group">
                            ${fitters.map(f => `<label><input type="checkbox" name="fitter" value="${f.name}"> ${f.name}</label>`).join('')}
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="gsa-form-notes">Notes:</label>
                        <textarea id="gsa-form-notes" name="notes" class="gos-input"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="gsa-newjob-delete" class="gos-button" style="display:none;">Delete Event</button>
                        <div class="right-group">
                            <button type="button" id="gsa-newjob-cancel" class="gos-button">Cancel</button>
                            <button type="submit" class="gos-button">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        `);
    },

    /**
     * Renders the scheduler grid structure. Called once.
     */
    renderGrid: function($panel, fitters, view) {
        if (view === 'week') {
            this.renderWeekGrid($panel, fitters);
        } else { // Day View
            this.renderDayGrid($panel, fitters);
        }
    },

    renderDayGrid: function($panel, fitters) {
        const gridContainer = $panel.find('.gsa-scheduler-grid');
        const numFitters = fitters.length;
        const slotsPerDay = 22; // 7:00 to 17:30 (30-minute intervals)
        const startHour = 7; // Diary starts at 7:00 AM

        gridContainer.css({
            'grid-template-columns': `80px repeat(${numFitters}, 1fr)`,
            'grid-template-rows': `auto repeat(${slotsPerDay}, 40px)`
        });

        let html = '';
        html += '<div class="gsa-header-corner"></div>';
        fitters.forEach((f, colIndex) => { // Removed tabindex from headers
            html += `<div class="gsa-fitter-header" style="grid-column: ${colIndex + 2}; grid-row: 1;">${f.name}</div>`;
        });

        for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex++) {
            const totalMinutes = startHour * 60 + slotIndex * 30;
            const hour = Math.floor(totalMinutes / 60);
            const minute = totalMinutes % 60;
            const currentRow = slotIndex + 2;
            html += `<div class="gsa-time-label" style="grid-row: ${currentRow};">${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}</div>`; // Removed tabindex from time labels
            fitters.forEach((f, colIndex) => {
                html += `<div class="gsa-grid-cell" style="grid-column: ${colIndex + 2}; grid-row: ${currentRow};" data-row-index="${slotIndex}" data-fitter-name="${f.name}" tabindex="0"></div>`;
            });
        }
        html += '<div class="gsa-event-container"></div>';
        gridContainer.html(html);
    },

    renderWeekGrid: function($panel, fitters) {
        const gridContainer = $panel.find('.gsa-scheduler-grid');
        const numFitters = fitters.length;
        const numDays = 5; // Mon-Fri

        gridContainer.css({
            'grid-template-columns': `120px repeat(${numFitters}, 1fr)`,
            'grid-template-rows': `auto repeat(${numDays}, minmax(120px, auto))`
        });

        let html = '';
        html += '<div class="gsa-header-corner"></div>';
        fitters.forEach((f, i) => { // Removed tabindex from headers
            html += `<div class="gsa-fitter-header" style="grid-column: ${i + 2}; grid-row: 1;">${f.name}</div>`;
        });

        for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
            const gridRow = dayIndex + 2;
            html += `<div class="gsa-day-header" style="grid-row: ${gridRow};" data-day-index="${dayIndex}"></div>`; // Removed tabindex from day headers
            fitters.forEach((f, colIndex) => {
                html += `<div class="gsa-fitter-cell" 
                                  style="grid-column: ${colIndex + 2}; grid-row: ${gridRow};" 
                                  data-day-index="${dayIndex}"
                                  data-fitter-name="${f.name}" tabindex="0"></div>`;
            });
        }
        gridContainer.html(html);
    },

    /**
     * Clears and renders events for a specific date onto the grid.
     */
    renderEvents: function($panel, flatSchedule, fitters, currentDate, view) {
        const gridContainer = $panel.find('.gsa-scheduler-grid');
        const fitterNameToIndex = new Map(fitters.map((f, i) => [f.name, i]));
        const startHour = 7;

        gridContainer.find('.gsa-event, .gsa-event-item').remove();
        gridContainer.find('.gsa-today').removeClass('gsa-today');

        if (view === 'week') {
            const weekStartDate = window.GOS_DIARY.utils.getStartOfWeek(currentDate);
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 4);
            $panel.find('#gsa-diary-date-display').text(
                `Week of ${weekStartDate.toLocaleDateString('en-gb', { day: 'numeric', month: 'long' })} - ${weekEndDate.toLocaleDateString('en-gb', { day: 'numeric', month: 'long', year: 'numeric' })}`
            );

            const eventsByDayFitter = new Map();
            for (let i = 0; i < 5; i++) {
                const day = new Date(weekStartDate);
                day.setDate(weekStartDate.getDate() + i);
                const dateString = day.toISOString().slice(0, 10);
                const isToday = day.toDateString() === new Date().toDateString();

                gridContainer.find(`.gsa-day-header[data-day-index="${i}"]`)
                    .text(day.toLocaleDateString('en-gb', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))
                    .toggleClass('gsa-today', isToday)
                    .attr('data-date', dateString);

                fitters.forEach(f => eventsByDayFitter.set(`${dateString}_${f.name}`, []));
            }

            flatSchedule.forEach(entry => {
                const start = new Date(entry.datetime);
                const dateString = start.toISOString().slice(0, 10);
                const key = `${dateString}_${entry.fitter}`;
                if (eventsByDayFitter.has(key)) {
                    eventsByDayFitter.get(key).push(entry);
                }
            });

            fitters.forEach((fitter) => {
                for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
                    const day = new Date(weekStartDate);
                    day.setDate(weekStartDate.getDate() + dayIndex);
                    const dateString = day.toISOString().slice(0, 10);
                    const key = `${dateString}_${fitter.name}`;
                    const eventsInCell = eventsByDayFitter.get(key) || [];

                    const cell = gridContainer.find(`.gsa-fitter-cell[data-day-index="${dayIndex}"][data-fitter-name="${fitter.name}"]`);
                    if (cell.length) {
                        let eventHtml = '<ul class="gsa-event-list">';
                        eventsInCell
                            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
                            .forEach(entry => {
                                const time = new Date(entry.datetime).toLocaleTimeString('en-gb', { hour: '2-digit', minute: '2-digit' });
                                eventHtml += `<li class="gsa-event-item" data-event-data='${JSON.stringify(entry)}'>
                                    <strong>${time} #${entry.job.id} - ${entry.type}</strong>
                                    <span>${entry.job.first_name} ${entry.job.last_name}</span>
                                    <span>${(entry.job.width * 1000).toFixed(0)}x${(entry.job.height * 1000).toFixed(0)}mm @ £${entry.job.price.toFixed(2)}</span>
                                    ${entry.notes ? `<span>${entry.notes}</span>` : ''}
                                </li>`;
                            });
                        eventHtml += '</ul>';
                        cell.html(eventHtml);
                        cell.find('.gsa-event-item').draggable({
                            revert: 'invalid',
                            helper: 'clone',
                            opacity: 0.8,
                            zIndex: 1000,
                            cursor: 'move',
                            start: function() { $(this).css('opacity', 0.5); },
                            stop: function() { $(this).css('opacity', 1); }
                        });
                    }
                }
            });
        } else { // Day View
            $panel.find('#gsa-diary-date-display').text(
                currentDate.toLocaleDateString('en-gb', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })
            );
            const slotHeight = 40;
            const eventContainer = gridContainer.find('.gsa-event-container');
            const fitterColWidth = (gridContainer.width() - 80) / fitters.length;

            eventContainer.empty();
            const dayEvents = flatSchedule.filter(entry =>
                new Date(entry.datetime).toDateString() === currentDate.toDateString()
            );

            // Group events by fitter for overlap calculation
            const eventsByFitter = new Map();
            fitters.forEach(f => eventsByFitter.set(f.name, []));
            dayEvents.forEach(entry => {
                eventsByFitter.get(entry.fitter)?.push(entry);
            });

            eventsByFitter.forEach((fitterEvents, fitterName) => {
                fitterEvents.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

                const renderedEvents = [];

                fitterEvents.forEach(entry => {
                    const start = new Date(entry.datetime);
                    const end = new Date(start.getTime() + entry.duration * 60 * 60 * 1000);

                    let overlapCount = 0;
                    renderedEvents.forEach(rendered => {
                        if (start < rendered.end && end > rendered.start) {
                            overlapCount++;
                        }
                    });

                    const fitterIndex = fitterNameToIndex.get(fitterName);
                    const baseWidth = fitterColWidth - 2;
                    let eventWidth = baseWidth;
                    let eventLeftOffset = (fitterIndex * fitterColWidth);

                    if (overlapCount > 0) {
                        eventWidth = baseWidth * 0.8;
                        eventLeftOffset += overlapCount * ((baseWidth * 0.2) / 2);
                    }

                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const startSlotIndex = (startMinutes - startHour * 60) / 30;
                    const durationSlots = parseFloat(entry.duration) * 2;
                    const color = entry.type === 'visit'
                        ? '#4e73df'
                        : entry.type === 'delivery'
                            ? '#1cc88a'
                            : '#e74a3b';
                    const top = startSlotIndex * slotHeight;
                    const height = durationSlots * slotHeight - 2;

                    const eventEl = $(`<div class="gsa-event" style="top:${top}px; left:${eventLeftOffset}px; height:${height}px; width:${eventWidth}px; background-color:${color};" data-job-id="${entry.job.id}" data-original-datetime="${entry.datetime}" tabindex="0">
                        <strong>#${entry.job.id} - ${entry.type}</strong>
                        <div>${entry.job.first_name} ${entry.job.last_name}</div>
                        <div>${(entry.job.width * 1000).toFixed(0)}x${(entry.job.height * 1000).toFixed(0)}mm @ £${entry.job.price.toFixed(2)}</div>
                        ${entry.notes ? `<div>${entry.notes}</div>` : ''}
                    </div>`).data('event-data', entry);

                    eventContainer.append(eventEl);
                    renderedEvents.push({ start, end, element: eventEl });

                    eventEl.draggable({
                        revert: 'invalid',
                        helper: 'clone',
                        opacity: 0.7,
                        zIndex: 100,
                        cursor: 'move',
                        start: function() { $(this).hide(); },
                        stop: function() { $(this).show(); }
                    });
                    eventEl.resizable({
                        handles: 's',
                        grid: [0, slotHeight],
                        minHeight: slotHeight,
                        stop: function(ui) {
                            const newHeight = ui.size.height;
                            const newDuration = (newHeight + 2) / slotHeight / 2;
                            const originalEventData = $(this).data('event-data');
                            window.GOS_DIARY.events.updateEventDuration(
                                originalEventData.job.id,
                                originalEventData.datetime,
                                originalEventData.fitter,
                                newDuration
                            );
                        }
                    });
                });

                if (currentDate.toDateString() === new Date().toDateString()) {
                    gridContainer
                        .find(`.gsa-time-label, .gsa-grid-cell`)
                        .addClass('gsa-today');
                }
            });
        }
    }
};
