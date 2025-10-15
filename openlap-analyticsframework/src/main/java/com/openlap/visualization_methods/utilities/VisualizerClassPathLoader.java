package com.openlap.visualization_methods.utilities;

import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.VisualizationLibraryInfo;
import com.openlap.visualization_methods.exceptions.VisualizationClassLoaderException;
import java.io.File;
import java.lang.reflect.Constructor;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Arrays;

public class VisualizerClassPathLoader implements AutoCloseable {

	private final URLClassLoader urlClassLoader;

	public VisualizerClassPathLoader(String jarFilePath) {
		try {
			File jarFile = new File(jarFilePath);
			if (!jarFile.exists()) {
				throw new IllegalArgumentException("JAR file not found: " + jarFilePath);
			}
			URL jarUrl = jarFile.toURI().toURL();
//			ClassLoader parent = Thread.currentThread().getContextClassLoader();
			ClassLoader parent = ClassLoader.getSystemClassLoader();

			this.urlClassLoader = new URLClassLoader(new URL[]{jarUrl}, parent);

		} catch (Exception e) {
			throw new RuntimeException("Failed to initialize class loader for JAR: " + jarFilePath, e);
		}
	}

	public VisualizationLibraryInfo loadLibraryInfo(String implementingClass) {
		try {
			Class<?> clazz = Class.forName(implementingClass, true, urlClassLoader);
			if (!VisualizationLibraryInfo.class.isAssignableFrom(clazz)) {
				throw new VisualizationClassLoaderException(
						"Class " + implementingClass + " does not implement VisualizationLibraryInfo."
				);
			}
			Constructor<?> ctor = clazz.getDeclaredConstructor();
			ctor.setAccessible(true);
			return (VisualizationLibraryInfo) ctor.newInstance();

		} catch (ClassNotFoundException e) {
			throw new VisualizationClassLoaderException(
					"Class " + implementingClass + " not found in JAR.", e);
		} catch (NoSuchMethodException e) {
			throw new VisualizationClassLoaderException(
					"Class " + implementingClass + " does not have a no-arg constructor.", e);
		} catch (Exception e) {
			throw new VisualizationClassLoaderException(
					"Failed to load class " + implementingClass + ": " + e.getMessage(), e);
		}
	}

	public VisualizationCodeGenerator loadTypeClass(String implementingClass) {
		try {
			System.out.println("Loading " + implementingClass + " from: " + Arrays.toString(urlClassLoader.getURLs()));
			Class<?> clazz = Class.forName(implementingClass, true, urlClassLoader);
			if (!VisualizationCodeGenerator.class.isAssignableFrom(clazz)) {
				throw new VisualizationClassLoaderException(
						"Class " + implementingClass + " does not implement VisualizationCodeGenerator."
				);
			}
			Constructor<?> ctor = clazz.getDeclaredConstructor();
			ctor.setAccessible(true);
			return (VisualizationCodeGenerator) ctor.newInstance();

		} catch (ClassNotFoundException e) {
			throw new VisualizationClassLoaderException(
					"Class " + implementingClass + " not found in JAR.", e);
		} catch (NoSuchMethodException e) {
			throw new VisualizationClassLoaderException(
					"Class " + implementingClass + " does not have a no-arg constructor.", e);
		} catch (Exception e) {
			throw new VisualizationClassLoaderException(
					"Failed to load class " + implementingClass + ": " + e.getMessage(), e);
		}
	}

	public void close() {
		try {
			urlClassLoader.close();
		} catch (Exception e) {
			// Ignore, just cleanup
		}
	}
}