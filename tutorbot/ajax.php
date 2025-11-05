<?php
define('AJAX_SCRIPT', true);
require_once('../../config.php');
require_once($CFG->libdir.'/adminlib.php');

header('Content-Type: application/json');

$action = required_param('action', PARAM_RAW);
$context = context_system::instance();


require_login();
require_capability('local/tutorbot:view', $context);

$config = get_config('local_tutorbot');
$enabled = isset($config->enabled) ? $config->enabled : 0;
$gemini_api_key = isset($config->geminiapikey) ? $config->geminiapikey : '';

if (!$enabled || empty($gemini_api_key)) {
    echo json_encode(['error' => 'Plugin not configured']);
    exit;
}

switch ($action) {
    case 'get_user_info':
    case 'getuserinfo':
        $user = $USER;
        echo json_encode([
            'id' => $user->id,
            'username' => $user->username,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email
        ]);
        break;

    case 'get_memories':
    case 'getmemories':
        global $DB;
        $record = $DB->get_record('local_tutorbot_memories', ['userid' => $USER->id]);
        $memories = $record ? $record->memories : '';

        // Auto-generate memories from Moodle data if empty
        if (empty($memories)) {
            $memories = generate_auto_memories($USER->id);
            // Save auto-generated memories using set_field for more explicit updates
            if ($record && isset($record->id)) {
                try {
                    $DB->set_field('local_tutorbot_memories', 'memories', $memories, ['id' => $record->id]);
                    $DB->set_field('local_tutorbot_memories', 'timemodified', time(), ['id' => $record->id]);
                } catch (Exception $e) {
                    error_log('Tutorbot: Error updating memories: ' . $e->getMessage());
                }
            } else {
                $newrecord = new stdClass();
                $newrecord->userid = $USER->id;
                $newrecord->memories = $memories;
                $newrecord->timecreated = time();
                $newrecord->timemodified = time();
                try {
                    $DB->insert_record('local_tutorbot_memories', $newrecord);
                } catch (Exception $e) {
                    error_log('Tutorbot: Error inserting memories: ' . $e->getMessage());
                }
            }
        }

        echo json_encode(['memories' => $memories]);
        break;

    case 'save_memories':
    case 'savememories':
        $memories = required_param('memories', PARAM_TEXT);
        global $DB;

        $record = $DB->get_record('local_tutorbot_memories', ['userid' => $USER->id]);
        if ($record && isset($record->id)) {
            try {
                $DB->set_field('local_tutorbot_memories', 'memories', $memories, ['id' => $record->id]);
                $DB->set_field('local_tutorbot_memories', 'timemodified', time(), ['id' => $record->id]);
            } catch (Exception $e) {
                error_log('Tutorbot: Error updating memories: ' . $e->getMessage());
                echo json_encode(['error' => 'Failed to save memories']);
                exit;
            }
        } else {
            $newrecord = new stdClass();
            $newrecord->userid = $USER->id;
            $newrecord->memories = $memories;
            $newrecord->timecreated = time();
            $newrecord->timemodified = time();
            try {
                $DB->insert_record('local_tutorbot_memories', $newrecord);
            } catch (Exception $e) {
                error_log('Tutorbot: Error inserting memories: ' . $e->getMessage());
                echo json_encode(['error' => 'Failed to save memories']);
                exit;
            }
        }
        echo json_encode(['success' => true]);
        break;

    case 'refresh_memories':
    case 'refreshmemories':
        $memories = generate_auto_memories($USER->id);

        global $DB;
        $record = $DB->get_record('local_tutorbot_memories', ['userid' => $USER->id]);
        if ($record && isset($record->id)) {
            try {
                $DB->set_field('local_tutorbot_memories', 'memories', $memories, ['id' => $record->id]);
                $DB->set_field('local_tutorbot_memories', 'timemodified', time(), ['id' => $record->id]);
            } catch (Exception $e) {
                error_log('Tutorbot: Error refreshing memories: ' . $e->getMessage());
                echo json_encode(['error' => 'Failed to refresh memories']);
                exit;
            }
        } else {
            $newrecord = new stdClass();
            $newrecord->userid = $USER->id;
            $newrecord->memories = $memories;
            $newrecord->timecreated = time();
            $newrecord->timemodified = time();
            try {
                $DB->insert_record('local_tutorbot_memories', $newrecord);
            } catch (Exception $e) {
                error_log('Tutorbot: Error inserting memories: ' . $e->getMessage());
                echo json_encode(['error' => 'Failed to refresh memories']);
                exit;
            }
        }

        echo json_encode(['success' => true, 'memories' => $memories]);
        break;

    case 'get_chat_history':
    case 'getchathistory':
        global $DB;
        $records = $DB->get_records('local_tutorbot_chat', ['userid' => $USER->id], 'timestamp ASC');
        $history = [];
        foreach ($records as $record) {
            $history[] = [
                'author' => $record->message_author,
                'text' => $record->message_text,
                'timestamp' => $record->timestamp
            ];
        }
        echo json_encode(['history' => $history]);
        break;

    case 'save_message':
    case 'savemessage':
        $author = required_param('author', PARAM_ALPHA);
        $text = required_param('text', PARAM_TEXT);
        $timestamp = time();

        global $DB;
        $record = new stdClass();
        $record->userid = $USER->id;
        $record->message_author = $author;
        $record->message_text = $text;
        $record->timestamp = $timestamp;
        $DB->insert_record('local_tutorbot_chat', $record);

        echo json_encode(['success' => true, 'timestamp' => $timestamp]);
        break;

    case 'chat_with_gemini':
    case 'chatwithgemini':
        $message = required_param('message', PARAM_TEXT);
        $history = optional_param_array('history', [], PARAM_TEXT);

        // Check rate limiting
        $max_requests = isset($config->ratelimit) ? (int)$config->ratelimit : 50;
        $hour_ago = time() - 3600;
        $recent_requests = $DB->count_records('local_tutorbot_chat', [
            'userid' => $USER->id,
            'message_author' => 'model'
        ], 'timestamp > ?', [$hour_ago]);

        if ($recent_requests >= $max_requests) {
            echo json_encode(['error' => 'Rate limit exceeded. Please try again later.']);
            exit;
        }

        // Call Gemini API
        try {
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . $gemini_api_key;

            // Get user memories
            $memory_record = $DB->get_record('local_tutorbot_memories', ['userid' => $USER->id]);
            $memories = $memory_record ? $memory_record->memories : '';

            // Prepare system instruction
            $system_instruction = "You are a helpful AI tutor. Provide clear, educational responses that help students learn effectively. Be encouraging and adapt your explanations to the student's level." . "\n\nSTUDENT MEMORIES:\n" . $memories . "\n---";

            // Build conversation history
            $contents = [];
            foreach ($history as $msg) {
                $contents[] = [
                    'role' => $msg['author'] === 'user' ? 'user' : 'model',
                    'parts' => [['text' => $msg['text']]]
                ];
            }
            $contents[] = [
                'role' => 'user',
                'parts' => [['text' => $message]]
            ];

            $payload = [
                'contents' => $contents,
                'systemInstruction' => [
                    'parts' => [['text' => $system_instruction]]
                ],
                'generationConfig' => [
                    'maxOutputTokens' => isset($config->maxtokens) ? (int)$config->maxtokens : 2000
                ]
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($http_code === 200) {
                $data = json_decode($response, true);
                $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response generated.';

                // Save the model response
                $record = new stdClass();
                $record->userid = $USER->id;
                $record->message_author = 'model';
                $record->message_text = $text;
                $record->timestamp = time();
                $DB->insert_record('local_tutorbot_chat', $record);

                echo json_encode(['response' => $text]);
            } else {
                echo json_encode(['error' => 'API request failed']);
            }
        } catch (Exception $e) {
            echo json_encode(['error' => 'An error occurred: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['error' => 'Unknown action']);
        break;
}

/**
 * Generate automatic memories from Moodle data
 */
function generate_auto_memories($userid) {
    global $DB;

    $memories = "AUTO-GENERATED LEARNING PROFILE\n";
    $memories .= "============================\n\n";

    try {
        // Get user profile information
        $user = $DB->get_record('user', ['id' => $userid]);
        if ($user) {
            $memories .= "STUDENT PROFILE:\n";
            $memories .= "Name: " . ($user->firstname ?? '') . " " . ($user->lastname ?? '') . "\n";
            $memories .= "Email: " . ($user->email ?? '') . "\n";
            if ($user->city) $memories .= "Location: " . $user->city . "\n";
            $memories .= "\n";
        }

        // Get course enrollments (simplified)
        $enrollments = $DB->get_records_sql("
            SELECT c.fullname, c.shortname
            FROM {course} c
            JOIN {enrol} e ON e.courseid = c.id
            JOIN {user_enrolments} ue ON ue.enrolid = e.id
            WHERE ue.userid = ? AND ue.status = 0 AND e.status = 0
            LIMIT 5
        ", [$userid]);

        if ($enrollments) {
            $memories .= "ENROLLED COURSES:\n";
            foreach ($enrollments as $enrollment) {
                $memories .= "- " . $enrollment->fullname . " (" . $enrollment->shortname . ")\n";
            }
            $memories .= "\n";
        }

        // Simple activity check
        $thirty_days_ago = time() - (30 * 24 * 3600);
        $recent_logins = $DB->count_records_sql("
            SELECT COUNT(*)
            FROM {log}
            WHERE userid = ? AND timecreated > ?
        ", [$userid, $thirty_days_ago]);

        $memories .= "LEARNING PATTERNS:\n";
        if ($recent_logins > 20) {
            $memories .= "- Very active learner (logged in " . $recent_logins . " times in last 30 days)\n";
        } elseif ($recent_logins > 5) {
            $memories .= "- Regular activity (logged in " . $recent_logins . " times in last 30 days)\n";
        } else {
            $memories .= "- Limited recent activity (logged in " . $recent_logins . " times in last 30 days)\n";
        }

    } catch (Exception $e) {
        $memories .= "STUDENT PROFILE:\n";
        $memories .= "Name: Student\n";
        $memories .= "\n";
        $memories .= "LEARNING STATUS:\n";
        $memories .= "- Active Moodle user\n";
        $memories .= "- Ready to start learning\n";
    }

    $memories .= "\n";
    $memories .= "--- This profile is automatically updated based on your Moodle activity ---\n";
    $memories .= "\n💡 Tip: The more you use Moodle (quizzes, assignments, courses), the more detailed your learning profile becomes!";

    return $memories;
}