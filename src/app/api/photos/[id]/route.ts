import { publicPhotoPath } from "@/lib/db";
import { handle, json } from "@/lib/http";
import { validId } from "@/lib/validation";
import { photoResponse } from "@/lib/photos";
export const dynamic = "force-dynamic";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const { id } = await context.params;
    if (!validId(id)) return json({ error: "Photo not found." }, 404);
    const path = await publicPhotoPath(id);
    return path
      ? photoResponse(path)
      : json({ error: "Photo not found." }, 404);
  });
}
