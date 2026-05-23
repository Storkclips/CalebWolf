/*
  # Replace base64 data URLs in blog_images with empty strings

  ## Problem
  Several blog_images rows have massive base64 data: URLs stored directly in the
  url column (14.9MB, 2.8MB, 1.7MB). When the REST API fetches all blog_images
  with SELECT *, the response exceeds the payload limit and returns HTTP 500.

  ## Fix
  Clear the url column for any row where the url starts with "data:" (base64).
  These cannot be served as proper image URLs anyway. The images will need to be
  re-uploaded via the blog editor to proper Supabase storage.

  ## Affected rows
  Only rows where url starts with 'data:' — these are invalid for web use.
*/

UPDATE blog_images
SET url = ''
WHERE url LIKE 'data:%';
