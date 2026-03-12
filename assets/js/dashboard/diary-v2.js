/**
 * GlazierOS Diary System v2.0.0
 * Complete rebuild with modern architecture
 * 
 * Architecture:
 * - DiaryStateManager: Observable state management with localStorage persistence
 * - DiaryAPI: REST API abstraction layer with automatic nonce injection
 * - DiaryConfig: Centralized configuration and business logic
 * - DiaryApp: Main application controller
 * 
 * @package GlazierOS
 * @version 2.0.0
 * @author GlazierOS Development Team
 */

console.log('🔵 DIARY V2 FILE LOADING...');

(function($) {
    'use strict';
    
    console.log('🔵 DIARY V2 IIFE EXECUTING...');

    // ============================================================================
    // CONFIGURATION & CONSTANTS
    // ============================================================================

    const CONFIG = {
        VERSION: '2.0.0',
        
        // View modes
        VIEW_MODES: {
            MONTH: 'month',
            WEEK: 'week',
            DAY: 'day',
            TIMELINE: 'timeline',
            LIST: 'list'
        },

        // Event types with colors and icons (using CSS variables for fresh cyan/teal palette)
        EVENT_TYPES: [
            { value: 'survey', label: 'Survey', icon: '📋', color: 'var(--gos-info, #3b82f6)' },
            { value: 'measure', label: 'Measure', icon: '📏', color: 'var(--gos-primary, #06b6d4)' },
            { value: 'delivery', label: 'Delivery', icon: '🚚', color: 'var(--gos-success, #10b981)' },
            { value: 'install', label: 'Installation', icon: '🔧', color: 'var(--gos-accent, #f59e0b)' },
            { value: 'service', label: 'Service', icon: '⚙️', color: 'var(--gos-danger, #ef4444)' },
            { value: 'followup', label: 'Follow-up', icon: '📞', color: 'var(--gos-secondary, #8b5cf6)' },
            { value: 'meeting', label: 'Meeting', icon: '🤝', color: 'var(--gos-accent, #ec4899)' },
            { value: 'other', label: 'Other', icon: '📌', color: 'var(--gos-gray-600, #64748b)' }
        ],

        // Event statuses (using CSS variables)
        EVENT_STATUSES: [
            { value: 'scheduled', label: 'Scheduled', icon: '📅', color: 'var(--gos-info, #3b82f6)' },
            { value: 'confirmed', label: 'Confirmed', icon: '✅', color: 'var(--gos-primary, #06b6d4)' },
            { value: 'in_progress', label: 'In Progress', icon: '⏳', color: 'var(--gos-accent, #f59e0b)' },
            { value: 'completed', label: 'Completed', icon: '✔️', color: 'var(--gos-success, #10b981)' },
            { value: 'cancelled', label: 'Cancelled', icon: '❌', color: 'var(--gos-danger, #ef4444)' },
            { value: 'rescheduled', label: 'Rescheduled', icon: '🔄', color: 'var(--gos-secondary, #8b5cf6)' }
        ],

        // Working hours
        WORKING_HOURS: {
            START: 7,  // 7:00 AM
            END: 18,   // 6:00 PM
            SLOT_DURATION: 30 // minutes
        },

        // Working days
        WORKING_DAYS: [1, 2, 3, 4, 5], // Mon-Fri

        // Duration presets (in hours)
        DURATION_PRESETS: [
            { value: 0.5, label: '30 min' },
            { value: 1, label: '1 hour' },
            { value: 1.5, label: '1.5 hours' },
            { value: 2, label: '2 hours' },
            { value: 3, label: '3 hours' },
            { value: 4, label: '4 hours' },
            { value: 6, label: '6 hours' },
            { value: 8, label: 'Full day' }
        ],

        // Time slots for dropdown (will be populated after CONFIG is created)
        TIME_SLOTS: [],

        // Default values
        DEFAULTS: {
            VIEW_MODE: 'week',
            EVENT_TYPE: 'survey',
            EVENT_STATUS: 'scheduled',
            EVENT_DURATION: 1,
            ITEMS_PER_PAGE: 50
        },

        // Debounce delays
        DEBOUNCE_DELAY: 300,
        SEARCH_DELAY: 500,

        // Storage keys
        STORAGE_KEYS: {
            VIEW_MODE: 'gos_diary_view_mode',
            FILTERS: 'gos_diary_filters',
            CURRENT_DATE: 'gos_diary_current_date'
        },

        // API endpoints
        API_ENDPOINTS: {
            EVENTS: '/wp-json/glazieros/v1/diary/events',
            EVENT_BY_ID: (id) => `/wp-json/glazieros/v1/diary/events/${id}`,
            FITTERS: '/wp-json/glazieros/v1/fitters',
            JOBS: '/wp-json/glazieros/v1/jobs',
            JOB_SCHEDULE: (id) => `/wp-json/glazieros/v1/jobs/${id}/schedule`
        },

        // Keyboard shortcuts
        SHORTCUTS: {
            'Ctrl+N': 'createEvent',
            'Ctrl+F': 'focusSearch',
            'Ctrl+D': 'deleteSelected',
            'Ctrl+E': 'exportEvents',
            'Alt+1': 'viewMonth',
            'Alt+2': 'viewWeek',
            'Alt+3': 'viewDay',
            'Alt+4': 'viewTimeline',
            'Alt+5': 'viewList',
            'Escape': 'closeModal',
            'T': 'goToToday',
            'ArrowLeft': 'previousPeriod',
            'ArrowRight': 'nextPeriod'
        }
    };

    // Helper function to generate time slots
    function generateTimeSlots() {
        const slots = [];
        const start = CONFIG.WORKING_HOURS.START * 60; // Convert to minutes
        const end = CONFIG.WORKING_HOURS.END * 60;
        const interval = CONFIG.WORKING_HOURS.SLOT_DURATION;

        for (let minutes = start; minutes <= end; minutes += interval) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
            slots.push({
                value: time,
                label: time,
                minutes: minutes
            });
        }

        return slots;
    }

    // Populate TIME_SLOTS now that CONFIG is defined
    CONFIG.TIME_SLOTS = generateTimeSlots();

    // ============================================================================
    // STATE MANAGER
    // ============================================================================

    class DiaryStateManager {
        constructor() {
            this.state = {
                // Core data
                events: [],
                fitters: [],
                jobs: [],
                
                // UI state
                viewMode: this.loadFromStorage('viewMode') || CONFIG.DEFAULTS.VIEW_MODE,
                currentDate: this.loadDateFromStorage() || new Date(),
                selectedEvent: null,
                selectedEvents: new Set(),
                
                // Filters
                filters: this.loadFromStorage('filters') || {
                    search: '',
                    eventType: 'all',
                    eventStatus: 'all',
                    fitter: 'all',
                    dateRange: 'all'
                },
                
                // Sorting & pagination
                sortBy: 'datetime_asc',
                currentPage: 1,
                itemsPerPage: CONFIG.DEFAULTS.ITEMS_PER_PAGE,
                
                // Computed state
                filteredEvents: [],
                totalPages: 1,
                
                // Loading states
                isLoading: false,
                isCreating: false,
                isUpdating: false,
                isDeleting: false,
                
                // Modal state
                isModalOpen: false,
                modalMode: null, // 'create' | 'edit' | 'view'
                
                // Error state
                error: null
            };

            this.listeners = new Set();
            this.initialized = false;
        }

        /**
         * Subscribe to state changes
         */
        subscribe(listener) {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        }

        /**
         * Update state and notify listeners
         */
        setState(updates) {
            const prevState = { ...this.state };
            this.state = { ...this.state, ...updates };
            
            // Persist certain state to localStorage
            if (updates.viewMode) {
                this.saveToStorage('viewMode', updates.viewMode);
            }
            if (updates.currentDate) {
                this.saveDateToStorage(updates.currentDate);
            }
            if (updates.filters) {
                this.saveToStorage('filters', updates.filters);
            }

            // Notify all listeners
            this.listeners.forEach(listener => {
                try {
                    listener(this.state, prevState);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            });
        }

        /**
         * Get current state
         */
        getState() {
            return { ...this.state };
        }

        /**
         * Load from localStorage
         */
        loadFromStorage(key) {
            try {
                const storageKey = CONFIG.STORAGE_KEYS[key.toUpperCase()];
                const item = localStorage.getItem(storageKey);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Error loading from storage:', error);
                return null;
            }
        }

        /**
         * Save to localStorage
         */
        saveToStorage(key, value) {
            try {
                const storageKey = CONFIG.STORAGE_KEYS[key.toUpperCase()];
                localStorage.setItem(storageKey, JSON.stringify(value));
            } catch (error) {
                console.error('Error saving to storage:', error);
            }
        }

        /**
         * Load date from storage
         */
        loadDateFromStorage() {
            try {
                const dateStr = localStorage.getItem(CONFIG.STORAGE_KEYS.CURRENT_DATE);
                return dateStr ? new Date(dateStr) : null;
            } catch (error) {
                return null;
            }
        }

        /**
         * Save date to storage
         */
        saveDateToStorage(date) {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEYS.CURRENT_DATE, date.toISOString());
            } catch (error) {
                console.error('Error saving date to storage:', error);
            }
        }

        /**
         * Reset state
         */
        reset() {
            this.state = {
                ...this.state,
                selectedEvent: null,
                selectedEvents: new Set(),
                filters: {
                    search: '',
                    eventType: 'all',
                    eventStatus: 'all',
                    fitter: 'all',
                    dateRange: 'all'
                },
                currentPage: 1,
                error: null
            };
            this.listeners.forEach(listener => listener(this.state));
        }
    }

    // ============================================================================
    // API LAYER
    // ============================================================================

    class DiaryAPI {
        constructor() {
            this.nonce = window.wpApiSettings?.nonce || '';
            this.baseUrl = window.wpApiSettings?.root || '/wp-json/glazieros/v1/';
        }

        /**
         * Generic fetch with nonce injection and error handling
         */
        async fetch(endpoint, options = {}) {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': this.nonce
                }
            };

            const mergedOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            };

            try {
                const response = await fetch(endpoint, mergedOptions);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return { success: true, data };
            } catch (error) {
                console.error('API Error:', error);
                return { success: false, error: error.message };
            }
        }

        /**
         * Fetch all events
         */
        async fetchEvents() {
            return await this.fetch(CONFIG.API_ENDPOINTS.EVENTS);
        }

        /**
         * Fetch single event by ID
         */
        async fetchEvent(id) {
            return await this.fetch(CONFIG.API_ENDPOINTS.EVENT_BY_ID(id));
        }

        /**
         * Create new event
         */
        async createEvent(eventData) {
            return await this.fetch(CONFIG.API_ENDPOINTS.EVENTS, {
                method: 'POST',
                body: JSON.stringify(eventData)
            });
        }

        /**
         * Update existing event
         */
        async updateEvent(id, eventData) {
            return await this.fetch(CONFIG.API_ENDPOINTS.EVENT_BY_ID(id), {
                method: 'PUT',
                body: JSON.stringify(eventData)
            });
        }

        /**
         * Delete event
         */
        async deleteEvent(id) {
            return await this.fetch(CONFIG.API_ENDPOINTS.EVENT_BY_ID(id), {
                method: 'DELETE'
            });
        }

        /**
         * Bulk delete events
         */
        async bulkDeleteEvents(ids) {
            return await this.fetch(`${CONFIG.API_ENDPOINTS.EVENTS}/bulk-delete`, {
                method: 'POST',
                body: JSON.stringify({ ids })
            });
        }

        /**
         * Fetch fitters
         */
        async fetchFitters() {
            return await this.fetch(CONFIG.API_ENDPOINTS.FITTERS);
        }

        /**
         * Fetch jobs
         */
        async fetchJobs() {
            return await this.fetch(CONFIG.API_ENDPOINTS.JOBS);
        }

        /**
         * Fetch job schedule
         */
        async fetchJobSchedule(jobId) {
            return await this.fetch(CONFIG.API_ENDPOINTS.JOB_SCHEDULE(jobId));
        }

        /**
         * Update job schedule
         */
        async updateJobSchedule(jobId, schedule) {
            return await this.fetch(CONFIG.API_ENDPOINTS.JOB_SCHEDULE(jobId), {
                method: 'POST',
                body: JSON.stringify(schedule)
            });
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    class DiaryUtils {
        /**
         * Get start of week (Monday)
         */
        static getStartOfWeek(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(d.setDate(diff));
        }

        /**
         * Get end of week (Friday)
         */
        static getEndOfWeek(date) {
            const start = this.getStartOfWeek(date);
            const end = new Date(start);
            end.setDate(start.getDate() + 4);
            return end;
        }

        /**
         * Get start of month
         */
        static getStartOfMonth(date) {
            return new Date(date.getFullYear(), date.getMonth(), 1);
        }

        /**
         * Get end of month
         */
        static getEndOfMonth(date) {
            return new Date(date.getFullYear(), date.getMonth() + 1, 0);
        }

        /**
         * Format date
         */
        static formatDate(date, format = 'short') {
            const d = new Date(date);
            
            switch(format) {
                case 'short':
                    return d.toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short' 
                    });
                case 'long':
                    return d.toLocaleDateString('en-GB', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                case 'iso':
                    return d.toISOString().split('T')[0];
                default:
                    return d.toLocaleDateString('en-GB');
            }
        }

        /**
         * Format time
         */
        static formatTime(date) {
            return new Date(date).toLocaleTimeString('en-GB', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        /**
         * Format datetime
         */
        static formatDateTime(date) {
            const d = new Date(date);
            return `${this.formatDate(d, 'short')} ${this.formatTime(d)}`;
        }

        /**
         * Check if date is today
         */
        static isToday(date) {
            const today = new Date();
            const d = new Date(date);
            return d.toDateString() === today.toDateString();
        }

        /**
         * Check if date is in past
         */
        static isPast(date) {
            return new Date(date) < new Date();
        }

        /**
         * Check if events overlap
         */
        static doEventsOverlap(event1, event2) {
            const start1 = new Date(event1.datetime);
            const end1 = new Date(start1.getTime() + event1.duration * 60 * 60 * 1000);
            const start2 = new Date(event2.datetime);
            const end2 = new Date(start2.getTime() + event2.duration * 60 * 60 * 1000);
            
            return start1 < end2 && start2 < end1;
        }

        /**
         * Get event type config
         */
        static getEventType(value) {
            return CONFIG.EVENT_TYPES.find(t => t.value === value) || CONFIG.EVENT_TYPES[0];
        }

        /**
         * Get event status config
         */
        static getEventStatus(value) {
            return CONFIG.EVENT_STATUSES.find(s => s.value === value) || CONFIG.EVENT_STATUSES[0];
        }

        /**
         * Calculate event conflicts
         */
        static getEventConflicts(event, allEvents) {
            return allEvents.filter(e => {
                // Skip same event
                if (e.id === event.id) return false;
                
                // Skip if different fitter
                if (e.fitter !== event.fitter) return false;
                
                // Check overlap
                return this.doEventsOverlap(event, e);
            });
        }

        /**
         * Get fitter availability
         */
        static getFitterAvailability(fitter, date, allEvents) {
            const dayEvents = allEvents.filter(e => {
                const eventDate = new Date(e.datetime);
                return e.fitter === fitter && 
                       eventDate.toDateString() === new Date(date).toDateString();
            });

            const totalHours = dayEvents.reduce((sum, e) => sum + parseFloat(e.duration || 0), 0);
            const workingHours = CONFIG.WORKING_HOURS.END - CONFIG.WORKING_HOURS.START;
            const availableHours = workingHours - totalHours;

            return {
                totalHours,
                availableHours,
                isAvailable: availableHours > 0,
                utilizationPercent: (totalHours / workingHours) * 100
            };
        }

        /**
         * Debounce function
         */
        static debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        /**
         * Throttle function
         */
        static throttle(func, wait) {
            let timeout;
            let previous = 0;
            
            return function executedFunction(...args) {
                const now = Date.now();
                const remaining = wait - (now - previous);
                
                if (remaining <= 0 || remaining > wait) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    previous = now;
                    func(...args);
                } else if (!timeout) {
                    timeout = setTimeout(() => {
                        previous = Date.now();
                        timeout = null;
                        func(...args);
                    }, remaining);
                }
            };
        }
    }

    // ============================================================================
    // MAIN DIARY APPLICATION
    // ============================================================================

    class DiaryApp {
        constructor() {
            this.state = new DiaryStateManager();
            this.api = new DiaryAPI();
            this.utils = DiaryUtils;
            
            this.currentEditingEvent = null;
            this.draggedEvent = null;
            
            // Bind methods
            this.render = this.render.bind(this);
            this.handleStateChange = this.handleStateChange.bind(this);
        }

        /**
         * Inject premium gradient styling (matching quotes/dashboard theme)
         */
        injectPremiumStyles() {
            const styleId = 'gos-diary-premium-styles';
            
            // Remove existing styles if present
            const existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* ========================================
                   PREMIUM GRADIENT DIARY THEME
                   Matching quotes/dashboard aesthetic
                   ======================================== */
                
                /* Premium Header - Gradient Background */
                .gos-diary-premium-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    border-bottom: none !important;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15) !important;
                    position: relative !important;
                    overflow: hidden !important;
                    padding-bottom: 0 !important;
                }
                
                .gos-diary-premium-header::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") !important;
                    opacity: 0.3 !important;
                    pointer-events: none !important;
                }
                
                /* Topbar - White Text on Gradient */
                .gos-diary-premium-header .gos-diary-topbar {
                    background: transparent !important;
                    border: none !important;
                    position: relative !important;
                    z-index: 10 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    padding: 12px 24px !important;
                    gap: 24px !important;
                }
                
                /* Title - White Text with Shadow */
                .gos-diary-premium-header .gos-diary-title-compact {
                    color: white !important;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                    font-weight: 600 !important;
                    font-size: 1.25rem !important;
                    margin: 0 !important;
                }
                
                /* Center Section - Date + View Switcher */
                .gos-topbar-center {
                    display: flex !important;
                    align-items: center !important;
                    gap: 20px !important;
                    flex: 1 !important;
                    justify-content: center !important;
                }
                
                /* Date Navigation Section */
                .gos-date-nav-modern {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                }
                
                /* Date Display - Large, Prominent */
                .gos-date-premium {
                    color: white !important;
                    text-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
                    font-weight: 700 !important;
                    font-size: 1.5rem !important;
                    letter-spacing: -0.02em !important;
                    margin: 0 16px !important;
                    white-space: nowrap !important;
                    min-width: 280px !important;
                    text-align: center !important;
                }
                
                /* New Event Button - Glass Morphism White */
                .gos-btn-premium {
                    background: rgba(255, 255, 255, 0.2) !important;
                    backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.3) !important;
                    color: white !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                }
                
                .gos-btn-premium:hover {
                    background: rgba(255, 255, 255, 0.3) !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
                }
                
                /* Navigation Buttons - Glass Style */
                .gos-diary-premium-header .gos-nav-btn-modern,
                .gos-diary-premium-header .gos-today-btn-modern {
                    background: rgba(255, 255, 255, 0.15) !important;
                    border: 1px solid rgba(255, 255, 255, 0.25) !important;
                    color: white !important;
                    backdrop-filter: blur(10px) !important;
                    transition: all 0.2s ease !important;
                }
                
                .gos-diary-premium-header .gos-nav-btn-modern:hover,
                .gos-diary-premium-header .gos-today-btn-modern:hover {
                    background: rgba(255, 255, 255, 0.25) !important;
                    border-color: rgba(255, 255, 255, 0.4) !important;
                    transform: translateY(-1px) !important;
                }
                
                /* View Switcher Pills - Premium Glass Style */
                .gos-view-pills-premium {
                    background: rgba(255, 255, 255, 0.15) !important;
                    backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.2) !important;
                    padding: 4px !important;
                    border-radius: 12px !important;
                    display: flex !important;
                    gap: 4px !important;
                    flex-shrink: 0 !important;
                }
                
                .gos-view-pills-premium .gos-view-pill {
                    background: transparent !important;
                    color: rgba(255, 255, 255, 0.8) !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    font-size: 0.875rem !important;
                    font-weight: 500 !important;
                    transition: all 0.2s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    cursor: pointer !important;
                    white-space: nowrap !important;
                }
                
                .gos-view-pills-premium .gos-view-pill svg {
                    width: 16px !important;
                    height: 16px !important;
                    stroke: currentColor !important;
                }
                
                .gos-view-pills-premium .gos-view-pill:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                    color: white !important;
                }
                
                .gos-view-pills-premium .gos-view-pill.active {
                    background: white !important;
                    color: #667eea !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                    font-weight: 600 !important;
                }
                
                /* Left section */
                .gos-topbar-left {
                    display: flex !important;
                    align-items: center !important;
                    gap: 16px !important;
                    flex-shrink: 0 !important;
                }
                
                /* Right section */
                .gos-topbar-right {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                    flex-shrink: 0 !important;
                }
                
                /* Stats Badges - Glass Style */
                .gos-diary-premium-header .gos-stats-badges span {
                    background: rgba(255, 255, 255, 0.2) !important;
                    backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(255, 255, 255, 0.25) !important;
                    color: white !important;
                    padding: 6px 12px !important;
                    border-radius: 20px !important;
                    font-size: 0.8125rem !important;
                    font-weight: 500 !important;
                }
                
                /* Filter Button - Glass Style */
                .gos-diary-premium-header .gos-btn-filter-modern {
                    background: rgba(255, 255, 255, 0.15) !important;
                    border: 1px solid rgba(255, 255, 255, 0.25) !important;
                    color: white !important;
                    backdrop-filter: blur(10px) !important;
                    padding: 8px !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }
                
                .gos-diary-premium-header .gos-btn-filter-modern:hover {
                    background: rgba(255, 255, 255, 0.25) !important;
                    transform: translateY(-1px) !important;
                }
                
                /* Calendar Grid - Subtle Gradient Accents */
                .gos-month-calendar {
                    background: #f8f9fc !important;
                }
                
                .gos-month-weekday-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    padding: 12px !important;
                    font-size: 0.8125rem !important;
                }
                
                .gos-month-cell-modern {
                    background: white !important;
                    transition: all 0.2s ease !important;
                    border: 1px solid #e5e7eb !important;
                }
                
                .gos-month-cell-modern:hover {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%) !important;
                    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1) !important;
                }
                
                .gos-month-cell-modern.gos-cell-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
                    border: 2px solid #667eea !important;
                }
                
                /* Event Cards - Gradient Top Bar */
                .gos-event-card-modern {
                    background: white !important;
                    border-left: 4px solid #667eea !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
                    transition: all 0.2s ease !important;
                    border-radius: 6px !important;
                    padding: 8px 10px !important;
                    margin-bottom: 4px !important;
                }
                
                .gos-event-card-modern:hover {
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2) !important;
                    transform: translateX(2px) !important;
                }
                
                /* Fitter Sidebar - Premium Styling */
                .gos-fitter-sidebar {
                    background: linear-gradient(180deg, #f8f9fc 0%, white 100%) !important;
                    border-right: 1px solid #e5e7eb !important;
                }
                
                .gos-fitter-item {
                    transition: all 0.2s ease !important;
                    border-radius: 8px !important;
                    padding: 8px 12px !important;
                    margin: 4px 8px !important;
                }
                
                .gos-fitter-item:hover {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%) !important;
                }
                
                .gos-fitter-item.selected {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3) !important;
                }
                
                /* Loading State - Gradient Shimmer */
                .gos-loading-spinner {
                    border: 3px solid rgba(102, 126, 234, 0.1) !important;
                    border-top-color: #667eea !important;
                    border-right-color: #764ba2 !important;
                }
                
                /* Modal - Premium Header */
                .gos-modal-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                }
                
                .gos-modal-header h3 {
                    color: white !important;
                }
                
                .gos-modal-close-btn {
                    color: white !important;
                    opacity: 0.9 !important;
                }
                
                .gos-modal-close-btn:hover {
                    opacity: 1 !important;
                }
                
                /* ========================================
                   WEEK VIEW - CLEAN MINIMAL STYLING
                   ======================================== */
                
                .gos-week-view-calendar {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    background: #fafbfc !important;
                }
                
                /* Week Header - Clean White with Subtle Borders */
                .gos-week-header-modern {
                    display: grid !important;
                    grid-template-columns: 200px repeat(5, 1fr) !important;
                    background: white !important;
                    border-bottom: 2px solid #e5e7eb !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 20 !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                }
                
                .gos-week-corner-cell {
                    background: #f9fafb !important;
                    color: #6b7280 !important;
                    font-weight: 600 !important;
                    font-size: 0.75rem !important;
                    padding: 16px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    border-right: 1px solid #e5e7eb !important;
                }
                
                .gos-week-day-header {
                    background: white !important;
                    color: #6b7280 !important;
                    padding: 12px 16px !important;
                    text-align: center !important;
                    border-right: 1px solid #f3f4f6 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                    transition: all 0.2s ease !important;
                }
                
                .gos-week-day-header:last-child {
                    border-right: none !important;
                }
                
                .gos-week-day-header.is-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%) !important;
                }
                
                .gos-week-day-header .day-name {
                    font-size: 0.75rem !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    color: #9ca3af !important;
                }
                
                .gos-week-day-header .day-date {
                    font-size: 1.5rem !important;
                    font-weight: 600 !important;
                    color: #1f2937 !important;
                }
                
                .gos-week-day-header.is-today .day-date {
                    color: #667eea !important;
                }
                
                /* Week Body - Fitter Rows */
                .gos-week-body-modern {
                    flex: 1 !important;
                    overflow-y: auto !important;
                    background: #fafbfc !important;
                }
                
                .gos-week-fitter-row {
                    display: grid !important;
                    grid-template-columns: 200px repeat(5, 1fr) !important;
                    border-bottom: 1px solid #f3f4f6 !important;
                    min-height: 120px !important;
                    transition: all 0.2s ease !important;
                    background: white !important;
                    margin-bottom: 1px !important;
                }
                
                .gos-week-fitter-row:hover {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
                }
                
                /* Fitter Name Cell - Minimal Style */
                .gos-week-fitter-cell {
                    background: #f9fafb !important;
                    border-right: 1px solid #e5e7eb !important;
                    padding: 16px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 6px !important;
                    position: sticky !important;
                    left: 0 !important;
                    z-index: 10 !important;
                    transition: all 0.3s ease !important;
                }
                
                .gos-week-fitter-row:hover .gos-week-fitter-cell {
                    background: white !important;
                }
                
                .gos-week-fitter-cell .fitter-name {
                    font-size: 0.9375rem !important;
                    font-weight: 600 !important;
                    color: #1f2937 !important;
                }
                
                .gos-week-fitter-cell .fitter-meta {
                    font-size: 0.75rem !important;
                    color: #667eea !important;
                    font-weight: 500 !important;
                }
                
                /* Day Cells - Clean White */
                .gos-week-day-cell {
                    background: white !important;
                    border-right: 1px solid #f3f4f6 !important;
                    padding: 12px !important;
                    position: relative !important;
                    min-height: 120px !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                }
                
                .gos-week-day-cell:last-child {
                    border-right: none !important;
                }
                
                .gos-week-day-cell.is-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%) !important;
                }
                
                .gos-week-day-cell:hover {
                    background: #fafbfc !important;
                }
                
                /* Add Button - Subtle */
                .gos-week-add-btn {
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 32px !important;
                    height: 32px !important;
                    background: #667eea !important;
                    border: none !important;
                    border-radius: 50% !important;
                    color: white !important;
                    cursor: pointer !important;
                    opacity: 0 !important;
                    transition: all 0.2s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    box-shadow: 0 2px 6px rgba(102, 126, 234, 0.2) !important;
                }
                
                .gos-week-day-cell:hover .gos-week-add-btn {
                    opacity: 1 !important;
                }
                
                .gos-week-add-btn:hover {
                    background: #764ba2 !important;
                    transform: translate(-50%, -50%) scale(1.1) !important;
                }
                
                /* Event Pills - Colorful Accents */
                .gos-week-event-pill {
                    background: white !important;
                    border-left: 3px solid #667eea !important;
                    border-radius: 4px !important;
                    padding: 6px 10px !important;
                    margin-bottom: 6px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
                    font-size: 0.8125rem !important;
                }
                
                .gos-week-event-pill:hover {
                    transform: translateX(2px) !important;
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15) !important;
                }
                
                /* ========================================
                   MONTH VIEW - CLEAN CALENDAR GRID
                   ======================================== */
                
                .gos-month-view {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    background: #fafbfc !important;
                    padding: 20px !important;
                }
                
                .gos-month-calendar {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    background: white !important;
                    border: 1px solid #e5e7eb !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                }
                
                /* Month Header - Minimal Day Names */
                .gos-month-header {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    background: #f9fafb !important;
                    border-bottom: 1px solid #e5e7eb !important;
                }
                
                .gos-month-day-header {
                    padding: 12px !important;
                    text-align: center !important;
                    font-size: 0.75rem !important;
                    font-weight: 600 !important;
                    color: #9ca3af !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    border-right: 1px solid #f3f4f6 !important;
                }
                
                .gos-month-day-header:last-child {
                    border-right: none !important;
                }
                
                /* Month Body - Week Rows */
                .gos-month-body {
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                
                .gos-month-week {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr) !important;
                    flex: 1 !important;
                    border-bottom: 1px solid #f3f4f6 !important;
                }
                
                .gos-month-week:last-child {
                    border-bottom: none !important;
                }
                
                /* Month Day Cells - Clean & Spacious */
                .gos-month-cell-modern {
                    background: white !important;
                    border-right: 1px solid #f3f4f6 !important;
                    padding: 12px !important;
                    min-height: 100px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                    position: relative !important;
                }
                
                .gos-month-cell-modern:last-child {
                    border-right: none !important;
                }
                
                .gos-month-cell-modern.gos-month-cell-other {
                    background: #fafbfc !important;
                }
                
                .gos-month-cell-modern.gos-month-cell-other .gos-month-day-number {
                    color: #d1d5db !important;
                }
                
                .gos-month-cell-modern.gos-month-cell-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%) !important;
                }
                
                .gos-month-cell-modern.gos-month-cell-weekend {
                    background: #fafbfc !important;
                }
                
                .gos-month-cell-modern:hover {
                    background: #f9fafb !important;
                }
                
                .gos-month-cell-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                }
                
                .gos-month-day-number {
                    font-size: 0.875rem !important;
                    font-weight: 600 !important;
                    color: #6b7280 !important;
                }
                
                .gos-month-cell-today .gos-month-day-number {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    color: white !important;
                    width: 28px !important;
                    height: 28px !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-weight: 700 !important;
                }
                
                .gos-month-add-btn {
                    width: 20px !important;
                    height: 20px !important;
                    background: #667eea !important;
                    border: none !important;
                    border-radius: 4px !important;
                    color: white !important;
                    cursor: pointer !important;
                    opacity: 0 !important;
                    transition: all 0.2s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                .gos-month-cell-modern:hover .gos-month-add-btn {
                    opacity: 1 !important;
                }
                
                .gos-month-event-pill {
                    background: #f0f4ff !important;
                    border-left: 2px solid #667eea !important;
                    border-radius: 3px !important;
                    padding: 3px 6px !important;
                    margin-bottom: 3px !important;
                    font-size: 0.6875rem !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    color: #4b5563 !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
                
                .gos-month-event-pill:hover {
                    background: #667eea !important;
                    color: white !important;
                }
                
                /* ========================================
                   DAY VIEW - MINIMAL TIME GRID
                   ======================================== */
                
                .gos-day-view-modern {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    background: #fafbfc !important;
                }
                
                .gos-day-sticky-header {
                    display: grid !important;
                    background: white !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 20 !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                    border-bottom: 1px solid #e5e7eb !important;
                }
                
                .gos-day-time-corner {
                    background: #f9fafb !important;
                    color: #9ca3af !important;
                    font-weight: 600 !important;
                    padding: 16px !important;
                    text-align: center !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    font-size: 0.75rem !important;
                }
                
                .gos-day-fitter-header {
                    background: white !important;
                    color: #1f2937 !important;
                    padding: 12px 16px !important;
                    text-align: center !important;
                    font-weight: 600 !important;
                    border-right: 1px solid #f3f4f6 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                }
                
                .gos-day-fitter-header .fitter-name {
                    font-size: 0.9375rem !important;
                    color: #1f2937 !important;
                }
                
                .gos-day-fitter-header .fitter-meta {
                    font-size: 0.75rem !important;
                    color: #667eea !important;
                    font-weight: 500 !important;
                }
                
                .gos-day-grid-container {
                    flex: 1 !important;
                    overflow-y: auto !important;
                    background: white !important;
                }
                
                .gos-day-hour-row {
                    display: grid !important;
                    border-bottom: 1px solid #f3f4f6 !important;
                    min-height: 60px !important;
                }
                
                .gos-day-hour-row.is-current {
                    background: linear-gradient(90deg, rgba(102, 126, 234, 0.03) 0%, transparent 100%) !important;
                }
                
                .gos-day-time-label {
                    background: #f9fafb !important;
                    padding: 12px 16px !important;
                    font-size: 0.75rem !important;
                    font-weight: 600 !important;
                    color: #9ca3af !important;
                    border-right: 1px solid #e5e7eb !important;
                    display: flex !important;
                    align-items: flex-start !important;
                    justify-content: center !important;
                    padding-top: 8px !important;
                }
                
                .gos-day-hour-cell {
                    background: white !important;
                    border-right: 1px solid #f3f4f6 !important;
                    padding: 8px !important;
                    position: relative !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                }
                
                .gos-day-hour-cell:hover {
                    background: #fafbfc !important;
                }
                
                .gos-day-add-btn {
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 28px !important;
                    height: 28px !important;
                    background: #667eea !important;
                    border: none !important;
                    border-radius: 50% !important;
                    color: white !important;
                    cursor: pointer !important;
                    opacity: 0 !important;
                    transition: all 0.2s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                .gos-day-hour-cell:hover .gos-day-add-btn {
                    opacity: 1 !important;
                }
                
                /* ========================================
                   TIMELINE VIEW - HORIZONTAL SCROLL
                   ======================================== */
                
                .gos-timeline-view {
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    background: #fafbfc !important;
                    overflow: hidden !important;
                }
                
                .gos-timeline-header {
                    background: white !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 20 !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                    overflow-x: auto !important;
                    white-space: nowrap !important;
                    border-bottom: 1px solid #e5e7eb !important;
                }
                
                .gos-timeline-header-row {
                    display: flex !important;
                    min-width: max-content !important;
                }
                
                .gos-timeline-corner {
                    flex-shrink: 0 !important;
                    width: 200px !important;
                    background: #f9fafb !important;
                    color: #9ca3af !important;
                    font-weight: 600 !important;
                    padding: 16px !important;
                    text-align: center !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    font-size: 0.75rem !important;
                    border-right: 1px solid #e5e7eb !important;
                }
                
                .gos-timeline-date-header {
                    flex-shrink: 0 !important;
                    width: 150px !important;
                    background: white !important;
                    color: #6b7280 !important;
                    padding: 12px 16px !important;
                    text-align: center !important;
                    border-right: 1px solid #f3f4f6 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                }
                
                .gos-timeline-date-header.is-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%) !important;
                }
                
                .gos-timeline-date-header .day-name {
                    font-size: 0.75rem !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    color: #9ca3af !important;
                }
                
                .gos-timeline-date-header .day-date {
                    font-size: 1.25rem !important;
                    font-weight: 600 !important;
                    color: #1f2937 !important;
                }
                
                .gos-timeline-date-header.is-today .day-date {
                    color: #667eea !important;
                }
                
                .gos-timeline-body {
                    flex: 1 !important;
                    overflow: auto !important;
                    background: white !important;
                }
                
                .gos-timeline-fitter-row {
                    display: flex !important;
                    border-bottom: 1px solid #f3f4f6 !important;
                    min-height: 80px !important;
                    min-width: max-content !important;
                }
                
                .gos-timeline-fitter-cell {
                    flex-shrink: 0 !important;
                    width: 200px !important;
                    background: #f9fafb !important;
                    border-right: 1px solid #e5e7eb !important;
                    padding: 16px !important;
                    position: sticky !important;
                    left: 0 !important;
                    z-index: 10 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 4px !important;
                }
                
                .gos-timeline-fitter-cell .fitter-name {
                    font-size: 0.9375rem !important;
                    font-weight: 600 !important;
                    color: #1f2937 !important;
                }
                
                .gos-timeline-day-cell {
                    flex-shrink: 0 !important;
                    width: 150px !important;
                    background: white !important;
                    border-right: 1px solid #f3f4f6 !important;
                    padding: 8px !important;
                    position: relative !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                }
                
                .gos-timeline-day-cell.is-today {
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.03) 0%, rgba(118, 75, 162, 0.03) 100%) !important;
                }
                
                .gos-timeline-day-cell:hover {
                    background: #fafbfc !important;
                }
                
                /* ========================================
                   LIST VIEW - CLEAN CARD LAYOUT
                   ======================================== */
                
                .gos-list-view {
                    padding: 20px !important;
                    background: #fafbfc !important;
                    overflow-y: auto !important;
                }
                
                .gos-list-event-card {
                    background: white !important;
                    border-left: 3px solid #667eea !important;
                    border-radius: 8px !important;
                    padding: 16px !important;
                    margin-bottom: 12px !important;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.04) !important;
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                }
                
                .gos-list-event-card:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1) !important;
                }
            `;
            
            document.head.appendChild(style);
        }

        /**
         * Initialize the diary application
         */
        async init() {
            console.log('🚀 Initializing Diary v2.0.0...');
            
            // Inject premium gradient styles first
            this.injectPremiumStyles();
            
            try {
                // Show loading state
                this.renderLoadingState();
                
                // Subscribe to state changes
                this.state.subscribe(this.handleStateChange);
                
                // Load initial data
                await this.loadInitialData();
                
                // Attach event listeners
                this.attachEventListeners();
                
                // Initial render
                this.render();
                
                // Initialize keyboard shortcuts
                this.initKeyboardShortcuts();
                
                console.log('✅ Diary v2.0.0 initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize Diary:', error);
                this.renderError(error.message);
            }
        }

        /**
         * Load initial data from API
         */
        async loadInitialData() {
            this.state.setState({ isLoading: true });
            
            try {
                // Fetch data in parallel
                const [eventsResult, fittersResult, jobsResult] = await Promise.all([
                    this.api.fetchEvents(),
                    this.api.fetchFitters(),
                    this.api.fetchJobs()
                ]);

                // Process events - normalize field names (DataStore uses start/end, diary expects datetime/duration)
                const rawEvents = eventsResult.success ? eventsResult.data : [];
                const events = rawEvents.map(function(e) {
                    if (!e.datetime && e.start) {
                        e.datetime = e.start;
                    }
                    if (!e.duration && e.start && e.end) {
                        var ms = new Date(e.end).getTime() - new Date(e.start).getTime();
                        e.duration = ms > 0 ? ms / 3600000 : 1;
                    }
                    if (!e.duration) e.duration = 1;
                    if (!e.type) e.type = 'other';
                    if (!e.fitter && e.fitter_id) {
                        var matchedFitter = (fittersResult.success ? fittersResult.data : []).find(function(f) { return f.id == e.fitter_id; });
                        if (matchedFitter) e.fitter = matchedFitter.name;
                    }
                    if (!e.job && e.job_id) {
                        var matchedJob = (jobsResult.success ? jobsResult.data : []).find(function(j) { return j.id == e.job_id; });
                        if (matchedJob) e.job = matchedJob;
                    }
                    return e;
                });
                
                // Process fitters
                const fitters = fittersResult.success ? 
                    (Array.isArray(fittersResult.data) ? fittersResult.data : []).filter(f => f && f.id && f.name) : 
                    [];
                
                // Process jobs
                const jobs = jobsResult.success ? 
                    (Array.isArray(jobsResult.data) ? jobsResult.data : []) : 
                    [];

                // Update state
                this.state.setState({
                    events,
                    fitters,
                    jobs,
                    isLoading: false,
                    error: null
                });

                // Apply filters to get filtered events
                this.applyFiltersAndSort();

            } catch (error) {
                console.error('Error loading initial data:', error);
                this.state.setState({ 
                    isLoading: false, 
                    error: error.message 
                });
            }
        }

        /**
         * Reload events from API
         */
        async reloadEvents() {
            const result = await this.api.fetchEvents();
            
            if (result.success) {
                this.state.setState({ events: result.data });
                this.applyFiltersAndSort();
            } else {
                this.showNotification('❌ Failed to reload events', 'error');
            }
        }

        /**
         * Apply filters and sorting to events
         */
        applyFiltersAndSort() {
            const { events, filters, sortBy } = this.state.getState();
            
            let filtered = [...events];

            // Apply search filter
            if (filters.search && filters.search.trim() !== '') {
                const query = filters.search.toLowerCase().trim();
                filtered = filtered.filter(event => {
                    // Search in job details
                    const job = event.job || {};
                    const customerName = `${job.first_name || ''} ${job.last_name || ''}`.toLowerCase();
                    
                    return (
                        customerName.includes(query) ||
                        (event.type || '').toLowerCase().includes(query) ||
                        (event.fitter || '').toLowerCase().includes(query) ||
                        (event.notes || '').toLowerCase().includes(query) ||
                        (job.email || '').toLowerCase().includes(query) ||
                        (job.phone || '').includes(query) ||
                        event.id.toString().includes(query)
                    );
                });
            }

            // Apply event type filter
            if (filters.eventType && filters.eventType !== 'all') {
                filtered = filtered.filter(e => e.type === filters.eventType);
            }

            // Apply event status filter
            if (filters.eventStatus && filters.eventStatus !== 'all') {
                filtered = filtered.filter(e => e.status === filters.eventStatus);
            }

            // Apply fitter filter
            if (filters.fitter && filters.fitter !== 'all') {
                filtered = filtered.filter(e => e.fitter === filters.fitter);
            }

            // Apply date range filter
            if (filters.dateRange && filters.dateRange !== 'all') {
                const now = new Date();
                filtered = filtered.filter(e => {
                    const eventDate = new Date(e.datetime);
                    
                    switch(filters.dateRange) {
                        case 'today':
                            return eventDate.toDateString() === now.toDateString();
                        case 'tomorrow':
                            const tomorrow = new Date(now);
                            tomorrow.setDate(now.getDate() + 1);
                            return eventDate.toDateString() === tomorrow.toDateString();
                        case 'this_week':
                            const weekStart = DiaryUtils.getStartOfWeek(now);
                            const weekEnd = DiaryUtils.getEndOfWeek(now);
                            return eventDate >= weekStart && eventDate <= weekEnd;
                        case 'next_week':
                            const nextWeekStart = new Date(now);
                            nextWeekStart.setDate(now.getDate() + 7);
                            const nwStart = DiaryUtils.getStartOfWeek(nextWeekStart);
                            const nwEnd = DiaryUtils.getEndOfWeek(nextWeekStart);
                            return eventDate >= nwStart && eventDate <= nwEnd;
                        case 'this_month':
                            return eventDate.getMonth() === now.getMonth() && 
                                   eventDate.getFullYear() === now.getFullYear();
                        case 'past':
                            return eventDate < now;
                        case 'future':
                            return eventDate >= now;
                        default:
                            return true;
                    }
                });
            }

            // Apply sorting
            filtered = this.applySorting(filtered, sortBy);

            // Update state with filtered events
            this.state.setState({ 
                filteredEvents: filtered,
                totalPages: Math.ceil(filtered.length / this.state.getState().itemsPerPage)
            });
        }

        /**
         * Apply sorting to events
         */
        applySorting(events, sortBy) {
            const sorted = [...events];
            
            switch(sortBy) {
                case 'datetime_asc':
                    return sorted.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
                case 'datetime_desc':
                    return sorted.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
                case 'type_asc':
                    return sorted.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
                case 'type_desc':
                    return sorted.sort((a, b) => (b.type || '').localeCompare(a.type || ''));
                case 'fitter_asc':
                    return sorted.sort((a, b) => (a.fitter || '').localeCompare(b.fitter || ''));
                case 'fitter_desc':
                    return sorted.sort((a, b) => (b.fitter || '').localeCompare(a.fitter || ''));
                case 'duration_asc':
                    return sorted.sort((a, b) => parseFloat(a.duration || 0) - parseFloat(b.duration || 0));
                case 'duration_desc':
                    return sorted.sort((a, b) => parseFloat(b.duration || 0) - parseFloat(a.duration || 0));
                default:
                    return sorted;
            }
        }

        /**
         * Handle state changes
         */
        handleStateChange(newState, prevState) {
            // Re-render if view mode changes
            if (newState.viewMode !== prevState.viewMode) {
                this.render();
            }

            // Re-render if current date changes
            if (newState.currentDate !== prevState.currentDate) {
                this.render();
            }

            // Re-apply filters if events or filters change
            if (newState.events !== prevState.events || newState.filters !== prevState.filters) {
                this.applyFiltersAndSort();
            }

            // Re-render if filtered events change
            if (newState.filteredEvents !== prevState.filteredEvents) {
                this.renderEvents();
            }
        }

        /**
         * Main render function
         */
        render() {
            const $panel = $('#gsa-diary');
            
            if ($panel.length === 0) {
                console.error('Diary panel not found');
                return;
            }

            // Render main layout
            $panel.html(this.renderMainLayout());
            
            // Render active view
            this.renderCurrentView();
        }

        /**
         * Render main layout structure
         */
        renderMainLayout() {
            const state = this.state.getState();
            
            return `
                <div class="gos-diary-v2-container">
                    <!-- Header -->
                    <div class="gos-diary-header">
                        ${this.renderHeader()}
                    </div>
                    
                    <!-- Toolbar -->
                    <div class="gos-diary-toolbar">
                        ${this.renderToolbar()}
                    </div>
                    
                    <!-- Main Content -->
                    <div class="gos-diary-body" id="gos-diary-body">
                        <!-- View will be rendered here -->
                    </div>
                    
                    <!-- Sidebar (optional) -->
                    <div class="gos-diary-sidebar" id="gos-diary-sidebar" style="display:none;">
                        ${this.renderSidebar()}
                    </div>
                </div>
                
                <!-- Notifications Container -->
                <div id="gos-diary-notifications"></div>
            `;
        }

        /**
         * Render header - MODERN CALENDAR PLATFORM STYLE
         * Inspired by Notion Calendar / Apple Calendar
         */
        renderHeader() {
            const state = this.state.getState();
            const stats = this.calculateStatistics ? this.calculateStatistics() : { todayEvents: 0, upcomingEvents: 0 };
            
            return `
                <div class="gos-diary-header-modern gos-diary-premium-header">
                    <!-- Compact top bar matching Quotes layout -->
                    <div class="gos-diary-topbar">
                        <!-- Left: Title + New Event -->
                        <div class="gos-topbar-left">
                            <h1 class="gos-diary-title-compact">Calendar</h1>
                            <button class="gos-btn-new-event-modern gos-btn-premium" id="gos-create-event-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>New Event</span>
                            </button>
                        </div>
                        
                        <!-- Center: Date Navigation + View Switcher Pills -->
                        <div class="gos-topbar-center">
                            <!-- Date Navigation -->
                            <div class="gos-date-nav-modern">
                                <button class="gos-nav-btn-modern" id="gos-diary-prev" title="Previous">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                                
                                <button class="gos-today-btn-modern" id="gos-diary-today">Today</button>
                                
                                <button class="gos-nav-btn-modern" id="gos-diary-next" title="Next">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                                
                                <h2 class="gos-date-display-modern gos-date-premium" id="gos-diary-date-display">
                                    ${this.getDateDisplayText()}
                                </h2>
                            </div>
                            
                            <!-- View Switcher Pills with Hover Animation -->
                            <div class="gos-view-pills gos-view-pills-premium" role="radiogroup" aria-label="Calendar view">
                                ${this.renderViewSwitcher()}
                            </div>
                        </div>
                        
                        <!-- Right: Stats + Filters -->
                        <div class="gos-topbar-right">
                            <div class="gos-stats-badges" id="gos-diary-stats-inline">
                                <span class="gos-stat-badge-today" title="Events today">${stats.todayEvents}</span>
                                <span class="gos-stat-badge-upcoming" title="Upcoming events">${stats.upcomingEvents}</span>
                            </div>
                            
                            <button class="gos-btn-filter-modern" id="gos-toggle-filters-btn" title="Filters & Search">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Render toolbar - NOW EMPTY (all moved to header)
         */
        renderToolbar() {
            return `
                <!-- Filters Panel (slide-over style, hidden by default) -->
                <div class="gos-diary-filters-panel" id="gos-diary-filters-panel" style="display:none;">
                    ${this.renderFiltersPanel()}
                </div>
            `;
        }

        /**
         * Render view switcher - COMPACT PILL BUTTONS WITH HOVER ANIMATION
         */
        renderViewSwitcher() {
            const state = this.state.getState();
            const currentView = state.viewMode;
            
            // Pill-style buttons with icons + labels
            const views = [
                { 
                    value: CONFIG.VIEW_MODES.MONTH, 
                    label: 'Month',
                    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
                },
                { 
                    value: CONFIG.VIEW_MODES.WEEK, 
                    label: 'Week',
                    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="4" x2="9" y2="22"></line><line x1="15" y1="4" x2="15" y2="22"></line></svg>`
                },
                { 
                    value: CONFIG.VIEW_MODES.DAY, 
                    label: 'Day',
                    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
                },
                { 
                    value: CONFIG.VIEW_MODES.TIMELINE, 
                    label: 'Timeline',
                    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><polyline points="8 5 3 12 8 19"></polyline><polyline points="16 5 21 12 16 19"></polyline></svg>`
                },
                { 
                    value: CONFIG.VIEW_MODES.LIST, 
                    label: 'List',
                    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`
                }
            ];
            
            return views.map(view => `
                <button class="gos-view-pill ${currentView === view.value ? 'active' : ''}" 
                        data-view="${view.value}" 
                        title="${view.label} view"
                        aria-label="${view.label} view">
                    ${view.icon}
                    <span>${view.label}</span>
                </button>
            `).join('');
        }

        /**
         * Get date display text based on current view
         */
        getDateDisplayText() {
            const state = this.state.getState();
            const date = state.currentDate;
            const viewMode = state.viewMode;
            
            switch(viewMode) {
                case CONFIG.VIEW_MODES.MONTH:
                    return date.toLocaleDateString('en-GB', { 
                        month: 'long', 
                        year: 'numeric' 
                    });
                    
                case CONFIG.VIEW_MODES.WEEK:
                    const weekStart = DiaryUtils.getStartOfWeek(date);
                    const weekEnd = DiaryUtils.getEndOfWeek(date);
                    return `Week of ${DiaryUtils.formatDate(weekStart, 'short')} - ${DiaryUtils.formatDate(weekEnd, 'short')}`;
                    
                case CONFIG.VIEW_MODES.DAY:
                    return DiaryUtils.formatDate(date, 'long');
                    
                default:
                    return DiaryUtils.formatDate(date, 'long');
            }
        }

        /**
         * Continue in next part...
         */
    }

    // ============================================================================
    // EXPORT TO GLOBAL SCOPE
    // ============================================================================

    window.GOS_DIARY_V2 = {
        CONFIG,
        DiaryStateManager,
        DiaryAPI,
        DiaryUtils,
        DiaryApp
    };

    console.log('✅ GlazierOS Diary v2.0.0 - Core modules loaded');

})(jQuery);
