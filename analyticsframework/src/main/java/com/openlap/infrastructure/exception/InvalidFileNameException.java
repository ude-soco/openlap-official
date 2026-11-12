package com.openlap.infrastructure.exception;

/**
 * An unsafe or invalid plugin file name (path separators, ".." traversal, disallowed characters, or
 * a non-".jar" extension) → HTTP 400. Used to guard plugin upload/delete/reload against path
 * traversal out of the JAR directory.
 */
public class InvalidFileNameException extends ValidationException {
  public InvalidFileNameException(String message) {
    super("INVALID_FILE_NAME", message);
  }
}
