<?php
require_once('../../config.php');
require_once($CFG->libdir.'/adminlib.php');

// Check if user has permissions.
require_capability('local/tutorbot:configure', context_system::instance());

// Set up the page.
$PAGE->set_context(context_system::instance());
$PAGE->set_url('/local/tutorbot/admin_settings.php');
$PAGE->set_title(get_string('pluginname', 'local_tutorbot'));
$PAGE->set_heading(get_string('pluginname', 'local_tutorbot'));
$PAGE->set_pagelayout('admin');

$action = optional_param('action', '', PARAM_ALPHA);
$config = get_config('local_tutorbot');

// Handle form submission.
if ($action === 'save' && confirm_sesskey()) {
    $enabled = optional_param('enabled', 0, PARAM_INT);
    $geminiapikey = optional_param('geminiapikey', '', PARAM_TEXT);
    $maxtokens = optional_param('maxtokens', 2000, PARAM_INT);
    $ratelimit = optional_param('ratelimit', 50, PARAM_INT);

    set_config('enabled', $enabled, 'local_tutorbot');
    set_config('geminiapikey', $geminiapikey, 'local_tutorbot');
    set_config('maxtokens', $maxtokens, 'local_tutorbot');
    set_config('ratelimit', $ratelimit, 'local_tutorbot');

    redirect($PAGE->url, get_string('settingssaved', 'admin'));
}

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('pluginname', 'local_tutorbot'));

echo html_writer::start_tag('form', array('method' => 'post', 'action' => $PAGE->url));
echo html_writer::empty_tag('input', array('type' => 'hidden', 'name' => 'action', 'value' => 'save'));
echo html_writer::empty_tag('input', array('type' => 'hidden', 'name' => 'sesskey', 'value' => sesskey()));

echo html_writer::start_tag('table', array('class' => 'generaltable', 'cellpadding' => '5'));

// Enable/disable setting.
echo html_writer::start_tag('tr');
echo html_writer::tag('td', get_string('enabled', 'local_tutorbot'), array('class' => 'c0'));
echo html_writer::start_tag('td', array('class' => 'c1'));
$select = html_writer::select(
    array(0 => get_string('no'), 1 => get_string('yes')),
    'enabled',
    isset($config->enabled) ? $config->enabled : 0,
    array(),
    array()
);
echo $select;
echo html_writer::tag('td', get_string('enabled_help', 'local_tutorbot'), array('class' => 'c2'));
echo html_writer::end_tag('tr');

// Gemini API Key.
echo html_writer::start_tag('tr');
echo html_writer::tag('td', get_string('geminiapikey', 'local_tutorbot'), array('class' => 'c0'));
echo html_writer::start_tag('td', array('class' => 'c1'));
echo html_writer::empty_tag('input', array(
    'type' => 'text',
    'name' => 'geminiapikey',
    'value' => isset($config->geminiapikey) ? $config->geminiapikey : '',
    'size' => '50',
    'maxlength' => '255'
));
echo html_writer::tag('td', get_string('geminiapikey_help', 'local_tutorbot'), array('class' => 'c2'));
echo html_writer::end_tag('tr');

// Maximum tokens.
echo html_writer::start_tag('tr');
echo html_writer::tag('td', get_string('maxtokens', 'local_tutorbot'), array('class' => 'c0'));
echo html_writer::start_tag('td', array('class' => 'c1'));
echo html_writer::empty_tag('input', array(
    'type' => 'text',
    'name' => 'maxtokens',
    'value' => isset($config->maxtokens) ? $config->maxtokens : 2000,
    'size' => '10',
    'maxlength' => '10'
));
echo html_writer::tag('td', get_string('maxtokens_help', 'local_tutorbot'), array('class' => 'c2'));
echo html_writer::end_tag('tr');

// Rate limiting.
echo html_writer::start_tag('tr');
echo html_writer::tag('td', get_string('ratelimit', 'local_tutorbot'), array('class' => 'c0'));
echo html_writer::start_tag('td', array('class' => 'c1'));
echo html_writer::empty_tag('input', array(
    'type' => 'text',
    'name' => 'ratelimit',
    'value' => isset($config->ratelimit) ? $config->ratelimit : 50,
    'size' => '10',
    'maxlength' => '10'
));
echo html_writer::tag('td', get_string('ratelimit_help', 'local_tutorbot'), array('class' => 'c2'));
echo html_writer::end_tag('tr');

echo html_writer::end_tag('table');

echo html_writer::empty_tag('input', array(
    'type' => 'submit',
    'value' => get_string('savechanges', 'admin'),
    'class' => 'btn btn-primary'
));

echo html_writer::end_tag('form');

echo $OUTPUT->footer();