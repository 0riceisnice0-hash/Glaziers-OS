<?php
/**
 * Plugin Name:      GlazierOS App
 * Description:      MVP quoting, dashboard & scheduler – unified front-end dashboard.
 * Version:          0.2.5
 * Author:           Zac Bartley
 * Text Domain:      glazieros-app
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// 1) PSR-4 autoloader for GlazierOS\*
spl_autoload_register( function( $class ) {
    $prefix = 'GlazierOS\\';
    if ( 0 !== strpos( $class, $prefix ) ) {
        return;
    }
    $relative = substr( $class, strlen( $prefix ) );
    $path     = plugin_dir_path( __FILE__ ) . 'includes/' . str_replace( '\\', '/', $relative ) . '.php';
    if ( file_exists( $path ) ) {
        require_once $path;
    }
} );

// 2) Bootstrap core classes
add_action( 'plugins_loaded', function() {
    // The App class will now handle all initialization, including CPTs and REST API routes.
    \GlazierOS\App::get_instance();
    // Admin classes that register shortcodes or admin pages directly.
    new \GlazierOS\Admin\Fitters(); // Still needed for admin page registration if it has one
    new \GlazierOS\Admin\QuoteDetail(); // Still needed for shortcode registration
} );

/**
 * Fix: Add customer data to REST API response.
 *
 * Addresses the issue where the dashboard's 'customer' column always shows 'N/A'.
 * This is typically because the customer information is not included in the
 * REST API response for the list of quotes/jobs.
 *
 * This code registers a new 'customer' field for the 'job' post type. It populates
 * the field with the customer's name, making it available to the dashboard.
 */
add_action( 'rest_api_init', function () {
    register_rest_field(
        'job', // Assuming 'job' is the CPT slug from the '/jobs/' REST URL.
        'customer',    // The field name the dashboard's customer column expects.
        [
            'get_callback' => function( $post_array ) {
                // First, try to get the customer name from post meta.
                // '_customer_name' is a common and good practice for a meta key.
                $customer_name = get_post_meta( $post_array['id'], '_customer_name', true );

                if ( ! empty( $customer_name ) ) {
                    // The frontend likely expects an object, e.g., `job.customer.name`.
                    return [ 'name' => $customer_name ];
                }

                // As a fallback, let's use the post author's display name.
                $author = get_userdata( $post_array['author'] );
                if ( $author ) {
                    return [ 'name' => $author->display_name ];
                }

                return null; // No customer found; frontend will show "N/A".
            }
        ]
    );
} );

/**
 * Fix: Ensure all "New" quotes are listed in the dashboard tab.
 *
 * The WordPress REST API defaults to returning a maximum of 10 posts per page.
 * This hook modifies the query for "job" posts to remove that limit when the
 * request specifically asks for posts with the status 'new'. This ensures the
 * "New Quotes" tab displays all relevant quotes, not just the first 10.
 */
add_filter( 'rest_job_query', function( $args, $request ) {
    // Get the 'status' parameter from the REST API request.
    $status = $request->get_param( 'status' );

    // Check if the request is for quotes with the status of 'new'.
    // This corresponds to the "New Quotes" tab.
    if ( ! empty( $status ) && $status === 'new' ) {
        // By default, WP_Query (and the REST API) is paginated.
        // Setting 'posts_per_page' to -1 disables pagination and fetches all matching posts.
        $args['posts_per_page'] = -1;
    }

    return $args;
}, 10, 2 );

// 5) Shortcodes
add_shortcode( 'glazieros_pricing_tool', function() {
    // Enqueue the assets needed for the pricing tool.
    // This ensures they are only loaded when the shortcode is used.
    wp_enqueue_script( 'gos-pricing-app-js' );

    return '<div id="glazieros-pricing-tool"></div>';
} );
add_shortcode( 'gos_dashboard', function() {
    wp_enqueue_script( 'gos-dashboard-app-js' );
    return '<div id="gos-dashboard-app"></div>';
} );

// 6) Enqueue assets
add_action( 'wp_enqueue_scripts', function() {
    wp_enqueue_style( 'gos-main-css',
        plugins_url( 'assets/css/main.css', __FILE__ ),
        [],
        filemtime( plugin_dir_path( __FILE__ ) . 'assets/css/main.css' )
    );

    // Enqueue jQuery UI for drag and drop
    wp_enqueue_script('jquery-ui-draggable');
    wp_enqueue_script('jquery-ui-droppable');
    wp_enqueue_script('jquery-ui-resizable'); // Enqueue resizable for diary events
    wp_enqueue_style('jquery-ui-css', '//code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css'); // Basic theme for drag/drop feedback
    // Enqueue Three.js
    wp_enqueue_script( 'three-core',  'https://unpkg.com/three@0.152.0/build/three.min.js', [], null, true );
    
    // Register the 3D model builders, dependencies for the pricing app.
    wp_register_script( 'gos-builder-test-window',
        plugins_url( 'assets/js/builders/TestWindow.js', __FILE__ ),
        [ 'three-core' ],
        filemtime( plugin_dir_path( __FILE__ ) . 'assets/js/builders/TestWindow.js' ),
        true
    );
    wp_register_script( 'gos-builder-test-door',
        plugins_url( 'assets/js/builders/TestDoor.js', __FILE__ ),
        [ 'three-core' ],
        filemtime( plugin_dir_path( __FILE__ ) . 'assets/js/builders/TestDoor.js' ),
        true
    );

    // Register the pricing app, used in the 'new' dashboard panel and the shortcode.
    wp_register_script( 'gos-pricing-app-js',
        plugins_url( 'assets/js/pricing-app.js', __FILE__ ),
        [ 'jquery', 'three-core', 'gos-builder-test-window', 'gos-builder-test-door' ],
        filemtime( plugin_dir_path( __FILE__ ) . 'assets/js/pricing-app.js' ),
        true
    );

    // Provide REST URLs to the pricing app.
    wp_localize_script( 'gos-pricing-app-js', 'GlazierOS', [
        'quoteUrl'    => rest_url( 'glazieros/v1/quote' ),
        'settingsUrl' => rest_url( 'glazieros/v1/settings/pricing' ),
        'detailsUrl'  => rest_url( 'glazieros/v1/jobs/' ), // Base URL for details endpoint
    ] );

    // Enqueue the main dashboard app
    wp_enqueue_script( 'gos-dashboard-app-js',
        plugins_url( 'assets/js/dashboard/dashboard-app.js', __FILE__ ),
        // The main dashboard app only needs jQuery. FullCalendar dependencies are
        // handled by the specific panels that use it (e.g., 'diary').
        [ 'jquery' ],
        filemtime( plugin_dir_path( __FILE__ ) . 'assets/js/dashboard/dashboard-app.js' ),
        true
    );

    // Enqueue all panel scripts and define their dependencies
    $dashboard_panels = ['quotes', 'new', 'fitters', 'settings', 'invoices', 'reports', 'diary', 'quote-detail'];
    foreach ($dashboard_panels as $panel) {
        // All panels depend on the main dashboard app.
        $dependencies = ['gos-dashboard-app-js'];

        if ($panel === 'diary') {
            // The diary panel has been split into multiple files.
            
            // Enqueue CSS components
            $diary_css_files = ['layout', 'grid', 'events', 'components'];
            foreach ($diary_css_files as $css_file) {
                $css_path = plugin_dir_path(__FILE__) . "assets/css/diary/{$css_file}.css";
                if (file_exists($css_path)) {
                    wp_enqueue_style(
                        "gos-diary-css-{$css_file}",
                        plugins_url("assets/css/diary/{$css_file}.css", __FILE__),
                        [],
                        filemtime($css_path)
                    );
                }
            }

            // Add jQuery UI Draggable and Droppable as dependencies for the diary panel JS
            $diary_js_base_deps = array_merge($dependencies, ['jquery-ui-draggable', 'jquery-ui-droppable']);

            // Register JS components with correct dependencies
            $diary_js_path = plugin_dir_path(__FILE__) . 'assets/js/dashboard/diary/';
            $diary_js_url = plugins_url('assets/js/dashboard/diary/', __FILE__);

            wp_register_script('gos-diary-utils', $diary_js_url . 'utils.js', [], filemtime($diary_js_path . 'utils.js'), true);
            wp_register_script('gos-diary-api', $diary_js_url . 'api.js', [], filemtime($diary_js_path . 'api.js'), true);
            wp_register_script('gos-diary-ui', $diary_js_url . 'ui.js', ['gos-diary-utils'], filemtime($diary_js_path . 'ui.js'), true);
            wp_register_script('gos-diary-events', $diary_js_url . 'events.js', ['gos-diary-utils', 'gos-diary-api', 'gos-diary-ui'], filemtime($diary_js_path . 'events.js'), true);
            
            // Enqueue the main script, which will pull in all its dependencies in the correct order.
            wp_enqueue_script('gos-diary-main', $diary_js_url . 'main.js', array_merge($diary_js_base_deps, ['gos-diary-events']), filemtime($diary_js_path . 'main.js'), true);

            // We've handled the 'diary' panel, so skip the generic handler below.
            continue;
        }
        if ($panel === 'quote-detail') {
            // The quote detail panel needs the 3D model builders (which depend on Three.js).
            $dependencies[] = 'gos-builder-test-window';
            $dependencies[] = 'gos-builder-test-door';
        }
        if ($panel === 'new') {
            // The 'new' panel requires the pricing tool.
            $dependencies[] = 'gos-pricing-app-js';
        }

        $file_path = plugin_dir_path(__FILE__) . "assets/js/dashboard/{$panel}.js";
        if (file_exists($file_path)) {
            wp_enqueue_script(
                "gos-panel-{$panel}",
                plugins_url("assets/js/dashboard/{$panel}.js", __FILE__),
                $dependencies,
                filemtime($file_path),
                true
            );
        }
    }
} );
