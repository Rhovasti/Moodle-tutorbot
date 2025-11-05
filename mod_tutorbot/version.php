<?php
defined('MOODLE_INTERNAL') || die();

$plugin->component = 'mod_tutorbot';
$plugin->version   = 2025110500;
$plugin->requires  = 2024100600;  // Requires Moodle 5.1
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0.0';
$plugin->dependencies = [
    'mod_lti' => 2024100600
];