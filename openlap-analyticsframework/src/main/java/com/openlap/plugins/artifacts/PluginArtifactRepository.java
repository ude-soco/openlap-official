package com.openlap.plugins.artifacts;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface PluginArtifactRepository extends MongoRepository<PluginArtifact, String> {}
