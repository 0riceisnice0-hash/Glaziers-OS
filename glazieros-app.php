<?php
/**
 * Plugin Name:      GlazierOS App
 * Description:      Complete glazing business management system with quoting, scheduling & invoicing
 * Version:          0.6.0
 * Author:           Zac Bartley
 * Text Domain:      glazieros-app
 * Requires PHP:     7.4
 * Requires at least: 5.8
 * License:          GPL v2 or later
 * License URI:      https://www.gnu.org/licenses/gpl-2.0.html
 */

// Security: Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define plugin constants
define('GLAZIEROS_VERSION', '0.6.0');
define('GLAZIEROS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GLAZIEROS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GLAZIEROS_ASSETS_URL', GLAZIEROS_PLUGIN_URL . 'assets/');

/**
 * PSR-4 Autoloader for GlazierOS namespace
 * Automatically loads classes from the includes/ directory
 */
spl_autoload_register( function( $class ) {
    $prefix = 'GlazierOS\\';
    
    // Check if the class uses our namespace
    if ( 0 !== strpos( $class, $prefix ) ) {
        return;
    }
    
    // Get the relative class name and convert to file path
    $relative = substr( $class, strlen( $prefix ) );
    $path = GLAZIEROS_PLUGIN_DIR . 'includes/' . str_replace( '\\', '/', $relative ) . '.php';
    
    // Load the file if it exists
    if ( file_exists( $path ) ) {
        require_once $path;
    }
} );


/**
 * Bootstrap the plugin
 * Initialize core functionality after all plugins are loaded
 */
add_action( 'plugins_loaded', function() {
    // Initialize the main App singleton
    \GlazierOS\App::get_instance();
    
    // Initialize admin-specific classes
    if ( is_admin() ) {
        new \GlazierOS\Admin\QuoteDetail();
        
        // Include data seeder (provides admin actions for creating test data)
        require_once GLAZIEROS_PLUGIN_DIR . 'includes/DataSeeder.php';
    }
} );

/**
 * Plugin activation hook
 * Flushes rewrite rules to ensure REST API endpoints are registered
 */
register_activation_hook( __FILE__, function() {
    // Initialize the App to register CPTs
    \GlazierOS\App::get_instance();
    
    // Flush rewrite rules to register REST routes
    flush_rewrite_rules();
    
    // Set activation flag for admin notice
    set_transient( 'gos_activation_notice', true, 30 );
} );

/**
 * Plugin deactivation hook
 * Cleans up rewrite rules
 */
register_deactivation_hook( __FILE__, function() {
    flush_rewrite_rules();
} );

/**
 * Display admin notice on first activation
 */
add_action( 'admin_notices', function() {
    if ( get_transient( 'gos_activation_notice' ) ) {
        delete_transient( 'gos_activation_notice' );
        ?>
        <div class="notice notice-success is-dismissible">
            <p><strong>GlazierOS activated successfully!</strong></p>
            <p>Quick start:</p>
            <ul style="list-style: disc; margin-left: 20px;">
                <li>Visit <a href="<?php echo admin_url( 'admin.php?page=glazieros-dashboard' ); ?>">GlazierOS Dashboard</a></li>
                <li>Add team members in the <strong>Team</strong> tab</li>
                <li>Configure settings in the <strong>Settings</strong> tab</li>
                <li>Create your first quote in the <strong>New</strong> tab</li>
            </ul>
            <p><em>Note: If REST API endpoints aren't working, go to <a href="<?php echo admin_url( 'options-permalink.php' ); ?>">Settings → Permalinks</a> and click Save.</em></p>
        </div>
        <?php
    }
} );

/**
 * Utility function: Log user activity for audit trail
 * 
 * @param string $action      The action performed (e.g., "Job Created")
 * @param int    $object_id   The ID of the affected object
 * @param string $object_type The type of object (e.g., "gos_job")
 */
function gos_log_activity( $action, $object_id, $object_type ) {
    wp_insert_post( [
        'post_type'   => 'gos_audit_log',
        'post_title'  => sanitize_text_field( $action ),
        'post_status' => 'publish',
        'meta_input'  => [
            '_user_id'     => get_current_user_id(),
            '_object_id'   => absint( $object_id ),
            '_object_type' => sanitize_text_field( $object_type ),
            '_ip_address'  => sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? 'Unknown' ),
            '_timestamp'   => current_time( 'mysql' ),
        ],
    ] );
}

/**
 * Admin Menu: Add GlazierOS to WordPress admin sidebar
 */
add_action( 'admin_menu', function() {
    add_menu_page(
        __( 'GlazierOS', 'glazieros-app' ),           // Page title
        __( 'GlazierOS', 'glazieros-app' ),           // Menu title
        'manage_options',                              // Capability required
        'glazieros-app',                               // Menu slug
        'glazieros_render_admin_page',                 // Callback function
        'dashicons-admin-generic',                     // Icon
        2                                              // Position
    );
} );

/**
 * Render the main admin page
 * This div is the React mount point for the dashboard
 */
function glazieros_render_admin_page() {
    echo '<div id="gos-dashboard-app"></div>';
}

/**
 * Enqueue admin scripts and styles
 * Only loads assets on the GlazierOS admin page
 */
add_action( 'admin_enqueue_scripts', function( $hook ) {
    // Only load on our admin page
    if ( 'toplevel_page_glazieros-app' !== $hook ) {
        return;
    }
    
    glazieros_enqueue_dashboard_assets();
} );

/**
 * Enqueue frontend scripts and styles
 */
add_action( 'wp_enqueue_scripts', function() {
    glazieros_enqueue_frontend_assets();
} );

/**
 * Register shortcodes
 */
add_shortcode( 'glazieros_pricing_tool', 'glazieros_pricing_tool_shortcode' );
add_shortcode( 'gos_dashboard', 'glazieros_dashboard_shortcode' );

/**
 * Pricing tool shortcode callback
 */
function glazieros_pricing_tool_shortcode() {
    // Enqueue pricing wizard frontend script
    wp_enqueue_script(
        'gos-pricing-wizard-frontend',
        GLAZIEROS_ASSETS_URL . 'js/pricing-wizard-frontend.js',
        [ 'jquery' ],
        GLAZIEROS_VERSION,
        true
    );
    
    // Localize script with API settings
    wp_localize_script( 'gos-pricing-wizard-frontend', 'wpApiSettings', [
        'root'  => esc_url_raw( rest_url() ),
        'nonce' => wp_create_nonce( 'wp_rest' ),
    ] );
    
    return '<div id="glazieros-pricing-tool"></div>';
}

/**
 * Dashboard shortcode callback
 */
function glazieros_dashboard_shortcode() {
    glazieros_enqueue_dashboard_assets();
    return '<div id="gos-dashboard-app"></div>';
}

/**
 * Enqueue all dashboard assets (scripts & styles)
 * Centralized function to avoid duplication
 */
function glazieros_enqueue_dashboard_assets() {
    // jQuery UI for drag & drop functionality
    wp_enqueue_script( 'jquery-ui-draggable' );
    wp_enqueue_script( 'jquery-ui-droppable' );
    wp_enqueue_script( 'jquery-ui-resizable' );
    wp_enqueue_style( 'jquery-ui-css', '//code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css', [], '1.13.2' );
    
    // jQuery Throttle/Debounce for search input optimization
    wp_enqueue_script(
        'jquery-throttle-debounce',
        'https://cdnjs.cloudflare.com/ajax/libs/jquery-throttle-debounce/1.1/jquery.ba-throttle-debounce.min.js',
        [ 'jquery' ],
        '1.1',
        true
    );
    
    // Main dashboard CSS
    wp_enqueue_style( 
        'gos-main-css',
        GLAZIEROS_ASSETS_URL . 'css/main.css',
        [],
        GLAZIEROS_VERSION
    );
    
    // Team Management CSS
    wp_enqueue_style( 
        'gos-team-css',
        GLAZIEROS_ASSETS_URL . 'css/team.css',
        [],
        GLAZIEROS_VERSION
    );
    
    // Finance Module CSS
    wp_enqueue_style( 
        'gos-finance-css',
        GLAZIEROS_ASSETS_URL . 'css/finance.css',
        [],
        GLAZIEROS_VERSION
    );
    
    // Main dashboard app
    wp_enqueue_script(
        'gos-dashboard-app-js',
        GLAZIEROS_ASSETS_URL . 'js/dashboard/dashboard-app.js',
        [ 'jquery' ],
        GLAZIEROS_VERSION,
        true
    );
    
    // Localize REST API settings for all dashboard scripts
    wp_localize_script( 'gos-dashboard-app-js', 'wpApiSettings', [
        'root'  => esc_url_raw( rest_url() ),
        'nonce' => wp_create_nonce( 'wp_rest' ),
    ] );
    
    // Enqueue individual panel scripts with proper dependencies
    $panels = [
        'quotes-v2'    => [ 'gos-dashboard-app-js', 'jquery-throttle-debounce' ], // Production-grade v2.0 with 3D wizard
        // 'new-quote' tab removed - quote creation now happens via modal in quotes panel
        'team'         => [ 'gos-dashboard-app-js' ], // HR Management Hub (replaces simple fitters CRUD)
        'settings'     => [ 'gos-dashboard-app-js' ],
        'finance'      => [ 'gos-dashboard-app-js' ], // Complete Finance Module (invoices, expenses, payments)
        'finance-init' => [ 'gos-dashboard-app-js', 'gos-panel-finance' ], // Finance UI Initialization
        'reports'      => [ 'gos-dashboard-app-js' ],
        'audit-logs'   => [ 'gos-dashboard-app-js' ],
        'branches'     => [ 'gos-dashboard-app-js' ],
        'quote-detail' => [ 'gos-dashboard-app-js', 'gos-builder-test-window', 'gos-builder-test-door' ],
    ];
    
    foreach ( $panels as $panel => $deps ) {
        $file_path = GLAZIEROS_PLUGIN_DIR . "assets/js/dashboard/{$panel}.js";
        if ( file_exists( $file_path ) ) {
            wp_enqueue_script(
                "gos-panel-{$panel}",
                GLAZIEROS_ASSETS_URL . "js/dashboard/{$panel}.js",
                $deps,
                filemtime( $file_path ),
                true
            );
        }
    }
    
    // Diary panel has multiple CSS and JS files (load v2!)
    glazieros_enqueue_diary_v2_assets();
}

/**
 * Enqueue Diary v2.0.0 assets
 * Modern calendar platform UI (Notion Calendar / Apple Calendar style)
 */
function glazieros_enqueue_diary_v2_assets() {
    // Diary v2 Modern CSS - Complete calendar platform styling
    $diary_modern_css = GLAZIEROS_PLUGIN_DIR . 'assets/css/diary/diary-modern.css';
    if ( file_exists( $diary_modern_css ) ) {
        wp_enqueue_style(
            'gos-diary-v2-modern-css',
            GLAZIEROS_ASSETS_URL . 'css/diary/diary-modern.css',
            [],
            filemtime( $diary_modern_css )
        );
    }
    
    // Diary v2 JS modules (order matters - dependencies!)
    $diary_v2_js_path = GLAZIEROS_PLUGIN_DIR . 'assets/js/dashboard/';
    $diary_v2_js_url = GLAZIEROS_ASSETS_URL . 'js/dashboard/';
    
    // 1. Core foundation (CONFIG, StateManager, API, Utils, DiaryApp base class)
    $core_file = $diary_v2_js_path . 'diary-v2.js';
    if ( file_exists( $core_file ) ) {
        wp_enqueue_script(
            'gos-diary-v2-core',
            $diary_v2_js_url . 'diary-v2.js',
            [ 'jquery' ],
            filemtime( $core_file ),
            true
        );
    } else {
        error_log( 'GlazierOS Diary v2: Core file not found at: ' . $core_file );
    }
    
    // 2. Rendering methods (filters, statistics, sidebar)
    if ( file_exists( $diary_v2_js_path . 'diary-v2-rendering.js' ) ) {
        wp_enqueue_script(
            'gos-diary-v2-rendering',
            $diary_v2_js_url . 'diary-v2-rendering.js',
            [ 'gos-diary-v2-core' ],
            filemtime( $diary_v2_js_path . 'diary-v2-rendering.js' ),
            true
        );
    }
    
    // 3. View modes (Month, Week, Day, Timeline, List)
    if ( file_exists( $diary_v2_js_path . 'diary-v2-views.js' ) ) {
        wp_enqueue_script(
            'gos-diary-v2-views',
            $diary_v2_js_url . 'diary-v2-views.js',
            [ 'gos-diary-v2-core', 'gos-diary-v2-rendering' ],
            filemtime( $diary_v2_js_path . 'diary-v2-views.js' ),
            true
        );
    }
    
    // 4. Event listeners and interactions
    if ( file_exists( $diary_v2_js_path . 'diary-v2-events.js' ) ) {
        wp_enqueue_script(
            'gos-diary-v2-events',
            $diary_v2_js_url . 'diary-v2-events.js',
            [ 'gos-diary-v2-core', 'gos-diary-v2-rendering', 'gos-diary-v2-views' ],
            filemtime( $diary_v2_js_path . 'diary-v2-events.js' ),
            true
        );
    }
    
    // 5. Modal system and CRUD operations
    if ( file_exists( $diary_v2_js_path . 'diary-v2-modal.js' ) ) {
        wp_enqueue_script(
            'gos-diary-v2-modal',
            $diary_v2_js_url . 'diary-v2-modal.js',
            [ 'gos-diary-v2-core', 'gos-diary-v2-rendering', 'gos-diary-v2-views', 'gos-diary-v2-events' ],
            filemtime( $diary_v2_js_path . 'diary-v2-modal.js' ),
            true
        );
    }
    
    // 6. Initialization (must load last!)
    if ( file_exists( $diary_v2_js_path . 'diary-v2-init.js' ) ) {
        wp_enqueue_script(
            'gos-diary-v2-init',
            $diary_v2_js_url . 'diary-v2-init.js',
            [ 'gos-dashboard-app-js', 'gos-diary-v2-core', 'gos-diary-v2-rendering', 'gos-diary-v2-views', 'gos-diary-v2-events', 'gos-diary-v2-modal' ],
            filemtime( $diary_v2_js_path . 'diary-v2-init.js' ),
            true
        );
    }
}

/**
 * Enqueue frontend assets (for shortcodes and public pages)
 */
function glazieros_enqueue_frontend_assets() {
    // Main CSS
    wp_enqueue_style(
        'gos-main-css',
        GLAZIEROS_ASSETS_URL . 'css/main.css',
        [],
        GLAZIEROS_VERSION
    );
    
    // Three.js for 3D model viewer
    wp_enqueue_script(
        'three-core',
        'https://unpkg.com/three@0.152.0/build/three.min.js',
        [],
        '0.152.0',
        true
    );
    
    // 3D model builders
    wp_register_script(
        'gos-builder-test-window',
        GLAZIEROS_ASSETS_URL . 'js/builders/TestWindow.js',
        [ 'three-core' ],
        GLAZIEROS_VERSION,
        true
    );
    
    wp_register_script(
        'gos-builder-test-door',
        GLAZIEROS_ASSETS_URL . 'js/builders/TestDoor.js',
        [ 'three-core' ],
        GLAZIEROS_VERSION,
        true
    );
    
    // React pricing tool (registered, enqueued via shortcode)
    wp_register_script(
        'gos-pricing-tool-react',
        GLAZIEROS_ASSETS_URL . 'js/pricing-tool/index.js',
        [ 'wp-element', 'gos-builder-test-window', 'gos-builder-test-door' ],
        GLAZIEROS_VERSION,
        true
    );
    
    // Provide REST API URLs to JavaScript
    wp_localize_script( 'gos-pricing-tool-react', 'GlazierOS', [
        'quoteUrl'    => rest_url( 'glazieros/v1/quote' ),
        'detailsUrl'  => rest_url( 'glazieros/v1/jobs/' ),
        'settingsUrl' => rest_url( 'glazieros/v1/settings/pricing' ),
        'nonce'       => wp_create_nonce( 'wp_rest' ),
    ] );
}
