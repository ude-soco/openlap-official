package com.openlap.analytics_statements.services;

import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.dataset.OpenLAPDataSet;
import java.util.List;
import javax.validation.Valid;

public interface StatementService {

  List<Object> findAllUniquePlatforms(PlatformRequest platformRequest);

  List<Object> findUniqueActivityTypes(ActivityTypesRequest activityTypesRequest);

  List<Object> findUniqueActionOnActivities(ActionOnActivitiesRequest activityTypesRequest);

  List<Object> findUniqueActivities(ActivitiesRequest activitiesRequest);

  OpenLAPDataSet findStatements(StatementsRequest statementsRequest);

  Boolean validateLrsUser(@Valid LrsConsumerRequest lrsConsumerRequest);
}
