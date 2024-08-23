package com.openlap.analytics_module.services;

import com.openlap.analytics_module.dto.requests.indicator.IndicatorDraftRequest;
import com.openlap.analytics_module.dto.requests.indicator.IndicatorsToAnalyzeRequest;
import com.openlap.analytics_module.dto.response.indicator.*;
import com.openlap.analytics_module.entities.Indicator;

import java.util.List;
import javax.servlet.http.HttpServletRequest;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.ui.Model;

public interface IndicatorService {
	Page<IndicatorResponse> getAllMyIndicators(
			HttpServletRequest request, int page, int size, String sortBy, String sortDirection);

	PageImpl<IndicatorWithCodeResponse> getAllMyIndicatorsForCompositeSelection(
			HttpServletRequest request, int page);

	IndicatorFullDetailResponse getIndicatorById(String indicatorId);

	String getInteractiveIndicatorTemplate(String indicatorId, Model model);

	List<IndicatorWithCodeResponse> getIndicatorDetailResponseList(List<Indicator> indicators);

	String requestInteractiveIndicatorCode(String indicatorId, HttpServletRequest request);

	void copyMyExistingIndicator(HttpServletRequest request, String indicatorId);

	void deleteExistingIndicator(HttpServletRequest request, String indicatorId);

	String getInteractiveQuestionCode(String questionId, Model model);

	Page<IndicatorResponse> getAllIndicators(int page, int size, String sortBy, String sortDirection);

	PageImpl<CompatibleIndicatorsCompositeResponse> findCompatibleIndicators(
			HttpServletRequest request, String indicatorId, int page);

	String generateIndicatorCode(String indicatorId, Boolean uriCode);

	String validatePreviewBeforeDuplicationBasicIndicator(
			HttpServletRequest request, String indicatorId);

	void duplicateIndicator(HttpServletRequest request, String indicatorId);

	void saveIndicatorDraft(HttpServletRequest request, IndicatorDraftRequest indicatorDraftRequest);

	IndicatorsAnalyzedResponse getAnalyzedIndicators( IndicatorsToAnalyzeRequest indicatorList);
}
