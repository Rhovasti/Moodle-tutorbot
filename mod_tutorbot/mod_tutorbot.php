<?php
require_once('../../config.php');
require_once($CFG->dirroot.'/course/modlib.php');
require_once(__DIR__.'/lib.php');

$id = optional_param('id', 0, PARAM_INT);  // Course Module ID
$r = optional_param('r', 0, PARAM_INT);    // Resource instance ID
$redirect = optional_param('redirect', 0, PARAM_BOOL);

if ($r) {
    if (!$resource = $DB->get_record('tutorbot', array('id'=>$r))) {
        redirect(new moodle_url('/'));
    }
    $cm = get_coursemodule_from_instance('tutorbot', $resource->id, $resource->course);
} else {
    if (!$cm = get_coursemodule_from_id('tutorbot', $id)) {
        redirect(new moodle_url('/'));
    }
    $resource = $DB->get_record('tutorbot', array('id'=>$cm->instance), '*', MUST_EXIST);
}

$course = $DB->get_record('course', array('id'=>$cm->course), '*', MUST_EXIST);

require_course_login($course, true, $cm);
$context = context_module::instance($cm->id);
require_capability('mod/tutorbot:view', $context);

$PAGE->set_url('/mod/tutorbot/view.php', array('id' => $cm->id));
$PAGE->set_title(format_string($resource->name));
$PAGE->set_heading(format_string($course->fullname));
$PAGE->set_activity_record($resource);

// Mark as viewed
$completion = new completion_info($course);
$completion->set_module_viewed($cm);

echo $OUTPUT->header();
echo $OUTPUT->heading(format_string($resource->name));

// Prepare tutorbot URL with context
$tutorbot_url = 'https://tutorbot.munmuudle.eu';
$context_data = [
    'course_id' => $course->id,
    'course_name' => $course->fullname,
    'user_id' => $USER->id,
    'user_name' => fullname($USER),
    'cm_id' => $cm->id,
    'module_name' => $resource->name
];

// Build iframe with context data
$iframe_src = $tutorbot_url . '?' . http_build_query($context_data);

echo html_writer::start_div('mod-tutorbot-container');
echo html_writer::tag('iframe', '', [
    'src' => $iframe_src,
    'width' => '100%',
    'height' => '600px',
    'frameborder' => '0',
    'style' => 'border: 1px solid #ddd; border-radius: 4px;',
    'title' => get_string('tutorbot_iframe', 'mod_tutorbot')
]);
echo html_writer::end_div();

// Display introduction if present
if (!empty($resource->intro)) {
    echo $OUTPUT->box_start('generalbox', 'intro');
    echo format_module_intro('tutorbot', $resource, $cm->id);
    echo $OUTPUT->box_end();
}

echo $OUTPUT->footer();