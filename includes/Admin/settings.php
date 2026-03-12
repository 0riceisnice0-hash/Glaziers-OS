<?php
/**
 * Settings Admin Panel
 * 
 * Provides admin interface for configuring GlazierOS plugin settings
 * using WordPress Settings API
 * 
 * @package    GlazierOS
 * @subpackage Admin
 * @since      0.3.0
 */

namespace GlazierOS\Admin;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Settings Class
 */
class Settings {
    
    /**
     * Option group name
     *
     * @var string
     */
    private const OPTION_GROUP = 'glazieros_settings';
    
    /**
     * Settings page slug
     *
     * @var string
     */
    private const PAGE_SLUG = 'glazieros-settings';
    
    /**
     * Initialize settings
     */
    public function __construct() {
        add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
        add_action( 'admin_init', [ $this, 'register_settings' ] );
    }
    
    /**
     * Add settings page to WordPress admin menu
     */
    public function add_settings_page(): void {
        add_submenu_page(
            'glazieros-dashboard',
            __( 'GlazierOS Settings', 'glazieros-app' ),
            __( 'Settings', 'glazieros-app' ),
            'manage_options',
            self::PAGE_SLUG,
            [ $this, 'render_settings_page' ]
        );
    }
    
    /**
     * Register all settings using WordPress Settings API
     */
    public function register_settings(): void {
        // === Company Information Section ===
        register_setting(
            self::OPTION_GROUP,
            'gos_company_name',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => 'GlazierOS Ltd.',
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_company_address',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
                'default'           => '',
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_company_phone',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => '',
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_company_email',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_email',
                'default'           => get_option( 'admin_email' ),
            ]
        );
        
        // === Pricing Settings Section ===
        register_setting(
            self::OPTION_GROUP,
            'gos_vat_rate',
            [
                'type'              => 'number',
                'sanitize_callback' => [ $this, 'sanitize_percentage' ],
                'default'           => 20,
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_default_markup',
            [
                'type'              => 'number',
                'sanitize_callback' => [ $this, 'sanitize_percentage' ],
                'default'           => 30,
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_currency_symbol',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => '£',
            ]
        );
        
        // === Invoice Settings Section ===
        register_setting(
            self::OPTION_GROUP,
            'gos_invoice_prefix',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => 'INV',
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_invoice_payment_terms',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
                'default'           => __( 'Payment due within 30 days.', 'glazieros-app' ),
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_invoice_notes',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
                'default'           => __( 'Thank you for your business.', 'glazieros-app' ),
            ]
        );
        
        // === Email Notifications Section ===
        register_setting(
            self::OPTION_GROUP,
            'gos_enable_email_notifications',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ $this, 'sanitize_checkbox' ],
                'default'           => 1,
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_notification_email',
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_email',
                'default'           => get_option( 'admin_email' ),
            ]
        );
        
        // === Branch Settings Section ===
        register_setting(
            self::OPTION_GROUP,
            'gos_enable_multi_branch',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ $this, 'sanitize_checkbox' ],
                'default'           => 0,
            ]
        );
        
        // === Feature Toggles Section ===
        register_setting(
            self::OPTION_GROUP,
            'gos_enable_diary',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ $this, 'sanitize_checkbox' ],
                'default'           => 1,
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_enable_3d_configurator',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ $this, 'sanitize_checkbox' ],
                'default'           => 1,
            ]
        );
        
        register_setting(
            self::OPTION_GROUP,
            'gos_enable_audit_logs',
            [
                'type'              => 'boolean',
                'sanitize_callback' => [ $this, 'sanitize_checkbox' ],
                'default'           => 1,
            ]
        );
        
        // Add settings sections
        $this->add_settings_sections();
    }
    
    /**
     * Add settings sections and fields
     */
    private function add_settings_sections(): void {
        // Company Information Section
        add_settings_section(
            'gos_company_section',
            __( 'Company Information', 'glazieros-app' ),
            [ $this, 'render_section_description' ],
            self::PAGE_SLUG
        );
        
        add_settings_field(
            'gos_company_name',
            __( 'Company Name', 'glazieros-app' ),
            [ $this, 'render_text_field' ],
            self::PAGE_SLUG,
            'gos_company_section',
            [ 'label_for' => 'gos_company_name', 'class' => 'regular-text' ]
        );
        
        add_settings_field(
            'gos_company_address',
            __( 'Company Address', 'glazieros-app' ),
            [ $this, 'render_textarea_field' ],
            self::PAGE_SLUG,
            'gos_company_section',
            [ 'label_for' => 'gos_company_address', 'rows' => 3 ]
        );
        
        add_settings_field(
            'gos_company_phone',
            __( 'Phone Number', 'glazieros-app' ),
            [ $this, 'render_text_field' ],
            self::PAGE_SLUG,
            'gos_company_section',
            [ 'label_for' => 'gos_company_phone', 'class' => 'regular-text' ]
        );
        
        add_settings_field(
            'gos_company_email',
            __( 'Email Address', 'glazieros-app' ),
            [ $this, 'render_email_field' ],
            self::PAGE_SLUG,
            'gos_company_section',
            [ 'label_for' => 'gos_company_email', 'class' => 'regular-text' ]
        );
        
        // Pricing Section
        add_settings_section(
            'gos_pricing_section',
            __( 'Pricing Settings', 'glazieros-app' ),
            null,
            self::PAGE_SLUG
        );
        
        add_settings_field(
            'gos_vat_rate',
            __( 'VAT Rate (%)', 'glazieros-app' ),
            [ $this, 'render_number_field' ],
            self::PAGE_SLUG,
            'gos_pricing_section',
            [ 'label_for' => 'gos_vat_rate', 'min' => 0, 'max' => 100, 'step' => 0.1 ]
        );
        
        add_settings_field(
            'gos_default_markup',
            __( 'Default Markup (%)', 'glazieros-app' ),
            [ $this, 'render_number_field' ],
            self::PAGE_SLUG,
            'gos_pricing_section',
            [ 'label_for' => 'gos_default_markup', 'min' => 0, 'max' => 200, 'step' => 1 ]
        );
        
        add_settings_field(
            'gos_currency_symbol',
            __( 'Currency Symbol', 'glazieros-app' ),
            [ $this, 'render_text_field' ],
            self::PAGE_SLUG,
            'gos_pricing_section',
            [ 'label_for' => 'gos_currency_symbol', 'class' => 'small-text' ]
        );
        
        // Invoice Section
        add_settings_section(
            'gos_invoice_section',
            __( 'Invoice Settings', 'glazieros-app' ),
            null,
            self::PAGE_SLUG
        );
        
        add_settings_field(
            'gos_invoice_prefix',
            __( 'Invoice Prefix', 'glazieros-app' ),
            [ $this, 'render_text_field' ],
            self::PAGE_SLUG,
            'gos_invoice_section',
            [ 'label_for' => 'gos_invoice_prefix', 'class' => 'small-text' ]
        );
        
        add_settings_field(
            'gos_invoice_payment_terms',
            __( 'Payment Terms', 'glazieros-app' ),
            [ $this, 'render_textarea_field' ],
            self::PAGE_SLUG,
            'gos_invoice_section',
            [ 'label_for' => 'gos_invoice_payment_terms', 'rows' => 2 ]
        );
        
        add_settings_field(
            'gos_invoice_notes',
            __( 'Default Invoice Notes', 'glazieros-app' ),
            [ $this, 'render_textarea_field' ],
            self::PAGE_SLUG,
            'gos_invoice_section',
            [ 'label_for' => 'gos_invoice_notes', 'rows' => 3 ]
        );
        
        // Email Notifications Section
        add_settings_section(
            'gos_email_section',
            __( 'Email Notifications', 'glazieros-app' ),
            null,
            self::PAGE_SLUG
        );
        
        add_settings_field(
            'gos_enable_email_notifications',
            __( 'Enable Email Notifications', 'glazieros-app' ),
            [ $this, 'render_checkbox_field' ],
            self::PAGE_SLUG,
            'gos_email_section',
            [ 'label_for' => 'gos_enable_email_notifications' ]
        );
        
        add_settings_field(
            'gos_notification_email',
            __( 'Notification Email', 'glazieros-app' ),
            [ $this, 'render_email_field' ],
            self::PAGE_SLUG,
            'gos_email_section',
            [ 'label_for' => 'gos_notification_email', 'class' => 'regular-text' ]
        );
        
        // Feature Toggles Section
        add_settings_section(
            'gos_features_section',
            __( 'Feature Toggles', 'glazieros-app' ),
            null,
            self::PAGE_SLUG
        );
        
        add_settings_field(
            'gos_enable_multi_branch',
            __( 'Enable Multi-Branch Mode', 'glazieros-app' ),
            [ $this, 'render_checkbox_field' ],
            self::PAGE_SLUG,
            'gos_features_section',
            [ 'label_for' => 'gos_enable_multi_branch' ]
        );
        
        add_settings_field(
            'gos_enable_diary',
            __( 'Enable Diary System', 'glazieros-app' ),
            [ $this, 'render_checkbox_field' ],
            self::PAGE_SLUG,
            'gos_features_section',
            [ 'label_for' => 'gos_enable_diary' ]
        );
        
        add_settings_field(
            'gos_enable_3d_configurator',
            __( 'Enable 3D Configurator', 'glazieros-app' ),
            [ $this, 'render_checkbox_field' ],
            self::PAGE_SLUG,
            'gos_features_section',
            [ 'label_for' => 'gos_enable_3d_configurator' ]
        );
        
        add_settings_field(
            'gos_enable_audit_logs',
            __( 'Enable Audit Logs', 'glazieros-app' ),
            [ $this, 'render_checkbox_field' ],
            self::PAGE_SLUG,
            'gos_features_section',
            [ 'label_for' => 'gos_enable_audit_logs' ]
        );
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( __( 'You do not have sufficient permissions to access this page.', 'glazieros-app' ) );
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields( self::OPTION_GROUP );
                do_settings_sections( self::PAGE_SLUG );
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Render section description
     *
     * @param array $args Section arguments
     */
    public function render_section_description( array $args ): void {
        if ( 'gos_company_section' === $args['id'] ) {
            echo '<p>' . esc_html__( 'This information will be displayed on invoices and official documents.', 'glazieros-app' ) . '</p>';
        }
    }
    
    /**
     * Render text input field
     *
     * @param array $args Field arguments
     */
    public function render_text_field( array $args ): void {
        $option_name = $args['label_for'];
        $value = get_option( $option_name, '' );
        $class = $args['class'] ?? 'regular-text';
        
        printf(
            '<input type="text" id="%s" name="%s" value="%s" class="%s" />',
            esc_attr( $option_name ),
            esc_attr( $option_name ),
            esc_attr( $value ),
            esc_attr( $class )
        );
    }
    
    /**
     * Render textarea field
     *
     * @param array $args Field arguments
     */
    public function render_textarea_field( array $args ): void {
        $option_name = $args['label_for'];
        $value = get_option( $option_name, '' );
        $rows = $args['rows'] ?? 3;
        
        printf(
            '<textarea id="%s" name="%s" rows="%d" class="large-text">%s</textarea>',
            esc_attr( $option_name ),
            esc_attr( $option_name ),
            absint( $rows ),
            esc_textarea( $value )
        );
    }
    
    /**
     * Render email input field
     *
     * @param array $args Field arguments
     */
    public function render_email_field( array $args ): void {
        $option_name = $args['label_for'];
        $value = get_option( $option_name, '' );
        $class = $args['class'] ?? 'regular-text';
        
        printf(
            '<input type="email" id="%s" name="%s" value="%s" class="%s" />',
            esc_attr( $option_name ),
            esc_attr( $option_name ),
            esc_attr( $value ),
            esc_attr( $class )
        );
    }
    
    /**
     * Render number input field
     *
     * @param array $args Field arguments
     */
    public function render_number_field( array $args ): void {
        $option_name = $args['label_for'];
        $value = get_option( $option_name, 0 );
        $min = $args['min'] ?? 0;
        $max = $args['max'] ?? 999999;
        $step = $args['step'] ?? 1;
        
        printf(
            '<input type="number" id="%s" name="%s" value="%s" min="%s" max="%s" step="%s" class="small-text" />',
            esc_attr( $option_name ),
            esc_attr( $option_name ),
            esc_attr( $value ),
            esc_attr( $min ),
            esc_attr( $max ),
            esc_attr( $step )
        );
    }
    
    /**
     * Render checkbox field
     *
     * @param array $args Field arguments
     */
    public function render_checkbox_field( array $args ): void {
        $option_name = $args['label_for'];
        $value = get_option( $option_name, 0 );
        
        printf(
            '<input type="checkbox" id="%s" name="%s" value="1" %s />',
            esc_attr( $option_name ),
            esc_attr( $option_name ),
            checked( 1, $value, false )
        );
    }
    
    /**
     * Sanitize percentage value
     *
     * @param mixed $value The value to sanitize
     * @return float The sanitized value
     */
    public function sanitize_percentage( $value ): float {
        $value = floatval( $value );
        return max( 0, min( 100, $value ) );
    }
    
    /**
     * Sanitize checkbox value
     *
     * @param mixed $value The value to sanitize
     * @return int 1 if checked, 0 otherwise
     */
    public function sanitize_checkbox( $value ): int {
        return ( isset( $value ) && '1' === $value ) ? 1 : 0;
    }
}

// Initialize settings
new Settings();
