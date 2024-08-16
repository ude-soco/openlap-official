package com.openlap.analytics_module.repositories;

import com.openlap.analytics_module.entities.IndicatorCache;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface IndicatorCacheRepository extends MongoRepository<IndicatorCache, String> {}
