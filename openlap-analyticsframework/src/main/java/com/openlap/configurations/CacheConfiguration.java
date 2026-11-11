package com.openlap.configurations;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/** Enables application-service caching without pulling it into MVC controller slices. */
@Configuration(proxyBeanMethods = false)
@EnableCaching
public class CacheConfiguration {}
