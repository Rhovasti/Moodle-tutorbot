<?php
defined('MOODLE_INTERNAL') || die();

// This file redirects to the main mod_tutorbot.php file
// It's kept for compatibility reasons
redirect(new moodle_url('/mod/tutorbot/mod_tutorbot.php', $_GET));