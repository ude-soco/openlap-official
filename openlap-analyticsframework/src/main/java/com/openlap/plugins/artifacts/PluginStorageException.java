package com.openlap.plugins.artifacts;

import com.openlap.infrastructure.exception.OpenLapException;
import org.springframework.http.HttpStatus;

/** Public messages describe the failure without exposing storage endpoints or credentials. */
public class PluginStorageException extends OpenLapException {
  public PluginStorageException(String code, String message) {
    super(HttpStatus.SERVICE_UNAVAILABLE, code, message);
  }
}
