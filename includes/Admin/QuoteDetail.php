<?php
/**
 * Quote Detail Shortcode
 * 
 * Renders a detailed view of a quote/job for display on frontend or admin
 * Shortcode: [gos_quote_detail id="123"]
 * 
 * @package    GlazierOS
 * @subpackage Admin
 * @since      0.3.0
 * 
 * NOTE: This shortcode is currently unused. Consider removing if not needed.
 */

namespace GlazierOS\Admin;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class QuoteDetail {
    
    /**
     * Constructor - register shortcode
     */
    public function __construct() {
        add_shortcode( 'gos_quote_detail', [ $this, 'render' ] );
    }

    /**
     * Render quote detail shortcode
     *
     * @param array $atts Shortcode attributes
     * @return string Rendered HTML
     */
    public function render( $atts ): string {
        // Parse shortcode attributes
        $atts = shortcode_atts( [ 'id' => 0 ], $atts, 'gos_quote_detail' );
        $id   = absint( $atts['id'] );
        
        // Validate job ID
        if ( ! $id ) {
            return '<p class="gos-error">' . esc_html__( 'Invalid quote ID.', 'glazieros-app' ) . '</p>';
        }
        
        // Get post and validate it exists and is the right type
        $post = get_post( $id );
        if ( ! $post || 'gos_job' !== $post->post_type ) {
            return '<p class="gos-error">' . esc_html__( 'Quote not found.', 'glazieros-app' ) . '</p>';
        }
        
        // Check permissions - must be logged in to view
        if ( ! is_user_logged_in() ) {
            return '<p class="gos-error">' . esc_html__( 'You must be logged in to view this quote.', 'glazieros-app' ) . '</p>';
        }
        
        // Check if user has permission to view this specific job
        // Allow admins, or users from the same branch
        $can_view = current_user_can( 'manage_options' );
        
        if ( ! $can_view ) {
            $job_branch_id = get_post_meta( $id, '_branch_id', true );
            $user_branch_id = get_user_meta( get_current_user_id(), '_branch_id', true );
            
            if ( $job_branch_id && $user_branch_id && $job_branch_id === $user_branch_id ) {
                $can_view = true;
            }
        }
        
        if ( ! $can_view ) {
            return '<p class="gos-error">' . esc_html__( 'You do not have permission to view this quote.', 'glazieros-app' ) . '</p>';
        }
        
        // Get post metadata
        $meta = get_post_meta( $id );
        
        // Helper function to safely get meta value
        $get_meta = function( $key ) use ( $meta ) {
            return isset( $meta[ $key ][0] ) ? $meta[ $key ][0] : '';
        };
        
        // Render the output
        ob_start();
        ?>
        <div id="gos-quote-detail" class="gos-quote-detail-container">
            <h2><?php echo esc_html( sprintf( __( 'Quote #%d', 'glazieros-app' ), $id ) ); ?></h2>
            <ul class="gos-quote-details-list">
                <li><strong><?php esc_html_e( 'Type:', 'glazieros-app' ); ?></strong> <?php echo esc_html( ucfirst( $get_meta( 'gos_type' ) ) ); ?></li>
                <li><strong><?php esc_html_e( 'Size:', 'glazieros-app' ); ?></strong> <?php echo esc_html( $get_meta( 'gos_width' ) . ' × ' . $get_meta( 'gos_height' ) ); ?> m</li>
                <li><strong><?php esc_html_e( 'Price:', 'glazieros-app' ); ?></strong> £<?php echo esc_html( number_format_i18n( floatval( $get_meta( 'gos_price' ) ), 2 ) ); ?></li>
                <li><strong><?php esc_html_e( 'Lead Status:', 'glazieros-app' ); ?></strong> <?php echo esc_html( $get_meta( 'gos_lead_status' ) ); ?></li>
                <li><strong><?php esc_html_e( 'Install Status:', 'glazieros-app' ); ?></strong> <?php echo esc_html( $get_meta( 'gos_install_status' ) ); ?></li>
                <?php if ( $get_meta( 'gos_notes' ) ) : ?>
                    <li><strong><?php esc_html_e( 'Notes:', 'glazieros-app' ); ?></strong> <?php echo esc_html( $get_meta( 'gos_notes' ) ); ?></li>
                <?php endif; ?>
            </ul>
            
            <h3><?php esc_html_e( 'Customer Information', 'glazieros-app' ); ?></h3>
            <ul class="gos-customer-details-list">
                <?php if ( $get_meta( 'gos_first_name' ) || $get_meta( 'gos_last_name' ) ) : ?>
                    <li><strong><?php esc_html_e( 'Name:', 'glazieros-app' ); ?></strong> <?php echo esc_html( trim( $get_meta( 'gos_first_name' ) . ' ' . $get_meta( 'gos_last_name' ) ) ); ?></li>
                <?php endif; ?>
                <?php if ( $get_meta( 'gos_email' ) ) : ?>
                    <li><strong><?php esc_html_e( 'Email:', 'glazieros-app' ); ?></strong> <a href="mailto:<?php echo esc_attr( $get_meta( 'gos_email' ) ); ?>"><?php echo esc_html( $get_meta( 'gos_email' ) ); ?></a></li>
                <?php endif; ?>
                <?php if ( $get_meta( 'gos_phone' ) ) : ?>
                    <li><strong><?php esc_html_e( 'Phone:', 'glazieros-app' ); ?></strong> <a href="tel:<?php echo esc_attr( $get_meta( 'gos_phone' ) ); ?>"><?php echo esc_html( $get_meta( 'gos_phone' ) ); ?></a></li>
                <?php endif; ?>
                <?php if ( $get_meta( 'gos_address' ) ) : ?>
                    <li><strong><?php esc_html_e( 'Address:', 'glazieros-app' ); ?></strong> <?php echo esc_html( $get_meta( 'gos_address' ) ); ?></li>
                <?php endif; ?>
            </ul>
            
            <?php
            /**
             * Action hook for adding custom content to quote detail
             * 
             * @param int   $id   The job/quote ID
             * @param array $meta The post metadata
             */
            do_action( 'glazieros_quote_detail_after_customer_info', $id, $meta );
            ?>
            
            <div id="gos-3d" class="gos-3d-preview"></div>
        </div>
        <?php
        return ob_get_clean();
    }
}
