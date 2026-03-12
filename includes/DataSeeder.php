<?php
/**
 * Test Data Seeder for GlazierOS
 * 
 * Creates sample fitters, jobs, and branches for testing
 * Run this once to populate your development environment
 * 
 * @package GlazierOS
 * @since   0.3.0
 */

namespace GlazierOS;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Data Seeder Class
 */
class DataSeeder {
    
    /**
     * Seed all test data
     */
    public static function seed_all() {
        $results = [
            'branches' => self::seed_branches(),
            'fitters'  => self::seed_fitters(),
            'clients'  => self::seed_clients(),
            'jobs'     => self::seed_jobs(),
        ];
        
        return $results;
    }
    
    /**
     * Seed test branches
     */
    public static function seed_branches() {
        $branches = [
            'London Office',
            'Manchester Office',
            'Birmingham Office',
        ];
        
        $created = [];
        foreach ( $branches as $branch_name ) {
            $id = wp_insert_post( [
                'post_type'   => 'gos_branch',
                'post_title'  => $branch_name,
                'post_status' => 'publish',
            ] );
            
            if ( $id && ! is_wp_error( $id ) ) {
                $created[] = $id;
            }
        }
        
        return $created;
    }
    
    /**
     * Seed test fitters
     */
    public static function seed_fitters() {
        $fitters = [
            [
                'name'   => 'John Smith',
                'email'  => 'john.smith@example.com',
                'mobile' => '07700 900001',
            ],
            [
                'name'   => 'Sarah Johnson',
                'email'  => 'sarah.j@example.com',
                'mobile' => '07700 900002',
            ],
            [
                'name'   => 'Mike Williams',
                'email'  => 'mike.w@example.com',
                'mobile' => '07700 900003',
            ],
            [
                'name'   => 'Emma Davis',
                'email'  => 'emma.d@example.com',
                'mobile' => '07700 900004',
            ],
        ];
        
        $created = [];
        foreach ( $fitters as $fitter ) {
            $id = wp_insert_post( [
                'post_type'   => 'gos_fitter',
                'post_title'  => $fitter['name'],
                'post_status' => 'publish',
                'meta_input'  => [
                    'fitter_email'  => $fitter['email'],
                    'fitter_mobile' => $fitter['mobile'],
                ],
            ] );
            
            if ( $id && ! is_wp_error( $id ) ) {
                $created[] = $id;
            }
        }
        
        return $created;
    }
    
    /**
     * Seed test clients
     */
    public static function seed_clients() {
        $clients = [
            [
                'name'  => 'ABC Construction Ltd',
                'email' => 'info@abcconstruction.com',
                'phone' => '0203 123 4567',
            ],
            [
                'name'  => 'Home Renovations Co',
                'email' => 'hello@homereno.co.uk',
                'phone' => '0161 234 5678',
            ],
            [
                'name'  => 'Property Developers Group',
                'email' => 'contact@propdev.co.uk',
                'phone' => '0121 345 6789',
            ],
        ];
        
        $created = [];
        foreach ( $clients as $client ) {
            $id = wp_insert_post( [
                'post_type'   => 'gos_client',
                'post_title'  => $client['name'],
                'post_status' => 'publish',
                'meta_input'  => [
                    'client_email' => $client['email'],
                    'client_phone' => $client['phone'],
                ],
            ] );
            
            if ( $id && ! is_wp_error( $id ) ) {
                $created[] = $id;
            }
        }
        
        return $created;
    }
    
    /**
     * Seed test jobs/quotes
     */
    public static function seed_jobs() {
        $jobs = [
            [
                'type'   => 'window',
                'width'  => 1.5,
                'height' => 1.2,
                'price'  => 450.00,
                'first_name' => 'James',
                'last_name'  => 'Anderson',
                'email'      => 'james.anderson@example.com',
                'phone'      => '07700 900101',
                'address'    => '123 High Street, London, SW1A 1AA',
                'lead_status'    => 'New',
                'install_status' => 'Pending',
            ],
            [
                'type'   => 'door',
                'width'  => 0.9,
                'height' => 2.1,
                'price'  => 850.00,
                'first_name' => 'Lisa',
                'last_name'  => 'Thompson',
                'email'      => 'lisa.t@example.com',
                'phone'      => '07700 900102',
                'address'    => '456 Park Lane, Manchester, M1 1AA',
                'lead_status'    => 'Quoted',
                'install_status' => 'Scheduled',
            ],
            [
                'type'   => 'window',
                'width'  => 2.0,
                'height' => 1.5,
                'price'  => 650.00,
                'first_name' => 'Robert',
                'last_name'  => 'Wilson',
                'email'      => 'rob.wilson@example.com',
                'phone'      => '07700 900103',
                'address'    => '789 Queen Street, Birmingham, B1 1AA',
                'lead_status'    => 'Follow-up',
                'install_status' => 'Pending',
            ],
            [
                'type'   => 'window',
                'width'  => 1.8,
                'height' => 1.4,
                'price'  => 520.00,
                'first_name' => 'Sophie',
                'last_name'  => 'Brown',
                'email'      => 'sophie.b@example.com',
                'phone'      => '07700 900104',
                'address'    => '321 King Road, London, SE1 1AA',
                'lead_status'    => 'Won',
                'install_status' => 'Completed',
            ],
            [
                'type'   => 'door',
                'width'  => 1.0,
                'height' => 2.2,
                'price'  => 920.00,
                'first_name' => 'David',
                'last_name'  => 'Martin',
                'email'      => 'david.m@example.com',
                'phone'      => '07700 900105',
                'address'    => '654 Bridge Street, Manchester, M2 2BB',
                'lead_status'    => 'New',
                'install_status' => 'Pending',
            ],
        ];
        
        $created = [];
        foreach ( $jobs as $job ) {
            $title = sprintf(
                '%s: %.2fm×%.2fm',
                ucfirst( $job['type'] ),
                $job['width'],
                $job['height']
            );
            
            $id = wp_insert_post( [
                'post_type'   => 'gos_job',
                'post_title'  => $title,
                'post_status' => 'publish',
                'meta_input'  => [
                    'gos_type'           => $job['type'],
                    'gos_width'          => $job['width'],
                    'gos_height'         => $job['height'],
                    'gos_price'          => $job['price'],
                    'gos_first_name'     => $job['first_name'],
                    'gos_last_name'      => $job['last_name'],
                    'gos_email'          => $job['email'],
                    'gos_phone'          => $job['phone'],
                    'gos_address'        => $job['address'],
                    'gos_lead_status'    => $job['lead_status'],
                    'gos_install_status' => $job['install_status'],
                    'gos_notes'          => '',
                    'gos_schedule'       => [],
                ],
            ] );
            
            if ( $id && ! is_wp_error( $id ) ) {
                $created[] = $id;
            }
        }
        
        return $created;
    }
    
    /**
     * Delete all seeded data
     */
    public static function delete_all() {
        $post_types = [ 'gos_branch', 'gos_fitter', 'gos_client', 'gos_job' ];
        
        $deleted = [];
        foreach ( $post_types as $post_type ) {
            $posts = get_posts( [
                'post_type'      => $post_type,
                'posts_per_page' => -1,
                'post_status'    => 'any',
            ] );
            
            foreach ( $posts as $post ) {
                wp_delete_post( $post->ID, true );
                $deleted[] = $post->ID;
            }
        }
        
        return $deleted;
    }
}

/**
 * Admin action to seed data
 */
add_action( 'admin_action_gos_seed_data', function() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( 'Unauthorized' );
    }
    
    check_admin_referer( 'gos_seed_data' );
    
    $results = DataSeeder::seed_all();
    
    $message = sprintf(
        'Test data created! Branches: %d, Fitters: %d, Clients: %d, Jobs: %d',
        count( $results['branches'] ),
        count( $results['fitters'] ),
        count( $results['clients'] ),
        count( $results['jobs'] )
    );
    
    wp_redirect( add_query_arg( [
        'page'       => 'glazieros-dashboard',
        'gos_notice' => urlencode( $message ),
    ], admin_url( 'admin.php' ) ) );
    exit;
} );

/**
 * Add seed data button to activation notice
 */
add_action( 'admin_notices', function() {
    if ( isset( $_GET['gos_notice'] ) ) {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><?php echo esc_html( urldecode( $_GET['gos_notice'] ) ); ?></p>
        </div>
        <?php
    }
    
    // Show seed data option on dashboard page
    $screen = get_current_screen();
    if ( $screen && strpos( $screen->id, 'glazieros-dashboard' ) !== false ) {
        $job_count = wp_count_posts( 'gos_job' )->publish ?? 0;
        $fitter_count = wp_count_posts( 'gos_fitter' )->publish ?? 0;
        
        if ( $job_count === 0 && $fitter_count === 0 ) {
            $seed_url = wp_nonce_url(
                admin_url( 'admin.php?action=gos_seed_data' ),
                'gos_seed_data'
            );
            ?>
            <div class="notice notice-info">
                <p><strong>No data found!</strong> Would you like to create test data to try out GlazierOS?</p>
                <p>
                    <a href="<?php echo esc_url( $seed_url ); ?>" class="button button-primary">
                        Create Test Data (5 jobs, 4 fitters, 3 clients, 3 branches)
                    </a>
                </p>
            </div>
            <?php
        }
    }
} );