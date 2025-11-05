<?php
require_once('../../config.php');

$action = optional_param('action', 'view', PARAM_ALPHA);
$context = context_system::instance();

// Check if user has capability to view the tutorbot.
require_capability('local/tutorbot:view', $context);

// Get plugin settings.
$config = get_config('local_tutorbot');
$enabled = isset($config->enabled) ? $config->enabled : 0;
$gemini_api_key = isset($config->geminiapikey) ? $config->geminiapikey : '';

$PAGE->set_context($context);
$PAGE->set_url('/local/tutorbot/index.php');
$PAGE->set_title(get_string('pluginname', 'local_tutorbot'));
$PAGE->set_heading(get_string('pluginname', 'local_tutorbot'));
$PAGE->requires->css('/local/tutorbot/css/style.css');

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('pluginname', 'local_tutorbot'));

if (!$enabled) {
    $message = get_string('notconfigured', 'local_tutorbot');
    echo $OUTPUT->notification($message, 'warning');
    echo $OUTPUT->footer();
    exit;
}

if (empty($gemini_api_key)) {
    $message = get_string('notconfigured', 'local_tutorbot');
    echo $OUTPUT->notification($message, 'warning');
    echo $OUTPUT->footer();
    exit;
}

// Display the React app container.
echo html_writer::start_div('tutorbot-container', array('id' => 'tutorbot-root'));
echo html_writer::end_div();

// Include the Moodle JavaScript module with string support
$PAGE->requires->js_call_amd('local_tutorbot/main', 'init');


echo $OUTPUT->footer();