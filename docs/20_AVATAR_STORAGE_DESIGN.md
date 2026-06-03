# Discora - Avatar Storage Design

Version: 1.0

Status: Ready For Review

Scope: Sprint 3 avatar storage planning

Related Documents:

* 11_SECURITY_AND_ACCESS.md
* 16_ARCHITECTURE_DECISIONS.md
* 19_SPRINT_3_USER_IDENTITY_PLAN.md

---

# Purpose

This document defines the Supabase Storage requirements and exact bucket policies for Sprint 3 profile avatar uploads.

No source uploads, evidence media, discussion media, moderation workflows, or product media features are included.

---

# Bucket

Bucket name:

```text
avatars
```

Recommended bucket configuration:

```text
Public read: enabled
File size limit: 5 MB
Allowed MIME types:
  image/jpeg
  image/png
  image/webp
```

Object path convention:

```text
{user_id}/avatar.{extension}
```

Examples:

```text
89c7e3c8-1c3c-46b8-a2e2-facb5cfe93fb/avatar.jpg
89c7e3c8-1c3c-46b8-a2e2-facb5cfe93fb/avatar.webp
```

---

# Exact Bucket SQL

```sql
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

---

# Exact Avatar Bucket Policies

```sql
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and storage.filename(name) in (
    'avatar.jpg',
    'avatar.jpeg',
    'avatar.png',
    'avatar.webp'
  )
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
  and storage.filename(name) in (
    'avatar.jpg',
    'avatar.jpeg',
    'avatar.png',
    'avatar.webp'
  )
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

---

# Application-Side Validation

Before upload, the application must validate:

```text
Allowed extensions: jpg, jpeg, png, webp
Allowed MIME types: image/jpeg, image/png, image/webp
Maximum size: 5 MB
Path ownership: {auth.user.id}/avatar.{extension}
```

The app should replace the existing avatar object by uploading to the same path with upsert behavior.

---

# Non-Goals

Do not implement:

* Image cropping
* Image editing
* Multiple avatar history
* Source uploads
* Evidence uploads
* Discussion attachments
* Moderation file review
