package com.openlap.community.adaptation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.openlap.analytics_module.drafts.IndicatorDraftConfiguration;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_module.services.impl.ComplexIndicatorDataService;
import com.openlap.analytics_module.services.impl.ComplexIndicatorMerger;
import com.openlap.analytics_module.services.impl.IndicatorDraftDefinitionService;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.entities.AnalyticsTechnique;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.dataset.*;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.stereotype.Service;

/** Executes only the viewer-authored recipes in a private draft; original IDs are never resolved. */
@Service
@RequiredArgsConstructor
public class AdaptationExecution {
  private final TokenService tokens;
  private final StatementService statements;
  private final AnalyticsTechniqueService methods;
  private final VisualizationMethodUtilityService charts;
  private final IndicatorUtilityService utility;
  private final IndicatorDraftDefinitionService definitions;
  private final ComplexIndicatorMerger merger;
  private final IndicatorDraftConfiguration configurations;
  private final ObjectMapper mapper;
  private final Gson gson = new Gson();

  public record Result(Indicator root, List<Indicator> leaves, OpenLAPDataSet data,
      String previewCode, String bindingsHash, String pluginsHash, Map<String, String> targets) {}

  public Result execute(HttpServletRequest request, Document draft, String stage,
      Map<String, String> targetIds) {
    if (!Set.of("combine", "analysis", "visualization").contains(stage)) throw incomplete("Choose a supported preview step.");
    User viewer = tokens.getUserFromToken(request);
    IndicatorType type = IndicatorType.valueOf(draft.getString("indicatorType"));
    JsonNode config = configurations.validateAdaptation(mapper.valueToTree(draft.get("configuration")), type, 1);
    boolean finalStage = "visualization".equals(stage);
    Map<String, Object> bindingValues = new TreeMap<>(), pluginValues = new TreeMap<>();
    Map<String, String> targets = new LinkedHashMap<>(targetIds);
    List<Indicator> leaves = new ArrayList<>();
    List<ComplexIndicatorMerger.Source> mergeSources = new ArrayList<>();
    Indicator root;
    OpenLAPDataSet data;
    if (type == IndicatorType.BASIC) {
      var leaf = basic(request, config, viewer, draft.getString("name"), finalStage, bindingValues, pluginValues);
      root = leaf.indicator(); data = leaf.data();
    } else {
      if (config.path("sources").size() < 2) throw incomplete("Configure at least two Basic sources.");
      // Validate every personal binding and Composite method before reading even the first leaf.
      // A partially edited child must never make another child's query a fallback preview.
      String requiredMethod = null;
      for (JsonNode source : config.path("sources")) {
        if ("root".equals(source.path("id").asText())) throw incomplete("This source slot is reserved. Start a new source selection.");
        JsonNode child = config.path("sourceDrafts").path(source.path("id").asText());
        query(child, viewer, bindingValues);
        String method = child.path("analysis").path("selectedAnalyticsMethod").path("method").path("id").asText();
        if (type == IndicatorType.COMPOSITE && requiredMethod != null && !requiredMethod.equals(method))
          throw incomplete("Composite sources must use the same analytics method.");
        requiredMethod = method;
      }
      String firstMethod = null;
      int number = 0;
      for (JsonNode source : config.path("sources")) {
        number++;
        String slot = source.path("id").asText();
        JsonNode child = config.path("sourceDrafts").path(slot);
        if (!child.isObject()) throw incomplete("Configure Source " + number + " before continuing.");
        Leaf leaf;
        try {
          leaf = basic(request, child, viewer, name(child.path("indicator").path("indicatorName").asText(), "Source " + number),
              finalStage, bindingValues, pluginValues);
        } catch (ValidationException error) {
          throw new ValidationException(error.getCode(), "Source " + number + ": " + error.getMessage());
        }
        String method = leaf.indicator().getAnalyticsTechniqueReference().getAnalyticsTechnique().getId();
        if (type == IndicatorType.COMPOSITE && firstMethod != null && !firstMethod.equals(method))
          throw incomplete("Composite sources must use the same analytics method. Review Source " + number + ".");
        firstMethod = method;
        leaf.indicator().setId(targets.getOrDefault(slot, slot));
        leaves.add(leaf.indicator());
        String keyId = source.path("keyColumnId").asText();
        var key = leaf.data().getColumns().get(keyId);
        if (key == null) throw incomplete("Choose an available matching column for Source " + number + ".");
        List<String> measures = strings(source.path("measureColumnIds"));
        if (measures.isEmpty()) throw incomplete("Choose a measure for Source " + number + ".");
        // Namespacing stays in private slot IDs until publication, so the UI can keep stable mappings.
        mergeSources.add(new ComplexIndicatorMerger.Source(slot,
            name(source.path("label").asText(), source.path("name").asText()),
            key.getConfigurationData(), measures, leaf.data()));
      }
      var merged = merger.merge(mergeSources, type == IndicatorType.MULTI_LEVEL);
      ComplexIndicatorDataService.requireNonempty(merged);
      root = indicator(viewer, name(draft.getString("name"), "Adapted indicator"), type);
      data = merged;
      if (!"combine".equals(stage) && type == IndicatorType.MULTI_LEVEL) {
        JsonNode analysis = config.path("analysis");
        var reference = analysis(analysis.path("methodId").asText(), analysis.path("mapping"), analysis.path("params"), pluginValues);
        data = analyze(reference, merged);
        root.setAnalyticsTechniqueReference(reference);
      }
      List<IndicatorsToMerge> references = new ArrayList<>();
      for (int i = 0; i < leaves.size(); i++) {
        var source = mergeSources.get(i);
        references.add(new IndicatorsToMerge(leaves.get(i), gson.toJson(source.key()), source.measures(), source.label()));
      }
      root.setIndicators(references);
      root.setColumnToMerge(gson.toJson(mergeSources.get(0).key()));
      if (finalStage && type == IndicatorType.COMPOSITE)
        data = ComplexIndicatorDataService.visualizationData(merged, mapping(config.path("visualization").path("mapping")));
      root.setConfigurationRequest(savedComplex(config, leaves, targets));
    }
    String code = null;
    if (finalStage) {
      JsonNode visualization = config.path("visualization");
      root.setVisualizationTechniqueReference(visualization(visualization, type == IndicatorType.BASIC, data, pluginValues));
      var vis = root.getVisualizationTechniqueReference();
      code = utility.getIndicatorCodeMethod(data, vis.getVisLibrary().getId(), vis.getVisType().getId(),
          gson.fromJson(vis.getAnalyticsTechniqueToVisualizationMapping(), OpenLAPPortConfig.class),
          gson.fromJson(vis.getAdditionalParams(), Object.class), true);
      if (code == null || code.isBlank()) throw incomplete("The chart did not produce a preview. Review its inputs and options.");
    }
    root.setId(targets.getOrDefault("root", draft.get("_id").toString()));
    return new Result(root, List.copyOf(leaves), data, code, hash(bindingValues), hash(pluginValues), targets);
  }

  private record Leaf(Indicator indicator, OpenLAPDataSet data) {}

  private Leaf basic(HttpServletRequest request, JsonNode config, User viewer, String title,
      boolean finalStage, Map<String, Object> bindings, Map<String, Object> plugins) {
    StatementsRequest query = query(config, viewer, bindings);
    JsonNode input = config.path("analysis");
    var ref = analysis(input.path("selectedAnalyticsMethod").path("method").path("id").asText(),
        input.path("selectedAnalyticsMethod").path("mapping"), input.path("params"), plugins);
    OpenLAPDataSet raw = statements.findStatements(query);
    requireData(raw);
    OpenLAPDataSet output = analyze(ref, raw);
    Indicator value = indicator(viewer, name(title, "Adapted indicator"), IndicatorType.BASIC);
    value.setIndicatorQuery(gson.toJson(query));
    value.setAnalyticsTechniqueReference(ref);
    value.setConfigurationRequest(config.toString());
    if (finalStage) {
      value.setVisualizationTechniqueReference(visualization(config.path("visualization"), true, output, plugins));
      // The normal save validator also validates bounded authoring, request fields and ownership.
      ObjectNode payload = mapper.createObjectNode();
      payload.put("name", value.getName()).put("indicatorType", "BASIC").put("configuration", config.toString());
      payload.set("indicatorQuery", mapper.valueToTree(query));
      payload.put("analyticsTechniqueId", ref.getAnalyticsTechnique().getId());
      payload.set("analyticsTechniqueMapping", mapper.valueToTree(mapping(input.path("selectedAnalyticsMethod").path("mapping"))));
      payload.set("analyticsTechniqueParams", input.path("params"));
      var vis = value.getVisualizationTechniqueReference();
      payload.put("visualizationLibraryId", vis.getVisLibrary().getId()).put("visualizationTypeId", vis.getVisType().getId());
      payload.set("visualizationMapping", config.path("visualization").path("mapping"));
      payload.set("visualizationParams", config.path("visualization").path("params"));
      value = definitions.prepare(request, IndicatorType.BASIC, payload);
    }
    return new Leaf(value, output);
  }

  StatementsRequest query(JsonNode config, User viewer, Map<String, Object> bindings) {
    if (!"ONLY_ME".equals(config.path("filters").path("selectedUserFilter").asText()))
      throw new ValidationException("PERSONAL_DATA_REQUIRED", "Choose Use only my data for community adaptations.");
    JsonNode selected = config.path("dataset").path("selectedLRSList");
    if (!selected.isArray() || selected.isEmpty() || selected.size() > 20)
      throw new ValidationException("MISSING_LRS", "Choose one of your registered Learning Record Stores.");
    List<LrsStoresStatementRequest> stores = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    for (JsonNode item : selected) {
      String lrs = text(item.path("lrsId")), actor = text(item.path("uniqueIdentifier"));
      var consumer = viewer.getLrsConsumerList() == null ? null : viewer.getLrsConsumerList().stream()
          .filter(Objects::nonNull).filter(c -> lrs.equals(c.getLrsId()) && actor.equals(c.getUniqueIdentifier()))
          .findFirst().orElse(null);
      if (consumer == null || consumer.getId() == null || !Boolean.TRUE.equals(statements.validateLrsUser(new LrsConsumerRequest(lrs, actor))))
        throw new ValidationException("MISSING_LRS", "A selected learner connection is unavailable. Check Manage LRS and choose it again.");
      String identity = lrs + "\u0000" + actor;
      if (!seen.add(identity)) throw incomplete("Choose each learner connection only once.");
      stores.add(new LrsStoresStatementRequest(lrs, actor));
      bindings.put(identity, List.of(consumer.getId().toHexString(), lrs, actor));
    }
    Set<String> types = new LinkedHashSet<>(), actions = new LinkedHashSet<>();
    Map<String, ArrayList<String>> activities = new LinkedHashMap<>();
    JsonNode filters = config.path("filters").path("selectedActivities");
    if (!filters.isArray() || filters.isEmpty() || filters.size() > 50) throw incomplete("Complete the activity filters.");
    for (JsonNode filter : filters) {
      types.add(text(filter.path("selectedActivityType").path("id")));
      if (!filter.path("selectedActionList").isArray() || filter.path("selectedActionList").isEmpty()
          || !filter.path("selectedActivityList").isArray() || filter.path("selectedActivityList").isEmpty())
        throw incomplete("Choose an action and activities for each activity filter.");
      for (JsonNode action : filter.path("selectedActionList")) actions.add(text(action.path("id")));
      for (JsonNode activity : filter.path("selectedActivityList")) {
        String path = text(activity.path("queryId"));
        if (!path.startsWith("statement.object.") || !path.matches("statement\\.[A-Za-z0-9_.-]+")) throw incomplete("Choose a supported activity field.");
        var values = activities.computeIfAbsent(path, ignored -> new ArrayList<>());
        String id = text(activity.path("id")); if (!values.contains(id)) values.add(id);
      }
    }
    List<String> outputs = new ArrayList<>();
    for (var port : mapping(config.path("analysis").path("selectedAnalyticsMethod").path("mapping")).getMapping()) {
      String id = port.getOutputPort().getId();
      if (id == null || !id.matches("statement\\.[A-Za-z0-9_.-]+")) throw incomplete("Choose a supported input data column.");
      if (!outputs.contains(id)) outputs.add(id);
    }
    JsonNode time = config.path("filters").path("selectedTime");
    return new StatementsRequest(stores, new ArrayList<>(types), new ArrayList<>(actions), activities,
        new StatementDuration(text(time.path("from")), text(time.path("until"))), outputs, UserQueryCondition.ONLY_ME);
  }

  private AnalyticsTechniqueReference analysis(String id, JsonNode map, JsonNode params, Map<String, Object> plugins) {
    if (id == null || id.isBlank()) throw incomplete("Choose an analytics method.");
    AnalyticsTechnique method = methods.fetchAnalyticsTechniqueMethod(id);
    if (method == null || !method.isEnabled()) throw plugin();
    OpenLAPPortConfig mapping = mapping(map);
    if (!methods.validateAnalyticsTechniqueMapping(id, mapping).isValid()) throw incomplete("Review the analytics method input mappings.");
    if (!params.isArray()) throw incomplete("Complete the analytics method parameters.");
    plugins.put("method:" + id, Arrays.asList(id, method.getArtifactId(), method.getInstallationId(), method.getFileName(),
        method.getImplementingClass(), method.getOutputs(), method.isEnabled()));
    return new AnalyticsTechniqueReference(params.toString(), gson.toJson(mapping), method);
  }

  private OpenLAPDataSet analyze(AnalyticsTechniqueReference ref, OpenLAPDataSet data) {
    OpenLAPPortConfig mapping = gson.fromJson(ref.getQueryToAnalyticsTechniqueMapping(), OpenLAPPortConfig.class);
    ComplexIndicatorDataService.requireMapping(data, mapping);
    List<OpenLAPDynamicParam> params = gson.fromJson(ref.getAdditionalParams(), new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());
    OpenLAPDataSet result = utility.getAnalyzedDataSetMethod(new IndicatorAnalysisTechnique(ref.getAnalyticsTechnique().getId(), mapping, params), data);
    requireData(result);
    return result;
  }

  private VisualizationTechniqueReference visualization(JsonNode config, boolean basic, OpenLAPDataSet data, Map<String, Object> plugins) {
    String libraryId = basic ? config.path("selectedLibrary").path("id").asText() : config.path("libraryId").asText();
    String typeId = basic ? config.path("selectedType").path("id").asText() : config.path("typeId").asText();
    if (libraryId.isBlank() || typeId.isBlank()) throw incomplete("Choose a visualization library and chart.");
    var library = charts.fetchVisualizationLibraryMethod(libraryId);
    var type = charts.fetchVisualizationTypeMethod(typeId);
    if (library == null || type == null || !library.isEnabled() || !type.isEnabled()
        || type.getVisualizationLib() == null || !libraryId.equals(type.getVisualizationLib().getId())) throw plugin();
    OpenLAPPortConfig map = mapping(config.path("mapping"));
    ComplexIndicatorDataService.requireMapping(data, map);
    if (!charts.validateAnalyticsTechniqueToVisualizationMapping(typeId, map).isValid()) throw incomplete("Review the chart input mappings.");
    if (!config.path("params").isObject()) throw incomplete("Review the chart options.");
    Map<String, Object> params = mapper.convertValue(config.path("params"), new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
    params = com.openlap.plugins.visualization.VisualizationCustomization.validate(type.getVisualizationDescriptor() == null ? null
        : new Document(type.getVisualizationDescriptor()), params);
    plugins.put("library:" + libraryId, Arrays.asList(libraryId, library.getArtifactId(), library.getInstallationId(), library.getFrameworkLocation(), library.isEnabled()));
    plugins.put("chart:" + typeId, Arrays.asList(typeId, libraryId, type.getInstallationId(), type.getImplementingClass(),
        type.isEnabled(), mapper.valueToTree(type.getVisualizationDescriptor()), mapper.valueToTree(type.getChartConfiguration())));
    return new VisualizationTechniqueReference(gson.toJson(params), gson.toJson(map), library, type);
  }

  private OpenLAPPortConfig mapping(JsonNode value) {
    OpenLAPPortConfig result;
    try { result = gson.fromJson(value.toString(), OpenLAPPortConfig.class); }
    catch (RuntimeException error) { throw incomplete("Complete the required input mappings."); }
    if (result == null || result.getMapping() == null || result.getMapping().isEmpty() || result.getMapping().size() > 100)
      throw incomplete("Complete the required input mappings.");
    for (var port : result.getMapping()) if (port == null || port.getInputPort() == null || port.getOutputPort() == null
        || port.getInputPort().getId() == null || port.getOutputPort().getId() == null) throw incomplete("Complete the required input mappings.");
    return result;
  }

  private String savedComplex(JsonNode config, List<Indicator> leaves, Map<String, String> targets) {
    ObjectNode clean = ((ObjectNode) config).deepCopy(); clean.remove("sourceDrafts");
    int index = 0;
    for (JsonNode node : clean.path("sources")) {
      ObjectNode source = (ObjectNode) node;
      String slot = source.path("id").asText();
      source.put("id", targets.getOrDefault(slot, slot));
      source.put("name", leaves.get(index).getName());
      var method = leaves.get(index++).getAnalyticsTechniqueReference().getAnalyticsTechnique();
      source.set("analyticsMethod", mapper.valueToTree(Map.of("id", method.getId(), "name", method.getName())));
      source.set("outputs", mapper.valueToTree(methods.getAnalyticsTechniqueOutputs(method.getId())));
    }
    return remap(clean.toString(), targets);
  }

  public void remapForPublication(Result result, Map<String, String> targets) {
    Indicator root = result.root();
    if (root.getAnalyticsTechniqueReference() != null) {
      var analysis = root.getAnalyticsTechniqueReference();
      analysis.setQueryToAnalyticsTechniqueMapping(remap(analysis.getQueryToAnalyticsTechniqueMapping(), targets));
      analysis.setAdditionalParams(remap(analysis.getAdditionalParams(), targets));
    }
    var vis = root.getVisualizationTechniqueReference();
    if (vis != null) {
      vis.setAnalyticsTechniqueToVisualizationMapping(remap(vis.getAnalyticsTechniqueToVisualizationMapping(), targets));
      vis.setAdditionalParams(remap(vis.getAdditionalParams(), targets));
    }
  }

  static String remap(String value, Map<String, String> targets) {
    String result = value;
    if (result != null) for (var entry : targets.entrySet()) result = result.replace("source_" + entry.getKey() + "__", "source_" + entry.getValue() + "__");
    return result;
  }

  static void requireData(OpenLAPDataSet data) {
    if (data == null || data.getColumns() == null || data.getColumns().isEmpty()) throw noData();
    int rows = -1;
    for (var column : data.getColumns().values()) {
      if (column == null || column.getConfigurationData() == null || column.getData() == null || column.getData().isEmpty()) throw noData();
      if (rows >= 0 && rows != column.getData().size()) throw incomplete("The selected data has inconsistent column lengths.");
      rows = column.getData().size();
      if (rows > ComplexIndicatorMerger.MAX_ROWS || (long) rows * data.getColumns().size() > ComplexIndicatorMerger.MAX_CELLS)
        throw incomplete("The preview contains too much data. Narrow the activity filters or analysis output.");
    }
  }

  private static Indicator indicator(User owner, String name, IndicatorType type) {
    Indicator result = new Indicator(); result.setCreatedBy(owner); result.setName(name); result.setIndicatorType(type);
    result.setCreatedOn(LocalDateTime.now()); result.setTimesExecuted(0); return result;
  }
  private String hash(Object value) { return configurations.hash(mapper.valueToTree(value)); }
  private static String name(String value, String fallback) { return value == null || value.isBlank() ? fallback : value.substring(0, Math.min(300, value.length())); }
  private static String text(JsonNode value) { if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > 4096) throw incomplete("Complete the required dataset and filter selections."); return value.asText(); }
  private static List<String> strings(JsonNode value) { if (!value.isArray()) throw incomplete("Choose the measure columns."); List<String> result = new ArrayList<>(); for (JsonNode item : value) result.add(text(item)); return result; }
  static ValidationException incomplete(String message) { return new ValidationException("INCOMPLETE_ADAPTATION", message); }
  static ValidationException noData() { return new ValidationException("NO_DATA", "No output rows are available for your data. Review the filters and analysis inputs."); }
  static ValidationException plugin() { return new ValidationException("PLUGIN_UNAVAILABLE", "A selected method or chart is unavailable. Choose an available plugin in the editor."); }
}
