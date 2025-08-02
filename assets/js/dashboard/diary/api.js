// assets/js/dashboard/diary/api.js
window.GOS_DIARY = window.GOS_DIARY || {};

window.GOS_DIARY.api = {
    /**
     * Fetches jobs and fitters data in parallel.
     * @returns {Promise<[Array, Array]>} A promise that resolves to [jobs, fitters].
     */
    fetchInitialData: async function() {
        return Promise.all([
            fetch('/wp-json/glazieros/v1/jobs').then(r => r.json()),
            fetch('/wp-json/glazieros/v1/fitters').then(r => r.json())
        ]);
    },

    /**
     * Fetches all schedule entries for a list of jobs.
     * @param {Array} jobs - The list of jobs.
     * @returns {Promise<Array>} A promise that resolves to a flat array of all schedule entries.
     */
    fetchAllSchedules: async function(jobs) {
        const schedulePromises = jobs.map(job =>
            fetch(`/wp-json/glazieros/v1/jobs/${job.id}/schedule`)
            .then(r => r.json())
            .then(body => (Array.isArray(body) ? body : []).map(entry => ({ ...entry, job })))
        );
        const allSchedules = await Promise.all(schedulePromises);
        return allSchedules.flat();
    }
};