package com.openlap.analytics_statements.services.impl;

import com.openlap.analytics_statements.dtos.OpenLapDataConverter;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.LrsStore;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exception.ServiceException;
import com.openlap.exceptions.OpenLAPDataColumnException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.ProjectionOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class StatementServiceImpl implements StatementService {
  @Value("${spring.data.mongodb.secondary.database.collection}")
  String collection;

  private final MongoTemplate mongoTemplate;
  private final LrsService lrsService;

  public StatementServiceImpl(
      @Qualifier("secondaryMongoTemplate") MongoTemplate mongoTemplate, LrsService lrsService) {
    this.mongoTemplate = mongoTemplate;
    this.lrsService = lrsService;
  }

  @Override
  public List<Object> findAllUniquePlatforms(PlatformRequest platformRequest) {
    log.info("Searching for platforms");
    Aggregation aggregation =
        Aggregation.newAggregation(
            Aggregation.match(
                Criteria.where("lrs_id").in(getLrsObjectIdsMethod(platformRequest.getLrsStores()))),
            Aggregation.project().and("statement.context.platform").as("platform"),
            Aggregation.group("platform"));
    //            Aggregation.sort(Sort.Direction.ASC, "_id"),

    List<Document> mappedResults = getDocuments(aggregation);
    if (mappedResults.isEmpty()) {
      return Collections.emptyList();
    }
    List<Object> platforms = new ArrayList<>();
    for (Document doc : mappedResults) {
      if (doc.containsKey("_id")) {
        platforms.add(
            Map.of(
                "id",
                doc.getString("_id"),
                "queryId",
                "statement.context.platform",
                "name",
                doc.getString("_id")));
      }
    }
    // Sort platforms by name directly in Java
    Collections.sort(
        platforms, Comparator.comparing(map -> ((Map<String, Object>) map).get("name").toString()));

    return platforms;
  }

  private static List<ObjectId> getLrsObjectIdsMethod(
      List<LrsStoresStatementRequest> lrsStoresStatementRequestList) {
    List<ObjectId> lrsObjectIds = new ArrayList<>();
    for (LrsStoresStatementRequest lrsStoresStatementRequest : lrsStoresStatementRequestList) {
      lrsObjectIds.add(new ObjectId(lrsStoresStatementRequest.getLrsId()));
    }
    return lrsObjectIds;
  }

  @Override
  public List<Object> findUniqueActivityTypes(ActivityTypesRequest activityTypesRequest) {
    log.info("Searching for unique activity types");
    Aggregation aggregation =
        Aggregation.newAggregation(
            Aggregation.match(
                Criteria.where("lrs_id")
                    .in(getLrsObjectIdsMethod(activityTypesRequest.getLrsStores()))
                    .and("statement.context.platform")
                    .in(activityTypesRequest.getPlatforms())),
            Aggregation.group("statement.object.definition.type"),
            Aggregation.sort(Sort.Direction.ASC, "_id"),
            Aggregation.project().and("statement.object.definition.type").as("definitionType"));

    // Executing the aggregation
    List<Document> mappedResults = getDocuments(aggregation);

    if (mappedResults.isEmpty()) {
      return Collections.emptyList();
    }
    // Extracting the definition types
    List<Object> definitionTypes = new ArrayList<>();
    for (Document doc : mappedResults) {
      if (doc.containsKey("_id")) {
        String lastSegment = "";
        try {
          URL url = new URL(doc.getString("_id"));
          String path = url.getPath();
          String[] segments = path.split("/");
          if (segments.length > 1) {
            lastSegment = segments[segments.length - 1];
            Pattern pattern = Pattern.compile("^\\w");
            Matcher matcher = pattern.matcher(lastSegment);
            boolean matches = matcher.find();
            if (matches) {
              lastSegment =
                  lastSegment.substring(0, 1).toUpperCase()
                      + lastSegment.substring(1).toLowerCase();
            }
          } else {
            System.out.println("No segments to process.");
          }
        } catch (MalformedURLException e) {
        }
        definitionTypes.add(
            Map.of(
                "id",
                doc.getString("_id"),
                "queryId",
                "statement.object.definition.type",
                "name",
                lastSegment));
      }
    }
    Collections.sort(
        definitionTypes,
        Comparator.comparing(map -> ((Map<String, Object>) map).get("name").toString()));
    return definitionTypes;
  }

  private List<Document> getDocuments(Aggregation aggregation) {
    AggregationResults<Document> results =
        mongoTemplate.aggregate(aggregation, collection, Document.class);
    return results.getMappedResults();
  }

  @Override
  public List<Object> findUniqueActivities(ActivitiesRequest activitiesRequest) {
    Aggregation aggregation =
        Aggregation.newAggregation(
            Aggregation.match(
                Criteria.where("lrs_id")
                    .in(getLrsObjectIdsMethod(activitiesRequest.getLrsStores()))
                    .and("statement.context.platform")
                    .in(activitiesRequest.getPlatforms())
                    .and("statement.object.definition.type")
                    .in(activitiesRequest.getActivityTypes())),
            Aggregation.group("statement.object.definition.name"),
            Aggregation.project().and("statement.object.definition.name").as("activityName"));

    // Executing the aggregation
    List<Document> mappedResults = getDocuments(aggregation);
    if (mappedResults.isEmpty()) {
      return Collections.emptyList();
    }
    // Extracting the definition types
    List<Object> activitiesList = new ArrayList<>();
    for (Document doc : mappedResults) {
      String activityName = null;
      for (Map.Entry<?, ?> entryActivity : doc.entrySet()) {
        if (entryActivity.getValue() != null) {
          String queryId = "statement.object.definition.name." + entryActivity.getKey();
          activityName = (String) entryActivity.getValue();
          activitiesList.add(Map.of("id", activityName, "queryId", queryId, "name", activityName));
          break;
        }
      }
    }
    Collections.sort(
        activitiesList,
        Comparator.comparing(map -> ((Map<String, Object>) map).get("name").toString()));
    return activitiesList;
  }

  @Override
  public List<Object> findUniqueActionOnActivities(
      ActionOnActivitiesRequest actionOnActivitiesRequest) {
    ProjectionOperation projectOperation =
        Aggregation.project()
            .and("statement.verb.id")
            .as("verbId")
            .and("statement.verb.display")
            .as("verbDisplay");

    Criteria matchCriteria =
        Criteria.where("lrs_id")
            .in(getLrsObjectIdsMethod(actionOnActivitiesRequest.getLrsStores()))
            .and("statement.context.platform")
            .in(actionOnActivitiesRequest.getPlatforms())
            .and("statement.object.definition.type")
            .in(actionOnActivitiesRequest.getActivityTypes());

    List<Criteria> orCriteriaList = new ArrayList<>();
    for (Map.Entry<String, ArrayList<String>> entry :
        actionOnActivitiesRequest.getActivities().entrySet()) {
      String key = entry.getKey();
      List<String> values = entry.getValue();
      orCriteriaList.add(Criteria.where(key).in(values));
    }

    Criteria orCriteria = new Criteria().orOperator(orCriteriaList.toArray(new Criteria[0]));

    // Combine the main match criteria with the OR criteria using AND operator
    Criteria finalCriteria = new Criteria().andOperator(matchCriteria, orCriteria);

    Aggregation aggregation =
        Aggregation.newAggregation(
            Aggregation.match(finalCriteria),
            projectOperation,
            Aggregation.group("verbId", "verbDisplay"),
            Aggregation.project("verbId", "verbDisplay").andExclude("_id"));

    // Executing the aggregation
    List<Document> mappedResults = getDocuments(aggregation);
    if (mappedResults.isEmpty()) {
      return Collections.emptyList();
    }
    // Extracting the definition types
    List<Object> actionOnActivitiesList = new ArrayList<>();
    for (Document doc : mappedResults) {
      if (doc.containsKey("verbId") && doc.containsKey("verbDisplay")) {
        String id = doc.getString("verbId");
        Map<?, ?> displayMap = (Map<?, ?>) doc.get("verbDisplay");
        String verbName = null;
        for (Map.Entry<?, ?> entryVerb : displayMap.entrySet()) {
          if (entryVerb.getValue() != null) {
            String queryId = "statement.verb.display." + entryVerb.getKey();
            verbName = (String) entryVerb.getValue();
            verbName = verbName.substring(0, 1).toUpperCase() + verbName.substring(1).toLowerCase();
            actionOnActivitiesList.add(Map.of("id", id, "queryId", queryId, "name", verbName));
            break; // Stop after finding the first non-null value
          }
        }
      }
    }
    Collections.sort(
        actionOnActivitiesList,
        Comparator.comparing(map -> ((Map<String, Object>) map).get("name").toString()));
    return actionOnActivitiesList;
  }

  @Override
  public OpenLAPDataSet findStatements(StatementsRequest statementsRequest) {
    List<String> outputs = statementsRequest.getOutputs();
    ProjectionOperation projectOperation = Aggregation.project().andExclude("_id");

    Map<String, String> outputMappings = new HashMap<>();
    for (int i = 0; i < outputs.size(); i++) {
      String outputField = outputs.get(i);
      projectOperation = projectOperation.and(outputField).as("field" + (i + 1));
      outputMappings.put("field" + (i + 1), outputs.get(i));
    }

    // Match criteria for the main fields
    Criteria matchCriteria =
        Criteria.where("lrs_id")
            .in(getLrsObjectIdsMethod(statementsRequest.getLrsStores()))
            .and("statement.context.platform")
            .in(statementsRequest.getPlatforms())
            .and("statement.object.definition.type")
            .in(statementsRequest.getActivityTypes())
            .and("statement.verb.id")
            .in(statementsRequest.getActionOnActivities())
            .and("statement.stored")
            .gte(statementsRequest.getDuration().getFrom())
            .lte(statementsRequest.getDuration().getUntil());

    // User query condition
    List<Criteria> orUserCriteriaList = new ArrayList<>();

    for (LrsStoresStatementRequest lrsStore : statementsRequest.getLrsStores()) {
      if (statementsRequest.getUserQueryCondition() == UserQueryCondition.ONLY_ME) {
        orUserCriteriaList.add(
            Criteria.where(getIdentifierTypeAttribute(lrsStore.getLrsId()))
                .in(lrsStore.getUniqueIdentifier()));
      } else if (statementsRequest.getUserQueryCondition() == UserQueryCondition.EXCLUDE_ME) {
        orUserCriteriaList.add(
            Criteria.where(getIdentifierTypeAttribute(lrsStore.getLrsId()))
                .ne(lrsStore.getUniqueIdentifier()));
      }
    }
    Criteria orUserCriteria =
        new Criteria().orOperator(orUserCriteriaList.toArray(new Criteria[0]));

    // OR criteria to dynamically to build the activities
    List<Criteria> orCriteriaList = new ArrayList<>();
    for (Map.Entry<String, ArrayList<String>> entry :
        statementsRequest.getActivities().entrySet()) {
      String key = entry.getKey();
      List<String> values = entry.getValue();
      orCriteriaList.add(Criteria.where(key).in(values));
    }

    Criteria orCriteria = new Criteria().orOperator(orCriteriaList.toArray(new Criteria[0]));

    // Combine the main match criteria with the OR criteria using AND operator
    Criteria finalCriteria;
    if (!orUserCriteriaList.isEmpty()) {
      finalCriteria = new Criteria().andOperator(matchCriteria, orCriteria, orUserCriteria);
    } else {
      finalCriteria = new Criteria().andOperator(matchCriteria, orCriteria);
    }

    Aggregation aggregation =
        Aggregation.newAggregation(Aggregation.match(finalCriteria), projectOperation);

    // Executing the aggregation
    List<Document> mappedResults = getDocuments(aggregation);

    // Initialize a map to hold the lists of values for each field
    Map<String, ArrayList<Object>> fieldValuesMap = new HashMap<>();
    for (String output : outputs) {
      fieldValuesMap.put(output, new ArrayList<>());
    }

    // Populate the field values map
    for (Document doc : mappedResults) {
      for (Map.Entry<String, Object> entry : doc.entrySet()) {
        String originalFieldName = outputMappings.get(entry.getKey());
        if (originalFieldName != null && entry.getValue() != null) {
          fieldValuesMap.get(originalFieldName).add(entry.getValue());
        }
      }
    }

    OpenLapDataConverter dataConverter = new OpenLapDataConverter();
    Set<String> columnNames = fieldValuesMap.keySet();
    try {

      for (String columnName : columnNames) {
        dataConverter.SetOpenLapDataColumn(
            columnName, OpenLAPColumnDataType.Text, true, fieldValuesMap.get(columnName), "", "");
      }
    } catch (OpenLAPDataColumnException e) {
      throw new ServiceException("Could not create OpenLAPDataset for statements", e);
    }
    return dataConverter.getDataSet();
  }

  @Override
  public Boolean validateLrsUser(LrsConsumerRequest lrsConsumerRequest) {
    String lrsStoreId = lrsConsumerRequest.getLrsId();
    String identifierAttribute = getIdentifierTypeAttribute(lrsStoreId);
    // fetch the unique identifier type for the lrs
    Aggregation aggregation =
        Aggregation.newAggregation(
            Aggregation.match(
                Criteria.where(identifierAttribute)
                    .is(lrsConsumerRequest.getUniqueIdentifier())
                    .and("lrs_id")
                    .in(new ObjectId(lrsStoreId))),
            Aggregation.limit(1),
            Aggregation.project().and(identifierAttribute).as("actor"));

    List<Document> mappedResults = getDocuments(aggregation);

    return !mappedResults.isEmpty();
  }

  private String getIdentifierTypeAttribute(String lrsStoreId) {
    try {
      LrsStore lrsStore = lrsService.getLrsStore(lrsStoreId);
      String identifierAttribute;
      switch (lrsStore.getUniqueIdentifierType()) {
        case MBOX:
          identifierAttribute = "statement.actor.mbox";
          break;
        case MBOX_SHA1SUM:
          identifierAttribute = "statement.actor.mbox.sha1sum";
          break;
        case OPENID:
          identifierAttribute = "statement.actor.openid";
          break;
        case ACCOUNT_NAME:
          identifierAttribute = "statement.actor.account.name";
          break;
        default:
          throw new ServiceException("Unknown unique identifier type");
      }
      return identifierAttribute;
    } catch (Exception e) {
      throw new ServiceException(
          "Could not get identifier type attribute. Check the LRS id again.", e);
    }
  }
}
