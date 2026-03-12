/**
 * GlazierOS Diary System v2.0.0 - Initialization
 * 
 * Entry point for Diary v2
 * Initializes when the diary panel is activated
 * 
 * @package GlazierOS
 * @version 2.0.0
 */

jQuery(function($) {
    'use strict';

    // Wait for panel activation
    $(document).on('gsa:panel:activated', async (e, tab) => {
        if (tab !== 'diary') return;

        // Prevent re-initialization if already loaded
        if ($('#gsa-diary').data('diary-v2-init')) {
            console.log('ℹ️ Diary v2 already initialized');
            return;
        }

        console.log('🚀 Activating Diary v2.0.0...');

        try {
            // Wait a tiny bit for all scripts to fully execute
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Check if required modules are loaded
            if (!window.GOS_DIARY_V2) {
                throw new Error('Diary v2 namespace not found. Core module (diary-v2.js) not loaded.');
            }
            
            if (!window.GOS_DIARY_V2.DiaryApp) {
                throw new Error('DiaryApp class not found. Core module incomplete.');
            }
            
            if (!window.GOS_DIARY_V2.CONFIG) {
                throw new Error('CONFIG not found. Core module incomplete.');
            }

            console.log('📦 All Diary v2 modules detected:', Object.keys(window.GOS_DIARY_V2));

            // Mark as initialized
            $('#gsa-diary').data('diary-v2-init', true);

            // Create and initialize the app
            const app = new window.GOS_DIARY_V2.DiaryApp();
            await app.init();

            // Store app instance globally for debugging
            window.GOS_DIARY_APP = app;

            console.log('✅ Diary v2.0.0 activated successfully');
            console.log('💡 Tip: Access the app instance via window.GOS_DIARY_APP for debugging');

        } catch (error) {
            console.error('❌ Failed to activate Diary v2:', error);
            $('#gsa-diary').html(`
                <div style="padding: 2rem; text-align: center;">
                    <h2 style="color: #ef4444;">⚠️ Failed to Load Diary</h2>
                    <p style="color: #64748b; margin: 1rem 0;">
                        ${error.message}
                    </p>
                    <button onclick="location.reload()" style="
                        padding: 0.75rem 1.5rem;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        Reload Page
                    </button>
                </div>
            `);
        }
    });

    // Handle panel deactivation (cleanup)
    $(document).on('gsa:panel:deactivated', (e, tab) => {
        if (tab !== 'diary') return;

        console.log('👋 Deactivating Diary v2...');

        // Clean up modal if open
        $('#gos-event-modal').remove();
        $('body').removeClass('gos-modal-open');

        // Clean up notifications
        $('#gos-diary-notifications').remove();

        // Don't reset the init flag - let it stay initialized
        // Just clean up UI elements
    });

    console.log('✅ Diary v2.0.0 - Initialization module loaded');
});
