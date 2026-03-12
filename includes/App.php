<?php
/**
 * GlazierOS Core Application Class
 * 
 * Main singleton that handles plugin initialization, custom post types,
 * REST API endpoints, and core business logic.
 * 
 * @package    GlazierOS
 * @subpackage Core
 * @since      0.3.0
 */

namespace GlazierOS;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;
use WP_Query;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Main Application Class
 * Implements singleton pattern to ensure single instance
 */
final class App {
    
    /** @var App Singleton instance */
    private static $instance = null;
    
    /** @var array Hardcoded status options for lead management */
    private $lead_statuses = [
        'New',
        'Quoted',
        'Follow-up',
        'Won',
        'Lost'
    ];
    
    /** @var array Hardcoded status options for installation */
    private $install_statuses = [
        'Pending',
        'Scheduled',
        'In Progress',
        'Completed'
    ];
    
    /**
     * Private constructor to enforce singleton pattern
     */
    private function __construct() {
        // Register Custom Post Types
        add_action( 'init', [ $this, 'register_custom_post_types' ] );
        
        // Register REST API routes
        add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
        
        // Register custom roles and capabilities
        add_action( 'init', [ $this, 'register_roles_and_capabilities' ] );
        
        // Add branch to user profile
        add_action( 'show_user_profile', [ $this, 'add_branch_to_user_profile' ] );
        add_action( 'edit_user_profile', [ $this, 'add_branch_to_user_profile' ] );
        add_action( 'personal_options_update', [ $this, 'save_branch_for_user_profile' ] );
        add_action( 'edit_user_profile_update', [ $this, 'save_branch_for_user_profile' ] );
        
        // Finance: Check invoice statuses daily
        add_action( 'gos_daily_invoice_check', [ $this, 'check_invoice_statuses' ] );
        add_action( 'gos_daily_invoice_check', [ $this, 'send_overdue_reminders' ] );
        
        // Schedule daily cron if not already scheduled
        if ( ! wp_next_scheduled( 'gos_daily_invoice_check' ) ) {
            wp_schedule_event( time(), 'daily', 'gos_daily_invoice_check' );
        }
    }
    
    /**
     * Get or create the singleton instance
     * 
     * @return App The singleton instance
     */
    public static function get_instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Prevent cloning of the instance
     */
    private function __clone() {}
    
    /**
     * Prevent unserializing of the instance
     */
    public function __wakeup() {
        throw new \Exception( 'Cannot unserialize singleton' );
    }

    
    /**
     * Register custom roles and capabilities
     * Sets up GlazierOS-specific user roles with appropriate permissions
     */
    public function register_roles_and_capabilities() {
        $roles = [
            'gos_sales' => [
                'display_name' => __( 'Sales', 'glazieros-app' ),
                'capabilities' => [
                    'read'            => true,
                    'read_jobs'       => true,
                    'edit_jobs'       => true,
                    'read_quotes'     => true,
                    'edit_quotes'     => true,
                    'publish_quotes'  => true,
                    'read_clients'    => true,
                    'edit_clients'    => true,
                    'read_leads'      => true,
                    'edit_leads'      => true,
                ],
            ],
            'gos_fitter' => [
                'display_name' => __( 'Fitter', 'glazieros-app' ),
                'capabilities' => [
                    'read'       => true,
                    'read_jobs'  => true,
                    'edit_jobs'  => true, // For updating job status
                ],
            ],
            'gos_surveyor' => [
                'display_name' => __( 'Surveyor', 'glazieros-app' ),
                'capabilities' => [
                    'read'       => true,
                    'read_jobs'  => true,
                    'edit_jobs'  => true,
                ],
            ],
            'gos_marketing' => [
                'display_name' => __( 'Marketing', 'glazieros-app' ),
                'capabilities' => [
                    'read'        => true,
                    'read_leads'  => true,
                    'edit_leads'  => true,
                ],
            ],
            'gos_finance' => [
                'display_name' => __( 'Finance', 'glazieros-app' ),
                'capabilities' => [
                    'read'                      => true,
                    'read_jobs'                 => true,
                    'read_quotes'               => true,
                    'manage_glazieros_settings' => true,
                ],
            ],
            'gos_hr' => [
                'display_name' => __( 'HR', 'glazieros-app' ),
                'capabilities' => [
                    'read'        => true,
                    'list_users'  => true,
                    'edit_users'  => true,
                ],
            ],
        ];
        
        // Create each role (won't overwrite if exists)
        foreach ( $roles as $role_name => $role_info ) {
            if ( ! get_role( $role_name ) ) {
                add_role( $role_name, $role_info['display_name'], $role_info['capabilities'] );
            }
        }
        
        // Add all GlazierOS capabilities to administrators
        $admin_role = get_role( 'administrator' );
        if ( $admin_role ) {
            $admin_caps = [
                'manage_glazieros_settings',
                'read_jobs', 'edit_jobs', 'delete_jobs', 'publish_jobs',
                'read_quotes', 'edit_quotes', 'delete_quotes', 'publish_quotes',
                'read_fitters', 'edit_fitters', 'delete_fitters',
                'read_clients', 'edit_clients', 'delete_clients',
                'read_leads', 'edit_leads', 'delete_leads',
            ];
            
            foreach ( $admin_caps as $cap ) {
                $admin_role->add_cap( $cap );
            }
        }
    }
    
    /**
     * Register Custom Post Types
     * Normalized to use 'gos_' prefix for consistency
     */
    public function register_custom_post_types() {
        // Job CPT - main entity for quotes that become jobs
        register_post_type( 'gos_job', [
            'label'        => __( 'Jobs', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Jobs', 'glazieros-app' ),
                'singular_name' => __( 'Job', 'glazieros-app' ),
                'add_new'       => __( 'Add New Job', 'glazieros-app' ),
                'add_new_item'  => __( 'Add New Job', 'glazieros-app' ),
                'edit_item'     => __( 'Edit Job', 'glazieros-app' ),
            ],
            'public'       => true,
            'show_ui'      => true,
            'show_in_rest' => true, // Enable REST API
            'supports'     => [ 'title', 'editor', 'custom-fields', 'author' ],
            'has_archive'  => true,
            'capability_type' => 'job',
            'map_meta_cap'    => true,
        ] );
        
        // Fitter CPT
        register_post_type( 'gos_fitter', [
            'label'        => __( 'Fitters', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Fitters', 'glazieros-app' ),
                'singular_name' => __( 'Fitter', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'fitter',
            'map_meta_cap'    => true,
        ] );
        
        // Client CPT
        register_post_type( 'gos_client', [
            'label'        => __( 'Clients', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Clients', 'glazieros-app' ),
                'singular_name' => __( 'Client', 'glazieros-app' ),
            ],
            'public'       => true,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'editor', 'custom-fields' ],
            'has_archive'  => true,
            'capability_type' => 'client',
            'map_meta_cap'    => true,
        ] );
        
        // Lead CPT
        register_post_type( 'gos_lead', [
            'label'        => __( 'Leads', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Leads', 'glazieros-app' ),
                'singular_name' => __( 'Lead', 'glazieros-app' ),
            ],
            'public'       => true,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'editor', 'custom-fields' ],
            'has_archive'  => true,
            'capability_type' => 'lead',
            'map_meta_cap'    => true,
        ] );
        
        // Quote CPT (might be deprecated in favor of gos_job)
        register_post_type( 'gos_quote', [
            'label'        => __( 'Quotes', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Quotes', 'glazieros-app' ),
                'singular_name' => __( 'Quote', 'glazieros-app' ),
            ],
            'public'       => true,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'editor', 'custom-fields' ],
            'has_archive'  => true,
            'capability_type' => 'quote',
            'map_meta_cap'    => true,
        ] );
        
        // Note CPT - for job notes
        register_post_type( 'gos_note', [
            'label'        => __( 'Notes', 'glazieros-app' ),
            'public'       => false,
            'show_ui'      => false,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'editor', 'author' ],
        ] );
        
        // Audit Log CPT
        register_post_type( 'gos_audit_log', [
            'label'        => __( 'Audit Logs', 'glazieros-app' ),
            'public'       => false,
            'show_ui'      => current_user_can( 'manage_options' ),
            'show_in_rest' => false, // Keep logs internal
            'supports'     => [ 'title', 'custom-fields' ],
        ] );
        
        // Branch CPT
        register_post_type( 'gos_branch', [
            'label'        => __( 'Branches', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Branches', 'glazieros-app' ),
                'singular_name' => __( 'Branch', 'glazieros-app' ),
            ],
            'public'       => true,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'has_archive'  => true,
        ] );
        
        // ============================================================================
        // FINANCE MODULE CPTs
        // ============================================================================
        
        // Customer Invoice CPT
        register_post_type( 'gos_invoice', [
            'label'        => __( 'Invoices', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Invoices', 'glazieros-app' ),
                'singular_name' => __( 'Invoice', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'post',
            'map_meta_cap'    => true,
        ] );
        
        // Supplier Invoice / Expense CPT
        register_post_type( 'gos_expense', [
            'label'        => __( 'Expenses', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Expenses', 'glazieros-app' ),
                'singular_name' => __( 'Expense', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'post',
            'map_meta_cap'    => true,
        ] );
        
        // Payment In CPT
        register_post_type( 'gos_payment_in', [
            'label'        => __( 'Payments In', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Payments In', 'glazieros-app' ),
                'singular_name' => __( 'Payment In', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'post',
            'map_meta_cap'    => true,
        ] );
        
        // Payment Out CPT
        register_post_type( 'gos_payment_out', [
            'label'        => __( 'Payments Out', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Payments Out', 'glazieros-app' ),
                'singular_name' => __( 'Payment Out', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'post',
            'map_meta_cap'    => true,
        ] );
        
        // Payslip CPT
        register_post_type( 'gos_payslip', [
            'label'        => __( 'Payslips', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Payslips', 'glazieros-app' ),
                'singular_name' => __( 'Payslip', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'post',
            'map_meta_cap'    => true,
        ] );
        
        // Supplier CPT
        register_post_type( 'gos_supplier', [
            'label'        => __( 'Suppliers', 'glazieros-app' ),
            'labels'       => [
                'name'          => __( 'Suppliers', 'glazieros-app' ),
                'singular_name' => __( 'Supplier', 'glazieros-app' ),
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_rest' => true,
            'supports'     => [ 'title', 'custom-fields' ],
            'capability_type' => 'post',
            'map_meta_cap'    => true,
        ] );
        
        // Register custom tables on activation
        register_activation_hook( GLAZIEROS_PLUGIN_DIR . 'glazieros-app.php', [ $this, 'create_finance_tables' ] );
    }

  /**
   * Register REST API routes with proper security validation
   * 
   * Note: WordPress REST API automatically verifies nonces sent via X-WP-Nonce header.
   * We use permission_callback for capability checking and args validation for input sanitization.
   *
   * @since 0.3.0
   */
  public function register_rest_routes(): void {
    $namespace = 'glazieros/v1';

    // Save quote (create new job from pricing tool)
    register_rest_route( $namespace, '/quote', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'save_quote' ],
        'permission_callback' => function() { 
            return current_user_can( 'publish_posts' ); 
        },
        'args'                => [
            'type'   => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            'width'  => [ 'required' => true, 'validate_callback' => [ $this, 'validate_positive_number' ] ],
            'height' => [ 'required' => true, 'validate_callback' => [ $this, 'validate_positive_number' ] ],
            'price'  => [ 'required' => true, 'validate_callback' => [ $this, 'validate_positive_number' ] ],
        ],
    ] );
    
    // Convert quote to job
    register_rest_route( $namespace, '/quotes/(?P<id>\d+)/convert', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'convert_quote_to_job' ],
        'permission_callback' => function() { 
            return current_user_can( 'publish_posts' ); 
        },
        'args'                => [
            'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
        ],
    ] );
    
    // List/Create jobs
    register_rest_route( $namespace, '/jobs', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_jobs' ],
            'permission_callback' => function() { 
                return current_user_can( 'read' ); 
            },
            'args'                => [
                'page'     => [ 'default' => 1, 'sanitize_callback' => 'absint' ],
                'per_page' => [ 'default' => 12, 'sanitize_callback' => 'absint' ],
                'search'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'sort'     => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'create_job' ],
            'permission_callback' => function() { 
                return current_user_can( 'edit_posts' ); 
            },
        ],
    ] );
    
    // Get/Delete single job
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_job' ],
            'permission_callback' => function() { 
                return current_user_can( 'read' ); 
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::DELETABLE,
            'callback'            => [ $this, 'delete_job' ],
            'permission_callback' => function() { 
                return current_user_can( 'delete_posts' ); 
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
    ] );
    
    // Fitters CRUD (Legacy - kept for compatibility)
    register_rest_route( $namespace, '/fitters', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_fitters' ],
            'permission_callback' => function() { 
                return current_user_can( 'read' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'save_fitter' ],
            'permission_callback' => function() { 
                return current_user_can( 'edit_posts' ); 
            },
            'args'                => [
                'name'   => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'email'  => [ 'sanitize_callback' => 'sanitize_email' ],
                'mobile' => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ],
    ] );
    
    // Update/Delete specific fitter
    register_rest_route( $namespace, '/fitters/(?P<id>\d+)', [
        [
            'methods'             => \WP_REST_Server::EDITABLE,
            'callback'            => [ $this, 'update_fitter' ],
            'permission_callback' => function() { 
                return current_user_can( 'edit_posts' ); 
            },
            'args'                => [
                'id'     => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
                'name'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'email'  => [ 'sanitize_callback' => 'sanitize_email' ],
                'mobile' => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::DELETABLE,
            'callback'            => [ $this, 'delete_fitter' ],
            'permission_callback' => function() { 
                return current_user_can( 'delete_posts' ); 
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
    ] );
    
    // Team Management CRUD (New comprehensive HR system)
    register_rest_route( $namespace, '/team', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_team' ],
            'permission_callback' => function() { 
                return current_user_can( 'read' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'save_team_member' ],
            'permission_callback' => function() { 
                return current_user_can( 'edit_posts' ); 
            },
        ],
    ] );
    
    // Get/Update/Delete specific team member
    register_rest_route( $namespace, '/team/(?P<id>\d+)', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_team_member' ],
            'permission_callback' => function() { 
                return current_user_can( 'read' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::EDITABLE,
            'callback'            => [ $this, 'save_team_member' ],
            'permission_callback' => function() { 
                return current_user_can( 'edit_posts' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::DELETABLE,
            'callback'            => [ $this, 'delete_team_member' ],
            'permission_callback' => function() { 
                return current_user_can( 'delete_posts' ); 
            },
        ],
    ] );
    
    // Team member availability
    register_rest_route( $namespace, '/team/(?P<id>\d+)/availability', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'save_team_availability' ],
        'permission_callback' => function() { 
            return current_user_can( 'edit_posts' ); 
        },
    ] );
    
    // Team documents
    register_rest_route( $namespace, '/team/documents', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'upload_team_document' ],
        'permission_callback' => function() { 
            return current_user_can( 'upload_files' ); 
        },
    ] );
    
    // Generate invoice for a job
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/invoice', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'generate_invoice' ],
        'permission_callback' => function() { 
            return current_user_can( 'edit_posts' ); 
        },
        'args'                => [
            'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
        ],
    ] );
    
    // Schedule per job
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/schedule', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_schedule' ],
            'permission_callback' => function() { 
                return current_user_can( 'read' ); 
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'save_schedule' ],
            'permission_callback' => function() { 
                return current_user_can( 'edit_posts' ); 
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
    ] );
    
    // Stats for reports
    register_rest_route( $namespace, '/stats', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [ $this, 'get_stats' ],
        'permission_callback' => function() { 
            return current_user_can( 'read' ); 
        },
    ] );
    
    // Save job details from pricing tool
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/details', [
        'methods'             => \WP_REST_Server::EDITABLE,
        'callback'            => [ $this, 'save_job_details' ],
        'permission_callback' => function() { 
            return current_user_can( 'edit_posts' ); 
        },
        'args'                => [
            'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
        ],
    ] );
    
    // Update job status
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/status', [
        'methods'             => \WP_REST_Server::EDITABLE,
        'callback'            => [ $this, 'update_job_status' ],
        'permission_callback' => function() { 
            return current_user_can( 'edit_posts' ); 
        },
        'args'                => [
            'id'     => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            'status' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            'type'   => [ 'default' => 'lead', 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ] );

    // Search endpoint
    register_rest_route( $namespace, '/search', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [ $this, 'global_search' ],
        'permission_callback' => function() { 
            return current_user_can( 'read' ); 
        },
        'args'                => [
            'term' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ] );

    // Notes endpoints
    register_rest_route( $namespace, '/notes', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_notes' ],
            'permission_callback' => [ $this, 'can_edit_parent_post' ],
            'args'                => [
                'post_id' => [ 'required' => true, 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'create_note' ],
            'permission_callback' => [ $this, 'can_edit_parent_post' ],
            'args'                => [
                'post_id' => [ 'required' => true, 'validate_callback' => [ $this, 'validate_post_id' ] ],
                'content' => [ 'required' => true, 'sanitize_callback' => 'sanitize_textarea_field' ],
            ],
        ],
    ] );

    // Invoice status update
    register_rest_route( $namespace, '/invoices/(?P<id>\d+)/status', [
        'methods'             => \WP_REST_Server::EDITABLE,
        'callback'            => [ $this, 'update_invoice_status' ],
        'permission_callback' => function() { 
            return current_user_can( 'edit_posts' ); 
        },
        'args'                => [
            'id'     => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            'status' => [
                'required'          => true,
                'validate_callback' => function( $param ) {
                    return in_array( $param, [ 'paid', 'unpaid', 'pending', 'cancelled' ], true );
                },
            ],
        ],
    ] );

    // Audit logs endpoint
    register_rest_route( $namespace, '/audit-logs', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [ $this, 'get_audit_logs' ],
        'permission_callback' => function() { 
            return current_user_can( 'manage_options' ); 
        },
    ] );

    // Pricing rules endpoints
    register_rest_route( $namespace, '/pricing-rules', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_pricing_rules' ],
            'permission_callback' => function() { 
                return current_user_can( 'manage_options' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'save_pricing_rules' ],
            'permission_callback' => function() { 
                return current_user_can( 'manage_options' ); 
            },
        ],
    ] );

    // Settings endpoints
    register_rest_route( $namespace, '/settings/pricing', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_pricing_settings' ],
            'permission_callback' => function() { 
                return current_user_can( 'manage_options' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::EDITABLE,
            'callback'            => [ $this, 'save_pricing_settings' ],
            'permission_callback' => function() { 
                return current_user_can( 'manage_options' ); 
            },
        ],
    ] );
    
    register_rest_route( $namespace, '/settings/form', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_form_settings' ],
            'permission_callback' => function() { 
                return current_user_can( 'manage_options' ); 
            },
        ],
        [
            'methods'             => \WP_REST_Server::EDITABLE,
            'callback'            => [ $this, 'save_form_settings' ],
            'permission_callback' => function() { 
                return current_user_can( 'manage_options' ); 
            },
        ],
    ] );

    // ============================================================================
    // DIARY / CALENDAR ENDPOINTS
    // ============================================================================

    // Get all diary events
    register_rest_route( $namespace, '/diary/events', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [ $this, 'get_diary_events' ],
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
    ] );

    // Get single diary event
    register_rest_route( $namespace, '/diary/events/(?P<id>\d+)', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [ $this, 'get_diary_event' ],
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
    ] );

    // Create diary event
    register_rest_route( $namespace, '/diary/events', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'create_diary_event' ],
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
    ] );

    // Update diary event
    register_rest_route( $namespace, '/diary/events/(?P<id>\d+)', [
        'methods'             => \WP_REST_Server::EDITABLE,
        'callback'            => [ $this, 'update_diary_event' ],
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
    ] );

    // Delete diary event
    register_rest_route( $namespace, '/diary/events/(?P<id>\d+)', [
        'methods'             => \WP_REST_Server::DELETABLE,
        'callback'            => [ $this, 'delete_diary_event' ],
        'permission_callback' => function() {
            return current_user_can( 'delete_posts' );
        },
    ] );
    
    // ============================================================================
    // FINANCE MODULE ENDPOINTS
    // ============================================================================
    
    // Invoices - List/Create
    register_rest_route( $namespace, '/invoices', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_invoices' ],
            'permission_callback' => function() {
                return current_user_can( 'read' );
            },
            'args'                => [
                'page'     => [ 'default' => 1, 'sanitize_callback' => 'absint' ],
                'per_page' => [ 'default' => 20, 'sanitize_callback' => 'absint' ],
                'search'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'status'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'create_invoice' ],
            'permission_callback' => function() {
                return current_user_can( 'edit_posts' );
            },
        ],
    ] );
    
    // Invoices - Get/Update/Delete single
    register_rest_route( $namespace, '/invoices/(?P<id>\d+)', [
        [
            'methods'             => \WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_invoice' ],
            'permission_callback' => function() {
                return current_user_can( 'read' );
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::EDITABLE,
            'callback'            => [ $this, 'update_invoice' ],
            'permission_callback' => function() {
                return current_user_can( 'edit_posts' );
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
        [
            'methods'             => \WP_REST_Server::DELETABLE,
            'callback'            => [ $this, 'delete_invoice' ],
            'permission_callback' => function() {
                return current_user_can( 'delete_posts' );
            },
            'args'                => [
                'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
            ],
        ],
    ] );
    
    // Invoice - Send via email
    register_rest_route( $namespace, '/invoices/(?P<id>\d+)/send', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'send_invoice' ],
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args'                => [
            'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
        ],
    ] );
    
    // Invoice - Generate PDF
    register_rest_route( $namespace, '/invoices/(?P<id>\d+)/pdf', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'generate_invoice_pdf' ],
        'permission_callback' => function() {
            return current_user_can( 'read' );
        },
        'args'                => [
            'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
        ],
    ] );
    
    // Invoice - Record payment
    register_rest_route( $namespace, '/invoices/(?P<id>\d+)/payment', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'record_invoice_payment' ],
        'permission_callback' => function() {
            return current_user_can( 'edit_posts' );
        },
        'args'                => [
            'id' => [ 'validate_callback' => [ $this, 'validate_post_id' ] ],
        ],
    ] );
    
    // Finance Analytics Dashboard
    register_rest_route( $namespace, '/finance/analytics', [
        'methods'             => \WP_REST_Server::READABLE,
        'callback'            => [ $this, 'get_finance_analytics' ],
        'permission_callback' => function() {
            return current_user_can( 'read' );
        },
        'args'                => [
            'start_date' => [ 'sanitize_callback' => 'sanitize_text_field' ],
            'end_date'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
        ],
    ] );
    
    // Finance - Manual status check
    register_rest_route( $namespace, '/finance/check-statuses', [
        'methods'             => \WP_REST_Server::CREATABLE,
        'callback'            => [ $this, 'manual_status_check' ],
        'permission_callback' => function() {
            return current_user_can( 'manage_options' );
        },
    ] );
  }

  /**
   * Validate that a parameter is a valid post ID
   *
   * @param mixed $param The parameter to validate
   * @return bool True if valid, false otherwise
   */
  public function validate_post_id( $param ): bool {
      return is_numeric( $param ) && $param > 0;
  }

  /**
   * Validate that a parameter is a positive number
   *
   * @param mixed $param The parameter to validate
   * @return bool True if valid, false otherwise
   */
  public function validate_positive_number( $param ): bool {
      return is_numeric( $param ) && $param > 0;
  }

  public function can_edit_parent_post(WP_REST_Request $request) {
    $post_id = $request->get_param('post_id');
    return current_user_can('edit_post', $post_id);
  }

  public function add_branch_to_user_profile( $user ) {
    ?>
    <h3>Branch</h3>
    <table class="form-table">
        <tr>
            <th><label for="branch">Branch</label></th>
            <td>
                <?php
                $branches = get_posts(['post_type' => 'gos_branch', 'numberposts' => -1]);
                $selected_branch = get_user_meta( $user->ID, '_branch_id', true );
                ?>
                <select name="_branch_id" id="branch">
                    <option value="">- Select Branch -</option>
                    <?php foreach ($branches as $branch) : ?>
                        <option value="<?php echo $branch->ID; ?>" <?php selected($selected_branch, $branch->ID); ?>><?php echo $branch->post_title; ?></option>
                    <?php endforeach; ?>
                </select>
            </td>
        </tr>
    </table>
    <?php
  }

  public function save_branch_for_user_profile( $user_id ) {
    if ( !current_user_can( 'edit_user', $user_id ) ) {
        return false;
    }
    update_user_meta( $user_id, '_branch_id', $_POST['_branch_id'] );
  }

  /**
   * Callback for the jobs endpoint.
   */
  public function get_jobs( WP_REST_Request $request ) {
    $params = $request->get_query_params();
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $per_page = isset($params['per_page']) ? (int)$params['per_page'] : 12;

    $args = [
      'post_type'   => 'gos_job',
      'posts_per_page' => $per_page,
      'paged' => $page,
      'orderby' => 'date',
      'order' => 'DESC',
    ];

    $branch_id = get_user_meta(get_current_user_id(), '_branch_id', true);
    if ( !current_user_can('manage_options') && !empty($branch_id) ) {
        $args['meta_query'][] = [
            'key' => '_branch_id',
            'value' => $branch_id,
            'compare' => '=',
        ];
    }

    // Search
    if (!empty($params['search'])) {
        $args['s'] = sanitize_text_field($params['search']);
    }

    // Sorting
    if (!empty($params['sort'])) {
        switch ($params['sort']) {
            case 'price_desc': $args['orderby'] = 'meta_value_num'; $args['meta_key'] = 'gos_price'; $args['order'] = 'DESC'; break;
            case 'price_asc':  $args['orderby'] = 'meta_value_num'; $args['meta_key'] = 'gos_price'; $args['order'] = 'ASC'; break;
            case 'date_asc':   $args['order'] = 'ASC'; break;
        }
    }

    $query = new \WP_Query($args);
    $posts = $query->get_posts();
    $data = array_map([$this, 'format_job_data'], $posts);

    $response = new WP_REST_Response($data);
    $response->header('X-WP-Total', $query->found_posts);
    $response->header('X-WP-TotalPages', $query->max_num_pages);

    return $response;
  }

  public function create_job( WP_REST_Request $request ) {
    $body = $request->get_json_params();
    
    // Create new post
    $post_data = [
      'post_type'   => 'gos_job',
      'post_title'  => sprintf( 'Quote #%s - %s %s', 
          time(), 
          sanitize_text_field( $body['first_name'] ?? '' ),
          sanitize_text_field( $body['last_name'] ?? '' )
      ),
      'post_status' => 'publish',
    ];
    
    $post_id = wp_insert_post( $post_data );
    
    if ( is_wp_error( $post_id ) ) {
      return new WP_Error( 'create_failed', 'Failed to create quote.', [ 'status' => 500 ] );
    }
    
    // Save all metadata
    $meta_fields = [
      'first_name', 'last_name', 'email', 'phone', 'address',
      'type', 'width', 'height', 'material', 'glazing', 'color',
      'price', 'lead_status', 'install_status', 'notes', 'config'
    ];
    
    foreach ( $meta_fields as $field ) {
      if ( isset( $body[$field] ) ) {
        $value = $field === 'config' ? $body[$field] : sanitize_text_field( $body[$field] );
        update_post_meta( $post_id, 'gos_' . $field, $value );
      }
    }
    
    // Set default statuses if not provided
    if ( empty( $body['lead_status'] ) ) {
      update_post_meta( $post_id, 'gos_lead_status', 'New' );
    }
    if ( empty( $body['install_status'] ) ) {
      update_post_meta( $post_id, 'gos_install_status', 'Pending' );
    }
    
    // Log activity
    gos_log_activity( 'Job Created', $post_id, 'gos_job' );
    
    // Return the created job
    $post = get_post( $post_id );
    $data = $this->format_job_data( $post );
    
    return rest_ensure_response( $data );
  }

  public function get_job( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $post = get_post($id);

    if ( ! $post || 'gos_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }

    $data = $this->format_job_data($post);

    return rest_ensure_response($data);
  }

  public function delete_job( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }
    gos_log_activity('Job Deleted', $id, 'gos_job');
    $result = wp_delete_post( $id, true ); 
    if ( ! $result ) {
        return new WP_Error( 'cant-delete', 'Could not delete job.', [ 'status' => 500 ] );
    }
    return rest_ensure_response( [ 'success' => true ] );
  }
  public function get_fitters( WP_REST_Request $req ) {
    $args = [ 'post_type' => 'gos_fitter', 'numberposts' => -1 ];

    $branch_id = get_user_meta(get_current_user_id(), '_branch_id', true);
    if ( !current_user_can('manage_options') && !empty($branch_id) ) {
        $args['meta_query'][] = [
            'key' => '_branch_id',
            'value' => $branch_id,
            'compare' => '=',
        ];
    }

    $fs = get_posts( $args );
    $o  = array_map( function( $f ) {
        return [
            'id'     => $f->ID,
            'name'   => $f->post_title,
            'email'  => get_post_meta( $f->ID, 'fitter_email', true ),
            'mobile' => get_post_meta( $f->ID, 'fitter_mobile', true ),
        ];
    }, $fs );
    return rest_ensure_response( $o );
  }

  public function save_quote( WP_REST_Request $req ) {
    $d = $req->get_json_params();
    $branch_id = get_user_meta(get_current_user_id(), '_branch_id', true);
    $status = $d['status'] ?? 'publish';
    $id = wp_insert_post( [
        'post_type'   => 'gos_job',
        'post_title'  => sprintf( '%s: %.2fm×%.2fm', ucfirst( $d['type'] ?? '' ), $d['width'] ?? 0, $d['height'] ?? 0 ),
        'post_status' => $status,
        'meta_input'  => [
            'gos_type'       => sanitize_text_field( $d['type'] ?? '' ),
            'gos_width'      => floatval( $d['width'] ?? 0 ),
            'gos_height'     => floatval( $d['height'] ?? 0 ),
            'gos_price'      => floatval( $d['price'] ?? 0 ),
            'gos_lead_status' => sanitize_text_field( $d['lead_status'] ?? 'New' ),
            'gos_install_status' => sanitize_text_field( $d['install_status'] ?? 'Pending' ),
            'gos_notes'      => sanitize_textarea_field( $d['notes'] ?? '' ),
            'gos_schedule'   => [],
            '_branch_id' => $branch_id,
            // Customer details - support both direct fields and form_data nested object
            'gos_first_name' => sanitize_text_field( $d['first_name'] ?? $d['form_data']['first_name'] ?? '' ),
            'gos_last_name'  => sanitize_text_field( $d['last_name'] ?? $d['form_data']['last_name'] ?? '' ),
            'gos_email'      => sanitize_email( $d['email'] ?? $d['form_data']['email'] ?? '' ),
            'gos_phone'      => sanitize_text_field( $d['phone'] ?? $d['form_data']['phone'] ?? '' ),
            'gos_address'    => sanitize_textarea_field( $d['address'] ?? $d['form_data']['address'] ?? '' ),
            // Product details
            'gos_material'   => sanitize_text_field( $d['material'] ?? '' ),
            'gos_glazing'    => sanitize_text_field( $d['glazing'] ?? '' ),
            'gos_color'      => sanitize_text_field( $d['color'] ?? '' ),
        ],
    ] );
    if ( is_wp_error( $id ) ) {
        return new WP_Error( 'cant-create', $id->get_error_message(), [ 'status' => 500 ] );
    }
    gos_log_activity('Quote Created', $id, 'gos_quote');
    $response = new WP_REST_Response( [ 'job_id' => $id, 'id' => $id, 'post_id' => $id ] );
    $response->set_status( 201 );
    return $response;
  }

  public function convert_quote_to_job( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }

    wp_update_post([
        'ID' => $id,
        'post_status' => 'publish',
    ]);

    gos_log_activity('Quote Converted to Job', $id, 'gos_job');

    return rest_ensure_response(['success' => true]);
  }

  public function save_fitter( WP_REST_Request $req ) {
    $d  = $req->get_json_params();
    $branch_id = get_user_meta(get_current_user_id(), '_branch_id', true);
    $id = wp_insert_post( [
        'post_type' => 'gos_fitter',
        'post_title' => sanitize_text_field( $d['name'] ),
        'post_status' => 'publish',
        'meta_input' => [
            '_branch_id' => $branch_id,
        ]
    ] );
    update_post_meta( $id, 'fitter_email', sanitize_email( $d['email'] ) );
    update_post_meta( $id, 'fitter_mobile', sanitize_text_field( $d['mobile'] ) );
    gos_log_activity('Fitter Created', $id, 'gos_fitter');
    return rest_ensure_response( [ 'id' => $id ] );
  }

  public function update_fitter( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_fitter' !== $post->post_type ) {
        return new WP_Error( 'invalid_fitter_id', 'Invalid fitter ID.', [ 'status' => 404 ] );
    }
    $d = $req->get_json_params();
    wp_update_post([
        'ID' => $id,
        'post_title' => sanitize_text_field( $d['name'] )
    ]);
    update_post_meta( $id, 'fitter_email', sanitize_email( $d['email'] ) );
    update_post_meta( $id, 'fitter_mobile', sanitize_text_field( $d['mobile'] ) );
    gos_log_activity('Fitter Updated', $id, 'gos_fitter');
    return rest_ensure_response( [ 'success' => true ] );
  }

  public function delete_fitter( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_fitter' !== $post->post_type ) {
        return new WP_Error( 'invalid_fitter_id', 'Invalid fitter ID.', [ 'status' => 404 ] );
    }
    gos_log_activity('Fitter Deleted', $id, 'gos_fitter');
    $result = wp_delete_post( $id, true );
    if ( ! $result ) {
        return new WP_Error( 'cant-delete', 'Could not delete fitter.', [ 'status' => 500 ] );
    }
    return rest_ensure_response( [ 'success' => true ] );
  }

  public function get_notes(WP_REST_Request $request) {
    $post_id = $request->get_param('post_id');
    $notes = get_posts([
        'post_type' => 'go_note',
        'post_parent' => $post_id,
        'numberposts' => -1,
        'orderby' => 'date',
        'order' => 'ASC',
    ]);

    $formatted_notes = array_map(function($note) {
        $author = get_userdata($note->post_author);
        return [
            'id' => $note->ID,
            'content' => $note->post_content,
            'author' => $author ? $author->display_name : 'Unknown',
            'date' => $note->post_date,
        ];
    }, $notes);

    return rest_ensure_response($formatted_notes);
  }

  public function create_note(WP_REST_Request $request) {
    $post_id = $request->get_param('post_id');
    $content = $request->get_param('content');

    $note_id = wp_insert_post([
        'post_type' => 'go_note',
        'post_title' => 'Note for post ' . $post_id,
        'post_content' => $content,
        'post_status' => 'publish',
        'post_parent' => $post_id,
        'post_author' => get_current_user_id(),
    ]);

    if (is_wp_error($note_id)) {
        return new WP_Error('cant-create-note', $note_id->get_error_message(), ['status' => 500]);
    }
    gos_log_activity('Note Created', $note_id, 'go_note');
    return rest_ensure_response(['success' => true, 'note_id' => $note_id]);
  }

  public function get_schedule( WP_REST_Request $req ) {
    $id = $req['id'];
    return rest_ensure_response( get_post_meta( $id, 'gos_schedule', true ) ?: [] );
  }

  public function save_schedule( WP_REST_Request $req ) {
    $id = $req['id'];
    $d  = $req->get_json_params();
    update_post_meta( $id, 'gos_schedule', $d );
    return rest_ensure_response( $d );
  }

  public function get_stats( WP_REST_Request $req ) {
    $cache_key = 'gos_reports_stats';
    $cached_data = get_transient($cache_key);

    if (false !== $cached_data) {
        return rest_ensure_response($cached_data);
    }

    $total_quotes = wp_count_posts('gos_quote')->publish;
    $total_leads = wp_count_posts('gos_lead')->publish;

    $jobs_query = new \WP_Query([
        'post_type' => 'gos_job',
        'posts_per_page' => -1,
        'post_status' => 'publish',
    ]);
    $jobs = $jobs_query->get_posts();

    $active_jobs = 0;
    $overdue_invoices = 0;
    $thirty_days_ago = strtotime('-30 days');

    $stats = [
        'total_jobs' => $jobs_query->found_posts,
        'by_lead_status' => [],
        'by_install_status' => [],
        'won_jobs_prices' => [],
        'total_quotes' => $total_quotes,
        'total_leads' => $total_leads,
    ];

    foreach ($jobs as $job) {
        $lead_status = get_post_meta($job->ID, 'gos_lead_status', true) ?: 'New';
        $stats['by_lead_status'][$lead_status] = ($stats['by_lead_status'][$lead_status] ?? 0) + 1;

        if ($lead_status === 'Won') {
            $price = get_post_meta($job->ID, 'gos_price', true);
            if (is_numeric($price)) {
                $stats['won_jobs_prices'][] = (float)$price;
            }
        }

        $install_status = get_post_meta($job->ID, 'gos_install_status', true) ?: 'Pending';
        $stats['by_install_status'][$install_status] = ($stats['by_install_status'][$install_status] ?? 0) + 1;

        if (in_array($install_status, ['In Progress', 'Scheduled'])) {
            $active_jobs++;
        }

        $invoice_status = get_post_meta($job->ID, '_invoice_status', true);
        $invoice_date = get_post_meta($job->ID, '_invoice_date', true);

        if ($invoice_status === 'unpaid' && $invoice_date && strtotime($invoice_date) < $thirty_days_ago) {
            $overdue_invoices++;
        }
    }

    $stats['active_jobs'] = $active_jobs;
    $stats['overdue_invoices'] = $overdue_invoices;

    // Cache for 1 hour
    set_transient($cache_key, $stats, HOUR_IN_SECONDS);

    return rest_ensure_response($stats);
  }

  public function global_search( WP_REST_Request $request ) {
    $term = sanitize_text_field($request->get_param('term'));
    $results = [];

    if (empty($term)) {
        return rest_ensure_response($results);
    }

    $post_types = ['gos_job', 'gos_quote', 'gos_client', 'gos_fitter'];

    $query = new \WP_Query([
        'post_type' => $post_types,
        's' => $term,
        'posts_per_page' => 20,
    ]);

    $posts = $query->get_posts();

    foreach ($posts as $post) {
        $results[] = [
            'id' => $post->ID,
            'title' => $post->post_title,
            'type' => get_post_type_object(get_post_type($post))->labels->singular_name,
            'url' => get_permalink($post->ID), // This might not be useful for the dashboard, but good to have
        ];
    }

    return rest_ensure_response($results);
  }

  public function get_audit_logs( WP_REST_Request $request ) {
    $logs = get_posts([
        'post_type' => 'go_audit_log',
        'numberposts' => 100,
        'orderby' => 'date',
        'order' => 'DESC',
    ]);

    $formatted_logs = array_map(function($log) {
        $user = get_userdata(get_post_meta($log->ID, '_user_id', true));
        return [
            'id' => $log->ID,
            'action' => $log->post_title,
            'user' => $user ? $user->display_name : 'Unknown',
            'object_id' => get_post_meta($log->ID, '_object_id', true),
            'object_type' => get_post_meta($log->ID, '_object_type', true),
            'ip_address' => get_post_meta($log->ID, '_ip_address', true),
            'date' => $log->post_date,
        ];
    }, $logs);

    return rest_ensure_response($formatted_logs);
  }

  public function get_pricing_rules( WP_REST_Request $request ) {
      $rules = get_option('gos_pricing_rules', []);
      return rest_ensure_response($rules);
  }

  public function save_pricing_rules( WP_REST_Request $request ) {
      $rules = $request->get_json_params();
      update_option('gos_pricing_rules', $rules);
      return rest_ensure_response(['success' => true]);
  }

  public function save_job_details( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }
    $params = $req->get_json_params();
    $meta_to_update = [
        'gos_first_name' => sanitize_text_field( $params['first_name'] ?? '' ),
        'gos_last_name'  => sanitize_text_field( $params['last_name'] ?? '' ),
        'gos_phone'      => sanitize_text_field( $params['phone'] ?? '' ),
        'gos_email'      => sanitize_email( $params['email'] ?? '' ),
        'gos_address'    => sanitize_textarea_field( $params['address'] ?? '' ),
        'gos_notes'      => sanitize_textarea_field( $params['notes'] ?? '' ),
        'gos_form_data' => isset($params['form_data']) && is_array($params['form_data']) ? json_encode($params['form_data']) : '',
    ];

    // Handle dual status updates
    $hardcoded_statuses = [
        'lead' => ['New', 'Quoted', 'Follow-up', 'Won', 'Lost'],
        'install' => ['Pending', 'Scheduled', 'In Progress', 'Completed']
    ];

    if ( isset( $params['lead_status'] ) ) {
        $new_status = sanitize_text_field( $params['lead_status'] );
        $allowed = array_map('strtolower', $hardcoded_statuses['lead']);
        if ( in_array( $new_status, $allowed ) ) {
            $meta_to_update['gos_lead_status'] = $new_status;
        }
    }
    if ( isset( $params['install_status'] ) ) {
        $new_status = sanitize_text_field( $params['install_status'] );
        $allowed = array_map('strtolower', $hardcoded_statuses['install']);
        if ( in_array( $new_status, $allowed ) ) {
            $meta_to_update['gos_install_status'] = $new_status;
        }
    }

    foreach ( $meta_to_update as $key => $value ) {
        update_post_meta( $id, $key, $value );
    }

    delete_transient('gos_reports_stats'); // Bust cache
    gos_log_activity('Job Details Updated', $id, 'gos_job');
    return rest_ensure_response( [ 'saved' => true, 'job_id' => $id ] );
  }

  public function update_job_status( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }

    $params = $req->get_json_params();
    $new_status = sanitize_text_field( $params['status'] );
    $type = sanitize_key( $params['type'] ?? 'lead' ); // 'lead' or 'install'

    // Since statuses are now hardcoded in the frontend, we can't rely on the database
    // option for validation. We'll define the allowed statuses here.
    // This also makes the backend more robust if the frontend sends an invalid status.
    $hardcoded_statuses = [
        'lead' => ['New', 'Quoted', 'Follow-up', 'Won', 'Lost'],
        'install' => ['Pending', 'Scheduled', 'In Progress', 'Completed']
    ];

    $allowed_statuses = [];
    if ($type === 'lead') {
        $allowed_statuses = array_map('ucfirst', $hardcoded_statuses['lead']);
    } elseif ($type === 'install') {
        $allowed_statuses = array_map('ucfirst', $hardcoded_statuses['install']);
    }

    if ( !in_array($new_status, $allowed_statuses) ) {
        return new WP_Error( 'invalid_status', 'Invalid status provided.', [ 'status' => 400 ] );
    }

    update_post_meta( $id, "gos_{$type}_status", $new_status ); // e.g., gos_lead_status

    delete_transient('gos_reports_stats'); // Bust cache
    gos_log_activity("Job Status Updated to {$new_status}", $id, 'gos_job');
    return $this->get_job($req); // Return the full updated job object
  }

  public function update_invoice_status( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }

    $status = $request->get_param('status');
    update_post_meta($id, '_invoice_status', $status);
    gos_log_activity("Invoice Status Updated to {$status}", $id, 'gos_job');
    return rest_ensure_response(['success' => true]);
  }

  public function generate_invoice( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $invoice_service = new Invoice();
    $result = $invoice_service->generate_for_job($id);
    return rest_ensure_response($result);
  }
  private function format_job_data( \WP_Post $p ): array {
    return [
        'id'         => $p->ID,
        'date'       => $p->post_date,
        'type'       => get_post_meta($p->ID, 'gos_type', true),
        'width'      => floatval(get_post_meta($p->ID, 'gos_width', true)),
        'height'     => floatval(get_post_meta($p->ID, 'gos_height', true)),
        'price'      => floatval(get_post_meta($p->ID, 'gos_price', true)),
        'lead_status' => get_post_meta( $p->ID, 'gos_lead_status', true ) ?: 'New',
        'install_status' => get_post_meta( $p->ID, 'gos_install_status', true ) ?: 'Pending',
        'notes'      => get_post_meta( $p->ID, 'gos_notes', true ),
        'schedule'   => get_post_meta( $p->ID, 'gos_schedule', true ),
        'first_name' => get_post_meta($p->ID, 'gos_first_name', true),
        'last_name'  => get_post_meta($p->ID, 'gos_last_name', true),
        'phone'      => get_post_meta($p->ID, 'gos_phone', true),
        'email'      => get_post_meta($p->ID, 'gos_email', true),
        'address'    => get_post_meta($p->ID, 'gos_address', true),
        'form_data'  => json_decode(get_post_meta($p->ID, 'gos_form_data', true) ?: '[]', true),
        'invoice_number' => get_post_meta($p->ID, '_invoice_number', true),
        'invoice_url'    => get_post_meta($p->ID, '_invoice_pdf_url', true),
    ];
  }

  // --- Settings Callbacks ---

  public function get_pricing_settings() {
    $opt = get_option( 'gos_pricing', [ 'window' => 250, 'door' => 350 ] );
    return rest_ensure_response( $opt );
  }

  public function save_pricing_settings( WP_REST_Request $req ) {
    $d = $req->get_json_params();
    $sanitized_data = [
        'window' => isset($d['window']) ? floatval($d['window']) : 0,
        'door'   => isset($d['door']) ? floatval($d['door']) : 0,
    ];
    update_option( 'gos_pricing', $sanitized_data );
    return rest_ensure_response( $sanitized_data );
  }

  public function get_form_settings() {
    $default_fields = [
        [ 'id' => 'first_name', 'label' => 'First Name', 'type' => 'text', 'required' => true ],
        [ 'id' => 'last_name', 'label' => 'Last Name', 'type' => 'text', 'required' => true ],
        [ 'id' => 'email', 'label' => 'Email Address', 'type' => 'email', 'required' => true ],
        [ 'id' => 'phone', 'label' => 'Phone Number', 'type' => 'tel', 'required' => true ],
        [ 'id' => 'address', 'label' => 'Address', 'type' => 'textarea', 'required' => true ],
    ];
    $fields = get_option( 'gos_form_fields', $default_fields );
    return rest_ensure_response( $fields );
  }

  public function save_form_settings( WP_REST_Request $req ) {
    $form_fields = $req->get_json_params();
    $sanitized_fields = [];
    if ( is_array( $form_fields ) ) {
        foreach ( $form_fields as $field ) {
            $sanitized_id = isset($field['id']) ? sanitize_key( $field['id'] ) : '';
            $sanitized_label = isset($field['label']) ? sanitize_text_field( $field['label'] ) : '';
            $sanitized_type = isset($field['type']) ? sanitize_text_field( $field['type'] ) : '';

            // Ensure essential fields are present and not empty after sanitization
            if ( !empty($sanitized_id) && !empty($sanitized_label) && !empty($sanitized_type) ) {
                $sanitized_fields[] = [
                    'id'       => $sanitized_id,
                    'label'    => $sanitized_label,
                    'type'     => in_array($sanitized_type, ['text', 'textarea', 'email', 'tel', 'checkbox', 'dropdown']) ? $sanitized_type : 'text',
                    'required' => !empty( $field['required'] ),
                    'options'  => isset($field['options']) ? sanitize_text_field($field['options']) : '',
                ];
            }
        }
    }
    update_option( 'gos_form_fields', $sanitized_fields );
    return rest_ensure_response( [ 'success' => true ] );
  }

  // ============================================================================
  // DIARY / CALENDAR CALLBACK METHODS
  // ============================================================================

  /**
   * Get all diary events
   * Returns jobs with schedule information formatted for calendar display
   */
  public function get_diary_events( WP_REST_Request $request ) {
    $args = [
        'post_type'      => 'gos_job',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
        'meta_query'     => [
            [
                'key'     => 'gos_schedule',
                'compare' => 'EXISTS',
            ],
        ],
    ];

    $jobs = get_posts( $args );
    $events = [];

    foreach ( $jobs as $job ) {
        $schedule = get_post_meta( $job->ID, 'gos_schedule', true );
        if ( empty( $schedule ) ) {
            continue;
        }

        $schedule_data = is_string( $schedule ) ? json_decode( $schedule, true ) : $schedule;
        
        if ( ! empty( $schedule_data['datetime'] ) ) {
            $events[] = [
                'id'       => $job->ID,
                'datetime' => $schedule_data['datetime'],
                'duration' => $schedule_data['duration'] ?? 2,
                'fitter'   => $schedule_data['fitter'] ?? 'Unassigned',
                'type'     => get_post_meta( $job->ID, 'gos_type', true ) ?: 'measure',
                'status'   => get_post_meta( $job->ID, 'gos_install_status', true ) ?: 'scheduled',
                'job'      => [
                    'id'         => $job->ID,
                    'first_name' => get_post_meta( $job->ID, 'gos_first_name', true ),
                    'last_name'  => get_post_meta( $job->ID, 'gos_last_name', true ),
                    'address'    => get_post_meta( $job->ID, 'gos_address', true ),
                    'phone'      => get_post_meta( $job->ID, 'gos_phone', true ),
                ],
            ];
        }
    }

    return rest_ensure_response( $events );
  }

  /**
   * Get single diary event
   */
  public function get_diary_event( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $job = get_post( $id );

    if ( ! $job || 'gos_job' !== $job->post_type ) {
        return new WP_Error( 'invalid_event_id', 'Invalid event ID.', [ 'status' => 404 ] );
    }

    $schedule = get_post_meta( $id, 'gos_schedule', true );
    $schedule_data = is_string( $schedule ) ? json_decode( $schedule, true ) : $schedule;

    $event = [
        'id'       => $id,
        'datetime' => $schedule_data['datetime'] ?? '',
        'duration' => $schedule_data['duration'] ?? 2,
        'fitter'   => $schedule_data['fitter'] ?? 'Unassigned',
        'type'     => get_post_meta( $id, 'gos_type', true ) ?: 'measure',
        'status'   => get_post_meta( $id, 'gos_install_status', true ) ?: 'scheduled',
        'job'      => $this->format_job_data( $job ),
    ];

    return rest_ensure_response( $event );
  }

  /**
   * Create new diary event
   */
  public function create_diary_event( WP_REST_Request $request ) {
    $params = $request->get_json_params();

    $job_id = wp_insert_post( [
        'post_type'   => 'gos_job',
        'post_title'  => sprintf( '%s %s', $params['first_name'] ?? '', $params['last_name'] ?? 'Event' ),
        'post_status' => 'publish',
    ] );

    if ( is_wp_error( $job_id ) ) {
        return $job_id;
    }

    $schedule = [
        'datetime' => $params['datetime'],
        'duration' => $params['duration'] ?? 2,
        'fitter'   => $params['fitter'] ?? 'Unassigned',
    ];
    update_post_meta( $job_id, 'gos_schedule', json_encode( $schedule ) );

    if ( ! empty( $params['first_name'] ) ) update_post_meta( $job_id, 'gos_first_name', sanitize_text_field( $params['first_name'] ) );
    if ( ! empty( $params['last_name'] ) ) update_post_meta( $job_id, 'gos_last_name', sanitize_text_field( $params['last_name'] ) );
    if ( ! empty( $params['phone'] ) ) update_post_meta( $job_id, 'gos_phone', sanitize_text_field( $params['phone'] ) );
    if ( ! empty( $params['address'] ) ) update_post_meta( $job_id, 'gos_address', sanitize_text_field( $params['address'] ) );
    if ( ! empty( $params['type'] ) ) update_post_meta( $job_id, 'gos_type', sanitize_text_field( $params['type'] ) );
    if ( ! empty( $params['status'] ) ) update_post_meta( $job_id, 'gos_install_status', sanitize_text_field( $params['status'] ) );

    gos_log_activity( 'Diary Event Created', $job_id, 'gos_job' );
    return rest_ensure_response( [ 'success' => true, 'id' => $job_id ] );
  }

  /**
   * Update existing diary event
   */
  public function update_diary_event( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $params = $request->get_json_params();

    $job = get_post( $id );
    if ( ! $job || 'gos_job' !== $job->post_type ) {
        return new WP_Error( 'invalid_event_id', 'Invalid event ID.', [ 'status' => 404 ] );
    }

    if ( isset( $params['datetime'] ) || isset( $params['duration'] ) || isset( $params['fitter'] ) ) {
        $current_schedule = get_post_meta( $id, 'gos_schedule', true );
        $schedule_data = is_string( $current_schedule ) ? json_decode( $current_schedule, true ) : [];

        if ( isset( $params['datetime'] ) ) $schedule_data['datetime'] = $params['datetime'];
        if ( isset( $params['duration'] ) ) $schedule_data['duration'] = $params['duration'];
        if ( isset( $params['fitter'] ) ) $schedule_data['fitter'] = $params['fitter'];

        update_post_meta( $id, 'gos_schedule', json_encode( $schedule_data ) );
    }

    if ( isset( $params['first_name'] ) ) update_post_meta( $id, 'gos_first_name', sanitize_text_field( $params['first_name'] ) );
    if ( isset( $params['last_name'] ) ) update_post_meta( $id, 'gos_last_name', sanitize_text_field( $params['last_name'] ) );
    if ( isset( $params['phone'] ) ) update_post_meta( $id, 'gos_phone', sanitize_text_field( $params['phone'] ) );
    if ( isset( $params['address'] ) ) update_post_meta( $id, 'gos_address', sanitize_text_field( $params['address'] ) );
    if ( isset( $params['type'] ) ) update_post_meta( $id, 'gos_type', sanitize_text_field( $params['type'] ) );
    if ( isset( $params['status'] ) ) update_post_meta( $id, 'gos_install_status', sanitize_text_field( $params['status'] ) );

    gos_log_activity( 'Diary Event Updated', $id, 'gos_job' );
    return rest_ensure_response( [ 'success' => true ] );
  }

  /**
   * Delete diary event
   */
  public function delete_diary_event( WP_REST_Request $request ) {
    $id = (int) $request['id'];

    $job = get_post( $id );
    if ( ! $job || 'gos_job' !== $job->post_type ) {
        return new WP_Error( 'invalid_event_id', 'Invalid event ID.', [ 'status' => 404 ] );
    }

    $deleted = wp_delete_post( $id, true );
    if ( ! $deleted ) {
        return new WP_Error( 'delete_failed', 'Failed to delete event.', [ 'status' => 500 ] );
    }

    gos_log_activity( 'Diary Event Deleted', $id, 'gos_job' );
    return rest_ensure_response( [ 'success' => true ] );
  }

  // ============================================================================
  // TEAM MANAGEMENT CALLBACK METHODS
  // ============================================================================

  /**
   * Get all team members
   * Returns comprehensive team data including HR info, availability, and upcoming events
   */
  public function get_team( WP_REST_Request $request ) {
    $args = [
        'post_type'      => 'gos_fitter',
        'posts_per_page' => -1,
        'post_status'    => 'publish',
    ];

    // Branch filtering for non-admin users
    $branch_id = get_user_meta( get_current_user_id(), '_branch_id', true );
    if ( ! current_user_can( 'manage_options' ) && ! empty( $branch_id ) ) {
        $args['meta_query'] = [
            [
                'key'     => '_branch_id',
                'value'   => $branch_id,
                'compare' => '=',
            ],
        ];
    }

    $team_members = get_posts( $args );
    $output = [];

    foreach ( $team_members as $member ) {
        $output[] = $this->format_team_member_data( $member );
    }

    return rest_ensure_response( $output );
  }

  /**
   * Get single team member with full details
   */
  public function get_team_member( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $member = get_post( $id );

    if ( ! $member || 'gos_fitter' !== $member->post_type ) {
        return new WP_Error( 'invalid_member_id', 'Invalid team member ID.', [ 'status' => 404 ] );
    }

    return rest_ensure_response( $this->format_team_member_data( $member, true ) );
  }

  /**
   * Create or update team member
   */
  public function save_team_member( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    $id = $request['id'] ?? null;

    // Prepare post data
    $post_data = [
        'post_type'   => 'gos_fitter',
        'post_title'  => sanitize_text_field( $params['name'] ?? 'Team Member' ),
        'post_status' => 'publish',
    ];

    if ( $id ) {
        $post_data['ID'] = $id;
        $saved_id = wp_update_post( $post_data );
        $action = 'Team Member Updated';
    } else {
        $saved_id = wp_insert_post( $post_data );
        $action = 'Team Member Created';
    }

    if ( is_wp_error( $saved_id ) ) {
        return $saved_id;
    }

    // Save all team member data
    $meta_fields = [
        'fitter_email'         => 'sanitize_email',
        'fitter_mobile'        => 'sanitize_text_field',
        'job_title'            => 'sanitize_text_field',
        'role'                 => 'sanitize_text_field',
        'branch'               => 'sanitize_text_field',
        'status'               => 'sanitize_text_field',
        'start_date'           => 'sanitize_text_field',
        'contract_type'        => 'sanitize_text_field',
        'hourly_rate'          => 'floatval',
        'salary'               => 'floatval',
        'pto_earned'           => 'intval',
        'pto_taken'            => 'intval',
        'pto_remaining'        => 'intval',
        'sick_days_used'       => 'intval',
        'emergency_contact'    => 'sanitize_text_field',
    ];

    foreach ( $meta_fields as $key => $sanitize_func ) {
        if ( isset( $params[$key] ) ) {
            $value = $sanitize_func( $params[$key] );
            update_post_meta( $saved_id, $key, $value );
        }
    }

    // Branch assignment
    $branch_id = get_user_meta( get_current_user_id(), '_branch_id', true );
    if ( ! empty( $branch_id ) ) {
        update_post_meta( $saved_id, '_branch_id', $branch_id );
    }

    gos_log_activity( $action, $saved_id, 'gos_fitter' );
    return rest_ensure_response( [
        'success' => true,
        'id'      => $saved_id,
        'member'  => $this->format_team_member_data( get_post( $saved_id ), true ),
    ] );
  }

  /**
   * Delete team member
   */
  public function delete_team_member( WP_REST_Request $request ) {
    $id = (int) $request['id'];

    $member = get_post( $id );
    if ( ! $member || 'gos_fitter' !== $member->post_type ) {
        return new WP_Error( 'invalid_member_id', 'Invalid team member ID.', [ 'status' => 404 ] );
    }

    $deleted = wp_delete_post( $id, true );
    if ( ! $deleted ) {
        return new WP_Error( 'delete_failed', 'Failed to delete team member.', [ 'status' => 500 ] );
    }

    gos_log_activity( 'Team Member Deleted', $id, 'gos_fitter' );
    return rest_ensure_response( [ 'success' => true ] );
  }

  /**
   * Save team member availability
   */
  public function save_team_availability( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $params = $request->get_json_params();

    $member = get_post( $id );
    if ( ! $member || 'gos_fitter' !== $member->post_type ) {
        return new WP_Error( 'invalid_member_id', 'Invalid team member ID.', [ 'status' => 404 ] );
    }

    // Save availability data (stored as JSON)
    $availability = get_post_meta( $id, 'team_availability', true );
    if ( ! is_array( $availability ) ) {
        $availability = [];
    }

    // Add or update availability entry
    $entry = [
        'date'     => sanitize_text_field( $params['date'] ?? '' ),
        'type'     => sanitize_text_field( $params['type'] ?? 'unavailable' ), // holiday, sick, training, unavailable
        'notes'    => sanitize_text_field( $params['notes'] ?? '' ),
        'duration' => floatval( $params['duration'] ?? 1 ),
    ];

    $availability[] = $entry;
    update_post_meta( $id, 'team_availability', $availability );

    gos_log_activity( 'Team Availability Updated', $id, 'gos_fitter' );
    return rest_ensure_response( [ 'success' => true ] );
  }

  /**
   * Upload team document
   */
  public function upload_team_document( WP_REST_Request $request ) {
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    $staff_id = $request->get_param( 'staff_id' );
    
    if ( ! isset( $_FILES['file'] ) ) {
        return new WP_Error( 'no_file', 'No file uploaded.', [ 'status' => 400 ] );
    }

    $upload = media_handle_upload( 'file', 0 );

    if ( is_wp_error( $upload ) ) {
        return $upload;
    }

    // Store document reference in team member meta
    $documents = get_post_meta( $staff_id, 'team_documents', true );
    if ( ! is_array( $documents ) ) {
        $documents = [];
    }

    $documents[] = [
        'attachment_id' => $upload,
        'name'          => get_the_title( $upload ),
        'upload_date'   => current_time( 'Y-m-d' ),
        'url'           => wp_get_attachment_url( $upload ),
    ];

    update_post_meta( $staff_id, 'team_documents', $documents );

    gos_log_activity( 'Team Document Uploaded', $staff_id, 'gos_fitter' );
    return rest_ensure_response( [
        'success'       => true,
        'attachment_id' => $upload,
        'url'           => wp_get_attachment_url( $upload ),
    ] );
  }

  /**
   * Format team member data for API response
   */
  private function format_team_member_data( $member, $include_details = false ) {
    $data = [
        'id'               => $member->ID,
        'name'             => $member->post_title,
        'email'            => get_post_meta( $member->ID, 'fitter_email', true ),
        'mobile'           => get_post_meta( $member->ID, 'fitter_mobile', true ),
        'job_title'        => get_post_meta( $member->ID, 'job_title', true ),
        'role'             => get_post_meta( $member->ID, 'role', true ) ?: 'fitter',
        'branch'           => get_post_meta( $member->ID, 'branch', true ) ?: 'main',
        'status'           => get_post_meta( $member->ID, 'status', true ) ?: 'active',
        'pto_remaining'    => (int) get_post_meta( $member->ID, 'pto_remaining', true ),
        'sick_days_used'   => (int) get_post_meta( $member->ID, 'sick_days_used', true ),
        'upcoming_events'  => 0, // TODO: Count from diary
    ];

    // Include detailed data if requested
    if ( $include_details ) {
        $data = array_merge( $data, [
            'start_date'          => get_post_meta( $member->ID, 'start_date', true ),
            'contract_type'       => get_post_meta( $member->ID, 'contract_type', true ) ?: 'full-time',
            'hourly_rate'         => get_post_meta( $member->ID, 'hourly_rate', true ),
            'salary'              => get_post_meta( $member->ID, 'salary', true ),
            'pto_earned'          => (int) get_post_meta( $member->ID, 'pto_earned', true ),
            'pto_taken'           => (int) get_post_meta( $member->ID, 'pto_taken', true ),
            'emergency_contact'   => get_post_meta( $member->ID, 'emergency_contact', true ),
            'hours_this_week'     => 0, // TODO: Calculate from diary
            'hours_this_month'    => 0, // TODO: Calculate from diary
            'documents'           => get_post_meta( $member->ID, 'team_documents', true ) ?: [],
            'notes'               => get_post_meta( $member->ID, 'team_notes', true ) ?: [],
            'upcoming_events_list' => [], // TODO: Fetch from diary
        ] );
    }

    return $data;
  }
  
  // ============================================================================
  // FINANCE MODULE - DATABASE SETUP
  // ============================================================================
  
  /**
   * Create custom finance tables
   * Called on plugin activation
   */
  public function create_finance_tables() {
    global $wpdb;
    $charset_collate = $wpdb->get_charset_collate();
    
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    
    // Invoice Items Table
    $table_invoice_items = $wpdb->prefix . 'gos_invoice_items';
    $sql_invoice_items = "CREATE TABLE $table_invoice_items (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      invoice_id BIGINT UNSIGNED NOT NULL,
      line_order INT DEFAULT 0,
      description VARCHAR(255) NOT NULL,
      quantity DECIMAL(10,2) DEFAULT 1.00,
      unit_price DECIMAL(10,2) NOT NULL,
      vat_rate DECIMAL(5,2) DEFAULT 20.00,
      vat_amount DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity * vat_rate / 100) STORED,
      subtotal DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
      total DECIMAL(10,2) GENERATED ALWAYS AS (unit_price * quantity * (1 + vat_rate / 100)) STORED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_invoice_id (invoice_id),
      FOREIGN KEY (invoice_id) REFERENCES {$wpdb->posts}(ID) ON DELETE CASCADE
    ) $charset_collate;";
    dbDelta( $sql_invoice_items );
    
    // Payment Allocations Table
    $table_payment_allocations = $wpdb->prefix . 'gos_payment_allocations';
    $sql_payment_allocations = "CREATE TABLE $table_payment_allocations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      payment_id BIGINT UNSIGNED NOT NULL,
      invoice_id BIGINT UNSIGNED NOT NULL,
      allocated_amount DECIMAL(10,2) NOT NULL,
      allocation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      allocated_by_user_id BIGINT UNSIGNED,
      notes TEXT,
      INDEX idx_payment_id (payment_id),
      INDEX idx_invoice_id (invoice_id),
      FOREIGN KEY (payment_id) REFERENCES {$wpdb->posts}(ID) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES {$wpdb->posts}(ID) ON DELETE CASCADE
    ) $charset_collate;";
    dbDelta( $sql_payment_allocations );
    
    // Transaction Ledger Table
    $table_transactions = $wpdb->prefix . 'gos_transactions';
    $sql_transactions = "CREATE TABLE $table_transactions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      transaction_type ENUM('invoice', 'expense', 'payment_in', 'payment_out', 'payslip') NOT NULL,
      post_id BIGINT UNSIGNED NOT NULL,
      transaction_date DATE NOT NULL,
      description VARCHAR(255),
      amount DECIMAL(10,2) NOT NULL,
      vat_amount DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'GBP',
      category VARCHAR(50),
      job_id BIGINT UNSIGNED,
      customer_id BIGINT UNSIGNED,
      supplier_id BIGINT UNSIGNED,
      staff_id BIGINT UNSIGNED,
      branch_id BIGINT UNSIGNED,
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_transaction_type (transaction_type),
      INDEX idx_transaction_date (transaction_date),
      INDEX idx_job_id (job_id),
      INDEX idx_customer_id (customer_id),
      INDEX idx_supplier_id (supplier_id),
      INDEX idx_staff_id (staff_id),
      INDEX idx_branch_id (branch_id),
      INDEX idx_status (status),
      INDEX idx_date_type (transaction_date, transaction_type)
    ) $charset_collate;";
    dbDelta( $sql_transactions );
    
    // Tax Rates Table
    $table_tax_rates = $wpdb->prefix . 'gos_tax_rates';
    $sql_tax_rates = "CREATE TABLE $table_tax_rates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      rate_name VARCHAR(50) NOT NULL,
      rate_percentage DECIMAL(5,2) NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      effective_from DATE,
      effective_to DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_rate_name (rate_name)
    ) $charset_collate;";
    dbDelta( $sql_tax_rates );
    
    // Insert default tax rates
    $wpdb->query("INSERT IGNORE INTO $table_tax_rates (rate_name, rate_percentage, is_default, is_active) VALUES
      ('VAT Standard Rate', 20.00, TRUE, TRUE),
      ('VAT Reduced Rate', 5.00, FALSE, TRUE),
      ('VAT Zero Rate', 0.00, FALSE, TRUE),
      ('No VAT', 0.00, FALSE, TRUE)
    ");
    
    // Store database version
    update_option( 'gos_finance_db_version', '1.0.0' );
  }
  
  // ============================================================================
  // FINANCE MODULE - INVOICE CRUD ENDPOINTS
  // ============================================================================
  
  /**
   * Get all invoices
   */
  public function get_invoices( WP_REST_Request $request ) {
    $params = $request->get_query_params();
    $page = isset( $params['page'] ) ? (int) $params['page'] : 1;
    $per_page = isset( $params['per_page'] ) ? (int) $params['per_page'] : 20;
    
    $args = [
        'post_type'      => 'gos_invoice',
        'posts_per_page' => $per_page,
        'paged'          => $page,
        'orderby'        => 'date',
        'order'          => 'DESC',
        'post_status'    => 'any',
    ];
    
    // Branch filtering
    $branch_id = get_user_meta( get_current_user_id(), '_branch_id', true );
    if ( ! current_user_can( 'manage_options' ) && ! empty( $branch_id ) ) {
        $args['meta_query'][] = [
            'key'     => '_branch_id',
            'value'   => $branch_id,
            'compare' => '=',
        ];
    }
    
    // Status filtering
    if ( ! empty( $params['status'] ) ) {
        $args['post_status'] = sanitize_text_field( $params['status'] );
    }
    
    // Search
    if ( ! empty( $params['search'] ) ) {
        $args['s'] = sanitize_text_field( $params['search'] );
    }
    
    $query = new \WP_Query( $args );
    $invoices = array_map( [ $this, 'format_invoice_data' ], $query->get_posts() );
    
    $response = new WP_REST_Response( $invoices );
    $response->header( 'X-WP-Total', $query->found_posts );
    $response->header( 'X-WP-TotalPages', $query->max_num_pages );
    
    return $response;
  }
  
  /**
   * Get single invoice
   */
  public function get_invoice( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $invoice = get_post( $id );
    
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    return rest_ensure_response( $this->format_invoice_data( $invoice, true ) );
  }
  
  /**
   * Create invoice
   */
  public function create_invoice( WP_REST_Request $request ) {
    $params = $request->get_json_params();
    
    // Generate invoice number
    $invoice_number = $this->generate_invoice_number();
    
    // Create invoice post
    $invoice_data = [
        'post_type'   => 'gos_invoice',
        'post_title'  => $invoice_number,
        'post_status' => 'draft',
    ];
    
    $invoice_id = wp_insert_post( $invoice_data );
    
    if ( is_wp_error( $invoice_id ) ) {
        return $invoice_id;
    }
    
    // Save invoice metadata
    $this->save_invoice_meta( $invoice_id, $params );
    
    // Save line items
    if ( ! empty( $params['items'] ) ) {
        $this->save_invoice_items( $invoice_id, $params['items'] );
    }
    
    // Calculate totals
    $this->calculate_invoice_totals( $invoice_id );
    
    // Log activity
    gos_log_activity( 'Invoice Created', $invoice_id, 'gos_invoice' );
    
    // Insert into ledger
    $this->insert_transaction_ledger( $invoice_id, 'invoice' );
    
    return rest_ensure_response( [
        'success' => true,
        'id'      => $invoice_id,
        'invoice' => $this->format_invoice_data( get_post( $invoice_id ), true ),
    ] );
  }
  
  /**
   * Update invoice
   */
  public function update_invoice( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $params = $request->get_json_params();
    
    $invoice = get_post( $id );
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    // Update invoice metadata
    $this->save_invoice_meta( $id, $params );
    
    // Update line items if provided
    if ( isset( $params['items'] ) ) {
        $this->save_invoice_items( $id, $params['items'] );
    }
    
    // Recalculate totals
    $this->calculate_invoice_totals( $id );
    
    // Update status if provided
    if ( isset( $params['status'] ) ) {
        wp_update_post( [
            'ID'          => $id,
            'post_status' => sanitize_text_field( $params['status'] ),
        ] );
    }
    
    // Log activity
    gos_log_activity( 'Invoice Updated', $id, 'gos_invoice' );
    
    // Update ledger
    $this->update_transaction_ledger( $id, 'invoice' );
    
    return rest_ensure_response( [
        'success' => true,
        'invoice' => $this->format_invoice_data( get_post( $id ), true ),
    ] );
  }
  
  /**
   * Delete invoice
   */
  public function delete_invoice( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    
    $invoice = get_post( $id );
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    // Log before deletion
    gos_log_activity( 'Invoice Deleted', $id, 'gos_invoice' );
    
    // Delete (ledger entries cascade via foreign key)
    $deleted = wp_delete_post( $id, true );
    
    if ( ! $deleted ) {
        return new WP_Error( 'delete_failed', 'Failed to delete invoice.', [ 'status' => 500 ] );
    }
    
    return rest_ensure_response( [ 'success' => true ] );
  }
  
  /**
   * Send invoice via email
   */
  public function send_invoice( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    
    $invoice = get_post( $id );
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    // Get invoice data
    $customer_email = get_post_meta( $id, '_customer_email', true );
    $customer_name = get_post_meta( $id, '_customer_name', true );
    $invoice_number = get_post_meta( $id, '_invoice_number', true );
    $total_amount = get_post_meta( $id, '_total_amount', true );
    $due_date = get_post_meta( $id, '_due_date', true );
    
    // Validate customer email
    if ( empty( $customer_email ) || ! is_email( $customer_email ) ) {
        return new WP_Error( 'invalid_email', 'Customer email is required to send invoice.', [ 'status' => 400 ] );
    }
    
    // Prepare email content
    $subject = sprintf( 'Invoice %s from %s', $invoice_number, get_bloginfo( 'name' ) );
    
    $message = $this->get_invoice_email_template( [
        'customer_name' => $customer_name,
        'invoice_number' => $invoice_number,
        'total_amount' => number_format( (float) $total_amount, 2 ),
        'due_date' => date( 'jS F Y', strtotime( $due_date ) ),
        'company_name' => get_bloginfo( 'name' ),
        'view_link' => home_url( '/invoice/' . $invoice_number ), // TODO: Create public invoice view page
    ] );
    
    // Email headers
    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . get_bloginfo( 'name' ) . ' <' . get_option( 'admin_email' ) . '>',
    ];
    
    // Send email
    $sent = wp_mail( $customer_email, $subject, $message, $headers );
    
    if ( ! $sent ) {
        return new WP_Error( 'email_failed', 'Failed to send invoice email.', [ 'status' => 500 ] );
    }
    
    // Update sent date and count
    $sent_count = intval( get_post_meta( $id, '_sent_count', true ) );
    update_post_meta( $id, '_sent_date', current_time( 'Y-m-d H:i:s' ) );
    update_post_meta( $id, '_sent_count', $sent_count + 1 );
    
    // Auto-transition draft → sent
    if ( $invoice->post_status === 'draft' ) {
        wp_update_post( [
            'ID'          => $id,
            'post_status' => 'sent',
        ] );
    }
    
    // Log activity
    gos_log_activity( 'Invoice Sent', $id, 'gos_invoice' );
    
    return rest_ensure_response( [
        'success' => true,
        'message' => sprintf( 'Invoice sent to %s successfully', $customer_email ),
        'invoice' => $this->format_invoice_data( get_post( $id ), true ),
    ] );
  }
  
  /**
   * Generate invoice PDF
   */
  public function generate_invoice_pdf( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    
    $invoice = get_post( $id );
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    // Get invoice data
    $invoice_data = $this->format_invoice_data( $invoice, true );
    
    // Generate PDF HTML content
    $pdf_html = $this->get_invoice_pdf_template( $invoice_data );
    
    // Create uploads directory if it doesn't exist
    $upload_dir = wp_upload_dir();
    $invoices_dir = $upload_dir['basedir'] . '/invoices';
    
    if ( ! file_exists( $invoices_dir ) ) {
        wp_mkdir_p( $invoices_dir );
    }
    
    // Save HTML version (can be opened in browser and printed as PDF)
    $filename = 'invoice-' . $invoice_data['invoice_number'] . '.html';
    $filepath = $invoices_dir . '/' . $filename;
    $pdf_url = $upload_dir['baseurl'] . '/invoices/' . $filename;
    
    file_put_contents( $filepath, $pdf_html );
    
    // Update invoice meta
    update_post_meta( $id, '_pdf_url', $pdf_url );
    update_post_meta( $id, '_pdf_generated_date', current_time( 'Y-m-d H:i:s' ) );
    
    // Log activity
    gos_log_activity( 'Invoice PDF Generated', $id, 'gos_invoice' );
    
    return rest_ensure_response( [
        'success' => true,
        'message' => 'PDF generated successfully',
        'pdf_url' => $pdf_url,
    ] );
  }
  
  /**
   * Record payment against invoice
   */
  public function record_invoice_payment( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $params = $request->get_json_params();
    
    $invoice = get_post( $id );
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    $amount = floatval( $params['amount'] ?? 0 );
    if ( $amount <= 0 ) {
        return new WP_Error( 'invalid_amount', 'Payment amount must be greater than 0.', [ 'status' => 400 ] );
    }
    
    // Create payment_in post
    $payment_id = wp_insert_post( [
        'post_type'   => 'gos_payment_in',
        'post_status' => 'publish',
        'post_title'  => 'Payment for ' . get_post_meta( $id, '_invoice_number', true ),
    ] );
    
    if ( is_wp_error( $payment_id ) ) {
        return $payment_id;
    }
    
    // Save payment metadata
    update_post_meta( $payment_id, '_amount', $amount );
    update_post_meta( $payment_id, '_payment_date', $params['payment_date'] ?? current_time( 'Y-m-d' ) );
    update_post_meta( $payment_id, '_payment_method', sanitize_text_field( $params['payment_method'] ?? 'other' ) );
    update_post_meta( $payment_id, '_reference', sanitize_text_field( $params['reference'] ?? '' ) );
    update_post_meta( $payment_id, '_invoice_id', $id );
    
    // Insert into payment_allocations table
    global $wpdb;
    $allocations_table = $wpdb->prefix . 'gos_payment_allocations';
    
    $wpdb->insert( $allocations_table, [
        'payment_id'         => $payment_id,
        'invoice_id'         => $id,
        'allocated_amount'   => $amount,
        'allocation_date'    => current_time( 'mysql' ),
        'allocated_by_user_id' => get_current_user_id(),
    ] );
    
    // Update invoice _amount_paid
    $current_paid = floatval( get_post_meta( $id, '_amount_paid', true ) );
    $new_paid = $current_paid + $amount;
    update_post_meta( $id, '_amount_paid', $new_paid );
    
    // Recalculate balance and auto-update status
    $this->calculate_invoice_totals( $id );
    
    // Log activity
    gos_log_activity( 'Payment Recorded', $id, 'gos_invoice' );
    
    return rest_ensure_response( [
        'success'    => true,
        'message'    => 'Payment recorded successfully',
        'payment_id' => $payment_id,
        'invoice'    => $this->format_invoice_data( get_post( $id ), true ),
    ] );
  }
  
  /**
   * Get finance analytics
   */
  public function get_finance_analytics( WP_REST_Request $request ) {
    global $wpdb;
    
    // Get date range from request
    $start_date = $request->get_param( 'start_date' );
    $end_date = $request->get_param( 'end_date' );
    
    // Default to current month if not provided
    if ( ! $start_date || ! $end_date ) {
        $start_date = date( 'Y-m-01' );
        $end_date = date( 'Y-m-t' );
    }
    
    // Calculate revenue (sum of paid invoices in period)
    $revenue = $wpdb->get_var( $wpdb->prepare(
        "SELECT SUM(pm.meta_value) 
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
         INNER JOIN {$wpdb->postmeta} pm_date ON p.ID = pm_date.post_id
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status IN ('paid', 'partial', 'publish')
         AND pm.meta_key = '_amount_paid'
         AND pm_date.meta_key = '_invoice_date'
         AND pm_date.meta_value BETWEEN %s AND %s
         AND pm.meta_value > 0",
        $start_date,
        $end_date
    ) );
    
    // Calculate expenses (sum of expenses in period)
    $expenses = $wpdb->get_var( $wpdb->prepare(
        "SELECT SUM(pm.meta_value)
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
         INNER JOIN {$wpdb->postmeta} pm_date ON p.ID = pm_date.post_id
         WHERE p.post_type = 'gos_expense'
         AND p.post_status = 'publish'
         AND pm.meta_key = '_total_amount'
         AND pm_date.meta_key = '_expense_date'
         AND pm_date.meta_value BETWEEN %s AND %s",
        $start_date,
        $end_date
    ) );
    
    // Calculate outstanding (sum of unpaid/partial invoice balances)
    $outstanding = $wpdb->get_var(
        "SELECT SUM(pm.meta_value)
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status IN ('sent', 'viewed', 'partial', 'overdue')
         AND pm.meta_key = '_balance_due'"
    );
    
    // Count overdue invoices
    $overdue_invoices = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(DISTINCT p.ID)
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_due ON p.ID = pm_due.post_id
         INNER JOIN {$wpdb->postmeta} pm_balance ON p.ID = pm_balance.post_id
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status IN ('sent', 'viewed', 'partial')
         AND pm_due.meta_key = '_due_date'
         AND pm_due.meta_value < %s
         AND pm_balance.meta_key = '_balance_due'
         AND pm_balance.meta_value > 0",
        current_time( 'Y-m-d' )
    ) );
    
    // Count total invoices in period
    $total_invoices = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(DISTINCT p.ID)
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_date ON p.ID = pm_date.post_id
         WHERE p.post_type = 'gos_invoice'
         AND pm_date.meta_key = '_invoice_date'
         AND pm_date.meta_value BETWEEN %s AND %s",
        $start_date,
        $end_date
    ) );
    
    // Count paid invoices
    $paid_invoices = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(DISTINCT p.ID)
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_date ON p.ID = pm_date.post_id
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status = 'paid'
         AND pm_date.meta_key = '_invoice_date'
         AND pm_date.meta_value BETWEEN %s AND %s",
        $start_date,
        $end_date
    ) );
    
    // Count total expenses
    $total_expenses = $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(DISTINCT p.ID)
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_date ON p.ID = pm_date.post_id
         WHERE p.post_type = 'gos_expense'
         AND pm_date.meta_key = '_expense_date'
         AND pm_date.meta_value BETWEEN %s AND %s",
        $start_date,
        $end_date
    ) );
    
    // Calculate profit and margin
    $revenue = floatval( $revenue );
    $expenses = floatval( $expenses );
    $net_profit = $revenue - $expenses;
    $profit_margin = $revenue > 0 ? round( ( $net_profit / $revenue ) * 100, 2 ) : 0;
    
    return rest_ensure_response( [
        'period' => [
            'start_date' => $start_date,
            'end_date'   => $end_date,
        ],
        'revenue'           => $revenue,
        'expenses'          => $expenses,
        'net_profit'        => $net_profit,
        'profit_margin'     => $profit_margin,
        'outstanding'       => floatval( $outstanding ),
        'overdue_invoices'  => intval( $overdue_invoices ),
        'total_invoices'    => intval( $total_invoices ),
        'paid_invoices'     => intval( $paid_invoices ),
        'total_expenses'    => intval( $total_expenses ),
        'currency'          => 'GBP',
    ] );
  }
  
  // ============================================================================
  // FINANCE MODULE - HELPER METHODS
  // ============================================================================
  
  /**
   * Generate next invoice number
   */
  private function generate_invoice_number() {
    $prefix = get_option( 'gos_invoice_prefix', 'INV' );
    $year = date( 'Y' );
    $last_number = get_option( 'gos_last_invoice_number_' . $year, 0 );
    $next_number = $last_number + 1;
    
    update_option( 'gos_last_invoice_number_' . $year, $next_number );
    
    return sprintf( '%s-%s-%04d', $prefix, $year, $next_number );
  }
  
  /**
   * Save invoice metadata
   */
  private function save_invoice_meta( $invoice_id, $params ) {
    $meta_fields = [
        'invoice_number', 'invoice_date', 'due_date',
        'customer_id', 'customer_name', 'customer_email', 'customer_address', 'customer_phone',
        'job_id', 'quote_id',
        'subtotal', 'vat_amount', 'vat_rate', 'discount_amount', 'total_amount',
        'payment_terms', 'payment_link', 'payment_link_expires',
        'notes', 'customer_notes', 'branch_id', 'currency',
    ];
    
    foreach ( $meta_fields as $field ) {
        if ( isset( $params[$field] ) ) {
            $value = $params[$field];
            
            // Sanitize based on type
            if ( in_array( $field, [ 'subtotal', 'vat_amount', 'vat_rate', 'discount_amount', 'total_amount' ] ) ) {
                $value = floatval( $value );
            } elseif ( in_array( $field, [ 'customer_id', 'job_id', 'quote_id', 'branch_id' ] ) ) {
                $value = intval( $value );
            } elseif ( $field === 'customer_email' ) {
                $value = sanitize_email( $value );
            } elseif ( in_array( $field, [ 'notes', 'customer_notes', 'customer_address' ] ) ) {
                $value = sanitize_textarea_field( $value );
            } else {
                $value = sanitize_text_field( $value );
            }
            
            update_post_meta( $invoice_id, '_' . $field, $value );
        }
    }
    
    // Auto-generate invoice number if not provided
    if ( empty( get_post_meta( $invoice_id, '_invoice_number', true ) ) ) {
        update_post_meta( $invoice_id, '_invoice_number', $this->generate_invoice_number() );
    }
    
    // Set default dates
    if ( empty( get_post_meta( $invoice_id, '_invoice_date', true ) ) ) {
        update_post_meta( $invoice_id, '_invoice_date', current_time( 'Y-m-d' ) );
    }
    
    if ( empty( get_post_meta( $invoice_id, '_due_date', true ) ) ) {
        $payment_terms = get_post_meta( $invoice_id, '_payment_terms', true ) ?: 'Net 30';
        $days = intval( preg_replace( '/\D/', '', $payment_terms ) ) ?: 30;
        $due_date = date( 'Y-m-d', strtotime( '+' . $days . ' days' ) );
        update_post_meta( $invoice_id, '_due_date', $due_date );
    }
  }
  
  /**
   * Save invoice line items
   */
  private function save_invoice_items( $invoice_id, $items ) {
    global $wpdb;
    $table = $wpdb->prefix . 'gos_invoice_items';
    
    // Delete existing items
    $wpdb->delete( $table, [ 'invoice_id' => $invoice_id ] );
    
    // Insert new items
    foreach ( $items as $index => $item ) {
        $wpdb->insert( $table, [
            'invoice_id'  => $invoice_id,
            'line_order'  => $index,
            'description' => sanitize_text_field( $item['description'] ?? '' ),
            'quantity'    => floatval( $item['quantity'] ?? 1 ),
            'unit_price'  => floatval( $item['unit_price'] ?? 0 ),
            'vat_rate'    => floatval( $item['vat_rate'] ?? 20 ),
        ] );
    }
  }
  
  /**
   * Calculate invoice totals from line items
   */
  private function calculate_invoice_totals( $invoice_id ) {
    global $wpdb;
    $table = $wpdb->prefix . 'gos_invoice_items';
    
    $totals = $wpdb->get_row( $wpdb->prepare(
        "SELECT 
            SUM(subtotal) as subtotal,
            SUM(vat_amount) as vat_amount,
            SUM(total) as total
        FROM $table
        WHERE invoice_id = %d",
        $invoice_id
    ) );
    
    if ( $totals ) {
        update_post_meta( $invoice_id, '_subtotal', $totals->subtotal );
        update_post_meta( $invoice_id, '_vat_amount', $totals->vat_amount );
        update_post_meta( $invoice_id, '_total_amount', $totals->total );
        
        // Calculate balance due
        $amount_paid = floatval( get_post_meta( $invoice_id, '_amount_paid', true ) );
        $balance_due = $totals->total - $amount_paid;
        update_post_meta( $invoice_id, '_balance_due', $balance_due );
        
        // Auto-update status based on balance
        if ( $balance_due <= 0 && $amount_paid > 0 ) {
            wp_update_post( [
                'ID'          => $invoice_id,
                'post_status' => 'paid',
            ] );
        } elseif ( $amount_paid > 0 ) {
            wp_update_post( [
                'ID'          => $invoice_id,
                'post_status' => 'partial',
            ] );
        }
    }
  }
  
  /**
   * Insert transaction into ledger
   */
  private function insert_transaction_ledger( $post_id, $transaction_type ) {
    global $wpdb;
    $table = $wpdb->prefix . 'gos_transactions';
    
    $data = [
        'transaction_type' => $transaction_type,
        'post_id'          => $post_id,
    ];
    
    // Get data based on type
    if ( $transaction_type === 'invoice' ) {
        $data['transaction_date'] = get_post_meta( $post_id, '_invoice_date', true ) ?: current_time( 'Y-m-d' );
        $data['description']      = get_post_meta( $post_id, '_invoice_number', true );
        $data['amount']           = floatval( get_post_meta( $post_id, '_subtotal', true ) );
        $data['vat_amount']       = floatval( get_post_meta( $post_id, '_vat_amount', true ) );
        $data['total_amount']     = floatval( get_post_meta( $post_id, '_total_amount', true ) );
        $data['customer_id']      = intval( get_post_meta( $post_id, '_customer_id', true ) );
        $data['job_id']           = intval( get_post_meta( $post_id, '_job_id', true ) );
        $data['branch_id']        = intval( get_post_meta( $post_id, '_branch_id', true ) );
        $data['status']           = get_post_status( $post_id );
    }
    
    $wpdb->replace( $table, $data );
  }
  
  /**
   * Update transaction in ledger
   */
  private function update_transaction_ledger( $post_id, $transaction_type ) {
    $this->insert_transaction_ledger( $post_id, $transaction_type ); // REPLACE handles updates
  }
  
  /**
   * Format invoice data for API response
   */
  private function format_invoice_data( \WP_Post $invoice, $include_items = false ) {
    $data = [
        'id'              => $invoice->ID,
        'invoice_number'  => get_post_meta( $invoice->ID, '_invoice_number', true ),
        'invoice_date'    => get_post_meta( $invoice->ID, '_invoice_date', true ),
        'due_date'        => get_post_meta( $invoice->ID, '_due_date', true ),
        'status'          => $invoice->post_status,
        'customer_name'   => get_post_meta( $invoice->ID, '_customer_name', true ),
        'customer_email'  => get_post_meta( $invoice->ID, '_customer_email', true ),
        'subtotal'        => floatval( get_post_meta( $invoice->ID, '_subtotal', true ) ),
        'vat_amount'      => floatval( get_post_meta( $invoice->ID, '_vat_amount', true ) ),
        'total_amount'    => floatval( get_post_meta( $invoice->ID, '_total_amount', true ) ),
        'amount_paid'     => floatval( get_post_meta( $invoice->ID, '_amount_paid', true ) ),
        'balance_due'     => floatval( get_post_meta( $invoice->ID, '_balance_due', true ) ),
        'job_id'          => intval( get_post_meta( $invoice->ID, '_job_id', true ) ),
        'created_date'    => $invoice->post_date,
    ];
    
    // Include line items if requested
    if ( $include_items ) {
        global $wpdb;
        $table = $wpdb->prefix . 'gos_invoice_items';
        $items = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM $table WHERE invoice_id = %d ORDER BY line_order ASC",
            $invoice->ID
        ), ARRAY_A );
        
        $data['items'] = $items;
        $data['customer_address'] = get_post_meta( $invoice->ID, '_customer_address', true );
        $data['customer_phone']   = get_post_meta( $invoice->ID, '_customer_phone', true );
        $data['payment_terms']    = get_post_meta( $invoice->ID, '_payment_terms', true );
        $data['notes']            = get_post_meta( $invoice->ID, '_notes', true );
        $data['customer_notes']   = get_post_meta( $invoice->ID, '_customer_notes', true );
    }
    
    return $data;
  }
  
  /**
   * Get invoice email template
   */
  private function get_invoice_email_template( $data ) {
    $template = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 12px 12px 0 0;
            }
            .content {
                background: #f9fafb;
                padding: 30px;
                border-left: 1px solid #e5e7eb;
                border-right: 1px solid #e5e7eb;
            }
            .invoice-details {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #e5e7eb;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #f3f4f6;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .label {
                font-weight: 600;
                color: #6b7280;
            }
            .value {
                color: #1f2937;
            }
            .total {
                font-size: 1.25rem;
                font-weight: 700;
                color: #667eea;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                margin: 20px 0;
            }
            .footer {
                background: #1f2937;
                color: white;
                padding: 20px 30px;
                text-align: center;
                border-radius: 0 0 12px 12px;
                font-size: 0.875rem;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="margin: 0;">New Invoice</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">From ' . esc_html( $data['company_name'] ) . '</p>
        </div>
        
        <div class="content">
            <p>Dear ' . esc_html( $data['customer_name'] ) . ',</p>
            
            <p>Thank you for your business. Please find your invoice details below:</p>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span class="label">Invoice Number:</span>
                    <span class="value">' . esc_html( $data['invoice_number'] ) . '</span>
                </div>
                <div class="detail-row">
                    <span class="label">Amount Due:</span>
                    <span class="value total">£' . esc_html( $data['total_amount'] ) . '</span>
                </div>
                <div class="detail-row">
                    <span class="label">Due Date:</span>
                    <span class="value">' . esc_html( $data['due_date'] ) . '</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="' . esc_url( $data['view_link'] ) . '" class="button">View Invoice Online</a>
            </div>
            
            <p>If you have any questions about this invoice, please contact us.</p>
            
            <p>Thank you,<br>' . esc_html( $data['company_name'] ) . '</p>
        </div>
        
        <div class="footer">
            <p style="margin: 0;">This is an automated email. Please do not reply directly to this message.</p>
        </div>
    </body>
    </html>
    ';
    
    return $template;
  }
  
  /**
   * Get invoice PDF template
   */
  private function get_invoice_pdf_template( $data ) {
    $company_name = get_bloginfo( 'name' );
    $company_address = get_option( 'gos_company_address', '' );
    $company_phone = get_option( 'gos_company_phone', '' );
    $company_email = get_option( 'admin_email' );
    
    // Calculate line items HTML
    $items_html = '';
    $subtotal = 0;
    
    if ( ! empty( $data['items'] ) ) {
        foreach ( $data['items'] as $item ) {
            $line_total = floatval( $item['total'] );
            $subtotal += $line_total;
            
            $items_html .= '
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">' . esc_html( $item['description'] ) . '</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">' . floatval( $item['quantity'] ) . '</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">£' . number_format( floatval( $item['unit_price'] ), 2 ) . '</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">' . floatval( $item['vat_rate'] ) . '%</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;"><strong>£' . number_format( $line_total, 2 ) . '</strong></td>
            </tr>';
        }
    }
    
    $vat_amount = floatval( $data['vat_amount'] );
    $total = floatval( $data['total_amount'] );
    $paid = floatval( $data['amount_paid'] );
    $balance = floatval( $data['balance_due'] );
    
    $template = '
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice ' . esc_html( $data['invoice_number'] ) . '</title>
        <style>
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 210mm;
                margin: 0 auto;
                padding: 20px;
                background: white;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #667eea;
            }
            .company-details h1 {
                margin: 0 0 10px;
                color: #667eea;
                font-size: 1.75rem;
            }
            .company-details p {
                margin: 4px 0;
                color: #6b7280;
            }
            .invoice-meta {
                text-align: right;
            }
            .invoice-meta h2 {
                margin: 0 0 10px;
                font-size: 1.5rem;
                color: #1f2937;
            }
            .invoice-meta p {
                margin: 4px 0;
            }
            .customer-section {
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            }
            .customer-section h3 {
                margin: 0 0 10px;
                color: #1f2937;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            thead {
                background: #f3f4f6;
            }
            th {
                padding: 12px;
                text-align: left;
                font-weight: 600;
                color: #1f2937;
                border-bottom: 2px solid #e5e7eb;
            }
            th.text-right, td.text-right {
                text-align: right;
            }
            .totals {
                width: 300px;
                margin-left: auto;
                margin-top: 30px;
            }
            .totals tr td {
                padding: 8px 12px;
                border-bottom: 1px solid #e5e7eb;
            }
            .totals .grand-total td {
                background: #667eea;
                color: white;
                font-size: 1.25rem;
                font-weight: 700;
                border: none;
            }
            .notes {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.875rem;
                font-weight: 600;
                text-transform: uppercase;
            }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-partial { background: #fef3c7; color: #92400e; }
            .status-draft { background: #f3f4f6; color: #1f2937; }
            .status-sent { background: #dbeafe; color: #1e40af; }
        </style>
    </head>
    <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Print PDF</button>
        </div>
        
        <div class="invoice-header">
            <div class="company-details">
                <h1>' . esc_html( $company_name ) . '</h1>
                ' . ( $company_address ? '<p>' . nl2br( esc_html( $company_address ) ) . '</p>' : '' ) . '
                ' . ( $company_phone ? '<p>Phone: ' . esc_html( $company_phone ) . '</p>' : '' ) . '
                <p>Email: ' . esc_html( $company_email ) . '</p>
            </div>
            <div class="invoice-meta">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> ' . esc_html( $data['invoice_number'] ) . '</p>
                <p><strong>Date:</strong> ' . date( 'jS F Y', strtotime( $data['invoice_date'] ) ) . '</p>
                <p><strong>Due Date:</strong> ' . date( 'jS F Y', strtotime( $data['due_date'] ) ) . '</p>
                <p><span class="status-badge status-' . esc_attr( $data['status'] ) . '">' . esc_html( ucfirst( $data['status'] ) ) . '</span></p>
            </div>
        </div>
        
        <div class="customer-section">
            <h3>Bill To:</h3>
            <p><strong>' . esc_html( $data['customer_name'] ) . '</strong></p>
            ' . ( ! empty( $data['customer_address'] ) ? '<p>' . nl2br( esc_html( $data['customer_address'] ) ) . '</p>' : '' ) . '
            ' . ( ! empty( $data['customer_email'] ) ? '<p>Email: ' . esc_html( $data['customer_email'] ) . '</p>' : '' ) . '
            ' . ( ! empty( $data['customer_phone'] ) ? '<p>Phone: ' . esc_html( $data['customer_phone'] ) . '</p>' : '' ) . '
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: center;">VAT %</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ' . $items_html . '
            </tbody>
        </table>
        
        <table class="totals">
            <tr>
                <td><strong>Subtotal:</strong></td>
                <td class="text-right">£' . number_format( $subtotal, 2 ) . '</td>
            </tr>
            <tr>
                <td><strong>VAT:</strong></td>
                <td class="text-right">£' . number_format( $vat_amount, 2 ) . '</td>
            </tr>
            <tr class="grand-total">
                <td><strong>TOTAL:</strong></td>
                <td class="text-right">£' . number_format( $total, 2 ) . '</td>
            </tr>
            ' . ( $paid > 0 ? '
            <tr>
                <td><strong>Amount Paid:</strong></td>
                <td class="text-right">£' . number_format( $paid, 2 ) . '</td>
            </tr>
            <tr style="background: #fef3c7;">
                <td><strong>Balance Due:</strong></td>
                <td class="text-right"><strong>£' . number_format( $balance, 2 ) . '</strong></td>
            </tr>
            ' : '' ) . '
        </table>
        
        ' . ( ! empty( $data['customer_notes'] ) ? '
        <div class="notes">
            <h3>Notes:</h3>
            <p>' . nl2br( esc_html( $data['customer_notes'] ) ) . '</p>
        </div>
        ' : '' ) . '
        
        ' . ( ! empty( $data['payment_terms'] ) ? '
        <div class="notes">
            <h3>Payment Terms:</h3>
            <p>' . esc_html( $data['payment_terms'] ) . '</p>
        </div>
        ' : '' ) . '
        
        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.875rem;">
            <p>Thank you for your business!</p>
        </div>
    </body>
    </html>
    ';
    
    
    return $template;
  }
  
  /**
   * Manual status check endpoint
   */
  public function manual_status_check( WP_REST_Request $request ) {
    $updated = $this->check_invoice_statuses();
    $reminders = $this->send_overdue_reminders();
    
    return rest_ensure_response( [
        'success' => true,
        'message' => sprintf( '%d invoices updated, %d reminders sent', $updated, $reminders ),
        'updated_count' => $updated,
        'reminders_sent' => $reminders,
    ] );
  }
  
  /**
   * Check and update invoice statuses (called on every page load or via cron)
   */
  public function check_invoice_statuses() {
    global $wpdb;
    
    $today = current_time( 'Y-m-d' );
    
    // Find invoices that are overdue
    $overdue_invoices = $wpdb->get_results( $wpdb->prepare(
        "SELECT p.ID 
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_due ON p.ID = pm_due.post_id AND pm_due.meta_key = '_due_date'
         INNER JOIN {$wpdb->postmeta} pm_balance ON p.ID = pm_balance.post_id AND pm_balance.meta_key = '_balance_due'
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status IN ('sent', 'viewed', 'partial')
         AND pm_due.meta_value < %s
         AND CAST(pm_balance.meta_value AS DECIMAL(10,2)) > 0",
        $today
    ) );
    
    // Update to overdue status
    foreach ( $overdue_invoices as $invoice ) {
        wp_update_post( [
            'ID'          => $invoice->ID,
            'post_status' => 'overdue',
        ] );
        
        gos_log_activity( 'Invoice Marked Overdue', $invoice->ID, 'gos_invoice' );
    }
    
    // Find fully paid invoices and mark as paid
    $paid_invoices = $wpdb->get_results(
        "SELECT p.ID, pm_total.meta_value as total, pm_paid.meta_value as paid
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key = '_total_amount'
         INNER JOIN {$wpdb->postmeta} pm_paid ON p.ID = pm_paid.post_id AND pm_paid.meta_key = '_amount_paid'
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status NOT IN ('paid', 'cancelled')
         AND CAST(pm_paid.meta_value AS DECIMAL(10,2)) >= CAST(pm_total.meta_value AS DECIMAL(10,2))
         AND CAST(pm_paid.meta_value AS DECIMAL(10,2)) > 0"
    );
    
    // Update to paid status
    foreach ( $paid_invoices as $invoice ) {
        wp_update_post( [
            'ID'          => $invoice->ID,
            'post_status' => 'paid',
        ] );
        
        update_post_meta( $invoice->ID, '_balance_due', 0 );
        update_post_meta( $invoice->ID, '_payment_date', current_time( 'Y-m-d' ) );
        
        gos_log_activity( 'Invoice Marked Paid', $invoice->ID, 'gos_invoice' );
    }
    
    // Find partially paid invoices
    $partial_invoices = $wpdb->get_results(
        "SELECT p.ID
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key = '_total_amount'
         INNER JOIN {$wpdb->postmeta} pm_paid ON p.ID = pm_paid.post_id AND pm_paid.meta_key = '_amount_paid'
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status NOT IN ('paid', 'partial', 'cancelled')
         AND CAST(pm_paid.meta_value AS DECIMAL(10,2)) > 0
         AND CAST(pm_paid.meta_value AS DECIMAL(10,2)) < CAST(pm_total.meta_value AS DECIMAL(10,2))"
    );
    
    // Update to partial status
    foreach ( $partial_invoices as $invoice ) {
        wp_update_post( [
            'ID'          => $invoice->ID,
            'post_status' => 'partial',
        ] );
        
        gos_log_activity( 'Invoice Marked Partially Paid', $invoice->ID, 'gos_invoice' );
    }
    
    return count( $overdue_invoices ) + count( $paid_invoices ) + count( $partial_invoices );
  }
  
  /**
   * Send reminder emails for overdue invoices
   */
  public function send_overdue_reminders() {
    global $wpdb;
    
    $today = current_time( 'Y-m-d' );
    
    // Find overdue invoices that haven't had a reminder in the last 7 days
    $overdue_invoices = $wpdb->get_results( $wpdb->prepare(
        "SELECT p.ID 
         FROM {$wpdb->posts} p
         LEFT JOIN {$wpdb->postmeta} pm_reminder ON p.ID = pm_reminder.post_id AND pm_reminder.meta_key = '_last_reminder_sent'
         WHERE p.post_type = 'gos_invoice'
         AND p.post_status = 'overdue'
         AND (pm_reminder.meta_value IS NULL OR pm_reminder.meta_value < %s)",
        date( 'Y-m-d', strtotime( '-7 days' ) )
    ) );
    
    $sent_count = 0;
    
    foreach ( $overdue_invoices as $invoice_data ) {
        $invoice_id = $invoice_data->ID;
        $customer_email = get_post_meta( $invoice_id, '_customer_email', true );
        $customer_name = get_post_meta( $invoice_id, '_customer_name', true );
        $invoice_number = get_post_meta( $invoice_id, '_invoice_number', true );
        $total_amount = get_post_meta( $invoice_id, '_total_amount', true );
        $balance_due = get_post_meta( $invoice_id, '_balance_due', true );
        $due_date = get_post_meta( $invoice_id, '_due_date', true );
        
        if ( empty( $customer_email ) || ! is_email( $customer_email ) ) {
            continue;
        }
        
        // Calculate days overdue
        $due_timestamp = strtotime( $due_date );
        $today_timestamp = strtotime( $today );
        $days_overdue = floor( ( $today_timestamp - $due_timestamp ) / ( 60 * 60 * 24 ) );
        
        // Prepare reminder email
        $subject = sprintf( 'Payment Reminder: Invoice %s - %d days overdue', $invoice_number, $days_overdue );
        
        $message = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; }
                .highlight { background: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 style="margin: 0;">Payment Reminder</h2>
            </div>
            <div class="content">
                <p>Dear ' . esc_html( $customer_name ) . ',</p>
                
                <p>This is a friendly reminder that your payment is now <strong>' . $days_overdue . ' days overdue</strong>.</p>
                
                <div class="highlight">
                    <strong>Invoice #:</strong> ' . esc_html( $invoice_number ) . '<br>
                    <strong>Original Due Date:</strong> ' . date( 'jS F Y', $due_timestamp ) . '<br>
                    <strong>Amount Due:</strong> £' . number_format( (float) $balance_due, 2 ) . '
                </div>
                
                <p>Please arrange payment at your earliest convenience to avoid any additional charges or service interruptions.</p>
                
                <p>If you have already sent payment, please disregard this notice. If you have any questions or need to discuss payment arrangements, please contact us.</p>
                
                <p>Thank you for your prompt attention to this matter.</p>
                
                <p>Best regards,<br>' . get_bloginfo( 'name' ) . '</p>
            </div>
        </body>
        </html>
        ';
        
        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . get_bloginfo( 'name' ) . ' <' . get_option( 'admin_email' ) . '>',
        ];
        
        // Send email
        if ( wp_mail( $customer_email, $subject, $message, $headers ) ) {
            // Update reminder metadata
            update_post_meta( $invoice_id, '_last_reminder_sent', $today );
            $reminder_count = intval( get_post_meta( $invoice_id, '_reminder_count', true ) );
            update_post_meta( $invoice_id, '_reminder_count', $reminder_count + 1 );
            
            gos_log_activity( 'Overdue Reminder Sent', $invoice_id, 'gos_invoice' );
            
            $sent_count++;
        }
    }
    
    return $sent_count;
  }
} // end of class App
















