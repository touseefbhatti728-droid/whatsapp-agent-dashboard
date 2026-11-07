<?php
/**
 * Plugin Name:       NextReply AI Receptionist
 * Plugin URI:        https://app.nextreply.io
 * Description:       Your NextReply AI on your website: a chat bubble that answers and books 24/7, and an online booking page. Connect in one click.
 * Version:           1.0.0
 * Requires at least: 5.6
 * Requires PHP:      7.2
 * Author:            NextReply
 * License:           GPLv2 or later
 * Text Domain:       nextreply
 */

if (!defined('ABSPATH')) {
	exit;
}

define('NEXTREPLY_APP', 'https://app.nextreply.io');
define('NEXTREPLY_WIDGET', 'https://whatsapp-agent-production-b43f.up.railway.app/public/widget.js');

function nextreply_business_id() {
	$id = get_option('nextreply_business_id', '');
	return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id) ? $id : '';
}

// ---- Settings page ---------------------------------------------------------------
add_action('admin_menu', function () {
	add_menu_page('NextReply', 'NextReply', 'manage_options', 'nextreply', 'nextreply_settings_page', 'dashicons-format-chat', 81);
});

// "Connect" comes back here with ?nextreply_business=<id>&state=<nonce>.
add_action('admin_init', function () {
	if (!current_user_can('manage_options')) {
		return;
	}
	if (isset($_GET['page'], $_GET['nextreply_business'], $_GET['state']) && $_GET['page'] === 'nextreply') {
		$id = sanitize_text_field(wp_unslash($_GET['nextreply_business']));
		if (wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['state'])), 'nextreply_connect')
			&& preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
			update_option('nextreply_business_id', $id);
			update_option('nextreply_enabled', '1');
			wp_safe_redirect(admin_url('admin.php?page=nextreply&connected=1'));
			exit;
		}
	}
	if (isset($_POST['nextreply_save']) && check_admin_referer('nextreply_save')) {
		update_option('nextreply_enabled', isset($_POST['nextreply_enabled']) ? '1' : '0');
		$color = sanitize_hex_color(wp_unslash($_POST['nextreply_color'] ?? '')) ?: '#6d28d9';
		update_option('nextreply_color', $color);
		update_option('nextreply_position', ($_POST['nextreply_position'] ?? '') === 'left' ? 'left' : 'right');
		wp_safe_redirect(admin_url('admin.php?page=nextreply&saved=1'));
		exit;
	}
	if (isset($_POST['nextreply_disconnect']) && check_admin_referer('nextreply_save')) {
		delete_option('nextreply_business_id');
		wp_safe_redirect(admin_url('admin.php?page=nextreply'));
		exit;
	}
});

function nextreply_settings_page() {
	$id = nextreply_business_id();
	$return = admin_url('admin.php?page=nextreply');
	$connect = add_query_arg(array(
		'platform' => 'wordpress',
		'site'     => home_url(),
		'return'   => $return,
		'state'    => wp_create_nonce('nextreply_connect'),
	), NEXTREPLY_APP . '/connect');
	?>
	<div class="wrap">
		<h1>NextReply AI Receptionist</h1>
		<?php if (isset($_GET['connected'])) : ?><div class="notice notice-success"><p>Connected! Your AI chat is now live on your site.</p></div><?php endif; ?>
		<?php if (isset($_GET['saved'])) : ?><div class="notice notice-success"><p>Saved.</p></div><?php endif; ?>

		<?php if (!$id) : ?>
			<div class="card" style="max-width:640px;padding:20px">
				<h2>Step 1 — Connect your NextReply account</h2>
				<p>Log in (or sign up free) and this site is linked automatically. Your AI learns your services from your website.</p>
				<p><a class="button button-primary button-hero" href="<?php echo esc_url($connect); ?>">Connect to NextReply</a></p>
			</div>
		<?php else : ?>
			<div class="card" style="max-width:640px;padding:20px">
				<h2>✅ Connected</h2>
				<p>Your AI chat bubble shows on every page of this site.</p>
				<form method="post">
					<?php wp_nonce_field('nextreply_save'); ?>
					<p><label><input type="checkbox" name="nextreply_enabled" <?php checked(get_option('nextreply_enabled', '1'), '1'); ?>> Show the chat bubble</label></p>
					<p><label>Colour <input type="text" name="nextreply_color" value="<?php echo esc_attr(get_option('nextreply_color', '#6d28d9')); ?>" size="8"></label>
					&nbsp; <label>Position <select name="nextreply_position">
						<option value="right" <?php selected(get_option('nextreply_position', 'right'), 'right'); ?>>Right</option>
						<option value="left" <?php selected(get_option('nextreply_position', 'right'), 'left'); ?>>Left</option>
					</select></label></p>
					<p><button class="button button-primary" name="nextreply_save" value="1">Save</button>
					<button class="button" name="nextreply_disconnect" value="1" onclick="return confirm('Disconnect NextReply from this site?')">Disconnect</button></p>
				</form>
				<h3>Online booking page</h3>
				<p>Put <code>[nextreply_booking]</code> on any page (e.g. a "Book now" page) to show your booking calendar.</p>
				<h3>Step 3 — WhatsApp, Facebook &amp; Instagram</h3>
				<p><a class="button" target="_blank" rel="noopener" href="<?php echo esc_url(NEXTREPLY_APP . '/setup'); ?>">Open NextReply setup</a></p>
			</div>
		<?php endif; ?>
	</div>
	<?php
}

// ---- Chat widget on every page -------------------------------------------------------
add_action('wp_footer', function () {
	$id = nextreply_business_id();
	if (!$id || get_option('nextreply_enabled', '1') !== '1') {
		return;
	}
	printf(
		'<script src="%s" data-business="%s" data-color="%s" data-position="%s" async></script>' . "\n",
		esc_url(NEXTREPLY_WIDGET),
		esc_attr($id),
		esc_attr(get_option('nextreply_color', '#6d28d9')),
		esc_attr(get_option('nextreply_position', 'right'))
	);
});

// ---- [nextreply_booking height="900"] ---------------------------------------------------
add_shortcode('nextreply_booking', function ($atts) {
	$id = nextreply_business_id();
	if (!$id) {
		return '';
	}
	$atts = shortcode_atts(array('height' => '900'), $atts, 'nextreply_booking');
	return sprintf(
		'<iframe src="%s" style="width:100%%;min-height:%dpx;border:0" loading="lazy" title="Book an appointment"></iframe>',
		esc_url(NEXTREPLY_APP . '/book/' . $id),
		max(500, intval($atts['height']))
	);
});

// Settings link on the Plugins screen.
add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
	array_unshift($links, '<a href="' . esc_url(admin_url('admin.php?page=nextreply')) . '">Settings</a>');
	return $links;
});
