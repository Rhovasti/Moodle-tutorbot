<?php
defined('MOODLE_INTERNAL') || die();

/**
 * List of features supported in Tutorbot module
 * @param string $feature FEATURE_xx constant for requested feature
 * @return mixed True if module supports feature, false if not, null if doesn't know
 */
function tutorbot_supports($feature) {
    switch($feature) {
        case FEATURE_MOD_INTRO:
            return true;
        case FEATURE_GROUPS:
            return true;
        case FEATURE_GROUPINGS:
            return true;
        case FEATURE_GROUPMEMBERSONLY:
            return true;
        case FEATURE_MOD_ARCHETYPE:
            return MOD_ARCHETYPE_RESOURCE;
        case FEATURE_BACKUP_MOODLE2:
            return true;
        case FEATURE_COMPLETION_TRACKS_VIEWS:
            return true;
        case FEATURE_SHOW_DESCRIPTION:
            return true;
        default:
            return null;
    }
}

/**
 * This function is used by the reset_course_userdata function in moodlelib.
 * @param $data the data submitted from the reset course.
 * @return array status array
 */
function tutorbot_reset_userdata($data) {
    return array();
}

/**
 * List the actions that correspond to a view of this module.
 * This is used by the participation reports.
 * @return array
 */
function tutorbot_get_view_actions() {
    return array('view', 'view all');
}

/**
 * List the actions that correspond to a post of this module.
 * This is used by the participation reports.
 * @return array
 */
function tutorbot_get_post_actions() {
    return array();
}

/**
 * Add tutorbot instance.
 * @param object $data
 * @param object $mform
 * @return int new tutorbot instance id
 */
function tutorbot_add_instance($data, $mform) {
    global $DB, $CFG;

    $data->timemodified = time();
    $data->id = $DB->insert_record('tutorbot', $data);

    $completiontimeexpected = !empty($data->completionexpected) ? $data->completionexpected : null;
    \core_completion\api::update_completion_date_event($data->coursemodule, 'tutorbot', $data->id, $completiontimeexpected);

    return $data->id;
}

/**
 * Update tutorbot instance.
 * @param object $data
 * @param object $mform
 * @return bool true
 */
function tutorbot_update_instance($data, $mform) {
    global $DB, $CFG;

    $data->timemodified = time();
    $data->id = $data->instance;
    $DB->update_record('tutorbot', $data);

    $completiontimeexpected = !empty($data->completionexpected) ? $data->completionexpected : null;
    \core_completion\api::update_completion_date_event($data->coursemodule, 'tutorbot', $data->id, $completiontimeexpected);

    return true;
}

/**
 * Delete tutorbot instance.
 * @param int $id
 * @return bool true
 */
function tutorbot_delete_instance($id) {
    global $DB;

    if (!$tutorbot = $DB->get_record('tutorbot', array('id'=>$id))) {
        return false;
    }

    $cm = get_coursemodule_from_instance('tutorbot', $id);
    \core_completion\api::update_completion_date_event($cm->id, 'tutorbot', $id, null);

    $DB->delete_records('tutorbot', array('id'=>$id));

    return true;
}

/**
 * Given a course_module object, this function returns any
 * "extra" information that may be needed when printing
 * this activity in a course listing.
 * See get_array_of_activities() in course/lib.php
 *
 * @param object $coursemodule
 * @return cached_cm_info|null
 */
function tutorbot_get_coursemodule_info($coursemodule) {
    global $DB, $CFG;

    if (!$tutorbot = $DB->get_record('tutorbot', array('id'=>$coursemodule->instance),
            'id, name, intro, introformat')) {
        return null;
    }

    $result = new cached_cm_info();
    $result->name = $tutorbot->name;

    if ($coursemodule->showdescription) {
        if ($tutorbot->intro) {
            $result->content = format_module_intro('tutorbot', $tutorbot, $coursemodule->id, false);
        }
    }

    return $result;
}