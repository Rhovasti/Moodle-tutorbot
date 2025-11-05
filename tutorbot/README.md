# AI Tutorbot Moodle Plugin

A personalized AI tutoring assistant integrated with Moodle, powered by Google Gemini AI.

## Features

- **Personalized Learning**: Students can add their course notes, quiz results, and learning goals for personalized tutoring
- **Real-time Chat**: Interactive conversation with AI tutor using streaming responses
- **Moodle Integration**: Seamless integration with Moodle authentication and user management
- **Rate Limiting**: Built-in protection against API abuse
- **Persistent Storage**: Chat history and memories saved in Moodle database

## Installation

1. Copy the `local/tutorbot` directory to your Moodle installation's `local` directory
2. Log in as administrator and visit your Moodle site to trigger database installation
3. Configure the plugin in Site administration ► Plugins ► Local plugins ► AI Tutorbot

## Configuration

1. **Enable the plugin**: Set "Enabled" to Yes
2. **Add Gemini API Key**: Obtain a key from [Google AI Studio](https://ai.google.dev/) and enter it in the settings
3. **Configure rate limiting**: Set maximum requests per hour per user (default: 50)
4. **Set response limits**: Configure maximum response tokens (default: 2000)

## Usage

### For Students

1. Access the AI Tutorbot from the navigation menu
2. Add your learning memories:
   - Course notes
   - Quiz results and feedback
   - Personal learning goals
   - Areas where you struggle
3. Start chatting with your AI tutor for personalized help

### For Teachers

- Students can use the tutorbot for personalized learning support
- The AI adapts responses based on individual student needs
- Monitor usage through the plugin logs

## Technical Details

### Database Tables

- `local_tutorbot_memories`: Stores user learning memories for personalization
- `local_tutorbot_chat`: Stores chat history between users and AI tutor

### API Endpoints

The plugin provides AJAX endpoints at `/local/tutorbot/ajax.php`:
- `get_user_info`: Retrieve current user information
- `get_memories`: Load user's learning memories
- `save_memories`: Save learning memories
- `get_chat_history`: Load chat history
- `save_message`: Save chat message
- `chat_with_gemini`: Send message to Gemini API

### Files Structure

```
local/tutorbot/
├── amd/
│   └── src/
│       └── app.js              # Main JavaScript application
├── classes/
├── css/
│   └── style.css               # Plugin styles
├── db/
│   ├── access.php              # Capability definitions
│   └── install.xml             # Database schema
├── lang/
│   └── en/
│       └── local_tutorbot.php  # Language strings
├── ajax.php                    # AJAX API endpoints
├── index.php                   # Main plugin page
├── lib.php                     # Core plugin functions
├── settings.php                # Plugin settings
├── version.php                 # Plugin version
└── README.md                   # This file
```

## Security Considerations

- All API calls require valid Moodle session and proper capabilities
- Rate limiting prevents API abuse
- Chat history is stored securely in Moodle database
- Gemini API key is stored securely in Moodle configuration

## Requirements

- Moodle 4.0 or higher
- PHP 8.0 or higher
- Valid Google Gemini API key
- Internet connection for API calls

## License

This plugin is licensed under the same terms as Moodle.

## Support

For issues and support, please create an issue in the plugin repository.