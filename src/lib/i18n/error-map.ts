import type { ErrorCode } from "./error-codes";

const errorMessages: Record<ErrorCode, string> = {
  UPLOAD_INVALID_FILE: "Unsupported file type.",
  UPLOAD_TOO_LARGE: "File is too large (max 50 MB).",
  UPLOAD_FAILED: "Upload failed.",
  SCHEMA_TEMPLATE_NOT_FOUND: "Schema template not found.",
  SCHEMA_TEMPLATE_CREATE_FAILED: "Failed to create schema template.",
  MAPPING_RUN_NOT_FOUND: "Mapping run not found.",
  MAPPING_RUN_CREATE_FAILED: "Failed to create mapping run.",
  MAPPING_CONFIRM_FAILED: "Failed to confirm mappings.",
  MAPPING_OUTPUT_FAILED: "Output generation failed.",
  MAPPING_SUGGEST_FAILED: "AI matching failed.",
  MAPPING_PROFILE_FAILED: "Failed to profile mapping run.",
  MAPPING_TEMPLATE_NOT_FOUND: "Mapping template not found.",
  MAPPING_TEMPLATE_UPDATE_FAILED: "Failed to update mapping template.",
  VALIDATION_ERROR: "Validation failed.",
  SERVER_ERROR: "An unexpected error occurred.",
  NOT_FOUND: "Resource not found.",
};

export function getErrorMessage(code: ErrorCode): string {
  return errorMessages[code] ?? "An unexpected error occurred.";
}
