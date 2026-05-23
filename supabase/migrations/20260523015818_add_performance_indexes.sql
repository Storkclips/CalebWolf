/*
  # Performance Optimization - Add Database Indexes

  This migration adds indexes to frequently queried columns to improve performance.
  
  ## Indexes Added:
  
  1. **purchases_user_id_idx** - Speed up loading user's purchased images
     - Column: `purchases.user_id`
     - Reason: Used in StoreContext to load owned images on every user session
     
  2. **gallery_images_theme_id_idx** - Speed up gallery image filtering by theme
     - Column: `gallery_images.theme_id`
     - Reason: Used extensively in ExplorePage, CollectionsPage, GalleryPage
     
  3. **unlock_codes_collection_id_idx** - Speed up loading unlock codes for collections
     - Column: `unlock_codes.collection_id`
     - Reason: Used in admin panel to list codes per collection
     
  4. **unlocked_collections_user_id_idx** - Speed up loading user's unlocked collections
     - Column: `unlocked_collections.user_id`
     - Reason: Used in MyLibraryPage to show user's unlocked galleries
     
  5. **blog_posts_published_idx** - Speed up public blog queries
     - Column: `blog_posts.published`
     - Reason: Public pages filter for published=true
     
  6. **collection_images_collection_id_idx** - Speed up loading images per collection
     - Column: `collection_images.collection_id`
     - Reason: Used when viewing specific collections
     
  7. **credit_transactions_user_id_idx** - Speed up loading user's transaction history
     - Column: `credit_transactions.user_id`
     - Reason: Used to track credit usage per user

  ## Security:
  - These are read-only indexes (no RLS changes needed)
  - They improve query performance without exposing any additional data
*/

-- Add index for purchases by user (used in StoreContext)
CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);

-- Add index for gallery images by theme (used in gallery pages)
CREATE INDEX IF NOT EXISTS gallery_images_theme_id_idx ON gallery_images(theme_id);

-- Add index for unlock codes by collection (used in admin)
CREATE INDEX IF NOT EXISTS unlock_codes_collection_id_idx ON unlock_codes(collection_id);

-- Add index for unlocked collections by user (used in MyLibrary)
CREATE INDEX IF NOT EXISTS unlocked_collections_user_id_idx ON unlocked_collections(user_id);

-- Add index for published blog posts (used in public blog pages)
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(published);

-- Add index for collection images by collection
CREATE INDEX IF NOT EXISTS collection_images_collection_id_idx ON collection_images(collection_id);

-- Add index for credit transactions by user
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);

-- Add composite index for frequently filtered combinations
CREATE INDEX IF NOT EXISTS gallery_images_theme_published_idx ON gallery_images(theme_id, is_published);
