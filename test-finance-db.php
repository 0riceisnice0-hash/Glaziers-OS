<?php
/**
 * Finance Module Database Test Script
 * 
 * Run this file in browser: /wp-content/plugins/glazieros-app/test-finance-db.php
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('Access denied. Admin only.');
}

echo '<h1>Finance Module Database Test</h1>';
echo '<style>body{font-family:monospace;padding:20px;background:#f5f5f5;} table{border-collapse:collapse;background:white;margin:20px 0;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#667eea;color:white;} .success{color:green;font-weight:bold;} .error{color:red;font-weight:bold;}</style>';

global $wpdb;

// 1. Check Finance Tables
echo '<h2>1. Finance Database Tables</h2>';
$tables = [
    'wp_gos_invoice_items',
    'wp_gos_payment_allocations',
    'wp_gos_transactions',
    'wp_gos_tax_rates'
];

echo '<table>';
echo '<tr><th>Table Name</th><th>Status</th><th>Row Count</th></tr>';
foreach ($tables as $table) {
    $exists = $wpdb->get_var("SHOW TABLES LIKE '$table'") === $table;
    $count = $exists ? $wpdb->get_var("SELECT COUNT(*) FROM $table") : 0;
    $status = $exists ? '<span class="success">✓ EXISTS</span>' : '<span class="error">✗ MISSING</span>';
    echo "<tr><td>$table</td><td>$status</td><td>$count</td></tr>";
}
echo '</table>';

// 2. Check Finance Custom Post Types
echo '<h2>2. Finance Custom Post Types</h2>';
$cpts = [
    'gos_invoice' => 'Customer Invoices',
    'gos_expense' => 'Supplier Invoices/Expenses',
    'gos_payment_in' => 'Payments In (Customer)',
    'gos_payment_out' => 'Payments Out (Supplier)',
    'gos_payslip' => 'Staff Payslips',
    'gos_supplier' => 'Supplier Directory'
];

echo '<table>';
echo '<tr><th>CPT Slug</th><th>Name</th><th>Status</th><th>Count</th></tr>';
foreach ($cpts as $slug => $name) {
    $exists = post_type_exists($slug);
    $count = $exists ? wp_count_posts($slug)->publish : 0;
    $status = $exists ? '<span class="success">✓ REGISTERED</span>' : '<span class="error">✗ NOT REGISTERED</span>';
    echo "<tr><td>$slug</td><td>$name</td><td>$status</td><td>$count</td></tr>";
}
echo '</table>';

// 3. Check Tax Rates
echo '<h2>3. Tax Rates Configuration</h2>';
$tax_rates = $wpdb->get_results("SELECT * FROM wp_gos_tax_rates ORDER BY rate_percentage DESC");
if ($tax_rates) {
    echo '<table>';
    echo '<tr><th>Rate Name</th><th>Percentage</th><th>Default</th><th>Active</th></tr>';
    foreach ($tax_rates as $rate) {
        $default = $rate->is_default ? '✓' : '';
        $active = $rate->is_active ? '<span class="success">Active</span>' : '<span class="error">Inactive</span>';
        echo "<tr><td>{$rate->rate_name}</td><td>{$rate->rate_percentage}%</td><td>$default</td><td>$active</td></tr>";
    }
    echo '</table>';
} else {
    echo '<p class="error">No tax rates found. Run plugin activation hook to create default rates.</p>';
}

// 4. Check REST API Endpoints
echo '<h2>4. REST API Endpoints</h2>';
$rest_server = rest_get_server();
$routes = $rest_server->get_routes();
$finance_routes = array_filter(array_keys($routes), function($route) {
    return strpos($route, '/glazieros/v1/invoices') !== false || strpos($route, '/glazieros/v1/finance') !== false;
});

echo '<table>';
echo '<tr><th>Endpoint</th><th>Methods</th></tr>';
foreach ($finance_routes as $route) {
    $methods = implode(', ', array_keys($routes[$route]));
    echo "<tr><td>$route</td><td>$methods</td></tr>";
}
echo '</table>';

// 5. Test Invoice Number Generation
echo '<h2>5. Test Invoice Number Generation</h2>';
$app = GlazierOS\App::get_instance();
if (method_exists($app, 'generate_invoice_number')) {
    $invoice_number = $app->generate_invoice_number();
    echo "<p class='success'>✓ Invoice Number Generated: <strong>$invoice_number</strong></p>";
} else {
    echo "<p class='error'>✗ generate_invoice_number() method not found</p>";
}

// 6. Database Version
echo '<h2>6. Finance Module Configuration</h2>';
$db_version = get_option('gos_finance_db_version');
echo '<table>';
echo '<tr><th>Option</th><th>Value</th></tr>';
echo "<tr><td>Database Version</td><td>" . ($db_version ?: '<span class="error">Not Set</span>') . "</td></tr>";
echo "<tr><td>Invoice Prefix</td><td>" . get_option('gos_invoice_prefix', 'INV') . "</td></tr>";
echo "<tr><td>Last Invoice Number (2025)</td><td>" . get_option('gos_last_invoice_number_2025', '0') . "</td></tr>";
echo '</table>';

echo '<hr>';
echo '<h3>✅ Database Test Complete</h3>';
echo '<p><a href="' . admin_url('admin.php?page=glazieros-app') . '">← Back to GlazierOS Dashboard</a></p>';
