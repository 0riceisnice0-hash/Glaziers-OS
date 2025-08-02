// assets/js/dashboard/diary/main.js
jQuery(function($) {
    // Main entry point when the 'diary' panel is activated.
    $(document).on('gsa:panel:activated', (e, tab) => {
        if (tab !== 'diary') return;
        // Prevent re-initialization if already loaded.
        if ($('#gsa-diary').data('init')) return;
        $('#gsa-diary').data('init', true).css({ position: 'relative', overflow: 'hidden' });
        
        console.log('⚙️ diary main.js activated');
        initDiaryPanel();
    });

    /**
     * Fetches initial data and kicks off the rendering process.
     * Uses async/await for cleaner asynchronous flow.
     */
    async function initDiaryPanel() {
        const $panel = $('#gsa-diary');
        $panel.html('<p>Loading Diary...</p>');

        try {
            // Fetch jobs and fitters data in parallel.
            const [jobs, fitters] = await window.GOS_DIARY.api.fetchInitialData();
            
            const validFitters = (Array.isArray(fitters) ? fitters : []).filter(f => f && f.id && f.name);
            if (validFitters.length === 0) {
                $panel.html('<p style="color:orange">No fitters found. Please add fitters to use the Diary.</p>');
                return;
            }
            
            const flatSchedule = await window.GOS_DIARY.api.fetchAllSchedules(jobs);

            // The state object holds the current... state of the diary.
            // It's passed to event handlers to avoid global variables.
            const state = {
                currentView: 'week',
                currentDate: new Date(),
                jobs: jobs,
                fitters: validFitters,
                schedule: flatSchedule,
                $panel: $panel
            };

            window.GOS_DIARY.ui.renderLayout($panel, jobs, validFitters);
            window.GOS_DIARY.ui.renderGrid($panel, validFitters, state.currentView);
            window.GOS_DIARY.events.attachEventHandlers(state);
            window.GOS_DIARY.ui.renderEvents($panel, flatSchedule, validFitters, state.currentDate, state.currentView); // Initial render

        } catch (error) {
            console.error("Failed to load data for Diary:", error);
            $panel.html('<p class="gos-error">Error loading diary data. Please check the console.</p>');
        }
    }
});