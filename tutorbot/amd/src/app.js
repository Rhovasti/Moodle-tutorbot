define([], function() {

    return {
        init: function() {
            console.log('AI Tutorbot initialized');

            const root = document.getElementById('tutorbot-root');
            if (!root) return;

            // Basic app state
            let user = null;
            let memories = '';
            let chatHistory = [];
            let isLoading = false;

            // Create UI structure
            function createUI() {
                // Get localized strings
                const strings = window.MoodleStrings || {};

                root.innerHTML = `
                    <div style="font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; display: flex; min-height: 500px;">

                        <!-- Sidebar for Memories -->
                        <div style="width: 350px; border-right: 1px solid #ddd; background: #f8f9fa; display: flex; flex-direction: column;" id="memories-sidebar">
                            <div style="padding: 15px; background: #007cba; color: white; border-bottom: 1px solid #ddd;">
                                <h3 style="margin: 0 0 10px 0; font-size: 16px;">📚 ${strings.memories || 'Your Learning Memories'}</h3>
                                <div style="display: flex; gap: 5px; align-items: center;">
                                    <button id="refresh-memories" style="padding: 5px 10px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        🔄 ${strings.loading || 'Loading'}...
                                    </button>
                                    <span id="memories-status" style="font-size: 11px; opacity: 0.8;"></span>
                                </div>
                            </div>
                            <div style="padding: 15px; flex: 1; overflow-y: auto;">
                                <p style="margin: 0 0 10px 0; font-size: 12px; color: #666; line-height: 1.4;">
                                    💡 <strong>${strings.memories_help || 'Auto-generated from your Moodle activity'}</strong><br>
                                    Quiz results, assignments, course enrollments, and learning patterns.
                                </p>
                                <textarea id="memories-textarea"
                                          style="width: 100%; height: 250px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; resize: vertical; font-family: monospace;"
                                          placeholder="${strings.typeyourmessage || 'Your learning memories will appear here automatically...'}"></textarea>
                                <div style="margin-top: 10px; display: flex; gap: 5px;">
                                    <button id="save-memories" style="padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        💾 ${strings.save_memories || 'Save Changes'}
                                    </button>
                                    <button id="reset-chat" style="padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                        🗑️ ${strings.cancel || 'Reset'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Main Chat Area -->
                        <div style="flex: 1; display: flex; flex-direction: column;">
                            <div style="padding: 15px; background: #007cba; color: white;">
                                <h2 style="margin: 0;">${strings.pluginname || 'AI Tutorbot'}</h2>
                                <p style="margin: 5px 0 0 0; opacity: 0.9;">${strings.welcomedesc || 'Your personal AI learning assistant'}</p>
                            </div>
                            <div style="flex: 1; padding: 20px; background: #f9f9f9; overflow-y: auto;" id="chat-messages">
                                <div style="text-align: center; color: #666; padding: 20px;">
                                    <h4>${strings.welcome || 'Welcome to AI Tutorbot'}! 🎓</h4>
                                    <p>${strings.welcomedesc || 'I\'m here to help you learn. Your memories from Moodle activities will help me provide personalized assistance.'}</p>
                                    <p style="font-size: 14px; margin-top: 10px;">
                                        <strong>💡 ${strings.loading || 'Tip'}:</strong> ${strings.memories_help || 'Check the sidebar on the left for your auto-generated learning profile!'}
                                    </p>
                                </div>
                            </div>
                            <div style="padding: 15px; border-top: 1px solid #ddd; background: white;">
                                <form id="chat-form" style="display: flex; gap: 10px;">
                                    <input type="text" id="message-input" placeholder="${strings.typeyourmessage || 'Ask your tutorbot a question...'}"
                                           style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" />
                                    <button type="submit" style="padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                        ${strings.sendmessage || 'Send'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Load user info
            async function loadUserInfo() {
                try {
                    const response = await fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php?action=get_user_info', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'sesskey=' + M.cfg.sesskey
                    });

                    if (response.ok) {
                        user = await response.json();
                        const strings = window.MoodleStrings || {};
                        const welcomeText = strings.welcome || 'Welcome';
                        document.getElementById('welcome-text').textContent = welcomeText + ', ' + user.firstname + '!';
                    }
                } catch (error) {
                    console.error('Failed to load user info:', error);
                }
            }

            // Load memories
            async function loadMemories() {
                try {
                    const response = await fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php?action=get_memories', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'sesskey=' + M.cfg.sesskey
                    });

                    if (response.ok) {
                        const data = await response.json();
                        memories = data.memories;
                        document.getElementById('memories-textarea').value = memories;
                    }
                } catch (error) {
                    console.error('Failed to load memories:', error);
                }
            }

            // Load chat history
            async function loadChatHistory() {
                try {
                    const response = await fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php?action=get_chat_history', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'sesskey=' + M.cfg.sesskey
                    });

                    if (response.ok) {
                        const data = await response.json();
                        chatHistory = data.history;
                        displayChatHistory();
                    }
                } catch (error) {
                    console.error('Failed to load chat history:', error);
                }
            }

            // Save memories
            async function saveMemories() {
                const textarea = document.getElementById('memories-textarea');
                const newMemories = textarea.value;
                const strings = window.MoodleStrings || {};

                try {
                    const response = await fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php?action=save_memories', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'sesskey=' + M.cfg.sesskey + '&memories=' + encodeURIComponent(newMemories)
                    });

                    if (response.ok) {
                        memories = newMemories;
                        chatHistory = [];
                        displayChatHistory();
                        alert(strings.save_memories || 'Memories saved! Chat has been reset.');
                    }
                } catch (error) {
                    console.error('Failed to save memories:', error);
                    alert(strings.error_occurred || 'Failed to save memories. Please try again.');
                }
            }

            // Send message to Gemini
            async function sendMessage(text) {
                if (isLoading || !text.trim()) return;

                const userMessage = {
                    author: 'user',
                    text: text,
                    timestamp: Date.now()
                };

                chatHistory.push(userMessage);
                displayMessage(userMessage);

                isLoading = true;
                document.getElementById('send-button').disabled = true;
                document.getElementById('message-input').disabled = true;

                // Show loading indicator
                const loadingMessage = {
                    author: 'model',
                    text: '...',
                    timestamp: Date.now()
                };
                chatHistory.push(loadingMessage);
                displayMessage(loadingMessage);

                try {
                    const response = await fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php?action=chat_with_gemini', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: 'sesskey=' + M.cfg.sesskey +
                               '&message=' + encodeURIComponent(text) +
                               '&history=' + encodeURIComponent(JSON.stringify(chatHistory.filter(msg => msg !== loadingMessage)))
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.error) {
                            throw new Error(data.error);
                        }

                        // Replace loading message with actual response
                        chatHistory[chatHistory.length - 1] = {
                            author: 'model',
                            text: data.response,
                            timestamp: Date.now()
                        };
                    } else {
                        throw new Error('Request failed');
                    }
                } catch (error) {
                    const strings = window.MoodleStrings || {};
                    chatHistory[chatHistory.length - 1] = {
                        author: 'model',
                        text: strings.error_occurred || 'Sorry, I encountered an error. Please try again.',
                        timestamp: Date.now()
                    };
                }

                isLoading = false;
                document.getElementById('send-button').disabled = false;
                document.getElementById('message-input').disabled = false;

                // Refresh display
                displayChatHistory();
                document.getElementById('message-input').value = '';
            }

            // Display chat history
            function displayChatHistory() {
                const container = document.getElementById('chat-messages');
                container.innerHTML = '';
                const strings = window.MoodleStrings || {};

                if (chatHistory.length === 0) {
                    container.innerHTML = `
                        <div class="tutorbot-welcome">
                            <h4>${strings.welcome || 'Welcome to AI Tutorbot'}!</h4>
                            <p>${strings.welcomedesc || 'Your personal AI tutor is here to help you learn. Add your learning memories on the left and start chatting below.'}</p>
                        </div>
                    `;
                    return;
                }

                chatHistory.forEach(message => displayMessage(message));
            }

            // Display individual message
            function displayMessage(message) {
                const container = document.getElementById('chat-messages');
                const messageDiv = document.createElement('div');
                messageDiv.className = `tutorbot-message ${message.author}`;

                if (message.text === '...') {
                    // Loading indicator
                    messageDiv.innerHTML = `
                        <div class="tutorbot-message-avatar bot">AI</div>
                        <div class="tutorbot-message-content">
                            <div class="tutorbot-loading">
                                <div class="tutorbot-loading-dot"></div>
                                <div class="tutorbot-loading-dot"></div>
                                <div class="tutorbot-loading-dot"></div>
                            </div>
                        </div>
                    `;
                } else {
                    const avatarText = message.author === 'user' ? (user ? user.firstname.charAt(0).toUpperCase() : 'U') : 'AI';
                    messageDiv.innerHTML = `
                        <div class="tutorbot-message-avatar ${message.author}">${avatarText}</div>
                        <div class="tutorbot-message-content">${message.text}</div>
                    `;
                }

                container.appendChild(messageDiv);
                container.scrollTop = container.scrollHeight;
            }

            // Event handlers
            function setupEventHandlers() {
                // Chat form submission
                document.getElementById('chat-form').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const input = document.getElementById('message-input');
                    sendMessage(input.value);
                });

                // Save memories button
                document.getElementById('save-memories').addEventListener('click', saveMemories);

                // Toggle sidebar
                document.getElementById('toggle-sidebar').addEventListener('click', function() {
                    const sidebar = document.getElementById('tutorbot-sidebar');
                    const content = document.getElementById('sidebar-content');
                    const button = document.getElementById('toggle-sidebar');

                    sidebar.classList.toggle('collapsed');
                    content.classList.toggle('hidden');
                    button.textContent = sidebar.classList.contains('collapsed') ? '»' : '«';
                });
            }

            // Setup event handlers for new UI structure
            function setupEventHandlers() {
                const form = document.getElementById("chat-form");
                const input = document.getElementById("message-input");
                const messages = document.getElementById("chat-messages");
                const memoriesTextarea = document.getElementById("memories-textarea");
                const refreshButton = document.getElementById("refresh-memories");
                const saveButton = document.getElementById("save-memories");
                const resetButton = document.getElementById("reset-chat");
                const statusSpan = document.getElementById("memories-status");
                const strings = window.MoodleStrings || {};

                // Event listeners for memory functions
                refreshButton.addEventListener("click", function() {
                    statusSpan.textContent = strings.loading || "Updating...";
                    statusSpan.style.color = "#ffc107";

                    fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: "action=refresh_memories&sesskey=" + M.cfg.sesskey
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            memoriesTextarea.value = data.memories;
                            statusSpan.textContent = strings.save_memories || "Updated!";
                            statusSpan.style.color = "#28a745";
                            setTimeout(() => {
                                statusSpan.textContent = "";
                            }, 2000);
                        } else {
                            statusSpan.textContent = strings.error_occurred || "Failed";
                            statusSpan.style.color = "#dc3545";
                        }
                    })
                    .catch(error => {
                        console.error("Error refreshing memories:", error);
                        statusSpan.textContent = strings.error_occurred || "Error";
                        statusSpan.style.color = "#dc3545";
                    });
                });

                saveButton.addEventListener("click", function() {
                    statusSpan.textContent = strings.loading || "Saving...";
                    statusSpan.style.color = "#ffc107";

                    fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: "action=save_memories&sesskey=" + M.cfg.sesskey + "&memories=" + encodeURIComponent(memoriesTextarea.value)
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            statusSpan.textContent = strings.save_memories || "Saved!";
                            statusSpan.style.color = "#28a745";
                            setTimeout(() => {
                                statusSpan.textContent = "";
                            }, 2000);
                            chatHistory = [];
                            displayChatHistory();
                        } else {
                            statusSpan.textContent = strings.error_occurred || "Failed";
                            statusSpan.style.color = "#dc3545";
                        }
                    })
                    .catch(error => {
                        console.error("Error saving memories:", error);
                        statusSpan.textContent = strings.error_occurred || "Error";
                        statusSpan.style.color = "#dc3545";
                    });
                });

                resetButton.addEventListener("click", function() {
                    if (confirm(strings.error_occurred || "This will clear all chat history. Are you sure?")) {
                        chatHistory = [];
                        displayChatHistory();
                    }
                });

                // Form submission for chat
                form.addEventListener("submit", function(e) {
                    e.preventDefault();
                    const message = input.value.trim();
                    if (!message) return;

                    // Add user message
                    const userMsg = document.createElement("div");
                    userMsg.style.cssText = "margin: 10px 0; text-align: right;";
                    userMsg.innerHTML = `
                        <div style="display: inline-block; background: #007cba; color: white; padding: 10px 15px; border-radius: 18px; max-width: 70%;">
                            ${message}
                        </div>
                    `;
                    messages.appendChild(userMsg);

                    input.value = "";
                    messages.scrollTop = messages.scrollHeight;

                    // Add loading indicator
                    const loadingMsg = document.createElement("div");
                    loadingMsg.style.cssText = "margin: 10px 0; text-align: left;";
                    loadingMsg.innerHTML = `
                        <div style="display: inline-block; background: #e9ecef; color: #666; padding: 10px 15px; border-radius: 18px;">
                            ${strings.loading || 'Thinking...'}
                        </div>
                    `;
                    messages.appendChild(loadingMsg);
                    messages.scrollTop = messages.scrollHeight;

                    // Send to server
                    fetch(M.cfg.wwwroot + '/local/tutorbot/ajax.php', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: "action=chat_with_gemini&sesskey=" + M.cfg.sesskey + "&message=" + encodeURIComponent(message)
                    })
                    .then(response => response.json())
                    .then(data => {
                        loadingMsg.remove();

                        const botMsg = document.createElement("div");
                        botMsg.style.cssText = "margin: 10px 0; text-align: left;";
                        botMsg.innerHTML = `
                            <div style="display: inline-block; background: #e9ecef; color: #333; padding: 10px 15px; border-radius: 18px; max-width: 70%;">
                                ${data.error ? (strings.error_occurred || "Sorry, I encountered an error. Please try again.") : data.response}
                            </div>
                        `;
                        messages.appendChild(botMsg);
                        messages.scrollTop = messages.scrollHeight;
                    })
                    .catch(error => {
                        loadingMsg.remove();
                        console.error("Error:", error);
                        const errorMsg = document.createElement("div");
                        errorMsg.style.cssText = "margin: 10px 0; text-align: left;";
                        errorMsg.innerHTML = `
                            <div style="display: inline-block; background: #f8d7da; color: #721c24; padding: 10px 15px; border-radius: 18px;">
                                ${strings.error_occurred || "Sorry, I encountered a connection error. Please try again."}
                            </div>
                        `;
                        messages.appendChild(errorMsg);
                        messages.scrollTop = messages.scrollHeight;
                    });
                });
            }

            // Initialize app
            function init() {
                createUI();
                setupEventHandlers();
                loadUserInfo();
                loadMemories();
            }

            // Start the app
            init();
        }
    };
});