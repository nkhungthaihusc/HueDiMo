-- Enforce file constraints at Storage, where the bytes are uploaded.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif',
                               'image/svg+xml', 'image/heic', 'image/heif']
WHERE id = 'huedimo-media';
