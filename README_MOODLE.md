# Moodle Tutorbot Plugin

A Moodle 5.1+ plugin that integrates an AI-powered tutoring assistant into your courses.

## Features

- **AI-Powered Tutoring**: Integration with Google Gemini AI for intelligent tutoring
- **Personalized Learning**: Context-aware responses based on student data
- **Moodle Integration**: Seamless integration with Moodle course structure
- **Privacy Compliant**: Follows Moodle privacy guidelines
- **Responsive Design**: Works on desktop and mobile devices

## Requirements

- Moodle 5.1 or higher
- PHP 8.1 or higher
- Internet connection for AI service access

## Installation

### Via Moodle Addon Installation Tool (Recommended)

1. Navigate to your Moodle site: `https://your-moodle-site.com`
2. Go to *Site administration* → *General* → *Install addons*
3. Enter the URL: `https://github.com/Rhovasti/Moodle-tutorbot/archive/main.zip`
4. Click "Install from the Moodle plugins directory"
5. Follow the on-screen instructions

### Manual Installation

1. Download the plugin from the [GitHub repository](https://github.com/Rhovasti/Moodle-tutorbot)
2. Extract the `mod_tutorbot` folder to your Moodle installation's `/mod/` directory
3. Visit your Moodle site as an administrator
4. Follow the on-screen installation instructions
5. Configure the plugin settings if needed

## Configuration

1. Go to *Site administration* → *Plugins* → *Activity modules* → *Tutorbot*
2. Configure the Tutorbot URL (default: `https://tutorbot.munmuudle.eu`)
3. Enable completion tracking if desired
4. Save changes

## Usage

### For Teachers

1. Turn editing on in your course
2. Click "+ Add an activity or resource"
3. Select "Tutorbot"
4. Give it a name and optionally add a description
5. Save and display

### For Students

1. Navigate to a course with a Tutorbot activity
2. Click on the Tutorbot activity
3. Start interacting with the AI tutor
4. The tutor will provide personalized help based on your course context

## Security and Privacy

- All communication with the AI service is encrypted
- Student data is handled according to Moodle privacy guidelines
- No personal information is stored beyond Moodle's standard data retention
- Plugin respects all Moodle capability and permission settings

## Troubleshooting

### Common Issues

1. **Tutorbot not loading**: Check your internet connection and verify the Tutorbot URL in plugin settings
2. **Permission denied**: Ensure you have the required permissions to access the activity
3. **White screen**: Check Moodle error logs and ensure PHP requirements are met

### Getting Help

- Check the [GitHub Issues](https://github.com/Rhovasti/Moodle-tutorbot/issues) page
- Visit the [Moodle.org forums](https://moodle.org/forums/) for community support
- Contact your site administrator for local issues

## Version History

### v1.0.0 (2025-11-05)
- Initial release
- Moodle 5.1 compatibility
- Basic Tutorbot integration
- Privacy compliance
- Completion tracking support

## License

This plugin is licensed under the GNU GPL v3. See the LICENSE file for details.

## Developer Information

### File Structure

```
mod_tutorbot/
├── version.php          # Plugin version and compatibility info
├── mod_tutorbot.php     # Main module file
├── lib.php              # Core plugin functions
├── index.php            # Activity index page
├── view.php             # View redirection file
├── settings.php         # Plugin configuration
├── db/
│   └── install.xml      # Database schema
└── lang/
    └── en/
        └── mod_tutorbot.php # Language strings
```

### API Integration

The plugin integrates with the Tutorbot service via iframe embedding, passing course context and user information securely via URL parameters.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support Development

If you find this plugin useful, please consider:
- ⭐ Starring the repository on GitHub
- 🐛 Reporting issues and bugs
- 💬 Contributing to discussions
- 📝 Improving documentation