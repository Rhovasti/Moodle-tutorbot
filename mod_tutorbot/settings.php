<?php
defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    //--- general settings -----------------------------------------------------------------------------------
    $settings = new admin_settingpage('mod_tutorbot_settings', get_string('pluginname', 'mod_tutorbot'));

    $settings->add(new admin_setting_configtext(
        'tutorbot_url',
        get_string('tutorbot_url', 'mod_tutorbot'),
        get_string('tutorbot_url_desc', 'mod_tutorbot'),
        'https://tutorbot.munmuudle.eu',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configcheckbox(
        'tutorbot_enable_completion',
        get_string('enable_completion', 'mod_tutorbot'),
        get_string('enable_completion_desc', 'mod_tutorbot'),
        1
    ));

    $ADMIN->add('modsettings', $settings);
}

//--- Add plugin to settings menu ------------------------------------------------------------------------------
$ADMIN->add('modsettings', new admin_category('modtutorbotfolder', new lang_string('pluginname', 'mod_tutorbot')));
$ADMIN->add('modtutorbotfolder', $settings);