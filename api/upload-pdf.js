// Optional server-side upload endpoint. Returns 501 unless the deployment
// has real storage credentials wired up. The client will automatically
// fall back to the public tmpfiles.org upload when this returns non-2xx.
//
// To enable, add either:
//   - Vercel Blob:      BLOB_READ_WRITE_TOKEN
//   - Cloudflare R2:    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE
//   - AWS S3:           S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_PUBLIC_BASE
//
// Then implement the matching branch below and return { url, provider }.

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasR2 = Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
  const hasS3 = Boolean(
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );

  if (!hasBlob && !hasR2 && !hasS3) {
    return response.status(501).json({
      error: "PDF upload endpoint not configured on server. Client will fall back to public host.",
    });
  }

  // Real implementations would parse the multipart body and forward to Blob/R2/S3.
  // Left intentionally minimal so the project does not depend on paid SDKs by default.
  return response.status(501).json({
    error: "Server-side upload provider configured but not implemented in this stub.",
  });
}
