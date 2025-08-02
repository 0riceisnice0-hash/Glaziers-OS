<?php
namespace GlazierOS\Admin;

class QuoteDetail {
  public function __construct() {
    add_shortcode( 'gos_quote_detail', [ $this, 'render' ] );
  }

  public function render( $atts ) {
    $atts = shortcode_atts( [ 'id' => 0 ], $atts, 'gos_quote_detail' );
    $id   = intval( $atts['id'] );
    if ( ! $id ) {
      return '<p>Invalid quote ID.</p>';
    }
    $meta = get_post_meta( $id );
    ob_start();
    ?>
    <div id="gos-quote-detail">
      <h2>Quote #<?php echo $id; ?></h2>
      <ul>
        <li>Type: <?php echo esc_html( $meta['gos_type'][0] ); ?></li>
        <li>Size: <?php echo esc_html( $meta['gos_width'][0] ) . ' × ' . esc_html( $meta['gos_height'][0] ); ?> m</li>
        <li>Price: £<?php echo number_format_i18n( floatval( $meta['gos_price'][0] ), 2 ); ?></li>
        <li>Status: <?php echo esc_html( $meta['gos_status'][0] ); ?></li>
        <li>Notes: <?php echo esc_html( $meta['gos_notes'][0] ); ?></li>
        <li>First name: <?php echo esc_html( $meta['gos_first_name'][0] ); ?></li>
        <li>Last name: <?php echo esc_html( $meta['gos_last_name'][0] ); ?></li>
        <li>Phone: <?php echo esc_html( $meta['gos_phone'][0] ); ?></li>
        <li>Email: <?php echo esc_html( $meta['gos_email'][0] ); ?></li>
        <li>Address: <?php echo esc_html( $meta['gos_address'][0] ); ?></li>
      </ul>
      <div id="gos-3d"></div>
    </div>
    <?php
    return ob_get_clean();
  }
}
