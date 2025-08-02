<?php
namespace GlazierOS;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

final class App {
  /** @var App */
  private static $instance;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private function __construct() {
    // Register Custom Post Types
    add_action('init', [ $this, 'register_custom_post_types' ]);

    // Register REST API routes
    add_action('rest_api_init', [ $this, 'register_rest_routes' ]);
  }

  /**
   * Get or create the single instance.
   */
  public static function get_instance(): self {
    if (null === self::$instance) {
      self::$instance = new self();
    }
    return self::$instance;
  }

  /**
   * Register our Custom Post Types.
   */
  public function register_custom_post_types() {
    register_post_type(
      'go_job',
      [
        'label'       => 'Jobs',
        'public'      => true,
        'show_ui'     => true,
        'supports'    => [ 'title', 'editor', 'custom-fields' ],
        'has_archive' => true,
      ]
    );
    register_post_type( 'gos_fitter', [
        'label'    => 'Fitters',
        'public'   => false,
        'show_ui'  => true,
        'supports' => [ 'title', 'custom-fields' ],
    ]
    );
  }

  /**
   * Register our REST API routes.
   */
  public function register_rest_routes() {
    $namespace = 'glazieros/v1';

    // Save quote
    register_rest_route( $namespace, '/quote', [
        'methods'             => 'POST',
        'callback'            => [ $this, 'save_quote' ],
        'permission_callback' => '__return_true',
    ] );
    // List jobs
    register_rest_route( $namespace, '/jobs', [
        'methods'             => 'GET',
        'callback'            => [ $this, 'get_jobs' ],
        'permission_callback' => '__return_true',
    ] );
    // Get single job
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)', [[
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_job' ],
            'permission_callback' => '__return_true',
        ],
        [
            'methods'             => 'DELETE',
            'callback'            => [ $this, 'delete_job' ],
            'permission_callback' => '__return_true',
        ],
    ]
     );
    // Fitters CRUD
    register_rest_route( $namespace, '/fitters', [
        [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_fitters' ],
            'permission_callback' => '__return_true',
        ],
        [
            'methods'             => 'POST',
            'callback'            => [ $this, 'save_fitter' ],
            'permission_callback' => '__return_true',
        ],
    ] );
    // Update/Delete a specific fitter
    register_rest_route( $namespace, '/fitters/(?P<id>\d+)', [
        [
            'methods'             => 'POST',
            'callback'            => [ $this, 'update_fitter' ],
            'permission_callback' => '__return_true',
        ],
        [
            'methods'             => 'DELETE',
            'callback'            => [ $this, 'delete_fitter' ],
            'permission_callback' => '__return_true',
        ],
    ] );
    // Schedule per job
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/schedule', [
        [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_schedule' ],
            'permission_callback' => '__return_true',
        ],
        [
            'methods'             => 'POST',
            'callback'            => [ $this, 'save_schedule' ],
            'permission_callback' => '__return_true',
        ],
    ] );
    // Stats for reports
    register_rest_route( $namespace, '/stats', [
        'methods'             => 'GET',
        'callback'            => [ $this, 'get_stats' ],
        'permission_callback' => '__return_true',
    ] );
    // Save job details from pricing tool
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/details', [
        'methods'             => 'POST',
        'callback'            => [ $this, 'save_job_details' ],
        'permission_callback' => '__return_true',
    ] );
    // Update job status
    register_rest_route( $namespace, '/jobs/(?P<id>\d+)/status', [
        'methods'             => 'POST',
        'callback'            => [ $this, 'update_job_status' ],
        'permission_callback' => '__return_true',
        'args'                => [
            'status' => [
                'required' => true,
            ],
            'type' => [
                'required' => false, // For dual status system
                'default' => 'lead',
            ],
        ],
    ] );

    // --- Settings Endpoints ---
    register_rest_route( $namespace, '/settings/pricing', [
        [ 'methods' => 'GET', 'callback' => [ $this, 'get_pricing_settings' ], 'permission_callback' => '__return_true' ],
        [ 'methods' => 'POST', 'callback' => [ $this, 'save_pricing_settings' ], 'permission_callback' => '__return_true' ],
    ] );
    register_rest_route( $namespace, '/settings/statuses', [
        [ 'methods' => 'GET', 'callback' => [ $this, 'get_status_settings' ], 'permission_callback' => '__return_true' ],
        [ 'methods' => 'POST', 'callback' => [ $this, 'save_status_settings' ], 'permission_callback' => '__return_true' ],
    ] );
    register_rest_route( $namespace, '/settings/form', [
        [ 'methods' => 'GET', 'callback' => [ $this, 'get_form_settings' ], 'permission_callback' => '__return_true' ],
        [ 'methods' => 'POST', 'callback' => [ $this, 'save_form_settings' ], 'permission_callback' => '__return_true' ],
    ] );
  }

  /**
   * Callback for the jobs endpoint.
   */
  public function get_jobs( WP_REST_Request $request ) {
    $posts = get_posts([
      'post_type'   => 'go_job',
      'numberposts' => -1,
    ]);

    $data = array_map([$this, 'format_job_data'], $posts);

    // Return data directly for consistency
    return rest_ensure_response($data);
  }

  public function get_job( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    $post = get_post($id);

    if ( ! $post || 'go_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }

    $data = $this->format_job_data($post);

    return rest_ensure_response($data);
  }

  public function delete_job( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'go_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }
    // Use wp_delete_post to move to trash or delete permanently.
    // true for permanent deletion.
    $result = wp_delete_post( $id, true ); 
    if ( ! $result ) {
        return new WP_Error( 'cant-delete', 'Could not delete job.', [ 'status' => 500 ] );
    }
    return rest_ensure_response( [ 'success' => true ] );
  }
  public function get_fitters( WP_REST_Request $req ) {
    $fs = get_posts( [ 'post_type' => 'gos_fitter', 'numberposts' => -1 ] );
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
    $id = wp_insert_post( [
        'post_type'   => 'go_job',
        'post_title'  => sprintf( '%s: %.2fm×%.2fm', ucfirst( $d['type'] ?? '' ), $d['width'] ?? 0, $d['height'] ?? 0 ),
        'post_status' => 'publish',
        'meta_input'  => [
            'gos_type'       => sanitize_text_field( $d['type'] ?? '' ),
            'gos_width'      => floatval( $d['width'] ?? 0 ),
            'gos_height'     => floatval( $d['height'] ?? 0 ),
            'gos_price'      => floatval( $d['price'] ?? 0 ),
            'gos_lead_status' => 'New', // Default lead status
            'gos_install_status' => 'Pending', // Default install status
            'gos_notes'      => '',
            'gos_schedule'   => [],
        ],
    ] );
    if ( is_wp_error( $id ) ) {
        return new WP_Error( 'cant-create', $id->get_error_message(), [ 'status' => 500 ] );
    }
    // Return a success response with the job ID.
    $response = new WP_REST_Response( [ 'job_id' => $id ] );
    $response->set_status( 201 );
    return $response;
  }

  public function save_fitter( WP_REST_Request $req ) {
    $d  = $req->get_json_params();
    $id = wp_insert_post( [ 'post_type' => 'gos_fitter', 'post_title' => sanitize_text_field( $d['name'] ), 'post_status' => 'publish' ] );
    update_post_meta( $id, 'fitter_email', sanitize_email( $d['email'] ) );
    update_post_meta( $id, 'fitter_mobile', sanitize_text_field( $d['mobile'] ) );
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
    return rest_ensure_response( [ 'success' => true ] );
  }

  public function delete_fitter( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'gos_fitter' !== $post->post_type ) {
        return new WP_Error( 'invalid_fitter_id', 'Invalid fitter ID.', [ 'status' => 404 ] );
    }
    $result = wp_delete_post( $id, true );
    if ( ! $result ) {
        return new WP_Error( 'cant-delete', 'Could not delete fitter.', [ 'status' => 500 ] );
    }
    return rest_ensure_response( [ 'success' => true ] );
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
    $jobs = get_posts( [ 'post_type' => 'go_job', 'numberposts' => -1, 'post_status' => 'any' ] );
    $total_jobs = count($jobs);
    $by_lead_status = [];
    $by_install_status = [];
    foreach ($jobs as $job) {
        $lead_status = get_post_meta($job->ID, 'gos_lead_status', true) ?: 'New';
        if (!isset($by_lead_status[$lead_status])) {
            $by_lead_status[$lead_status] = 0;
        }
        $by_lead_status[$lead_status]++;

        $install_status = get_post_meta($job->ID, 'gos_install_status', true) ?: 'Pending';
        if (!isset($by_install_status[$install_status])) {
            $by_install_status[$install_status] = 0;
        }
        $by_install_status[$install_status]++;
    }
    $data = [
        'total_jobs' => $total_jobs,
        'by_lead_status'  => $by_lead_status,
        'by_install_status' => $by_install_status,
    ];
    return rest_ensure_response($data);
  }

  public function save_job_details( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'go_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }
    $params = $req->get_json_params();
    $meta_to_update = [
        'gos_first_name' => sanitize_text_field( $params['first_name'] ?? '' ), 'gos_last_name'  => sanitize_text_field( $params['last_name'] ?? '' ), 'gos_phone'      => sanitize_text_field( $params['phone'] ?? '' ), 'gos_email'      => sanitize_email( $params['email'] ?? '' ), 'gos_address'    => sanitize_textarea_field( $params['address'] ?? '' ), 'gos_notes'      => sanitize_textarea_field( $params['notes'] ?? '' ),
        'gos_form_data' => isset($params['form_data']) && is_array($params['form_data']) ? json_encode($params['form_data']) : '',
    ];

    // Handle dual status updates
    $all_statuses = get_option('gos_statuses', []);
    if ( isset( $params['lead_status'] ) ) {
        $new_status = sanitize_text_field( $params['lead_status'] );
        $allowed = array_map(fn($s) => $s['label'], $all_statuses['lead'] ?? []);
        if ( in_array( $new_status, $allowed ) ) {
            $meta_to_update['gos_lead_status'] = $new_status;
        }
    }
    if ( isset( $params['install_status'] ) ) {
        $new_status = sanitize_text_field( $params['install_status'] );
        $allowed = array_map(fn($s) => $s['label'], $all_statuses['install'] ?? []);
        if ( in_array( $new_status, $allowed ) ) {
            $meta_to_update['gos_install_status'] = $new_status;
        }
    }

    foreach ( $meta_to_update as $key => $value ) {
        update_post_meta( $id, $key, $value );
    }
    return rest_ensure_response( [ 'saved' => true ] );
  }

  public function update_job_status( WP_REST_Request $req ) {
    $id = (int) $req['id'];
    $post = get_post( $id );
    if ( ! $post || 'go_job' !== $post->post_type ) {
        return new WP_Error( 'invalid_job_id', 'Invalid job ID.', [ 'status' => 404 ] );
    }

    $params = $req->get_json_params();
    $new_status = sanitize_text_field( $params['status'] );
    $type = sanitize_key( $params['type'] ?? 'lead' ); // 'lead' or 'install'

    $all_statuses = get_option('gos_statuses', []);
    $allowed_statuses = [];
    if ($type === 'lead' && isset($all_statuses['lead'])) {
        $allowed_statuses = array_map(fn($s) => $s['label'], $all_statuses['lead']);
    } elseif ($type === 'install' && isset($all_statuses['install'])) {
        $allowed_statuses = array_map(fn($s) => $s['label'], $all_statuses['install']);
    }

    if (empty($allowed_statuses) || !in_array($new_status, $allowed_statuses)) {
        return new WP_Error( 'invalid_status', 'Invalid status provided.', [ 'status' => 400 ] );
    }

    update_post_meta( $id, "gos_{$type}_status", $new_status );

    return rest_ensure_response( [ 'success' => true, 'type' => $type, 'new_status' => $new_status ] );
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

  public function get_status_settings() {
    $default_statuses = [
        'lead' => [
            [ 'label' => 'New', 'color' => '#4e73df' ],
            [ 'label' => 'Contacted', 'color' => '#f6c23e' ],
            [ 'label' => 'Quoted', 'color' => '#fd7e14' ],
            [ 'label' => 'Won', 'color' => '#1cc88a' ],
            [ 'label' => 'Lost', 'color' => '#e74a3b' ],
        ],
        'install' => [
            [ 'label' => 'Pending', 'color' => '#6c757d' ],
            [ 'label' => 'Booked In', 'color' => '#36b9cc' ],
            [ 'label' => 'Completed', 'color' => '#1cc88a' ],
            [ 'label' => 'Invoiced', 'color' => '#5a5c69' ],
        ]
    ];
    $statuses = get_option( 'gos_statuses', $default_statuses );
    return rest_ensure_response( $statuses );
  }

  public function save_status_settings( WP_REST_Request $req ) {
    $data = $req->get_json_params();
    $sanitized_data = [ 'lead' => [], 'install' => [] ];

    if ( isset($data['lead']) && is_array($data['lead']) ) {
        foreach ( $data['lead'] as $status ) {
            if ( !empty( $status['label'] ) && !empty( $status['color'] ) ) {
                $sanitized_data['lead'][] = [
                    'label' => sanitize_text_field( $status['label'] ),
                    'color' => sanitize_hex_color( $status['color'] ),
                ];
            }
        }
    }
    if ( isset($data['install']) && is_array($data['install']) ) {
        foreach ( $data['install'] as $status ) {
            if ( !empty( $status['label'] ) && !empty( $status['color'] ) ) {
                $sanitized_data['install'][] = [
                    'label' => sanitize_text_field( $status['label'] ),
                    'color' => sanitize_hex_color( $status['color'] ),
                ];
            }
        }
    }

    update_option( 'gos_statuses', $sanitized_data );
    return rest_ensure_response( [ 'success' => true ] );
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
} // end of class App
