<?php
defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    // Enable/disable plugin.
    $settings->add(new admin_setting_configcheckbox(
        'local_tutorbot/enabled',
        get_string('enabled', 'local_tutorbot'),
        get_string('enabled_help', 'local_tutorbot'),
        1
    ));

    // Gemini API Key.
    $settings->add(new admin_setting_configtext(
        'local_tutorbot/geminiapikey',
        get_string('geminiapikey', 'local_tutorbot'),
        get_string('geminiapikey_help', 'local_tutorbot'),
        '',
        PARAM_TEXT
    ));

    // Maximum tokens.
    $settings->add(new admin_setting_configtext(
        'local_tutorbot/maxtokens',
        get_string('maxtokens', 'local_tutorbot'),
        get_string('maxtokens_help', 'local_tutorbot'),
        2000,
        PARAM_INT
    ));

    // Rate limiting.
    $settings->add(new admin_setting_configtext(
        'local_tutorbot/ratelimit',
        get_string('ratelimit', 'local_tutorbot'),
        get_string('ratelimit_help', 'local_tutorbot'),
        50,
        PARAM_INT
    ));
}