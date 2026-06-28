// Helpers for consuming the backend's unified ApiErrorResponse envelope:
//   { status, code, message, details: { fieldErrors: [{ field, message }] }, ... }
// Thrown by the account-manager API functions as `error.response.data`.

/**
 * Maps `details.fieldErrors` into a `{ [field]: message }` object for binding
 * to form fields. The first message wins per field. Returns `{}` when there
 * are no structured field errors (e.g. a domain error carrying only a message).
 */
export const mapFieldErrors = (errorData) => {
  const result = {};
  const fieldErrors = errorData?.details?.fieldErrors;
  if (Array.isArray(fieldErrors)) {
    fieldErrors.forEach(({ field, message }) => {
      if (field && !result[field]) {
        result[field] = message;
      }
    });
  }
  return result;
};

/** Returns the envelope's human-readable message, or a fallback. */
export const getErrorMessage = (errorData, fallback = "Something went wrong.") =>
  errorData?.message || fallback;
