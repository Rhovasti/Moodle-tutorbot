// Moodle AMD module wrapper for Tutorbot app
define(['local_tutorbot/app', 'core/str'], function(App, Str) {

    return {
        init: function() {
            const rootElement = document.getElementById('tutorbot-root');
            if (rootElement) {
                // Load string translations for Finnish support
                var strings = [
                    {key: 'pluginname', component: 'local_tutorbot'},
                    {key: 'welcome', component: 'local_tutorbot'},
                    {key: 'welcomedesc', component: 'local_tutorbot'},
                    {key: 'memories_help', component: 'local_tutorbot'},
                    {key: 'save_memories', component: 'local_tutorbot'},
                    {key: 'sendmessage', component: 'local_tutorbot'},
                    {key: 'typeyourmessage', component: 'local_tutorbot'},
                    {key: 'loading', component: 'local_tutorbot'},
                    {key: 'error_occurred', component: 'local_tutorbot'},
                    {key: 'notconfigured', component: 'local_tutorbot'},
                    {key: 'chat_title', component: 'local_tutorbot'}
                ];

                Str.get_strings(strings).then(function(s) {
                    // Store strings in global scope for the app to use
                    window.MoodleStrings = {
                        pluginname: s[0],
                        welcome: s[1],
                        welcomedesc: s[2],
                        memories_help: s[3],
                        save_memories: s[4],
                        sendmessage: s[5],
                        typeyourmessage: s[6],
                        loading: s[7],
                        error_occurred: s[8],
                        notconfigured: s[9],
                        chat_title: s[10]
                    };

                    // Initialize the app with translations
                    App.init();
                });
            }
        }
    };
});