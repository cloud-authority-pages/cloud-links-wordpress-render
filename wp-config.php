<?php
define('DB_NAME', 'wordpress');
define('DB_USER', 'wordpress');
define('DB_PASSWORD', 'wordpress');
define('DB_HOST', 'localhost');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

define('AUTH_KEY',         'cloud-links-auth-key-1');
define('SECURE_AUTH_KEY',  'cloud-links-secure-auth-key-1');
define('LOGGED_IN_KEY',    'cloud-links-logged-in-key-1');
define('NONCE_KEY',        'cloud-links-nonce-key-1');
define('AUTH_SALT',        'cloud-links-auth-salt-1');
define('SECURE_AUTH_SALT', 'cloud-links-secure-auth-salt-1');
define('LOGGED_IN_SALT',   'cloud-links-logged-in-salt-1');
define('NONCE_SALT',       'cloud-links-nonce-salt-1');

$table_prefix = 'wp_';

define('WP_DEBUG', false);

if ( !defined('ABSPATH') )
    define('ABSPATH', dirname(__FILE__) . '/');

require_once(ABSPATH . 'wp-settings.php');
