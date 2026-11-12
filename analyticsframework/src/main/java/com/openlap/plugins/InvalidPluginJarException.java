package com.openlap.plugins;

import com.openlap.infrastructure.exception.ValidationException;

public class InvalidPluginJarException extends ValidationException {
  public InvalidPluginJarException(String message) {
    super("INVALID_PLUGIN_JAR", message);
  }
}
