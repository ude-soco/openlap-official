package com.openlap.analytics_statements.repositories;

import com.mongodb.DBObject;
import com.openlap.analytics_statements.entities.Statement;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface StatementRepository extends MongoRepository<Statement, String> {

  @Query(
      value = "{'statement.context': {$exists: true}}",
      fields = "{'statement.context.platform':1}")
  List<Statement> findAllPlatforms();

  @Query(
      value =
          "{'statement.context.platform': ?0, "
              + "'statement.object.definition.type': {$exists: true}}",
      fields = "{'statement.object.definition.type':1}")
  List<Statement> findAllActivityTypes(String platform);

  @Query(
      value =
          "{'statement.object.definition.type': { $exists: true}, "
              + "'statement.object.definition.type': ?0 }",
      fields = "{'statement.object.definition.name': 1}")
  List<Statement> findActivityTypeNames(String activityType);

  @Query(
      value =
          "{ 'statement.context.platform': ?0, "
              + "'statement.verb.id': {$exists: true}, "
              + "'statement.verb.display': {$exists: true} }",
      fields = "{'statement.verb.display':1, 'statement.verb.id':1}")
  List<Statement> getAllActionsOnActivities(String platform);

  @Query(value = "{ '$and': [ { '$and':?0 } ] }", fields = "?1")
  List<Statement> findStatementsByCustomQuery(
      DBObject queryObject, DBObject parametersToReceiveObject);

  @Query(value = "{ '$and': [ { '$and':?0 }, {'$and':?2} ] }", fields = "?1")
  List<Statement> findStatementsByCustomQueryWithFilter(
      DBObject queryObject, DBObject parametersToReceiveObject, DBObject filterQueryObject);
}
