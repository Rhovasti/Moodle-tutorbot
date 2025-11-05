<?php
require_once('../../config.php');

$PAGE->set_context(context_system::instance());
$PAGE->set_url('/local/tutorbot/langtest.php');
$PAGE->set_title('Language Test');

echo $OUTPUT->header();
echo $OUTPUT->heading('Language Selection Test');

echo '<div style="padding: 20px;">';
echo '<h3>Current Language Settings:</h3>';
echo '<p><strong>Current Language:</strong> ' . current_language() . '</p>';
echo '<p><strong>Available Languages:</strong> en, fi</p>';

echo '<h3>Language Switch Links:</h3>';
echo '<p><a href="?lang=en">Switch to English</a></p>';
echo '<p><a href="?lang=fi">Switch to Finnish</a></p>';

echo '<h3>Tutorbot Test:</h3>';
echo '<p><a href="index.php">Go to Tutorbot</a></p>';

// Test some string translations
echo '<h3>String Translations Test:</h3>';
echo '<p><strong>Plugin Name:</strong> ' . get_string('pluginname', 'local_tutorbot') . '</p>';
echo '<p><strong>Welcome:</strong> ' . get_string('welcome', 'local_tutorbot') . '</p>';
echo '<p><strong>Error:</strong> ' . get_string('error_occurred', 'local_tutorbot') . '</p>';

echo '</div>';

echo $OUTPUT->footer();