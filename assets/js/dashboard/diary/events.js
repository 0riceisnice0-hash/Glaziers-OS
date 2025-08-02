// assets/js/dashboard/diary/events.js
window.GOS_DIARY = window.GOS_DIARY || {};

jQuery(function($) {
    // This closure holds private functions for the event handlers.

    // Helper to re-render the entire panel after data changes
    const refreshPanel = () => {
        $('#gsa-diary').data('init', false);
        $(document).trigger('gsa:panel:activated', ['diary']);
    };

    // Function to show temporary feedback messages
    function showFeedback(message, type = 'success') {
        const $feedback = $('#gsa-feedback-message');
        $feedback.text(message).css('background-color', type === 'success' ? '#4CAF50' : '#f44336').fadeIn();
        setTimeout(() => $feedback.fadeOut(), 3000);
    }

    // Central function to open and populate the scheduling form.
    const openForm = (data = {}, state) => {
        const { $panel, schedule } = state;
        const form = $panel.find('#gsa-newjob')[0];

        // Show overlay
        $('#gsa-form-overlay').show();

        // Default to the currently viewed date if none is provided
        const formDate = data.datetime 
            ? new Date(data.datetime) 
            : new Date(state.currentDate); // Use currentDate from state for default date

        form.reset();
        form.jobId.value = data.job?.id || '';
        form.type.value = data.type || 'visit';
        form.date.value = formDate.toISOString().slice(0, 10);
        form.time.value = data.datetime ? data.datetime.slice(11, 16) : '09:00';
        form.duration.value = data.duration || '1';
        form.notes.value = data.notes || '';

        // If editing an existing event, pre-select all fitters associated with this job at this specific datetime
        if (data.datetime && data.job) {
            const associatedEntries = schedule.filter(entry => 
                entry.job.id === data.job.id && entry.datetime === data.datetime
            );
            const associatedFitters = associatedEntries.map(entry => entry.fitter);
            // Set checkboxes
            $panel.find('#gsa-form-fitters-checkboxes input[type="checkbox"]').prop('checked', false); // Clear all first
            associatedFitters.forEach(fitterName => {
                $panel.find(`#gsa-form-fitters-checkboxes input[type="checkbox"][value="${fitterName}"]`).prop('checked', true);
            });
        } else {
            // For new events, clear all checkboxes and check the one that was clicked
            $panel.find('#gsa-form-fitters-checkboxes input[type="checkbox"]').prop('checked', false);
            if (data.fitter) {
                $panel.find(`#gsa-form-fitters-checkboxes input[type="checkbox"][value="${data.fitter}"]`).prop('checked', true);
            }
        }
        form.originalDatetime.value = data.datetime || ''; // Used to identify an event for editing.

        // Show the delete button only when editing an existing event
        if (data.datetime) {
            $panel.find('#gsa-newjob-delete').show();
        } else {
            $panel.find('#gsa-newjob-delete').hide();
        }
        $panel.find('#gsa-newjob-form').addClass('active');
        form.jobId.focus(); // Focus on the first form field
    };

    // --- Drag and Drop Logic ---
    async function handleDrop(event, ui, $dropTarget, state) {
        let draggedEventData = ui.draggable.data('event-data');
        if (!draggedEventData) { // It's a week view item, get data from attribute
            try {
                draggedEventData = JSON.parse(ui.draggable.attr('data-event-data'));
            } catch (e) {
                console.error("Could not parse event data from dragged item", ui.draggable);
                return;
            }
        }
        const originalJobId = draggedEventData.job.id;
        const originalDatetime = draggedEventData.datetime;

        let newDateString;
        let newTime = '09:00'; // Default time for week view drops
        let newFitterName = $dropTarget.data('fitter-name');

        if (state.currentView === 'week') {
            newDateString = $dropTarget.closest('.gsa-scheduler-grid').find(`.gsa-day-header[data-day-index="${$dropTarget.data('day-index')}"]`).data('date');
        } else { // Day view
            newDateString = state.currentDate.toISOString().slice(0, 10);
            const slotIndex = $dropTarget.data('row-index'); // This is 30-min slot index
            const totalMinutes = 7 * 60 + slotIndex * 30; // Start at 7:00, increment by 30 mins
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        const newDatetime = `${newDateString}T${newTime}:00`;

        // If dropped on the same spot, do nothing
        if (originalDatetime === newDatetime && draggedEventData.fitter === newFitterName) {
            return;
        }

        try {
            // Fetch the current schedule for the job
            const response = await fetch(`/wp-json/glazieros/v1/jobs/${originalJobId}/schedule`);
            let schedule = await response.json();
            schedule = Array.isArray(schedule) ? schedule : [];

            // Find and update the specific entry that was dragged
            let updated = false;
            const newSchedule = schedule.map(entry => {
                // Identify the exact entry that was dragged (job ID, original datetime, original fitter)
                if (entry.job.id === originalJobId && entry.datetime === originalDatetime && entry.fitter === draggedEventData.fitter) {
                    updated = true;
                    return { ...entry, datetime: newDatetime, fitter: newFitterName };
                }
                return entry;
            });

            if (!updated) {
                throw new Error('Dragged event not found in schedule.');
            }

            // Save the updated schedule back to the server
            await fetch(`/wp-json/glazieros/v1/jobs/${originalJobId}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSchedule)
            });

            refreshPanel(); // Re-render the entire panel to reflect changes
        } catch (err) {
            console.error('Drag and drop failed:', err);
            alert('Failed to update schedule via drag and drop: ' + err.message);
            refreshPanel(); // Revert UI if save fails
        }
    }

    // Function to update event duration (called from ui.js resizable stop)
    async function updateEventDuration(jobId, originalDatetime, originalFitter, newDuration) {
        try {
            const response = await fetch(`/wp-json/glazieros/v1/jobs/${jobId}/schedule`);
            let schedule = await response.json();
            schedule = Array.isArray(schedule) ? schedule : [];

            let updated = false;
            const newSchedule = schedule.map(entry => {
                if (entry.job.id === jobId && entry.datetime === originalDatetime && entry.fitter === originalFitter) {
                    updated = true;
                    return { ...entry, duration: newDuration.toFixed(1) }; // Save with one decimal place
                }
                return entry;
            });

            if (!updated) {
                throw new Error('Event not found for duration update.');
            }

            await fetch(`/wp-json/glazieros/v1/jobs/${jobId}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSchedule)
            });

            showFeedback('Event duration updated successfully!');
            refreshPanel(); // Re-render to reflect change
        } catch (err) {
            console.error('Failed to update event duration:', err);
            showFeedback('Failed to update event duration: ' + err.message, 'error');
            refreshPanel(); // Revert UI if save fails
        }
    }

    window.GOS_DIARY.events = {
        updateEventDuration: updateEventDuration, // Expose for ui.js
        /**
         * Attaches all necessary event handlers for the diary panel.
         * @param {object} state - The current state of the diary.
         */
        attachEventHandlers: function(state) {
            const { $panel, fitters, schedule } = state;
            const form = $panel.find('#gsa-newjob')[0];

            // --- Event Listeners ---
            $panel.on('click', '#gsa-diary-prev', () => {
                const increment = state.currentView === 'week' ? 7 : 1;
                state.currentDate.setDate(state.currentDate.getDate() - increment);
                window.GOS_DIARY.ui.renderEvents($panel, schedule, fitters, state.currentDate, state.currentView);
            });
            $panel.on('click', '#gsa-diary-today', () => {
                state.currentDate = new Date();
                window.GOS_DIARY.ui.renderEvents($panel, schedule, fitters, state.currentDate, state.currentView);
            });
            $panel.on('click', '#gsa-diary-next', () => {
                const increment = state.currentView === 'week' ? 7 : 1;
                state.currentDate.setDate(state.currentDate.getDate() + increment);
                window.GOS_DIARY.ui.renderEvents($panel, schedule, fitters, state.currentDate, state.currentView);
            });

            $panel.on('click', '#gsa-view-day', () => {
                if (state.currentView === 'day') return;
                state.currentView = 'day';
                $panel.find('.gsa-view-btn').removeClass('active');
                $panel.find('#gsa-view-day').addClass('active');
                window.GOS_DIARY.ui.renderGrid($panel, fitters, state.currentView);
                window.GOS_DIARY.ui.renderEvents($panel, schedule, fitters, state.currentDate, state.currentView);
            });

            $panel.on('click', '#gsa-view-week', () => {
                if (state.currentView === 'week') return;
                state.currentView = 'week';
                $panel.find('.gsa-view-btn').removeClass('active');
                $panel.find('#gsa-view-week').addClass('active');
                window.GOS_DIARY.ui.renderGrid($panel, fitters, state.currentView);
                window.GOS_DIARY.ui.renderEvents($panel, schedule, fitters, state.currentDate, state.currentView);
            });

            $panel.on('click', '#gsa-add-new-job-btn', () => openForm({}, state));
            $panel.on('click', '#gsa-newjob-cancel', () => {
                $panel.find('#gsa-newjob-form').removeClass('active');
                $('#gsa-form-overlay').hide(); // Hide overlay
            });

            // --- Droppable Setup & Click on Empty Cells ---
            $panel.find('.gsa-grid-cell, .gsa-fitter-cell').droppable({
                accept: '.gsa-event, .gsa-event-item',
                hoverClass: 'ui-droppable-hover',
                drop: (event, ui) => handleDrop(event, ui, $(event.target), state)
            }).on('click', function() {
                const cell = $(this);
                const fitterName = cell.data('fitter-name');
                let dateString;
                let h = 9, m = 0;

                if (state.currentView === 'week') {
                    dateString = cell.closest('.gsa-scheduler-grid').find(`.gsa-day-header[data-day-index="${cell.data('day-index')}"]`).data('date');
                } else {
                    dateString = state.currentDate.toISOString().slice(0, 10); // Use current date for day view
                    const slotIndex = cell.data('row-index'); // This is 30-min slot index
                    const totalMinutes = 7 * 60 + slotIndex * 30; // Start at 7:00, increment by 30 mins
                    h = Math.floor(totalMinutes / 60);
                    m = totalMinutes % 60;
                }
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                
                openForm({ fitter: fitterName, datetime: `${dateString}T${time}` }, state);
            });

            // Click on an existing event to edit it.
            $panel.on('click', '.gsa-event, .gsa-event-item', function(e) {
                e.stopPropagation();
                let eventData = $(this).data('event-data');
                if (!eventData) {
                    eventData = JSON.parse($(this).attr('data-event-data'));
                }
                openForm(eventData, state);
            });

            // Keyboard accessibility for cells and events
            $panel.on('keydown', '.gsa-grid-cell, .gsa-fitter-cell, .gsa-event, .gsa-event-item', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent default Enter behavior (e.g., form submission if inside a form)
                    $(this).trigger('click'); // Simulate click to open form
                }
                // Arrow key navigation (more complex, not fully implemented here)
                // This would involve calculating next cell/event based on current focus and grid structure.
                // For example:
                // if (e.key === 'ArrowRight') {
                //     const $next = $(this).nextAll('[tabindex="0"]').first();
                //     if ($next.length) $next.focus();
                // }
                // ... similar for ArrowLeft, ArrowUp, ArrowDown
            });

            // Add tabindex to make cells and events focusable
            $panel.on('mouseenter', '.gsa-grid-cell, .gsa-fitter-cell, .gsa-event, .gsa-event-item', function() {
                // Add tabindex on hover/focus to make them keyboard navigable
                // This is a common pattern for dynamically focusable elements
                $(this).attr('tabindex', '0');
            }).on('mouseleave', '.gsa-grid-cell, .gsa-fitter-cell, .gsa-event, .gsa-event-item', function() {
                // Remove tabindex when not hovered/focused to prevent cluttering tab order
                // unless it's currently focused
                if (!$(this).is(':focus')) {
                    $(this).removeAttr('tabindex');
                }
            }).on('blur', '.gsa-grid-cell, .gsa-fitter-cell, .gsa-event, .gsa-event-item', function() {
                // Remove tabindex on blur if not hovered
                if (!$(this).is(':hover')) $(this).removeAttr('tabindex');
            });

            // Handle deleting a scheduled event
            $panel.on('click', '#gsa-newjob-delete', async function(e) {
                e.preventDefault();
                if (!confirm('Are you sure you want to delete this scheduled event from the diary?')) return;

                const f = $panel.find('#gsa-newjob')[0];
                const jobId = f.jobId.value;
                const originalDatetime = f.originalDatetime.value;

                if (!jobId || !originalDatetime) {
                    alert('Could not identify the event to delete.');
                    return;
                }

                try {
                    const response = await fetch(`/wp-json/glazieros/v1/jobs/${jobId}/schedule`);
                    let currentSchedule = await response.json();
                    currentSchedule = Array.isArray(currentSchedule) ? currentSchedule : [];

                    const updatedSchedule = currentSchedule.filter(en => !(en.job.id === jobId && en.datetime === originalDatetime));

                    const saveResponse = await fetch(`/wp-json/glazieros/v1/jobs/${jobId}/schedule`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedSchedule)
                    });

                    if (!saveResponse.ok) throw new Error(await saveResponse.text());

                    showFeedback('Event deleted successfully!');
                    $panel.find('#gsa-newjob-form').removeClass('active');
                    $('#gsa-form-overlay').hide(); // Hide overlay

                } catch (err) {
                    console.error(err);
                    alert('Failed to delete schedule entry: ' + err.message);
                }
            });

            // Handle form submission for creating/updating an event.
            $panel.on('submit', '#gsa-newjob', async function(e) {
                e.preventDefault();
                const f = this;
                const jobId = f.jobId.value;
                const selectedFitters = Array.from($panel.find('#gsa-form-fitters-checkboxes input[type="checkbox"]:checked')).map(cb => cb.value);
                
                if (!selectedFitters || selectedFitters.length === 0) {
                    alert('Please select at least one fitter.');
                    return;
                }

                const $saveBtn = $(this).find('button[type="submit"]');
                $saveBtn.prop('disabled', true).text('Saving...');

                const newEntries = selectedFitters.map(fitterName => ({
                    type: f.type.value, datetime: `${f.date.value}T${f.time.value}:00`, duration: f.duration.value, fitter: fitterName, notes: f.notes.value
                }));

                try {
                    const response = await fetch(`/wp-json/glazieros/v1/jobs/${jobId}/schedule`);
                    let currentSchedule = await response.json();
                    currentSchedule = Array.isArray(currentSchedule) ? currentSchedule : [];

                    if (f.originalDatetime.value) {
                        currentSchedule = currentSchedule.filter(en => en.datetime !== f.originalDatetime.value);
                    }
                    currentSchedule.push(...newEntries);

                    const saveResponse = await fetch(`/wp-json/glazieros/v1/jobs/${jobId}/schedule`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentSchedule)
                    });

                    if (!saveResponse.ok) throw new Error(await saveResponse.text());

                    showFeedback('Job scheduled successfully!');
                    $panel.find('#gsa-newjob-form').removeClass('active');
                    $('#gsa-form-overlay').hide(); // Hide overlay

                } catch (err) {
                    console.error(err);
                    alert('Failed to save schedule: ' + err.message);
                } finally {
                    $saveBtn.prop('disabled', false).text('Save');
                }
            });
        }
    };
});