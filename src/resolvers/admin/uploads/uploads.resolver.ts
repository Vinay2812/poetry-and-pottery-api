import { Arg, Mutation, Resolver } from "type-graphql";

import {
  generateUniqueKey,
  getPublicUrl,
  getSignedUrlForUpload,
} from "@/lib/r2";
import { adminRequired } from "@/middlewares/auth.middleware";
import { tryCatchAsync } from "@/utils/trycatch";

import {
  GetPresignedUploadUrlInput,
  PresignedUploadUrlResponse,
} from "./uploads.type";

// Allowed content types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Resolver()
export class AdminUploadsResolver {
  @Mutation(() => PresignedUploadUrlResponse)
  @adminRequired()
  async adminGetPresignedUploadUrl(
    @Arg("input", () => GetPresignedUploadUrlInput)
    input: GetPresignedUploadUrlInput,
  ): Promise<PresignedUploadUrlResponse> {
    return tryCatchAsync(async () => {
      const { filename, contentType, fileSize, folder } = input;

      // Validate required fields
      if (!filename || !contentType || !fileSize) {
        return {
          success: false,
          error: "Missing required fields: filename, contentType, fileSize",
        };
      }

      // Validate content type
      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return {
          success: false,
          error: `Invalid content type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        };
      }

      // Validate file size
      if (fileSize > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
      }

      const key = generateUniqueKey(filename, folder);
      const presignedUrl = await getSignedUrlForUpload(key, contentType, 600);
      const publicUrl = getPublicUrl(key);

      return {
        success: true,
        presignedUrl,
        publicUrl,
        key,
        error: null,
      };
    });
  }
}
