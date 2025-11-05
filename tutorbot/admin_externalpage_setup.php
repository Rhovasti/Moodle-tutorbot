<?php
defined('MOODLE_INTERNAL') || die();

// Register the admin external page
$ADMIN->add('localplugins', new admin_externalpage(
    'local_tutorbot_settings',
    get_string('pluginname', 'local_tutorbot'),
    $CFG->wwwroot . '/local/tutorbot/admin_settings.php'
));