/**
 * GlazierOS Team Management System
 * HR Hub for managing staff, availability, documents, and pay
 * 
 * @package GlazierOS
 * @version 1.0.0
 */

console.log('👥 team.js loaded');

(function($) {
    'use strict';

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    
    const TeamApp = {
        staff: [],
        currentView: 'directory', // directory | profile
        selectedStaffId: null,
        filters: {
            search: '',
            role: 'all',
            branch: 'all',
            status: 'active'
        }
    };

    // ============================================================================
    // API METHODS
    // ============================================================================
    
    const API = {
        async fetchStaff() {
            const response = await fetch('/wp-json/glazieros/v1/team', {
                headers: { 'X-WP-Nonce': wpApiSettings.nonce }
            });
            return await response.json();
        },

        async fetchStaffMember(id) {
            const response = await fetch(`/wp-json/glazieros/v1/team/${id}`, {
                headers: { 'X-WP-Nonce': wpApiSettings.nonce }
            });
            return await response.json();
        },

        async saveStaffMember(data) {
            const url = data.id 
                ? `/wp-json/glazieros/v1/team/${data.id}`
                : '/wp-json/glazieros/v1/team';
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': wpApiSettings.nonce
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        },

        async deleteStaffMember(id) {
            const response = await fetch(`/wp-json/glazieros/v1/team/${id}`, {
                method: 'DELETE',
                headers: { 'X-WP-Nonce': wpApiSettings.nonce }
            });
            return await response.json();
        },

        async uploadDocument(staffId, file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('staff_id', staffId);

            const response = await fetch('/wp-json/glazieros/v1/team/documents', {
                method: 'POST',
                headers: { 'X-WP-Nonce': wpApiSettings.nonce },
                body: formData
            });
            return await response.json();
        },

        async saveAvailability(staffId, data) {
            const response = await fetch(`/wp-json/glazieros/v1/team/${staffId}/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': wpApiSettings.nonce
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        }
    };

    // ============================================================================
    // RENDERING METHODS
    // ============================================================================

    function renderHeader() {
        return `
            <div class="gst-header">
                <div class="gst-header-left">
                    <h1 class="gst-title">Team Management</h1>
                    <p class="gst-subtitle">Manage staff, availability & HR records</p>
                </div>
                <div class="gst-header-right">
                    ${TeamApp.currentView === 'directory' ? `
                        <button class="gst-btn-primary" id="gst-add-staff-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <span>Add Team Member</span>
                        </button>
                    ` : `
                        <button class="gst-btn-secondary" id="gst-back-to-directory">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            <span>Back to Directory</span>
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    function renderFilters() {
        const roles = ['all', 'fitter', 'surveyor', 'office', 'manager', 'apprentice'];
        // Dynamically build branches from actual staff data
        const branchSet = new Set();
        TeamApp.staff.forEach(function(m) { if (m.branch) branchSet.add(m.branch); });
        const branches = ['all'].concat(Array.from(branchSet));
        
        return `
            <div class="gst-filters">
                <div class="gst-search-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="text" 
                        id="gst-search-input" 
                        placeholder="Search team members..."
                        value="${TeamApp.filters.search}"
                    />
                </div>
                
                <select id="gst-role-filter" class="gst-filter-select">
                    ${roles.map(role => `
                        <option value="${role}" ${TeamApp.filters.role === role ? 'selected' : ''}>
                            ${role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                    `).join('')}
                </select>
                
                <select id="gst-branch-filter" class="gst-filter-select">
                    ${branches.map(branch => `
                        <option value="${branch}" ${TeamApp.filters.branch === branch ? 'selected' : ''}>
                            ${branch === 'all' ? 'All Branches' : branch}
                        </option>
                    `).join('')}
                </select>
                
                <select id="gst-status-filter" class="gst-filter-select">
                    <option value="active" ${TeamApp.filters.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="on-leave" ${TeamApp.filters.status === 'on-leave' ? 'selected' : ''}>On Leave</option>
                    <option value="all" ${TeamApp.filters.status === 'all' ? 'selected' : ''}>All Status</option>
                </select>
            </div>
        `;
    }

    function renderStaffDirectory() {
        const filteredStaff = TeamApp.staff.filter(member => {
            const matchesSearch = !TeamApp.filters.search || 
                member.name.toLowerCase().includes(TeamApp.filters.search.toLowerCase()) ||
                (member.email && member.email.toLowerCase().includes(TeamApp.filters.search.toLowerCase()));
            
            const matchesRole = TeamApp.filters.role === 'all' || member.role === TeamApp.filters.role;
            const matchesBranch = TeamApp.filters.branch === 'all' || member.branch === TeamApp.filters.branch;
            const matchesStatus = TeamApp.filters.status === 'all' || member.status === TeamApp.filters.status;
            
            return matchesSearch && matchesRole && matchesBranch && matchesStatus;
        });

        if (filteredStaff.length === 0) {
            return `
                <div class="gst-empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3>No Team Members Found</h3>
                    <p>Try adjusting your filters or add a new team member</p>
                </div>
            `;
        }

        return `
            <div class="gst-staff-grid">
                ${filteredStaff.map(member => renderStaffCard(member)).join('')}
            </div>
        `;
    }

    function renderStaffCard(member) {
        const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const roleColors = {
            fitter: '#667eea',
            surveyor: '#10b981',
            office: '#f59e0b',
            manager: '#ef4444',
            apprentice: '#8b5cf6'
        };
        const roleColor = roleColors[member.role] || '#6b7280';
        const ptoRemaining = member.pto_remaining || 0;
        const ptoEarned = member.pto_earned || 25;
        const ptoUsedPct = ptoEarned > 0 ? Math.round(((ptoEarned - ptoRemaining) / ptoEarned) * 100) : 0;

        return `
            <div class="gst-staff-card" data-staff-id="${member.id}">
                <div class="gst-card-header">
                    <div class="gst-avatar" style="background: linear-gradient(135deg, ${roleColor}, ${roleColor}dd);">
                        ${member.photo ? `<img src="${member.photo}" alt="${member.name}">` : initials}
                    </div>
                    <div class="gst-status-badge gst-status-${member.status}">${(member.status || 'active').replace('-', ' ')}</div>
                </div>
                <div class="gst-card-body">
                    <h3 class="gst-staff-name">${member.name}</h3>
                    <p class="gst-staff-role" style="color: ${roleColor};">
                        <span class="gst-role-dot" style="background: ${roleColor};"></span>
                        ${member.job_title || member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </p>
                    <div class="gst-staff-meta">
                        <span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            ${member.branch || 'Main'}
                        </span>
                        <span title="PTO: ${ptoRemaining} of ${ptoEarned} days remaining">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            ${ptoRemaining}d leave left
                        </span>
                    </div>
                    <div class="gst-pto-bar" title="PTO used: ${ptoUsedPct}%">
                        <div class="gst-pto-bar-fill" style="width: ${ptoUsedPct}%; background: ${ptoUsedPct > 80 ? '#ef4444' : ptoUsedPct > 50 ? '#f59e0b' : '#10b981'};"></div>
                    </div>
                </div>
                <div class="gst-card-footer">
                    <button class="gst-btn-card">View Profile</button>
                </div>
            </div>
        `;
    }

    function renderProfileView(member) {
        if (!member) return '<p>Loading...</p>';

        return `
            <div class="gst-profile-container">
                <div class="gst-profile-sidebar">
                    ${renderProfileHeader(member)}
                    ${renderQuickStats(member)}
                </div>
                <div class="gst-profile-main">
                    <div class="gst-tabs-container">
                        <div class="gst-tabs">
                            <button class="gst-tab active" data-tab="overview">Overview</button>
                            <button class="gst-tab" data-tab="availability">Availability</button>
                            <button class="gst-tab" data-tab="documents">Documents</button>
                            <button class="gst-tab" data-tab="notes">Notes & Logs</button>
                            <button class="gst-tab" data-tab="pay">Pay & Hours</button>
                        </div>
                    </div>
                    <div class="gst-tab-content">
                        <div class="gst-tab-panel active" id="gst-tab-overview">
                            ${renderOverviewTab(member)}
                        </div>
                        <div class="gst-tab-panel" id="gst-tab-availability">
                            ${renderAvailabilityTab(member)}
                        </div>
                        <div class="gst-tab-panel" id="gst-tab-documents">
                            ${renderDocumentsTab(member)}
                        </div>
                        <div class="gst-tab-panel" id="gst-tab-notes">
                            ${renderNotesTab(member)}
                        </div>
                        <div class="gst-tab-panel" id="gst-tab-pay">
                            ${renderPayTab(member)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderProfileHeader(member) {
        const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const roleColors = {
            fitter: '#667eea',
            surveyor: '#10b981',
            office: '#f59e0b',
            manager: '#ef4444'
        };
        const roleColor = roleColors[member.role] || '#6b7280';

        return `
            <div class="gst-profile-header">
                <div class="gst-profile-avatar" style="background: linear-gradient(135deg, ${roleColor}, ${roleColor}dd);">
                    ${member.photo ? `<img src="${member.photo}" alt="${member.name}">` : initials}
                </div>
                <h2 class="gst-profile-name">${member.name}</h2>
                <p class="gst-profile-role" style="color: ${roleColor};">
                    ${member.job_title || member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </p>
                <div class="gst-profile-status gst-status-${member.status}">
                    ${member.status.replace('-', ' ')}
                </div>
                <div class="gst-profile-actions">
                    <button class="gst-btn-secondary" id="gst-edit-staff-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="gst-btn-danger" id="gst-delete-staff-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    function renderQuickStats(member) {
        return `
            <div class="gst-quick-stats">
                <div class="gst-stat-item">
                    <div class="gst-stat-icon" style="background: rgba(102, 126, 234, 0.1); color: #667eea;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                    </div>
                    <div class="gst-stat-content">
                        <div class="gst-stat-value">${member.pto_remaining || 0} days</div>
                        <div class="gst-stat-label">Holiday Remaining</div>
                    </div>
                </div>
                <div class="gst-stat-item">
                    <div class="gst-stat-icon" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                    </div>
                    <div class="gst-stat-content">
                        <div class="gst-stat-value">${member.sick_days_used || 0} days</div>
                        <div class="gst-stat-label">Sick Days Used</div>
                    </div>
                </div>
                <div class="gst-stat-item">
                    <div class="gst-stat-icon" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div class="gst-stat-content">
                        <div class="gst-stat-value">${member.hours_this_week || 0}h</div>
                        <div class="gst-stat-label">This Week</div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderOverviewTab(member) {
        return `
            <div class="gst-overview-grid">
                <div class="gst-info-card">
                    <h3>Contact Information</h3>
                    <div class="gst-info-row">
                        <span class="gst-info-label">Email</span>
                        <span class="gst-info-value">${member.email || 'Not provided'}</span>
                    </div>
                    <div class="gst-info-row">
                        <span class="gst-info-label">Mobile</span>
                        <span class="gst-info-value">${member.mobile || 'Not provided'}</span>
                    </div>
                    <div class="gst-info-row">
                        <span class="gst-info-label">Emergency Contact</span>
                        <span class="gst-info-value">${member.emergency_contact || 'Not provided'}</span>
                    </div>
                </div>
                
                <div class="gst-info-card">
                    <h3>Employment Details</h3>
                    <div class="gst-info-row">
                        <span class="gst-info-label">Start Date</span>
                        <span class="gst-info-value">${member.start_date || 'Not set'}</span>
                    </div>
                    <div class="gst-info-row">
                        <span class="gst-info-label">Contract Type</span>
                        <span class="gst-info-value">${member.contract_type || 'Full-time'}</span>
                    </div>
                    <div class="gst-info-row">
                        <span class="gst-info-label">Branch</span>
                        <span class="gst-info-value">${member.branch || 'Main'} Branch</span>
                    </div>
                </div>
                
                <div class="gst-info-card gst-card-full">
                    <h3>Upcoming Events</h3>
                    <div class="gst-events-list">
                        ${member.upcoming_events_list && member.upcoming_events_list.length > 0 
                            ? member.upcoming_events_list.map(event => `
                                <div class="gst-event-item">
                                    <div class="gst-event-date">${event.date}</div>
                                    <div class="gst-event-details">
                                        <div class="gst-event-title">${event.title}</div>
                                        <div class="gst-event-time">${event.time}</div>
                                    </div>
                                </div>
                            `).join('')
                            : '<p class="gst-empty-text">No upcoming events</p>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    function renderAvailabilityTab(member) {
        return `
            <div class="gst-availability-container">
                <div class="gst-availability-header">
                    <h3>Availability Calendar</h3>
                    <button class="gst-btn-primary" id="gst-mark-unavailable-btn">Mark Unavailable</button>
                </div>
                <div class="gst-availability-calendar">
                    <p class="gst-placeholder">Calendar view will be implemented here</p>
                    <p class="gst-placeholder-note">Shows: Holidays, Sick Days, Training, Unavailable days</p>
                </div>
                <div class="gst-availability-summary">
                    <h4>Leave Summary</h4>
                    <div class="gst-leave-stats">
                        <div class="gst-leave-stat">
                            <span class="gst-leave-label">Annual Leave Earned</span>
                            <span class="gst-leave-value">${member.pto_earned || 25} days</span>
                        </div>
                        <div class="gst-leave-stat">
                            <span class="gst-leave-label">Annual Leave Taken</span>
                            <span class="gst-leave-value">${member.pto_taken || 0} days</span>
                        </div>
                        <div class="gst-leave-stat">
                            <span class="gst-leave-label">Annual Leave Remaining</span>
                            <span class="gst-leave-value gst-highlight">${member.pto_remaining || 25} days</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderDocumentsTab(member) {
        const documents = member.documents || [];
        
        return `
            <div class="gst-documents-container">
                <div class="gst-documents-header">
                    <h3>Documents & Files</h3>
                    <button class="gst-btn-primary" id="gst-upload-document-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Upload Document
                    </button>
                </div>
                <div class="gst-documents-list">
                    ${documents.length > 0 
                        ? documents.map(doc => `
                            <div class="gst-document-item">
                                <div class="gst-document-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                </div>
                                <div class="gst-document-info">
                                    <h4>${doc.name}</h4>
                                    <p>Uploaded on ${doc.upload_date}</p>
                                </div>
                                <div class="gst-document-actions">
                                    <button class="gst-btn-icon" title="Download">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                    </button>
                                    <button class="gst-btn-icon gst-btn-danger" title="Delete">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')
                        : '<p class="gst-empty-text">No documents uploaded yet</p>'
                    }
                </div>
            </div>
        `;
    }

    function renderNotesTab(member) {
        const notes = member.notes || [];
        
        return `
            <div class="gst-notes-container">
                <div class="gst-notes-header">
                    <h3>Notes & Logs</h3>
                    <button class="gst-btn-primary" id="gst-add-note-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Note
                    </button>
                </div>
                <div class="gst-notes-list">
                    ${notes.length > 0
                        ? notes.map(note => `
                            <div class="gst-note-item">
                                <div class="gst-note-header">
                                    <div class="gst-note-author">${note.author}</div>
                                    <div class="gst-note-date">${note.date}</div>
                                </div>
                                <div class="gst-note-body">${note.text}</div>
                                ${note.category ? `<div class="gst-note-tag">${note.category}</div>` : ''}
                            </div>
                        `).join('')
                        : '<p class="gst-empty-text">No notes yet</p>'
                    }
                </div>
            </div>
        `;
    }

    function renderPayTab(member) {
        return `
            <div class="gst-pay-container">
                <div class="gst-pay-header">
                    <h3>Pay & Hours Overview</h3>
                    <button class="gst-btn-secondary" id="gst-edit-pay-btn">Edit Pay Details</button>
                </div>
                
                <div class="gst-pay-grid">
                    <div class="gst-pay-card">
                        <h4>Current Pay Rate</h4>
                        <div class="gst-pay-value">£${member.hourly_rate || '0.00'}/hour</div>
                        <p class="gst-pay-note">Or £${member.salary || '0'}/year salary</p>
                    </div>
                    
                    <div class="gst-pay-card">
                        <h4>This Week</h4>
                        <div class="gst-pay-value">${member.hours_this_week || 0} hours</div>
                        <p class="gst-pay-note">Estimated: £${(member.hours_this_week || 0) * (member.hourly_rate || 0)}</p>
                    </div>
                    
                    <div class="gst-pay-card">
                        <h4>This Month</h4>
                        <div class="gst-pay-value">${member.hours_this_month || 0} hours</div>
                        <p class="gst-pay-note">Estimated: £${(member.hours_this_month || 0) * (member.hourly_rate || 0)}</p>
                    </div>
                </div>
                
                <div class="gst-hours-log">
                    <h4>Recent Hours Log</h4>
                    <p class="gst-placeholder">Hours will be pulled from Diary events</p>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    function attachEventHandlers($panel) {
        // Prevent duplicate event handlers
        if ($panel.data('handlers-attached')) return;
        $panel.data('handlers-attached', true);

        // Search filter
        $panel.on('input', '#gst-search-input', function() {
            TeamApp.filters.search = $(this).val();
            renderDirectory($panel);
        });

        // Role filter
        $panel.on('change', '#gst-role-filter', function() {
            TeamApp.filters.role = $(this).val();
            renderDirectory($panel);
        });

        // Branch filter
        $panel.on('change', '#gst-branch-filter', function() {
            TeamApp.filters.branch = $(this).val();
            renderDirectory($panel);
        });

        // Status filter
        $panel.on('change', '#gst-status-filter', function() {
            TeamApp.filters.status = $(this).val();
            renderDirectory($panel);
        });

        // Add staff button
        $panel.on('click', '#gst-add-staff-btn', function() {
            showStaffModal();
        });

        // View staff profile
        $panel.on('click', '.gst-staff-card', function() {
            const staffId = $(this).data('staff-id');
            viewProfile(staffId, $panel);
        });

        // Back to directory
        $panel.on('click', '#gst-back-to-directory', function() {
            TeamApp.currentView = 'directory';
            TeamApp.selectedStaffId = null;
            renderDirectory($panel);
        });

        // Profile tabs
        $panel.on('click', '.gst-tab', function() {
            const tabName = $(this).data('tab');
            $panel.find('.gst-tab').removeClass('active');
            $panel.find('.gst-tab-panel').removeClass('active');
            $(this).addClass('active');
            $panel.find(`#gst-tab-${tabName}`).addClass('active');
        });

        // Edit staff
        $panel.on('click', '#gst-edit-staff-btn', function() {
            const member = TeamApp.staff.find(s => s.id === TeamApp.selectedStaffId);
            showStaffModal(member);
        });

        // Delete staff
        $panel.on('click', '#gst-delete-staff-btn', async function() {
            if (!confirm('Are you sure you want to delete this team member?')) return;
            
            try {
                await API.deleteStaffMember(TeamApp.selectedStaffId);
                TeamApp.currentView = 'directory';
                TeamApp.selectedStaffId = null;
                await loadStaff($panel);
            } catch (error) {
                console.error('Error deleting staff:', error);
                alert('Failed to delete team member');
            }
        });
    }

    function showStaffModal(member = null) {
        const isEdit = !!member;
        const modalHtml = `
            <div class="gst-modal-overlay" id="gst-staff-modal">
                <div class="gst-modal">
                    <div class="gst-modal-header">
                        <h2>${isEdit ? 'Edit' : 'Add'} Team Member</h2>
                        <button class="gst-modal-close">&times;</button>
                    </div>
                    <div class="gst-modal-body">
                        <form id="gst-staff-form">
                            <input type="hidden" name="id" value="${member?.id || ''}">
                            
                            <div class="gst-form-row">
                                <div class="gst-form-group">
                                    <label>Full Name *</label>
                                    <input type="text" name="name" value="${member?.name || ''}" required class="gst-input">
                                </div>
                                <div class="gst-form-group">
                                    <label>Email</label>
                                    <input type="email" name="email" value="${member?.email || ''}" class="gst-input">
                                </div>
                            </div>
                            
                            <div class="gst-form-row">
                                <div class="gst-form-group">
                                    <label>Mobile</label>
                                    <input type="tel" name="mobile" value="${member?.mobile || ''}" class="gst-input">
                                </div>
                                <div class="gst-form-group">
                                    <label>Job Title</label>
                                    <input type="text" name="job_title" value="${member?.job_title || ''}" class="gst-input">
                                </div>
                            </div>
                            
                            <div class="gst-form-row">
                                <div class="gst-form-group">
                                    <label>Role *</label>
                                    <select name="role" required class="gst-input">
                                        <option value="fitter" ${member?.role === 'fitter' ? 'selected' : ''}>Fitter</option>
                                        <option value="surveyor" ${member?.role === 'surveyor' ? 'selected' : ''}>Surveyor</option>
                                        <option value="office" ${member?.role === 'office' ? 'selected' : ''}>Office Staff</option>
                                        <option value="manager" ${member?.role === 'manager' ? 'selected' : ''}>Manager</option>
                                    </select>
                                </div>
                                <div class="gst-form-group">
                                    <label>Branch</label>
                                    <select name="branch" class="gst-input">
                                        <option value="main" ${member?.branch === 'main' ? 'selected' : ''}>Main</option>
                                        <option value="north" ${member?.branch === 'north' ? 'selected' : ''}>North</option>
                                        <option value="south" ${member?.branch === 'south' ? 'selected' : ''}>South</option>
                                        <option value="east" ${member?.branch === 'east' ? 'selected' : ''}>East</option>
                                        <option value="west" ${member?.branch === 'west' ? 'selected' : ''}>West</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="gst-form-row">
                                <div class="gst-form-group">
                                    <label>Start Date</label>
                                    <input type="date" name="start_date" value="${member?.start_date || ''}" class="gst-input">
                                </div>
                                <div class="gst-form-group">
                                    <label>Contract Type</label>
                                    <select name="contract_type" class="gst-input">
                                        <option value="full-time" ${member?.contract_type === 'full-time' ? 'selected' : ''}>Full-time</option>
                                        <option value="part-time" ${member?.contract_type === 'part-time' ? 'selected' : ''}>Part-time</option>
                                        <option value="contractor" ${member?.contract_type === 'contractor' ? 'selected' : ''}>Contractor</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="gst-form-row">
                                <div class="gst-form-group">
                                    <label>Hourly Rate (£)</label>
                                    <input type="number" step="0.01" name="hourly_rate" value="${member?.hourly_rate || ''}" class="gst-input">
                                </div>
                                <div class="gst-form-group">
                                    <label>Annual Salary (£)</label>
                                    <input type="number" name="salary" value="${member?.salary || ''}" class="gst-input">
                                </div>
                            </div>
                            
                            <div class="gst-form-group">
                                <label>Status</label>
                                <select name="status" class="gst-input">
                                    <option value="active" ${member?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="on-leave" ${member?.status === 'on-leave' ? 'selected' : ''}>On Leave</option>
                                    <option value="left" ${member?.status === 'left' ? 'selected' : ''}>Left</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="gst-modal-footer">
                        <button type="button" class="gst-btn-secondary gst-modal-close">Cancel</button>
                        <button type="submit" form="gst-staff-form" class="gst-btn-primary">
                            ${isEdit ? 'Save Changes' : 'Add Team Member'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHtml);

        // Handle form submission
        $('#gst-staff-form').on('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            try {
                await API.saveStaffMember(data);
                $('#gst-staff-modal').remove();
                await loadStaff($('#gsa-team'));
            } catch (error) {
                console.error('Error saving staff:', error);
                alert('Failed to save team member');
            }
        });

        // Handle modal close
        $('.gst-modal-close').on('click', function() {
            $('#gst-staff-modal').remove();
        });

        // Close on overlay click
        $('.gst-modal-overlay').on('click', function(e) {
            if ($(e.target).hasClass('gst-modal-overlay')) {
                $('#gst-staff-modal').remove();
            }
        });
    }

    async function viewProfile(staffId, $panel) {
        TeamApp.currentView = 'profile';
        TeamApp.selectedStaffId = staffId;
        
        const member = await API.fetchStaffMember(staffId);
        $panel.html(renderHeader() + renderProfileView(member));
        attachEventHandlers($panel);
    }

    function renderDirectory($panel) {
        $panel.html(
            renderHeader() +
            renderFilters() +
            renderStaffDirectory()
        );
        attachEventHandlers($panel);
    }

    async function loadStaff($panel) {
        TeamApp.staff = await API.fetchStaff();
        renderDirectory($panel);
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    jQuery(document).on('gsa:panel:activated', async (e, tab) => {
        if (tab !== 'team') return;

        const $panel = jQuery('#gsa-team');
        if ($panel.data('init')) return;
        $panel.data('init', true);

        try {
            await loadStaff($panel);
        } catch (error) {
            console.error('Error loading team:', error);
            $panel.html('<p>Error loading team members. Please try again.</p>');
        }
    });

    // Expose methods globally for inline onclick handlers
    window.TeamApp = {
        viewProfile: (staffId) => viewProfile(staffId, $('#gsa-team'))
    };

})(jQuery);
