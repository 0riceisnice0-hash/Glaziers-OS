// assets/js/dashboard/diary/utils.js
window.GOS_DIARY = window.GOS_DIARY || {};

window.GOS_DIARY.utils = {
    /**
     * Helper function to get the start of the week (Monday) for a given date.
     * @param {Date} d The date.
     * @returns {Date} The date of the Monday of that week.
     */
    getStartOfWeek: function(d) {
        const date = new Date(d);
        const day = date.getDay() || 7; // Make Sunday 7
        if (day !== 1) date.setHours(-24 * (day - 1));
        return new Date(date.setHours(0, 0, 0, 0));
    }
};