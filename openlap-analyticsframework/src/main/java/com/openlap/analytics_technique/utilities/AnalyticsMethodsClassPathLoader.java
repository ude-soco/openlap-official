package com.openlap.analytics_technique.utilities;

import com.openlap.analytics_technique.exceptions.AnalyticsMethodClassLoaderException;
import com.openlap.template.AnalyticsMethod;
import java.io.File;
import java.lang.reflect.Constructor;
import java.net.URL;
import java.net.URLClassLoader;

public class AnalyticsMethodsClassPathLoader implements AutoCloseable {

  private final URLClassLoader urlClassLoader;

  public AnalyticsMethodsClassPathLoader(String analyticsMethodsJarPath) {
    try {
      File jarFile = new File(analyticsMethodsJarPath);
      if (!jarFile.exists()) {
        throw new IllegalArgumentException("JAR file not found: " + analyticsMethodsJarPath);
      }

      URL jarUrl = jarFile.toURI().toURL();

      // ✅ use the thread context classloader as parent for Spring Boot compatibility
      ClassLoader parent = Thread.currentThread().getContextClassLoader();

      this.urlClassLoader = new URLClassLoader(new URL[] {jarUrl}, parent);

    } catch (Exception e) {
      throw new RuntimeException(
          "Failed to initialize class loader for JAR: " + analyticsMethodsJarPath, e);
    }
  }

  public AnalyticsMethod loadClass(String implementingClass) {
    try {
      // Load class from the external JAR using our loader
      Class<?> clazz = Class.forName(implementingClass, true, urlClassLoader);

      // Check type safety
      if (!AnalyticsMethod.class.isAssignableFrom(clazz)) {
        throw new AnalyticsMethodClassLoaderException(
            "Class " + implementingClass + " does not implement AnalyticsMethod.");
      }

      // Create instance via no-arg constructor
      Constructor<?> ctor = clazz.getDeclaredConstructor();
      ctor.setAccessible(true);
      return (AnalyticsMethod) ctor.newInstance();

    } catch (ClassNotFoundException e) {
      throw new AnalyticsMethodClassLoaderException(
          "Class " + implementingClass + " not found in JAR.", e);
    } catch (NoSuchMethodException e) {
      throw new AnalyticsMethodClassLoaderException(
          "Class " + implementingClass + " does not have a no-arg constructor.", e);
    } catch (Exception e) {
      throw new AnalyticsMethodClassLoaderException(
          "Failed to load class " + implementingClass + ": " + e.getMessage(), e);
    }
  }

  @Override
  public void close() {
    try {
      urlClassLoader.close();
    } catch (Exception ignored) {
    }
  }
}
