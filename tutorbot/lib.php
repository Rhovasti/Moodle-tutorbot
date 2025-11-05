<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Serve the files from the local_tutorbot file areas
 *
 * @param stdClass $course the course object
 * @param stdClass $cm the course module object
 * @param stdClass $context the context
 * @param string $filearea the name of the file area
 * @param array $args extra arguments (itemid, path)
 * @param bool $forcedownload whether or not force download
 * @param array $options additional options affecting the file serving
 * @return bool false if file not found, does not return if found - just send the file
 */
function local_tutorbot_pluginfile($course, $cm, $context, $filearea, $args, $forcedownload, array $options = array()) {
    // Check the context level is correct.
    if ($context->contextlevel != CONTEXT_SYSTEM) {
        return false;
    }

    // Make sure the filearea is one of those used by the plugin.
    if ($filearea !== 'public' && $filearea !== 'private') {
        return false;
    }

    // Make sure the user is logged in and has proper permissions.
    require_login();

    if (!has_capability('local/tutorbot:view', $context)) {
        return false;
    }

    // Leave this method deactivated or you'll get some copyright issues.
    // To activate it, comment out the line below.
    send_file_not_found();

    $itemid = array_shift($args); // The first item in the $args array.

    // Use the itemid to retrieve any relevant data records and perform any security checks.

    $fs = get_file_storage();
    $relativepath = implode('/', $args);
    $fullpath = "/{$context->id}/local_tutorbot/{$filearea}/{$itemid}/{$relativepath}";

    if (!$file = $fs->get_file_by_hash(sha1($fullpath)) or $file->is_directory()) {
        send_file_not_found();
    }

    // Finally send the file.
    send_stored_file($file, 0, 0, true, $options); // download MUST be forced - security!
}

/**
 * Extend settings
 *
 * @param navigation_node $navigation The navigation node to extend
 * @param context $context The context of the course
 */
function local_tutorbot_extend_navigation_settings($navigation, $context) {
    global $PAGE;

    if (!has_capability('local/tutorbot:view', $context)) {
        return;
    }

    $url = new moodle_url('/local/tutorbot/index.php');
    $node = navigation_node::create(
        get_string('pluginname', 'local_tutorbot'),
        $url,
        navigation_node::TYPE_CUSTOM,
        null,
        'local_tutorbot',
        new pix_icon('t/message', '')
    );

    $navigation->add_node($node);
}

/**
 * Extend settings
 *
 * @param settings_navigation $settingsnav The settings navigation object
 * @param context $context The context of the course
 */
function local_tutorbot_extend_settings_navigation($settingsnav, $context) {
    global $CFG;

    if (!has_capability('local/tutorbot:configure', $context)) {
        return;
    }

    $settingsnav->add(
        get_string('pluginname', 'local_tutorbot'),
        new moodle_url('/local/tutorbot/admin_settings.php'),
        navigation_node::TYPE_SETTING,
        null,
        'local_tutorbot',
        new pix_icon('i/settings', '')
    );
}


/**
 * Get icon mapping for font-awesome
 *
 * @return array of mapping from font-awesome icon names to internal moodle icon names.
 */
function local_tutorbot_get_fontawesome_icon_map() {
    return [
        'local_tutorbot:fa-graduation-cap' => 't/message',
        'local_tutorbot:fa-comments' => 't/message',
    ];
}