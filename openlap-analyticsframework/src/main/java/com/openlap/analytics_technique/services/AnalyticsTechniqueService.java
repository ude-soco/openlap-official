package com.openlap.analytics_technique.services;

import com.openlap.analytics_technique.dto.request.AnalyticsTechniqueRequest;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueFileNameResponse;
import com.openlap.analytics_technique.dto.response.AnalyticsTechniqueResponse;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPDataSetConfigValidationResult;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.template.AnalyticsMethod;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;

public interface AnalyticsTechniqueService {

  void createAnalyticsTechnique(AnalyticsTechniqueRequest analyticsTechnique);

  AnalyticsTechniqueResponse getAnalyticsTechniquesById(String techniqueId);

  AnalyticsTechnique fetchAnalyticsTechniqueMethod(String techniqueId);

  List<AnalyticsTechniqueResponse> getAllAnalyticsTechniques();

  AnalyticsMethod loadAnalyticsMethodInstance(String techniqueId);

  List<AnalyticsTechnique> fetchAllAnalyticsTechniquesMethod();

  boolean populateAnalyticsTechniques();

  List<OpenLAPColumnConfigData> getAnalyticsTechniqueInputs(String techniqueId);

  List<OpenLAPColumnConfigData> getAnalyticsTechniqueOutputs(String techniqueId);

  List<OpenLAPDynamicParam> getAnalyticsTechniqueParams(String techniqueId);

  OpenLAPDataSetConfigValidationResult validateAnalyticsTechniqueMapping(
      String techniqueId, OpenLAPPortConfig indicatorToAnalyticsTechniqueMapping);

  void uploadAnalyticsTechniqueFile(MultipartFile file);

  void deleteAnalyticsTechniqueFile(String fileName);

  void reloadAnalyticsTechniqueFile(String fileName);

  List<AnalyticsTechniqueFileNameResponse> getAllAnalyticsTechniqueFileNames();

  List<AnalyticsTechniqueResponse> getAllAnalyticsTechniqueByFileName(String fileName);
}
