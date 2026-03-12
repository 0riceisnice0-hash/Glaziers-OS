<?php
/**
 * Finance Module - Force Database Creation
 * 
 * Run this once to create Finance Module database tables
 * URL: /wp-content/plugins/glazieros-app/create-finance-tables.php
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    wp_die('Access denied. Admin users only.');
}

echo '<h1>🏦 Finance Module - Database Setup</h1>';
echo '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px;background:#f5f6fa;} .box{background:white;padding:30px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);max-width:800px;margin:0 auto;} h1{color:#667eea;} .success{color:#10b981;font-weight:bold;} .error{color:#ef4444;font-weight:bold;} pre{background:#f9fafb;padding:15px;border-radius:4px;overflow-x:auto;} .button{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;text-decoration:none;border-radius:6px;margin:10px 5px;}</style>';

echo '<div class="box">';

// Get App instance
$app = GlazierOS\App::get_instance();

echo '<h2>Running Database Creation...</h2>';

// Call the create_finance_tables method
try {
    if (method_exists($app, 'create_finance_tables')) {
        $app->create_finance_tables();
        echo '<p class="success">✅ SUCCESS! Finance database tables created.</p>';
    } else {
        echo '<p class="error">❌ ERROR: create_finance_tables() method not found in App class.</p>';
    }
} catch (Exception $e) {
    echo '<p class="error">❌ ERROR: ' . $e->getMessage() . '</p>';
}

// Verify tables were created
global $wpdb;
$tables = [
    'wp_gos_invoice_items',
    'wp_gos_payment_allocations', 
    'wp_gos_transactions',
    'wp_gos_tax_rates'
];

echo '<h2>Verification:</h2>';
echo '<ul>';
foreach ($tables as $table) {
    $exists = $wpdb->get_var("SHOW TABLES LIKE '$table'") === $table;
    if ($exists) {
        $count = $wpdb->get_var("SELECT COUNT(*) FROM $table");
        echo "<li class='success'>✓ Table <strong>$table</strong> exists ($count rows)</li>";
    } else {
        echo "<li class='error'>✗ Table <strong>$table</strong> NOT FOUND</li>";
    }
}
echo '</ul>';

// Check database version option
$db_version = get_option('gos_finance_db_version');
if ($db_version) {
    echo "<p class='success'>✓ Database version set to: <strong>$db_version</strong></p>";
} else {
    echo "<p class='error'>✗ Database version option not set</p>";
}

echo '<hr>';
echo '<h3>Next Steps:</h3>';
echo '<ol>';
echo '<li>Delete this file for security: <code>create-finance-tables.php</code></li>';
echo '<li><a href="' . admin_url('admin.php?page=glazieros-app') . '" class="button">Open GlazierOS Dashboard</a></li>';
echo '<li>Click the <strong>Invoices</strong> tab</li>';
echo '<li>Test creating your first invoice!</li>';
echo '</ol>';

echo '</div>';
