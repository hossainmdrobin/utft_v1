# Implementation Plan: Profile Media Upload Route & Media Model

## Overview
Implement a media upload pipeline that authenticates logged-in members, validates and streams image files to Cloudinary using the official `cloudinary` SDK, persists uploaded file metadata in a new `Media` Mongoose model, and returns a backwards-compatible response for the member profile page.

## Proposed Changes

### 1. Dependencies
- Install the official Cloudinary SDK:
  ```sh
  npm install cloudinary
  ```

### 2. Media Model Schema
- **File:** `src/models/Media.ts` (new)
- **Schema definition:**
  - `filename`: `{ type: String, required: true }` (Cloudinary `public_id`)
  - `originalName`: `{ type: String, required: true }`
  - `mimeType`: `{ type: String, required: true }`
  - `size`: `{ type: Number, required: true }`
  - `url`: `{ type: String, required: true }` (Cloudinary `secure_url`)
  - `altText`: `{ type: String, default: "" }`
  - `uploadedBy`: `{ type: Schema.Types.ObjectId, ref: "Member", required: true }`
  - Timestamps enabled (`createdAt`, `updatedAt`)
- Follow existing Mongoose model patterns (`models.Media ?? model<Media>('Media', mediaSchema)`).

### 3. Media Upload API Route
- **File:** `src/app/api/upload/route.ts`
- **Functionality:**
  - Authenticate using `getCurrentMember(req)` from `@/lib/authenticaiton/verifications`. Return 401 if unauthorized.
  - Connect to MongoDB via `connectDB()` from `@/integrations/mongodb/connection`.
  - Parse `formData` extracting `file` (File) and optional `altText` (string).
  - Validation:
    - File existence (return 400 if missing).
    - MIME type: allow `["image/jpeg", "image/png", "image/webp"]` (return 400 if invalid).
    - File size limit: 5MB (`5 * 1024 * 1024` bytes) (return 400 if exceeded).
  - Configure `cloudinary.v2` using:
    - `CLOUDINARY_CLOUD_NAME`
    - `CLOUDINARY_API_KEY`
    - `CLOUDINARY_API_SECRET`
    - `secure: true`
  - Convert file bytes to Buffer and stream to Cloudinary via `cloudinary.uploader.upload_stream`:
    - `folder: "utft/profile"`
    - `resource_type: "auto"`
  - Create `Media` record in MongoDB:
    ```ts
    const media = await Media.create({
      filename: uploadResult.public_id,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: uploadResult.secure_url,
      altText,
      uploadedBy: user._id,
    });
    ```
  - Return HTTP 201 with response body:
    ```json
    {
      "url": uploadResult.secure_url,
      "data": media
    }
    ```
    *(Preserving `url` ensures 100% backwards compatibility with `src/app/app/dashboard/profile/page.tsx`)*.

---

## Verification Plan

### Automated Checks
1. Type Checking:
   ```sh
   npx tsc --noEmit
   ```
2. Linting:
   ```sh
   npm run lint
   ```

### Manual / Functional Verification
1. Upload a profile image from the dashboard profile page (`/app/dashboard/profile`).
2. Verify:
   - Request receives HTTP 201 with `{ url, data }`.
   - Cloudinary receives the image in `utft/profile`.
   - MongoDB `media` collection has the corresponding document with `uploadedBy` referencing the member.
   - Profile photo updates and saves on member profile.
3. Test edge cases:
   - Unauthenticated request (returns 401).
   - Non-image MIME type like `.pdf` or `.txt` (returns 400).
   - File exceeding 5MB (returns 400).
