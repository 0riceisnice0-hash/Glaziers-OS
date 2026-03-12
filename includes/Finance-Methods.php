<?php
/**
 * Finance Module - Additional REST Endpoint Methods
 * 
 * This file contains additional endpoint callbacks for the Finance Module
 * that should be included in the App class.
 * 
 * @package    GlazierOS
 * @subpackage Finance
 * @since      0.6.0
 */

// These methods should be added to the App class in includes/App.php
// Temporary file for documentation - will be merged into App.php

/**
 * Send invoice via email
 */
public function send_invoice( WP_REST_Request $request ) {
    $id = (int) $request['id'];
    
    $invoice = get_post( $id );
    if ( ! $invoice || 'gos_invoice' !== $invoice->post_type ) {
        return new WP_Error( 'invalid_invoice_id', 'Invalid invoice ID.', [ 'status' => 404 ] );
    }
    
    // TODO: Implement email sending logic
    // - Generate PDF
    // - Compose email
    // - Send via wp_mail()
    // - Log sent_date and increment sent_count
    
    update_post_meta( $id, '_sent_date', current_time( 'mysql' ) );
    update_post_meta( $id, '_sent_count', intval( get_post_meta( $id, '_sent_count', true ) ) + 1 );
    
    // Update status to 'sent' if currently 'draft'
    if ( $invoice->post_status === 'draft' ) {
        wp_update_post( [
            'ID'          => $id,
            'post_status' => 'sent',
        ] );
    }
    
    gos_log_activity( 'Invoice Sent', $id, 'gos_invoice' );
    
    return rest_ensure_response( [
        'success' => true,
        'message' => 'Invoice sent successfully (email feature coming soon)',
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
    
    // TODO: Implement PDF generation
    // - Use TCPDF or similar library
    // - Generate professional invoice template
    // - Save to uploads directory
    // - Return URL
    
    $pdf_url = ''; // Placeholder
    update_post_meta( $id, '_pdf_url', $pdf_url );
    
    return rest_ensure_response( [
        'success' => true,
        'pdf_url' => $pdf_url,
        'message' => 'PDF generation feature coming soon',
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
    
    // Create payment_in post
    $payment_id = wp_insert_post( [
        'post_type'   => 'gos_payment_in',
        'post_title'  => sprintf( 'Payment for %s', get_post_meta( $id, '_invoice_number', true ) ),
        'post_status' => 'matched',
    ] );
    
    if ( is_wp_error( $payment_id ) ) {
        return $payment_id;
    }
    
    // Save payment metadata
    $amount = floatval( $params['amount'] ?? 0 );
    update_post_meta( $payment_id, '_amount', $amount );
    update_post_meta( $payment_id, '_payment_date', $params['payment_date'] ?? current_time( 'Y-m-d' ) );
    update_post_meta( $payment_id, '_payment_method', sanitize_text_field( $params['payment_method'] ?? 'card' ) );
    update_post_meta( $payment_id, '_payment_reference', sanitize_text_field( $params['reference'] ?? '' ) );
    
    // Allocate payment to invoice
    global $wpdb;
    $table = $wpdb->prefix . 'gos_payment_allocations';
    $wpdb->insert( $table, [
        'payment_id'           => $payment_id,
        'invoice_id'           => $id,
        'allocated_amount'     => $amount,
        'allocated_by_user_id' => get_current_user_id(),
    ] );
    
    // Update invoice amounts
    $current_paid = floatval( get_post_meta( $id, '_amount_paid', true ) );
    $new_paid = $current_paid + $amount;
    update_post_meta( $id, '_amount_paid', $new_paid );
    
    // Recalculate balance and update status
    $this->calculate_invoice_totals( $id );
    
    gos_log_activity( 'Payment Recorded', $payment_id, 'gos_payment_in' );
    
    return rest_ensure_response( [
        'success'    => true,
        'payment_id' => $payment_id,
        'invoice'    => $this->format_invoice_data( get_post( $id ), true ),
    ] );
}

/**
 * Get finance analytics dashboard data
 */
public function get_finance_analytics( WP_REST_Request $request ) {
    $params = $request->get_query_params();
    
    // Date range filtering
    $start_date = $params['start_date'] ?? date( 'Y-m-01' ); // First day of current month
    $end_date = $params['end_date'] ?? date( 'Y-m-t' ); // Last day of current month
    
    global $wpdb;
    $transactions_table = $wpdb->prefix . 'gos_transactions';
    
    // Revenue (from invoices marked as paid)
    $revenue = $wpdb->get_var( $wpdb->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) 
        FROM $transactions_table 
        WHERE transaction_type = 'invoice' 
        AND status = 'paid'
        AND transaction_date BETWEEN %s AND %s",
        $start_date,
        $end_date
    ) );
    
    // Expenses
    $expenses = $wpdb->get_var( $wpdb->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) 
        FROM $transactions_table 
        WHERE transaction_type = 'expense' 
        AND transaction_date BETWEEN %s AND %s",
        $start_date,
        $end_date
    ) );
    
    // Outstanding invoices (unpaid/overdue)
    $outstanding_args = [
        'post_type'      => 'gos_invoice',
        'post_status'    => [ 'sent', 'viewed', 'overdue' ],
        'posts_per_page' => -1,
    ];
    $outstanding_query = new \WP_Query( $outstanding_args );
    $outstanding_amount = 0;
    foreach ( $outstanding_query->get_posts() as $invoice ) {
        $outstanding_amount += floatval( get_post_meta( $invoice->ID, '_balance_due', true ) );
    }
    
    // Calculate profit
    $profit = floatval( $revenue ) - floatval( $expenses );
    $profit_margin = $revenue > 0 ? ( $profit / $revenue ) * 100 : 0;
    
    // Count stats
    $total_invoices = wp_count_posts( 'gos_invoice' );
    $total_expenses = wp_count_posts( 'gos_expense' );
    
    $analytics = [
        'period'              => [
            'start_date' => $start_date,
            'end_date'   => $end_date,
        ],
        'revenue'             => floatval( $revenue ),
        'expenses'            => floatval( $expenses ),
        'net_profit'          => $profit,
        'profit_margin'       => round( $profit_margin, 2 ),
        'outstanding'         => $outstanding_amount,
        'total_invoices'      => $total_invoices->publish + $total_invoices->sent + $total_invoices->paid,
        'paid_invoices'       => $total_invoices->paid ?? 0,
        'overdue_invoices'    => $total_invoices->overdue ?? 0,
        'total_expenses'      => $total_expenses->publish ?? 0,
        'currency'            => 'GBP',
    ];
    
    return rest_ensure_response( $analytics );
}
