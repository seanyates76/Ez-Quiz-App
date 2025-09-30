# Beta Route Documentation

## Overview

The `/beta` route provides access to beta features in EZ Quiz Web using Netlify Edge Functions. This implementation allows users to opt-in to beta features which persist across sessions.

## How It Works

### 1. Beta Preference Settings

Users can enable beta features through the Settings modal:
- Navigate to Settings (⚙ icon in header)
- Check "Enable beta features and auto-redirect to /beta"
- The preference is saved to both localStorage and cookies for persistence

### 2. Automatic Redirection

When beta is enabled:
- Users visiting `/` are automatically redirected to `/beta`
- The redirect can be bypassed by visiting `/?no-beta-redirect`

### 3. Beta Route Behavior

**When beta is enabled (via settings or `?beta=true` query param):**
- Serves the main application with beta modifications
- Adds a visible "BETA VERSION" banner
- Injects `data-beta="true"` attribute on the body element

**When beta is not enabled:**
- Shows a minimal landing page explaining beta access
- Provides links to return to main app or enable beta
- Includes a convenient "Enable Beta & Continue" option

### 4. Persistence Strategy

Beta preferences are stored in multiple locations for reliability:
- **localStorage**: `ezq.betaEnabled` (synced with other settings)
- **Cookie**: `ezq.betaEnabled` (for cross-session persistence)
- **State**: `S.settings.betaEnabled` (runtime state)

## Technical Implementation

### Edge Function

Location: `netlify/edge-functions/beta.js`

The edge function:
- Intercepts requests to `/beta`
- Checks for beta preference in cookies and query parameters
- Serves modified HTML with beta indicators when enabled
- Returns a minimal access page when beta is not enabled

### Configuration

In `netlify.toml`:
```toml
[edge_functions]
directory = "netlify/edge-functions"

[[edge_functions]]
function = "beta"
path = "/beta"
```

### Settings Integration

The beta preference integrates with the existing settings system:
- Added to `S.settings` state object
- Handled by `saveSettingsToStorage()` and `loadSettingsFromStorage()`
- Wired to the settings UI in `wireSettingsPanel()`

## Environment Requirements

### For Local Development
- No additional environment variables required
- Edge functions work with `netlify dev` command
- Fallback gracefully when edge functions are not available

### For Production
- Netlify Edge Functions enabled on your site
- No additional configuration needed beyond the `netlify.toml` setup

## Usage Examples

### Enabling Beta via Settings
1. Visit main app
2. Open Settings modal
3. Check "Enable beta features and auto-redirect to /beta"
4. Close settings
5. On next visit, you'll be automatically redirected to `/beta`

### Direct Beta Access
- Visit `/beta?beta=true` to enable beta and access immediately
- Visit `/beta` without beta enabled to see the access page

### Disabling Auto-redirect
- Visit `/?no-beta-redirect` to access main app without redirect
- Uncheck beta preference in settings to disable permanently

## Development Notes

### Extending Beta Features

To add new beta-specific functionality:

1. Check for beta mode in JavaScript:
   ```javascript
   if (document.body.dataset.beta === 'true') {
     // Beta-specific code
   }
   ```

2. Or check the state:
   ```javascript
   if (S.settings.betaEnabled) {
     // Beta-specific functionality
   }
   ```

### Testing Beta Flow

1. **Test auto-redirect**: Enable beta in settings, close browser, reopen to main app
2. **Test edge function**: Visit `/beta` directly with and without beta enabled
3. **Test persistence**: Enable beta, clear localStorage but keep cookies
4. **Test bypass**: Use `?no-beta-redirect` to access main app when beta is enabled

## Troubleshooting

### Edge Function Not Working
- Ensure `netlify dev` is used for local testing
- Check that the edge function is deployed correctly
- Verify `netlify.toml` configuration is correct

### Beta Setting Not Persisting
- Check browser console for localStorage/cookie errors
- Ensure cookies are not being blocked
- Test with different browsers

### Auto-redirect Not Working
- Verify beta setting is saved correctly
- Check for JavaScript errors in console
- Ensure main.js is loading the updated code

## Security Considerations

- Beta preference uses SameSite=Lax cookies for security
- No sensitive data is stored in beta preferences
- Edge function handles requests at the edge for better performance
- Graceful fallback when edge functions are unavailable