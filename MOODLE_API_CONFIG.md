# Moodle Web Services Configuration

## ✅ Phase 1 Complete - Moodle API Setup

### Server Information
- **Moodle URL**: https://moodle.munmuudle.eu
- **Moodle Version**: 2025100600 (Moodle 5.1, Build: 20251006)
- **Server IP**: 37.27.247.205
- **Installation Path**: /var/www/moodle51
- **Document Root**: /var/www/moodle51/public
- **Data Directory**: /var/www/moodle51/moodledata

### Web Services Configuration
- **Web Services Enabled**: Yes
- **Protocol**: REST
- **Endpoint**: https://moodle.munmuudle.eu/webservice/rest/server.php

### Service Account
- **Username**: `tutorbot_service`
- **User ID**: 3
- **Email**: tutorbot@munmuudle.eu
- **Password**: `TutorBot2024!Service`
- **Role**: tutorbotwebservice (Role ID: 9)

### API Token
```
3f83a81110f785e70f4cb07756258584
```

### Custom Service
- **Service Name**: TutorBot Integration Service
- **Service Shortname**: tutorbot_service
- **Service ID**: 2

### Available API Functions
1. `core_webservice_get_site_info` - Get site information
2. `core_user_get_users` - Get user details
3. `core_user_get_users_by_field` - Get users by field
4. `core_course_get_contents` - Get course contents
5. `core_course_get_courses` - Get courses
6. `mod_quiz_get_user_attempts` - Get quiz attempts
7. `core_completion_get_activities_completion_status` - Get activity completion
8. `core_notes_get_course_notes` - Get course notes

### Assigned Capabilities
- `webservice/rest:use` - Use REST web service
- `moodle/webservice:createtoken` - Create web service tokens
- `moodle/user:viewdetails` - View user details
- `moodle/course:view` - View courses
- `moodle/course:viewparticipants` - View course participants
- `mod/quiz:viewreports` - View quiz reports
- `moodle/notes:view` - View notes
- `report/completion:view` - View activity completion reports
- `moodle/grade:viewall` - View all grades

## Usage Example

```bash
# Test API Connection
curl "https://moodle.munmuudle.eu/webservice/rest/server.php?wstoken=3f83a81110f785e70f4cb07756258584&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json"

# Get User Information
curl "https://moodle.munmuudle.eu/webservice/rest/server.php?wstoken=3f83a81110f785e70f4cb07756258584&wsfunction=core_user_get_users_by_field&field=id&values[0]=2&moodlewsrestformat=json"

# Get Course Contents
curl "https://moodle.munmuudle.eu/webservice/rest/server.php?wstoken=3f83a81110f785e70f4cb07756258584&wsfunction=core_course_get_contents&courseid=1&moodlewsrestformat=json"
```

## Next Steps

### Phase 2: Implement MoodleService Class
- Create TypeScript service class in TutorBot backend
- Implement methods for each API function
- Add error handling and retry logic
- Store Moodle URL and token in `.env`

### Phase 3: User Context Integration
- Extract user data from LTI launch
- Fetch quiz history and activity completion
- Transform into "memories" format
- Store in database

### Phase 4: Real-time Sync
- Implement periodic sync job
- Update memories automatically
- Track learning progress

## Security Notes
- ⚠️ Keep API token secure - add to `.env` and `.gitignore`
- Token has no expiration (permanent token)
- Token has no IP restrictions
- Service account has minimal required permissions only
- All API calls use HTTPS

## Troubleshooting
- If API returns 403: Check cache purge (`php admin/cli/purge_caches.php`)
- If API returns access exception: Verify user capabilities
- If functions not available: Check service configuration in database (`mdl_external_services_functions`)
