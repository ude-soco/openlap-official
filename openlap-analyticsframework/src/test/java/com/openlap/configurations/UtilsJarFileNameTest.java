package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.openlap.infrastructure.exception.InvalidFileNameException;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.Test;
import org.springframework.http.HttpStatus;

/** Unit tests for plugin JAR file-name validation / path-traversal hardening. */
public class UtilsJarFileNameTest {

  private static final String BASE_DIR = "/data/jars/visualization_methods";

  @Test
  public void acceptsValidJarNames() {
    assertThat(Utils.requireSafeJarFileName("Visualizer-C3-1.0-SNAPSHOT.jar"))
        .isEqualTo("Visualizer-C3-1.0-SNAPSHOT.jar");
    // Surrounding whitespace is trimmed.
    assertThat(Utils.requireSafeJarFileName("  AnalyticsMethods_v2.jar  "))
        .isEqualTo("AnalyticsMethods_v2.jar");
  }

  @Test
  public void rejectsParentTraversal() {
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("../evil.jar"))
        .isInstanceOf(InvalidFileNameException.class);
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("../../application.properties"))
        .isInstanceOf(InvalidFileNameException.class);
  }

  @Test
  public void rejectsNestedSeparators() {
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("subdir/evil.jar"))
        .isInstanceOf(InvalidFileNameException.class);
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("subdir\\evil.jar"))
        .isInstanceOf(InvalidFileNameException.class);
  }

  @Test
  public void rejectsNonJarExtension() {
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("evil.txt"))
        .isInstanceOf(InvalidFileNameException.class);
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("application.properties"))
        .isInstanceOf(InvalidFileNameException.class);
  }

  @Test
  public void rejectsEmptyOrNull() {
    assertThatThrownBy(() -> Utils.requireSafeJarFileName(null))
        .isInstanceOf(InvalidFileNameException.class);
    assertThatThrownBy(() -> Utils.requireSafeJarFileName("   "))
        .isInstanceOf(InvalidFileNameException.class);
  }

  @Test
  public void resolvedPathStaysInsideBaseDirectory() {
    Path base = Paths.get(BASE_DIR).toAbsolutePath().normalize();
    Path resolved = Utils.resolveSafeJarPath(BASE_DIR, "Foo.jar");

    assertThat(resolved.startsWith(base)).isTrue();
    assertThat(resolved.getFileName().toString()).isEqualTo("Foo.jar");
  }

  @Test
  public void resolveRejectsTraversal() {
    assertThatThrownBy(() -> Utils.resolveSafeJarPath(BASE_DIR, "../../application.properties"))
        .isInstanceOf(InvalidFileNameException.class);
  }

  @Test
  public void invalidFileNameMapsToBadRequest() {
    InvalidFileNameException ex = new InvalidFileNameException("bad");
    assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(ex.getCode()).isEqualTo("INVALID_FILE_NAME");
  }
}
