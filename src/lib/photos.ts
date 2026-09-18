import sharp from "sharp";
import { put, get, del } from "@vercel/blob";
import { db } from "./db";
import { body } from "./http";
import type { Issue } from "./issues";
import { manualPhotoReview, reviewPhoto } from "./photo-review";
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export class PhotoInputError extends Error {}
export async function reportInput(
  request: Request,
): Promise<{ input: unknown; photo?: Buffer }> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return { input: await body(request) };
  const reader = request.body?.getReader();
  if (!reader) throw new PhotoInputError("The report is empty.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_PHOTO_BYTES + 16384) {
      await reader.cancel();
      throw new PhotoInputError("Choose a photo smaller than 4 MB.");
    }
    chunks.push(value);
  }
  try {
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type")! },
    }).formData();
    const input = JSON.parse(String(form.get("report")));
    const file = form.get("photo");
    if (!file) return { input };
    if (!(file instanceof File) || file.size > MAX_PHOTO_BYTES || !file.size)
      throw new Error();
    const bytes = Buffer.from(await file.arrayBuffer());
    return { input, photo: await normalizePhoto(bytes) };
  } catch {
    throw new PhotoInputError(
      "Choose a valid JPEG, PNG or WebP photo, up to 4 MB and 25 megapixels.",
    );
  }
}
export async function normalizePhoto(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES)
    throw new PhotoInputError("Photo too large or empty.");
  const decoder = sharp(bytes, {
    limitInputPixels: 25000000,
    failOn: "warning",
  });
  const metadata = await decoder.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  )
    throw new PhotoInputError("Unsupported photo format.");
  // Re-encode pixels only: discard EXIF/GPS, active content and original filenames.
  return decoder
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}
export async function saveReport(
  issue: Issue,
  photo?: Buffer,
  blocked?: { source: string; category: string },
) {
  const review = photo
    ? blocked ? manualPhotoReview("text_review") : await reviewPhoto(photo, issue)
    : null;
  const status = review?.autoApproved ? "approved" : "pending";
  const uploaded = photo
    ? await put(`issues/${issue.id}.jpg`, photo, {
        access: "private",
        contentType: "image/jpeg",
        addRandomSuffix: true,
      })
    : null;
  try {
    const sql = db();
    await sql.begin(async (tx) => {
      if (blocked) {
        await tx`INSERT INTO pafos_quarantine(id,submission_type,submission,blocked_by,category,created_at) VALUES(${issue.id},'post',${tx.json(issue)},${blocked.source},${blocked.category},${issue.createdAt})`;
      } else {
        await tx`INSERT INTO pafos_issues(id,data,created_at) VALUES(${issue.id},${tx.json(issue)},${issue.createdAt})`;
      }
      if (uploaded)
        await tx`INSERT INTO pafos_photos(issue_id,blob_path,created_at,status,ai_review,reviewed_at,reviewed_by) VALUES(${issue.id},${uploaded.pathname},${issue.createdAt},${status},${tx.json(review!)},${review?.autoApproved ? review.checkedAt : null},${review?.autoApproved ? "deepseek" : null})`;
    });
  } catch (error) {
    if (uploaded)
      await del(uploaded.pathname).catch(() =>
        console.error("Photo cleanup could not complete"),
      );
    throw error;
  }
  if (uploaded) issue.photo = {
    status,
    ...(status === "approved" ? { url: `/api/photos/${issue.id}` } : {}),
  };
}
export async function photoResponse(path: string) {
  const blob = await get(path, { access: "private" });
  if (!blob || !blob.stream) return new Response(null, { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline; filename=issue-photo.jpg",
    },
  });
}
