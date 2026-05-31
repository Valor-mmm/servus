# Cloudflare R2 Setup (one-time)

This document records the one-time steps to provision the R2 bucket used by the
`add-item-photos` change. Execute these once per deployment environment (prod,
dev/test). The steps require a Cloudflare account with R2 enabled.

## `aws4fetch` version

`aws4fetch` is pinned at **1.0.20** (npm). It is a single-file, MIT-licensed
SigV4 signing library with no transitive dependencies, used purely as a signing
helper for presigned R2/S3 URLs.

## 1. Create the R2 bucket

1. Log into the [Cloudflare dashboard](https://dash.cloudflare.com).
2. Select **R2 Object Storage** in the left sidebar.
3. Click **Create bucket**.
4. Name the bucket (e.g. `servus-photos-prod` for production,
   `servus-photos-dev` for the dev/test bucket).
5. Choose a region closest to your Deno Deploy region (Auto is fine).
6. Leave **Public Access** set to **Off** (bucket MUST remain private).
7. Click **Create bucket**.

## 2. Configure CORS

On the bucket's **Settings** tab, add a CORS policy.

**Production bucket** (narrow allowlist):

```json
[
  {
    "AllowedOrigins": ["https://servus.valor.codes"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

**Dev/test bucket** (covers all Deno Deploy preview URLs + local dev):

```json
[
  {
    "AllowedOrigins": [
      "https://*.deno.net",
      "http://localhost:8000"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

## 3. Create an R2 API token

1. In the Cloudflare dashboard go to **R2** → **Manage R2 API tokens**.
2. Click **Create API token**.
3. Set permissions to **Object Read & Write** scoped to the specific bucket.
4. Note the generated:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`

## 4. Determine R2_PUBLIC_URL

Combine the Cloudflare Account ID (visible in the right sidebar of any dashboard
page) and the bucket name:

```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>
```

Example:

```
https://abc123def456.r2.cloudflarestorage.com/servus-photos-prod
```

This is `R2_PUBLIC_URL`.

## 5. Add env vars

Three variables are required:

| Name                   | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| `R2_ACCESS_KEY_ID`     | API token access key ID                                  |
| `R2_SECRET_ACCESS_KEY` | API token secret key                                     |
| `R2_PUBLIC_URL`        | `https://<account_id>.r2.cloudflarestorage.com/<bucket>` |

### Deno Deploy

In the Deno Deploy project settings → **Environment Variables**, add the three
vars above. Use separate values for the prod and dev/test projects.

### Local dev (`.env` file)

Copy `.env.example` to `.env` and fill in the three R2 vars using your dev
bucket credentials. The `.env` file is git-ignored and must never be committed.

## 6. Verify

After setting env vars, start the dev server and navigate to any box detail page
with a non-delivered status. The `PhotoCapture` island should render. Attempting
a photo capture should upload to R2 and create a pending item.

## Rollback

Remove the three R2 env vars from Deno Deploy and revert the deploy. Any R2
objects created between deploy and rollback become orphans; they can be manually
deleted from the R2 console or left — at typical scale (~50 KB each) the waste
is negligible.
