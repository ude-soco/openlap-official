package com.openlap.analytics_technique.utilities;

import com.openlap.analytics_technique.exceptions.AnalyticsMethodClassLoaderException;
import com.openlap.template.AnalyticsMethod;
import org.xeustechnologies.jcl.JarClassLoader;
import org.xeustechnologies.jcl.JclObjectFactory;
import org.xeustechnologies.jcl.exception.JclException;
import org.xeustechnologies.jcl.proxy.CglibProxyProvider;
import org.xeustechnologies.jcl.proxy.ProxyProviderFactory;

public class AnalyticsMethodsClassPathLoader {

  private final JarClassLoader jcl;
  private final JclObjectFactory factory;

  public AnalyticsMethodsClassPathLoader(String analyticsMethodsJarsFolder) {

    jcl = new JarClassLoader();
    jcl.add(analyticsMethodsJarsFolder);
    jcl.getParentLoader().setOrder(1);
    jcl.getLocalLoader().setOrder(2);
    jcl.getSystemLoader().setOrder(3);
    jcl.getThreadLoader().setOrder(4);
    jcl.getCurrentLoader().setOrder(5);

    // Set default to cglib (from version 2.2.1)
    ProxyProviderFactory.setDefaultProxyProvider(new CglibProxyProvider());
    factory = JclObjectFactory.getInstance(true);
  }

  public AnalyticsMethod loadClass(String implementingClass) {
    AnalyticsMethod abstractMethod;
    try {
      abstractMethod = (AnalyticsMethod) factory.create(jcl, implementingClass);
      return abstractMethod;
    } catch (JclException e) {
      throw new AnalyticsMethodClassLoaderException(
          "The class " + implementingClass + " was not found or does not implement the framework.");
    } catch (NoSuchMethodError error) {
      throw new AnalyticsMethodClassLoaderException(
          "The class " + implementingClass + " does not have an empty constructor.");
    }
  }
}
