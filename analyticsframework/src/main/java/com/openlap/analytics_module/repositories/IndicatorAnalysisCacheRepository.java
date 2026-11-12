package com.openlap.analytics_module.repositories;

import com.openlap.analytics_module.entities.IndicatorAnalysisCache;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface IndicatorAnalysisCacheRepository
    extends MongoRepository<IndicatorAnalysisCache, String> {}
