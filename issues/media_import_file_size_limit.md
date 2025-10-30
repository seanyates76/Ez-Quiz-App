### Issue: Media Import

**Description:**
There is currently no file size limit for base64 encoding when importing media into the application. This may lead to performance issues or crashes if users attempt to import excessively large files.

**Steps to Reproduce:**
1. Attempt to import a large media file using base64 encoding.

**Expected Behavior:**
The application should enforce a maximum file size limit for media imports to prevent performance degradation.

**Suggested Solution:**
Implement a file size limit for media imports, with clear messaging to the user if they exceed this limit.