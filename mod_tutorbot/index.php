<?php
require_once('../../config.php');
require_once($CFG->dirroot.'/course/lib.php');
require_once($CFG->dirroot.'/mod/tutorbot/lib.php');

$id = required_param('id', PARAM_INT);  // Course ID

if (!$course = $DB->get_record('course', array('id' => $id))) {
    print_error('invalidcourseid');
}

require_course_login($course);
$PAGE->set_pagelayout('incourse');
$PAGE->set_url('/mod/tutorbot/index.php', array('id' => $id));
$PAGE->set_title(get_string('modulenameplural', 'mod_tutorbot'));
$PAGE->set_heading($course->fullname);
$PAGE->navbar->add(get_string('modulenameplural', 'mod_tutorbot'));

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('modulenameplural', 'mod_tutorbot'));

if (!$tutorbots = get_all_instances_in_course('tutorbot', $course)) {
    notice(get_string('thereareno', 'moodle', get_string('modulenameplural', 'mod_tutorbot')),
           new moodle_url('/course/view.php', array('id' => $course->id)));
    exit;
}

$usesections = course_format_uses_sections($course->format);

$table = new html_table();
$table->attributes['class'] = 'generaltable mod_index';

if ($usesections) {
    $strsectionname = get_string('sectionname', 'format_'.$course->format);
    $table->head  = array ($strsectionname, get_string('name'));
    $table->align = array ('center', 'left');
} else {
    $table->head  = array (get_string('name'));
    $table->align = array ('left');
}

$currentsection = '';

foreach ($tutorbots as $tutorbot) {
    if (!$tutorbot->visible) {
        $link = html_writer::link(
            new moodle_url('/mod/tutorbot/view.php', array('id' => $tutorbot->coursemodule)),
            format_string($tutorbot->name, true),
            array('class' => 'dimmed'));
    } else {
        $link = html_writer::link(
            new moodle_url('/mod/tutorbot/view.php', array('id' => $tutorbot->coursemodule)),
            format_string($tutorbot->name, true));
    }

    if ($usesections) {
        $printsection = '';
        if ($tutorbot->section !== $currentsection) {
            if ($tutorbot->section) {
                $printsection = get_section_name($course, $tutorbot->section);
            }
            if ($currentsection !== '') {
                $table->data[] = 'hr';
            }
            $currentsection = $tutorbot->section;
        }
    }

    if ($usesections) {
        $row = array($printsection, $link);
    } else {
        $row = array($link);
    }

    $table->data[] = $row;
}

echo '<br />';
echo html_writer::table($table);

echo $OUTPUT->footer();