<?php
/**
 * Invoice Generation Class
 * 
 * Handles PDF invoice generation for jobs using Dompdf library
 * 
 * @package    GlazierOS
 * @subpackage Invoice
 * @since      0.3.0
 */

namespace GlazierOS;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Check if Dompdf is available
if ( ! class_exists( 'Dompdf\Dompdf' ) ) {
    // Log error if Dompdf is not installed
    error_log( 'GlazierOS: Dompdf library not found. Please install via Composer: composer require dompdf/dompdf' );
}

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Invoice Class
 */
class Invoice {
    
    /**
     * Generates a PDF invoice for a given job
     *
     * @param int $job_id The ID of the job post
     * @return array|WP_Error An array with invoice data on success, or WP_Error on failure
     */
    public function generate_for_job( int $job_id ) {
        // Validate job exists
        $job = get_post( $job_id );
        if ( ! $job || 'gos_job' !== $job->post_type ) {
            return new \WP_Error( 
                'invalid_job', 
                __( 'The specified job ID is invalid or not a job post type.', 'glazieros-app' ),
                [ 'status' => 404 ]
            );
        }
        
        // Check if invoice already exists
        $existing_invoice = get_post_meta( $job_id, '_invoice_number', true );
        if ( $existing_invoice ) {
            return new \WP_Error( 
                'invoice_exists', 
                __( 'An invoice for this job already exists.', 'glazieros-app' ),
                [ 'status' => 400 ]
            );
        }
        
        // Check if Dompdf is available
        if ( ! class_exists( 'Dompdf\Dompdf' ) ) {
            return new \WP_Error(
                'dompdf_missing',
                __( 'PDF generation library (Dompdf) is not installed. Please contact system administrator.', 'glazieros-app' ),
                [ 'status' => 500 ]
            );
        }
        
        // Generate invoice data
        $invoice_data = $this->prepare_invoice_data( $job_id );
        
        // Create PDF
        try {
            $pdf_result = $this->create_pdf( $invoice_data );
            if ( is_wp_error( $pdf_result ) ) {
                return $pdf_result;
            }
            
            // Save invoice metadata
            update_post_meta( $job_id, '_invoice_number', $invoice_data['invoice_number'] );
            update_post_meta( $job_id, '_invoice_date', current_time( 'Y-m-d' ) );
            update_post_meta( $job_id, '_invoice_pdf_url', $pdf_result['url'] );
            update_post_meta( $job_id, '_invoice_total', $invoice_data['total'] );
            update_post_meta( $job_id, '_invoice_status', 'unpaid' );
            
            // Log activity
            if ( function_exists( 'gos_log_activity' ) ) {
                gos_log_activity( 'Invoice Generated', $job_id, 'gos_job' );
            }
            
            return [
                'success'        => true,
                'invoice_number' => $invoice_data['invoice_number'],
                'invoice_url'    => $pdf_result['url'],
            ];
            
        } catch ( \Exception $e ) {
            error_log( 'GlazierOS Invoice Generation Error: ' . $e->getMessage() );
            return new \WP_Error(
                'pdf_generation_failed',
                __( 'Failed to generate PDF invoice. Please try again.', 'glazieros-app' ),
                [ 'status' => 500 ]
            );
        }
    }
    
    /**
     * Prepare invoice data from job metadata
     *
     * @param int $job_id The job ID
     * @return array Invoice data array
     */
    private function prepare_invoice_data( int $job_id ): array {
        $job_meta = get_post_meta( $job_id );
        
        // Calculate pricing
        $price = (float) ( $job_meta['gos_price'][0] ?? 0 );
        $vat_rate = 0.20; // 20% VAT
        $subtotal = $price;
        $vat_amount = $subtotal * $vat_rate;
        $total = $subtotal + $vat_amount;
        
        // Get company settings (with fallbacks)
        $company_name = get_option( 'gos_company_name', 'GlazierOS Ltd.' );
        $company_address = get_option( 'gos_company_address', '123 Glass Street, Windowville, GL5 1AZ' );
        
        // Prepare invoice data
        return [
            'invoice_number'  => $this->get_next_invoice_number(),
            'issue_date'      => current_time( 'F j, Y' ),
            'due_date'        => date( 'F j, Y', strtotime( '+30 days' ) ),
            'job_id'          => $job_id,
            'customer_name'   => trim( ( $job_meta['gos_first_name'][0] ?? '' ) . ' ' . ( $job_meta['gos_last_name'][0] ?? '' ) ),
            'customer_address'=> $job_meta['gos_address'][0] ?? '',
            'customer_email'  => $job_meta['gos_email'][0] ?? '',
            'line_items'      => [
                [
                    'description' => sprintf(
                        '%s - %s',
                        ucfirst( $job_meta['gos_type'][0] ?? 'Item' ),
                        get_the_title( $job_id )
                    ),
                    'quantity'    => 1,
                    'unit_price'  => $subtotal,
                    'total'       => $subtotal,
                ]
            ],
            'subtotal'        => $subtotal,
            'vat_amount'      => $vat_amount,
            'total'           => $total,
            'notes'           => __( 'Thank you for your business.', 'glazieros-app' ),
            'payment_terms'   => __( 'Payment due within 30 days.', 'glazieros-app' ),
            'company_name'    => $company_name,
            'company_address' => $company_address,
        ];
    }
    
    /**
     * Create PDF from invoice data
     *
     * @param array $invoice_data The invoice data
     * @return array|WP_Error Array with file path and URL, or WP_Error on failure
     */
    private function create_pdf( array $invoice_data ) {
        // Render HTML template
        $html = $this->render_template( $invoice_data );
        if ( is_wp_error( $html ) ) {
            return $html;
        }
        
        // Configure Dompdf
        $options = new Options();
        $options->set( 'isHtml5ParserEnabled', true );
        $options->set( 'isRemoteEnabled', true );
        
        $dompdf = new Dompdf( $options );
        $dompdf->loadHtml( $html );
        $dompdf->setPaper( 'A4', 'portrait' );
        $dompdf->render();
        $pdf_output = $dompdf->output();
        
        // Prepare file paths
        $upload_dir = wp_upload_dir();
        $invoice_dir = $upload_dir['basedir'] . '/glazieros-invoices/' . date( 'Y' );
        $invoice_filename = $invoice_data['invoice_number'] . '.pdf';
        $invoice_filepath = $invoice_dir . '/' . $invoice_filename;
        $invoice_url = $upload_dir['baseurl'] . '/glazieros-invoices/' . date( 'Y' ) . '/' . $invoice_filename;
        
        // Create directory if it doesn't exist
        if ( ! file_exists( $invoice_dir ) ) {
            if ( ! wp_mkdir_p( $invoice_dir ) ) {
                return new \WP_Error(
                    'directory_creation_failed',
                    __( 'Failed to create invoice directory.', 'glazieros-app' )
                );
            }
        }
        
        // Save PDF file
        $bytes_written = file_put_contents( $invoice_filepath, $pdf_output );
        if ( false === $bytes_written ) {
            return new \WP_Error(
                'file_write_failed',
                __( 'Failed to write PDF file.', 'glazieros-app' )
            );
        }
        
        return [
            'path' => $invoice_filepath,
            'url'  => $invoice_url,
        ];
    }
    
    /**
     * Render invoice template
     *
     * @param array $invoice_data The invoice data
     * @return string|WP_Error The rendered HTML, or WP_Error on failure
     */
    private function render_template( array $invoice_data ) {
        // Template path - check multiple locations
        $template_locations = [
            get_stylesheet_directory() . '/glazieros/invoice-template.php', // Child theme
            get_template_directory() . '/glazieros/invoice-template.php',   // Parent theme
            GLAZIEROS_PLUGIN_DIR . 'includes/templates/invoice-default.php', // Plugin default
            dirname( __FILE__ ) . '/default.php', // Legacy location
        ];
        
        $template_path = null;
        foreach ( $template_locations as $location ) {
            if ( file_exists( $location ) ) {
                $template_path = $location;
                break;
            }
        }
        
        if ( ! $template_path ) {
            return new \WP_Error(
                'template_not_found',
                __( 'Invoice template file not found.', 'glazieros-app' )
            );
        }
        
        // Render template with output buffering
        ob_start();
        include $template_path;
        return ob_get_clean();
    }
    
    /**
     * Get the next sequential invoice number
     *
     * @return string The next invoice number
     */
    private function get_next_invoice_number(): string {
        $option_key = 'gos_last_invoice_number';
        $last_number = (int) get_option( $option_key, 0 );
        $next_number = $last_number + 1;
        update_option( $option_key, $next_number );
        
        $prefix = 'INV-' . date( 'Y' ) . '-';
        return $prefix . str_pad( $next_number, 4, '0', STR_PAD_LEFT );
    }
}
