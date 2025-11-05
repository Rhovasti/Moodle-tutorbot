<?php
defined('MOODLE_INTERNAL') || die();

/**
 * Upgrade script for the AI Tutorbot plugin.
 *
 * @param int $oldversion the old version of the plugin
 * @return bool always true
 */
function xmldb_local_tutorbot_upgrade($oldversion) {
    global $DB;

    $dbman = $DB->get_manager();

    if ($oldversion < 2024102200) {

        // Define table local_tutorbot_memories to be created.
        $table = new xmldb_table('local_tutorbot_memories');

        // Adding fields to table local_tutorbot_memories.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('memories', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);

        // Adding keys to table local_tutorbot_memories.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, array('id'));

        // Adding indexes to table local_tutorbot_memories.
        $table->add_index('userid_index', XMLDB_INDEX_UNIQUE, array('userid'));

        // Conditionally launch create table for local_tutorbot_memories.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Define table local_tutorbot_chat to be created.
        $table = new xmldb_table('local_tutorbot_chat');

        // Adding fields to table local_tutorbot_chat.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('message_author', XMLDB_TYPE_CHAR, '10', null, XMLDB_NOTNULL, null, null);
        $table->add_field('message_text', XMLDB_TYPE_TEXT, null, null, XMLDB_NOTNULL, null, null);
        $table->add_field('timestamp', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);

        // Adding keys to table local_tutorbot_chat.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, array('id'));

        // Conditionally launch create table for local_tutorbot_chat.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Tutorbot savepoint reached.
        upgrade_plugin_savepoint(true, 2024102200, 'local', 'tutorbot');
    }

    return true;
}