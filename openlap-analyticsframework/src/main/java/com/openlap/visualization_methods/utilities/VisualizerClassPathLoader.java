package com.openlap.visualization_methods.utilities;

import com.openlap.template.VisualizationCodeGenerator;
import com.openlap.template.VisualizationLibraryInfo;
import com.openlap.visualization_methods.exceptions.VisualizationClassLoaderException;
import org.xeustechnologies.jcl.JarClassLoader;
import org.xeustechnologies.jcl.JclObjectFactory;
import org.xeustechnologies.jcl.exception.JclException;
import org.xeustechnologies.jcl.proxy.CglibProxyProvider;
import org.xeustechnologies.jcl.proxy.ProxyProviderFactory;

public class VisualizerClassPathLoader {

  private final JarClassLoader jcl;
  private final JclObjectFactory factory;

  public VisualizerClassPathLoader(String visualizationMethodsJarsFolder) {

    jcl = new JarClassLoader();
    jcl.add(visualizationMethodsJarsFolder);
    jcl.getParentLoader().setOrder(1);
    jcl.getLocalLoader().setOrder(2);
    jcl.getSystemLoader().setOrder(3);
    jcl.getThreadLoader().setOrder(4);
    jcl.getCurrentLoader().setOrder(5);

    // Set default to cglib (from version 2.2.1)
    ProxyProviderFactory.setDefaultProxyProvider(new CglibProxyProvider());
    factory = JclObjectFactory.getInstance(true);
  }

  public VisualizationLibraryInfo loadLibraryInfo(String implementingClass) {
    VisualizationLibraryInfo libraryInfo;
    try {
      libraryInfo = (VisualizationLibraryInfo) factory.create(jcl, implementingClass);
      return libraryInfo;
    } catch (JclException e) {
      throw new VisualizationClassLoaderException(
          "The class "
              + implementingClass
              + " was not found or does not implement the VisualizationLibraryInfo class.");
    } catch (NoSuchMethodError error) {
      throw new VisualizationClassLoaderException(
          "The class " + implementingClass + " does not have an empty constructor.");
    }
  }

  public VisualizationCodeGenerator loadTypeClass(String implementingClass) {
    VisualizationCodeGenerator vizCodeGenerator;
    try {
      vizCodeGenerator = (VisualizationCodeGenerator) factory.create(jcl, implementingClass);
      return vizCodeGenerator;
    } catch (JclException e) {
      throw new VisualizationClassLoaderException(
          "The class "
              + implementingClass
              + " was not found or does not implement the VisualizationCodeGenerator class.");
    } catch (NoSuchMethodError error) {
      throw new VisualizationClassLoaderException(
          "The class " + implementingClass + " does not have an empty constructor.");
    }
  }
}
