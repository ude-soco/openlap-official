package com.openlap.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.utility_entities.*;
import com.openlap.analytics_module.repositories.IndicatorRepository;
import com.openlap.analytics_module.services.BasicAnalysisFields;
import com.openlap.analytics_module.services.ComplexIndicatorSourceGuard;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_module.services.impl.ComplexIndicatorDataService;
import com.openlap.analytics_module.services.impl.ComplexIndicatorMerger;
import com.openlap.analytics_statements.dtos.request.*;
import com.openlap.analytics_statements.entities.utility_entities.UserQueryCondition;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.dataset.*;
import com.openlap.dynamicparam.OpenLAPDynamicParam;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.user.entities.User;
import com.openlap.user.entities.utility_entities.LrsConsumer;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Reconstructs a private, viewer-owned graph. Never executes an original source ID or its cache. */
@Service
@RequiredArgsConstructor
public class CommunityIndicatorExecution {
  private final IndicatorRepository indicators;
  private final StatementService statements;
  private final IndicatorUtilityService utility;
  private final ComplexIndicatorMerger merger;
  private final ObjectMapper mapper;
  private final Gson gson = new Gson();
  private static final Pattern FIELD_PATH = Pattern.compile("[A-Za-z_][A-Za-z0-9_-]*(?:\\.[A-Za-z0-9_-]+)*");
  private static final Pattern LANGUAGE_FIELD = Pattern.compile(
      "statement\\.(?:verb\\.display|object\\.definition\\.(?:name|description))\\.([A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{1,8})*)");
  private static final Set<String> KNOWN_LANGUAGE_TAGS = Arrays.stream(Locale.getAvailableLocales())
      .map(locale -> locale.toLanguageTag().toLowerCase(Locale.ROOT)).collect(java.util.stream.Collectors.toUnmodifiableSet());
  private static final Set<String> STANDARD_FIELDS = Set.of(
      "statement.id", "statement.timestamp", "statement.stored", "statement.version", "statement.verb.id",
      "statement.object.id", "statement.object.objectType", "statement.object.definition.type",
      "statement.object.definition.interactionType", "statement.object.definition.moreInfo",
      "statement.result.score.raw", "statement.result.score.min", "statement.result.score.max", "statement.result.score.scaled",
      "statement.result.success", "statement.result.completion", "statement.result.response", "statement.result.duration",
      "statement.context.registration", "statement.context.revision", "statement.context.platform", "statement.context.language",
      "statement.context.statement.id", "statement.context.statement.objectType");

  public record ConnectionOption(String id, String label) {}
  public record ConnectionChoice(String lrsId, String lrsTitle, List<ConnectionOption> options) {}

  public List<ConnectionChoice> connectionChoices(Indicator source, User viewer) {
    if (source == null || viewer.getLrsConsumerList() == null) return List.of();
    Set<String> required = new LinkedHashSet<>();
    for (var leaf : leaves(source)) {
      var query = gson.fromJson(leaf.getIndicatorQuery(), StatementsRequest.class);
      if (query != null && query.getLrsStores() != null) query.getLrsStores().forEach(store -> required.add(store.getLrsId()));
    }
    List<ConnectionChoice> result = new ArrayList<>();
    for (String lrs : required) {
      Map<String, LrsConsumer> identities = new LinkedHashMap<>();
      viewer.getLrsConsumerList().stream().filter(Objects::nonNull)
          .filter(item -> lrs.equals(item.getLrsId()) && item.getId() != null && item.getUniqueIdentifier() != null && !item.getUniqueIdentifier().isBlank())
          .forEach(item -> identities.putIfAbsent(item.getUniqueIdentifier(), item));
      if (identities.size() > 1) result.add(new ConnectionChoice(lrs, "Your connected data source " + (result.size() + 1),
          identities.values().stream().map(item -> new ConnectionOption(item.getId().toHexString(), item.getUniqueIdentifier())).toList()));
    }
    return result;
  }

  public record Graph(Indicator root, List<Indicator> leaves, String version, String bindingsHash,
      Map<String, String> connections, Map<String, String> targets, String previewCode) {}

  public Graph execute(Indicator source, User viewer, Map<String, String> choices, Map<String, String> targetIds) {
    List<Indicator> originals = leaves(source);
    String version = fingerprint(source, originals);
    Map<String, LrsConsumer> bound = bindings(originals, viewer, choices == null ? Map.of() : choices);
    Map<String, String> connections = new TreeMap<>();
    Map<String, Object> bindingValues = new TreeMap<>();
    bound.forEach((lrs, consumer) -> {
      connections.put(lrs, consumer.getId().toHexString());
      bindingValues.put(lrs, List.of(consumer.getId().toHexString(), consumer.getUniqueIdentifier()));
    });
    Map<String, String> targets = new LinkedHashMap<>();
    for (Indicator original : originals) targets.put(original.getId(), target(targetIds, original.getId()));
    targets.putIfAbsent(source.getId(), target(targetIds, source.getId()));
    List<Indicator> prepared = new ArrayList<>();
    Map<String, OpenLAPDataSet> outputs = new LinkedHashMap<>();
    for (int index = 0; index < originals.size(); index++) {
      Indicator original = originals.get(index);
      Indicator copy = copyBasic(original, viewer, bound, targets.get(original.getId()),
          source.getIndicatorType() == IndicatorType.BASIC ? CommunitySanitizer.publicName(source) : "Community source " + (index + 1));
      StatementsRequest query = gson.fromJson(copy.getIndicatorQuery(), StatementsRequest.class);
      OpenLAPDataSet data = personalData(query);
      requireData(data);
      IndicatorAnalysisTechnique analysis = analysis(copy);
      ComplexIndicatorDataService.requireMapping(data, analysis.getAnalyticsTechniqueMapping());
      OpenLAPDataSet result = utility.getAnalyzedDataSetMethod(analysis, data);
      requireData(result);
      prepared.add(copy);
      outputs.put(copy.getId(), result);
    }
    Indicator root;
    OpenLAPDataSet analyzed;
    if (source.getIndicatorType() == IndicatorType.BASIC) {
      root = prepared.get(0);
      analyzed = outputs.get(root.getId());
    } else {
      root = copyComplex(source, viewer, prepared, targets);
      List<ComplexIndicatorMerger.Source> rows = new ArrayList<>();
      for (IndicatorsToMerge item : root.getIndicators()) {
        rows.add(new ComplexIndicatorMerger.Source(item.getIndicator().getId(), item.getLabel(),
            gson.fromJson(item.getColumnToMerge() == null ? root.getColumnToMerge() : item.getColumnToMerge(), OpenLAPColumnConfigData.class),
            item.getMeasureColumnIds(), outputs.get(item.getIndicator().getId())));
      }
      var merged = merger.merge(rows, root.getIndicatorType() == IndicatorType.MULTI_LEVEL);
      ComplexIndicatorDataService.requireNonempty(merged);
      if (root.getIndicatorType() == IndicatorType.COMPOSITE) {
        analyzed = ComplexIndicatorDataService.visualizationData(merged, visualizationMapping(root));
      } else {
        IndicatorAnalysisTechnique analysis = analysis(root);
        ComplexIndicatorDataService.requireMapping(merged, analysis.getAnalyticsTechniqueMapping());
        OpenLAPDataSet selected = new OpenLAPDataSet();
        for (OpenLAPPortMapping port : analysis.getAnalyticsTechniqueMapping().getMapping()) {
          selected.getColumns().put(port.getOutputPort().getId(), merged.getColumns().get(port.getOutputPort().getId()));
        }
        analyzed = utility.getAnalyzedDataSetMethod(analysis, selected);
        requireData(analyzed);
      }
      root.setConfigurationRequest(configuration(root, prepared, outputs));
    }
    ComplexIndicatorDataService.requireMapping(analyzed, visualizationMapping(root));
    var vis = root.getVisualizationTechniqueReference();
    String code = utility.getIndicatorCodeMethod(analyzed, vis.getVisLibrary().getId(),
        vis.getVisType().getId(), visualizationMapping(root), gson.fromJson(vis.getAdditionalParams(), Object.class), true);
    if (code == null || code.isBlank()) throw unavailable();
    return new Graph(root, source.getIndicatorType() == IndicatorType.BASIC ? List.of() : prepared,
        version, hash(bindingValues), connections, targets, code);
  }

  List<Indicator> leaves(Indicator source) {
    if (source == null || source.getCreatedBy() == null || source.getIndicatorType() == null) throw unavailable();
    if (source.getIndicatorType() == IndicatorType.BASIC) return List.of(source);
    if (source.getIndicators() == null || source.getIndicators().size() < 2 || source.getIndicators().size() > 10) throw unavailable();
    List<Indicator> result = new ArrayList<>();
    Set<String> ids = new HashSet<>();
    for (IndicatorsToMerge item : source.getIndicators()) {
      if (item == null || item.getIndicator() == null || !ids.add(item.getIndicator().getId())) throw unavailable();
      result.add(indicators.findById(item.getIndicator().getId()).orElseThrow(CommunityIndicatorExecution::unavailable));
    }
    ComplexIndicatorSourceGuard.validateResolved(source.getCreatedBy().getId(), result,
        source.getIndicatorType() == IndicatorType.COMPOSITE);
    return result;
  }

  public String currentBindingsHash(Indicator source, User viewer, Map<String, String> choices) {
    Map<String, Object> values = new TreeMap<>();
    bindings(leaves(source), viewer, choices).forEach((store, consumer) -> values.put(store,
        List.of(consumer.getId().toHexString(), consumer.getUniqueIdentifier())));
    return hash(values);
  }

  public String fingerprint(Indicator source) { return fingerprint(source, leaves(source)); }

  private String fingerprint(Indicator source, List<Indicator> leaves) {
    List<Object> definitions = new ArrayList<>();
    definitions.add(definition(source));
    for (Indicator leaf : leaves) definitions.add(definition(leaf));
    return hash(definitions);
  }

  private Object definition(Indicator value) {
    Map<String, Object> fields = new TreeMap<>();
    fields.put("id", value.getId()); fields.put("type", value.getIndicatorType());
    fields.put("name", value.getName()); fields.put("query", value.getIndicatorQuery());
    fields.put("configuration", value.getConfigurationRequest()); fields.put("key", value.getColumnToMerge());
    if (value.getAnalyticsTechniqueReference() != null) {
      var method = value.getAnalyticsTechniqueReference();
      fields.put("method", method.getAnalyticsTechnique() == null ? null : method.getAnalyticsTechnique().getId());
      fields.put("methodMapping", method.getQueryToAnalyticsTechniqueMapping());
      fields.put("params", method.getAdditionalParams());
    }
    if (value.getVisualizationTechniqueReference() != null) {
      var vis = value.getVisualizationTechniqueReference();
      fields.put("library", vis.getVisLibrary() == null ? null : vis.getVisLibrary().getId());
      fields.put("chart", vis.getVisType() == null ? null : vis.getVisType().getId());
      fields.put("visMapping", vis.getAnalyticsTechniqueToVisualizationMapping());
      fields.put("visParams", vis.getAdditionalParams());
    }
    if (value.getIndicators() != null) fields.put("sources", value.getIndicators().stream().map(item ->
        Arrays.asList(item.getIndicator() == null ? null : item.getIndicator().getId(), item.getColumnToMerge(), item.getMeasureColumnIds(), item.getLabel())).toList());
    return fields;
  }

  Map<String, LrsConsumer> bindings(List<Indicator> leaves, User viewer, Map<String, String> choices) {
    Set<String> required = new LinkedHashSet<>();
    for (Indicator leaf : leaves) {
      StatementsRequest query = gson.fromJson(leaf.getIndicatorQuery(), StatementsRequest.class);
      validateQuery(leaf, query);
      for (var store : query.getLrsStores()) {
        if (store == null || store.getLrsId() == null || store.getLrsId().isBlank()) throw unavailable();
        required.add(store.getLrsId());
      }
    }
    if (viewer.getLrsConsumerList() == null || viewer.getLrsConsumerList().isEmpty())
      throw failure("NO_CONNECTION", "Connect your Learning Record Store in Manage LRS before previewing this indicator.");
    Map<String, LrsConsumer> result = new LinkedHashMap<>();
    for (String lrs : required) {
      List<LrsConsumer> matches = viewer.getLrsConsumerList().stream().filter(Objects::nonNull)
          .filter(c -> lrs.equals(c.getLrsId()) && c.getId() != null && c.getUniqueIdentifier() != null && !c.getUniqueIdentifier().isBlank())
          .filter(c -> choices.get(lrs) == null || choices.get(lrs).equals(c.getId().toHexString())).toList();
      // Multiple identical registrations represent one identity, not an arbitrary choice of learner.
      Map<String, LrsConsumer> identities = new LinkedHashMap<>();
      matches.forEach(c -> identities.putIfAbsent(c.getUniqueIdentifier(), c));
      if (identities.isEmpty()) throw failure("MISSING_LRS", "Your saved connections do not include every data source required by this indicator.");
      if (identities.size() != 1) throw failure("CHOOSE_CONNECTION", "More than one of your learner identities matches a required data source. Choose the learner identity to use for your preview.");
      LrsConsumer selected = identities.values().iterator().next();
      if (!Boolean.TRUE.equals(statements.validateLrsUser(new LrsConsumerRequest(lrs, selected.getUniqueIdentifier()))))
        throw failure("MISSING_LRS", "A required learner connection could not be validated. Check Manage LRS and try again.");
      result.put(lrs, selected);
    }
    if (choices.keySet().stream().anyMatch(key -> !required.contains(key))) throw failure("INCOMPATIBLE", "Choose only the connections required by this indicator.");
    return result;
  }

  /** Required selectors cannot be redacted without changing semantics; reject private selectors. */
  private void validateQuery(Indicator source, StatementsRequest query) {
    if (query == null || query.getLrsStores() == null || query.getLrsStores().isEmpty()
        || query.getLrsStores().size() > 20 || query.getActivityTypes() == null || query.getActivityTypes().isEmpty()
        || query.getActionOnActivities() == null || query.getActionOnActivities().isEmpty()
        || query.getActivities() == null || query.getActivities().isEmpty() || query.getOutputs() == null || query.getOutputs().isEmpty()
        || query.getDuration() == null || query.getDuration().getFrom() == null || query.getDuration().getUntil() == null) throw unavailable();
    BasicAnalysisFields.requireAllowed(source);
    List<String> identifiers = new ArrayList<>();
    User author = source.getCreatedBy();
    if (author != null) {
      identifiers.add(author.getId()); identifiers.add(author.getEmail());
    }
    for (var original : query.getLrsStores()) if (original != null) identifiers.add(original.getUniqueIdentifier());
    List<Pattern> privateIds = identifiers.stream().filter(value -> value != null && !value.isBlank())
        .map(value -> identifierPattern(normalize(value.strip()))).toList();
    Pattern privateName = fullNamePattern(author);
    // Inspect values in their actual roles, not JSON keys or guessed name fragments.
    // A normal namespace such as openlap-demo does not identify its creator.
    for (String value : query.getActivityTypes()) requirePublicSelector(value, privateIds, privateName);
    for (String value : query.getActionOnActivities()) requirePublicSelector(value, privateIds, privateName);
    if (query.getActivities().keySet().stream().anyMatch(key -> key == null || !key.startsWith("statement.object.definition.name.")
        || key.indexOf('$') >= 0 || key.indexOf(0) >= 0)) throw unavailable();
    for (var entry : query.getActivities().entrySet()) {
      requireFieldPath(entry.getKey(), privateIds, privateName);
      if (entry.getValue() == null || entry.getValue().isEmpty()) throw unavailable();
      for (String value : entry.getValue()) requirePublicSelector(value, privateIds, privateName);
    }
    for (String field : query.getOutputs()) requireFieldPath(field, privateIds, privateName);
    // A year can equal a learner identifier without making an ISO date private.
    requireDate(query.getDuration().getFrom()); requireDate(query.getDuration().getUntil());
  }

  private static String normalize(String value) {
    return Normalizer.normalize(value, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
  }

  private static Pattern identifierPattern(String value) {
    // Complete emails and long opaque IDs remain private inside a slug too.
    // Short learner IDs must not reject an unrelated longer ID (123 vs 12345).
    if (value.indexOf('@') >= 0 || value.length() >= 12) return Pattern.compile(Pattern.quote(value));
    return Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(value) + "(?![\\p{L}\\p{N}])");
  }

  private static Pattern fullNamePattern(User author) {
    if (author == null || author.getName() == null) return null;
    var words = Arrays.stream(normalize(author.getName()).split("[^\\p{L}\\p{N}]+"))
        .filter(word -> !word.isBlank()).toList();
    // A single display-name word is not evidence that a public URI is personal.
    if (words.size() < 2) return null;
    return Pattern.compile("(?<![\\p{L}\\p{N}])" + String.join("[^\\p{L}\\p{N}]+", words.stream().map(Pattern::quote).toList())
        + "(?![\\p{L}\\p{N}])");
  }

  private static void requirePublicSelector(String value, List<Pattern> privateIds, Pattern privateName) {
    if (value == null || value.isBlank()) throw unavailable();
    String candidate = value;
    for (int layer = 0; layer <= 2; layer++) {
      String normalized = normalize(candidate);
      if (privateIds.stream().anyMatch(pattern -> pattern.matcher(normalized).find())
          || privateName != null && privateName.matcher(normalized).find())
        throw failure("INCOMPATIBLE", "This indicator uses private selectors that cannot be reused anonymously.");
      if (layer == 2 || candidate.indexOf('%') < 0) break;
      // Decode only for detection. Preserve literal '+' and '%' in ordinary text;
      // the original selectors are never rewritten in the viewer's query.
      String decoded = URLDecoder.decode(candidate.replace("+", "%2B").replaceAll("%(?![0-9a-fA-F]{2})", "%25"), StandardCharsets.UTF_8);
      if (decoded.equals(candidate)) break;
      candidate = decoded;
    }
  }

  private static void requireFieldPath(String field, List<Pattern> privateIds, Pattern privateName) {
    if (field == null || field.length() > 500 || !FIELD_PATH.matcher(field).matches()) throw unavailable();
    // Canonical xAPI keys are schema, even if an actor happens to be called Name
    // or has the identifier 'name'. Custom paths still cannot carry private IDs.
    if (STANDARD_FIELDS.contains(field)) return;
    var language = LANGUAGE_FIELD.matcher(field);
    if (language.matches()) {
      String tag = language.group(1).replace('_', '-').toLowerCase(Locale.ROOT), prefix = tag;
      while (!KNOWN_LANGUAGE_TAGS.contains(prefix) && prefix.contains("-"))
        prefix = prefix.substring(0, prefix.lastIndexOf('-'));
      // Only a recognized locale is schema. Private/custom variant suffixes
      // are still checked, without treating the ordinary language 'en' as an ID.
      String custom = KNOWN_LANGUAGE_TAGS.contains(prefix) ? language.group(1).substring(prefix.length()) : language.group(1);
      if (!custom.isBlank()) requirePublicSelector(custom, privateIds, privateName);
      return;
    }
    requirePublicSelector(field, privateIds, privateName);
  }

  private static void requireDate(String value) {
    if (value == null || value.length() > 40 || !value.matches("[0-9TtZz:+. -]+")) throw invalidTimeframe();
    try {
      if (value.length() == 10) LocalDate.parse(value);
      else {
        String iso = value.replace(' ', 'T');
        try { OffsetDateTime.parse(iso); }
        catch (DateTimeParseException noOffset) { LocalDateTime.parse(iso); }
      }
    } catch (DateTimeParseException invalid) { throw invalidTimeframe(); }
  }

  private static ValidationException invalidTimeframe() {
    return failure("INCOMPATIBLE", "This indicator has an invalid saved timeframe. Adapt it to choose valid dates.");
  }

  private Indicator copyBasic(Indicator source, User viewer, Map<String, LrsConsumer> bound, String id, String name) {
    Indicator copy = skeleton(source, viewer, id, name, Map.of());
    StatementsRequest query = gson.fromJson(source.getIndicatorQuery(), StatementsRequest.class);
    List<LrsStoresStatementRequest> stores = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    for (var original : query.getLrsStores()) if (seen.add(original.getLrsId())) {
      LrsConsumer consumer = bound.get(original.getLrsId());
      if (consumer == null) throw unavailable();
      stores.add(new LrsStoresStatementRequest(original.getLrsId(), consumer.getUniqueIdentifier()));
    }
    query.setLrsStores(stores);
    query.setUserQueryCondition(UserQueryCondition.ONLY_ME);
    copy.setIndicatorQuery(gson.toJson(query));
    copy.setConfigurationRequest(configuration(copy, List.of(), Map.of()));
    return copy;
  }

  private Indicator copyComplex(Indicator source, User viewer, List<Indicator> leaves, Map<String, String> targets) {
    Indicator root = skeleton(source, viewer, targets.get(source.getId()), CommunitySanitizer.publicName(source), targets);
    root.setColumnToMerge(safeColumn(source.getColumnToMerge()));
    List<IndicatorsToMerge> refs = new ArrayList<>();
    for (int index = 0; index < leaves.size(); index++) {
      var original = source.getIndicators().get(index);
      refs.add(new IndicatorsToMerge(leaves.get(index), safeColumn(original.getColumnToMerge()),
          original.getMeasureColumnIds() == null ? null : new ArrayList<>(original.getMeasureColumnIds()), "Source " + (index + 1)));
    }
    root.setIndicators(refs);
    return root;
  }

  private Indicator skeleton(Indicator source, User viewer, String id, String name, Map<String, String> targets) {
    Indicator copy = new Indicator();
    copy.setId(id); copy.setName(name); copy.setIndicatorType(source.getIndicatorType());
    copy.setCreatedBy(viewer); copy.setCreatedOn(LocalDateTime.now()); copy.setTimesExecuted(0);
    var vis = source.getVisualizationTechniqueReference();
    if (vis == null || vis.getVisLibrary() == null || vis.getVisType() == null || !vis.getVisLibrary().isEnabled() || !vis.getVisType().isEnabled()) throw failure("PLUGIN_UNAVAILABLE", "The required chart is currently unavailable.");
    copy.setVisualizationTechniqueReference(new VisualizationTechniqueReference(gson.toJson(CommunitySanitizer.visualizationParams(source)),
        safeMapping(vis.getAnalyticsTechniqueToVisualizationMapping(), targets), vis.getVisLibrary(), vis.getVisType()));
    var method = source.getAnalyticsTechniqueReference();
    if (source.getIndicatorType() != IndicatorType.COMPOSITE) {
      if (method == null || method.getAnalyticsTechnique() == null || !method.getAnalyticsTechnique().isEnabled()) throw failure("PLUGIN_UNAVAILABLE", "The required analytics method is currently unavailable.");
      List<OpenLAPDynamicParam> params = gson.fromJson(method.getAdditionalParams(), new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());
      List<Object> cleanParams = new ArrayList<>();
      for (var param : params == null ? List.<OpenLAPDynamicParam>of() : params) {
        if (param.getId() == null || !param.getId().equals(CommunitySanitizer.text(param.getId(), source.getCreatedBy(), "\u0000")))
          throw failure("INCOMPATIBLE", "A saved analytics parameter contains private content and cannot be shared safely.");
        Object value = param.getValue();
        var safe = com.google.gson.JsonParser.parseString(remap(gson.toJson(value), targets));
        requirePublicParameter(safe, source.getCreatedBy(), 0);
        Map<String, Object> clean = new LinkedHashMap<>(); clean.put("id", param.getId()); clean.put("value", gson.fromJson(safe, Object.class)); cleanParams.add(clean);
      }
      copy.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference(gson.toJson(cleanParams),
          safeMapping(method.getQueryToAnalyticsTechniqueMapping(), targets), method.getAnalyticsTechnique()));
    }
    return copy;
  }

  private static void requirePublicParameter(com.google.gson.JsonElement value, User author, int depth) {
    if (value == null || value.isJsonNull()) return;
    if (depth > 8 || value.toString().length() > 65_536) throw unavailable();
    if (value.isJsonPrimitive()) {
      var item = value.getAsJsonPrimitive();
      if (item.isString() && !item.getAsString().isBlank() && !item.getAsString().equals(CommunitySanitizer.text(item.getAsString(), author, "\u0000"))
          || item.isNumber() && !Double.isFinite(item.getAsDouble()))
        throw failure("INCOMPATIBLE", "A saved analytics parameter contains private content and cannot be shared safely.");
    } else if (value.isJsonArray()) {
      if (value.getAsJsonArray().size() > 100) throw unavailable();
      for (var child : value.getAsJsonArray()) requirePublicParameter(child, author, depth + 1);
    } else for (var item : value.getAsJsonObject().entrySet()) {
      if (!item.getKey().equals(CommunitySanitizer.text(item.getKey(), author, "\u0000")))
        throw failure("INCOMPATIBLE", "A saved analytics parameter contains private content and cannot be shared safely.");
      requirePublicParameter(item.getValue(), author, depth + 1);
    }
  }

  private String safeColumn(String json) {
    if (json == null) return null;
    var column = gson.fromJson(json, OpenLAPColumnConfigData.class);
    return gson.toJson(new OpenLAPColumnConfigData(column.getId(), column.getType(), column.isRequired(), "Matching column", ""));
  }

  private String safeMapping(String json, Map<String, String> targets) {
    var mapping = gson.fromJson(remap(json, targets), OpenLAPPortConfig.class);
    if (mapping == null || mapping.getMapping() == null) throw unavailable();
    List<OpenLAPPortMapping> ports = new ArrayList<>();
    for (var item : mapping.getMapping()) {
      if (item == null || item.getInputPort() == null || item.getOutputPort() == null) throw unavailable();
      var input = item.getInputPort(); var output = item.getOutputPort();
      ports.add(new OpenLAPPortMapping(new OpenLAPColumnConfigData(output.getId(), output.getType(), output.isRequired(), "Output", ""),
          new OpenLAPColumnConfigData(input.getId(), input.getType(), input.isRequired(), "Input", "")));
    }
    return gson.toJson(new OpenLAPPortConfig(new ArrayList<>(ports)));
  }

  /** Execute each (store, actor) pair independently, then union rows before the original method. */
  private OpenLAPDataSet personalData(StatementsRequest query) {
    OpenLAPDataSet result = null;
    for (var store : query.getLrsStores()) {
      StatementsRequest single = gson.fromJson(gson.toJson(query), StatementsRequest.class);
      single.setLrsStores(List.of(store));
      OpenLAPDataSet next = statements.findStatements(single);
      if (next == null || next.getColumns() == null || next.getColumns().isEmpty()) continue;
      if (result == null) result = gson.fromJson(gson.toJson(next), OpenLAPDataSet.class);
      else {
        if (!result.getColumns().keySet().equals(next.getColumns().keySet())) throw unavailable();
        for (String id : result.getColumns().keySet()) {
          var target = result.getColumns().get(id); var added = next.getColumns().get(id);
          if (target.getConfigurationData().getType() != added.getConfigurationData().getType()
              || target.getData() == null || added.getData() == null) throw unavailable();
          append(target, added);
        }
      }
    }
    requireData(result);
    return result;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static void append(OpenLAPDataColumn target, OpenLAPDataColumn added) { target.getData().addAll(added.getData()); }

  String remap(String json, Map<String, String> targets) {
    if (json == null) return null;
    String result = json;
    // Column identities are generated by the merger. Replace only their delimited identity prefix.
    for (var item : targets.entrySet()) result = result.replace("source_" + item.getKey() + "__", "source_" + item.getValue() + "__");
    return result;
  }

  private IndicatorAnalysisTechnique analysis(Indicator indicator) {
    var method = indicator.getAnalyticsTechniqueReference();
    List<OpenLAPDynamicParam> params = gson.fromJson(method.getAdditionalParams(), new TypeToken<List<OpenLAPDynamicParam>>() {}.getType());
    return new IndicatorAnalysisTechnique(method.getAnalyticsTechnique().getId(),
        gson.fromJson(method.getQueryToAnalyticsTechniqueMapping(), OpenLAPPortConfig.class), params == null ? List.of() : params);
  }

  private OpenLAPPortConfig visualizationMapping(Indicator indicator) {
    return gson.fromJson(indicator.getVisualizationTechniqueReference().getAnalyticsTechniqueToVisualizationMapping(), OpenLAPPortConfig.class);
  }

  private String configuration(Indicator root, List<Indicator> leaves, Map<String, OpenLAPDataSet> outputs) {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("schemaVersion", 1); result.put("type", root.getIndicatorType().name());
    var vis = root.getVisualizationTechniqueReference();
    Object mapping = gson.fromJson(vis.getAnalyticsTechniqueToVisualizationMapping(), Object.class);
    Object params = gson.fromJson(vis.getAdditionalParams(), Object.class);
    if (root.getIndicatorType() == IndicatorType.BASIC) {
      var query = gson.fromJson(root.getIndicatorQuery(), StatementsRequest.class);
      result.put("indicator", Map.of("indicatorName", root.getName(), "type", "BASIC"));
      result.put("dataset", Map.of("selectedLRSList", query.getLrsStores().stream().map(store -> Map.of("lrsId", store.getLrsId(), "uniqueIdentifier", store.getUniqueIdentifier(), "lrsTitle", "Connected Learning Record Store")).toList()));
      List<Object> filters = new ArrayList<>();
      for (int index = 0; index < query.getActivityTypes().size(); index++) {
        Map<String, Object> filter = new LinkedHashMap<>();
        String type = query.getActivityTypes().get(index);
        filter.put("id", "community-filter-" + index);
        filter.put("selectedActivityType", Map.of("id", type, "name", type));
        filter.put("selectedActionList", query.getActionOnActivities().stream().map(action -> Map.of("id", action, "name", action)).toList());
        List<Object> activities = new ArrayList<>();
        query.getActivities().forEach((key, values) -> values.forEach(value -> activities.add(Map.of("id", value, "queryId", key, "name", value))));
        filter.put("selectedActivityList", activities); filters.add(filter);
      }
      result.put("filters", Map.of("selectedUserFilter", "ONLY_ME", "selectedTime", Map.of("from", query.getDuration().getFrom(), "until", query.getDuration().getUntil()), "selectedActivities", filters));
      var method = analysis(root);
      result.put("analysis", Map.of("selectedAnalyticsMethod", Map.of("method", Map.of("id", method.getAnalyticsTechniqueId(), "name", root.getAnalyticsTechniqueReference().getAnalyticsTechnique().getName()), "mapping", method.getAnalyticsTechniqueMapping()), "params", method.getAnalyticsTechniqueParams()));
      result.put("visualization", Map.of("selectedLibrary", Map.of("id", vis.getVisLibrary().getId(), "name", vis.getVisLibrary().getName()), "selectedType", Map.of("id", vis.getVisType().getId(), "name", vis.getVisType().getName()), "mapping", mapping, "params", params));
      Map<String, Object> steps = new LinkedHashMap<>(); int step = 1;
      for (String key : List.of("dataset", "filters", "analysis", "visualization", "finalize")) steps.put(key, Map.of("locked", false, "openPanel", false, "step", String.valueOf(step++)));
      result.put("lockedStep", steps);
    } else {
      result.put("name", root.getName());
      List<Object> sources = new ArrayList<>();
      for (int index = 0; index < leaves.size(); index++) {
        Indicator leaf = leaves.get(index); var ref = root.getIndicators().get(index);
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", leaf.getId()); item.put("name", leaf.getName()); item.put("analyticsMethod", Map.of("id", leaf.getAnalyticsTechniqueReference().getAnalyticsTechnique().getId(), "name", leaf.getAnalyticsTechniqueReference().getAnalyticsTechnique().getName()));
        item.put("outputs", outputs.get(leaf.getId()).getColumnsConfigurationData());
        var key = gson.fromJson(ref.getColumnToMerge() == null ? root.getColumnToMerge() : ref.getColumnToMerge(), OpenLAPColumnConfigData.class);
        item.put("keyColumnId", key.getId()); item.put("measureColumnIds", ref.getMeasureColumnIds()); item.put("label", ref.getLabel());
        sources.add(item);
      }
      result.put("sources", sources);
      var method = root.getIndicatorType() == IndicatorType.MULTI_LEVEL ? analysis(root) : null;
      result.put("analysis", Map.of("methodId", method == null ? "" : method.getAnalyticsTechniqueId(), "mapping", method == null ? Map.of("mapping", List.of()) : method.getAnalyticsTechniqueMapping(), "params", method == null ? List.of() : method.getAnalyticsTechniqueParams()));
      result.put("visualization", Map.of("libraryId", vis.getVisLibrary().getId(), "typeId", vis.getVisType().getId(), "mapping", mapping, "params", params, "dataMode", visualizationMapping(root).getMapping().stream().anyMatch(port ->
          port.getOutputPort().getId().startsWith("combined_")) ? "combined" : "aligned"));
    }
    return gson.toJson(result);
  }

  static void requireData(OpenLAPDataSet data) {
    if (data == null || data.getColumns() == null || data.getColumns().isEmpty()
        || data.getColumns().values().stream().anyMatch(column -> column == null || column.getData() == null || column.getData().isEmpty()))
      throw failure("NO_DATA", "No matching data is available for your account with this indicator's filters.");
  }

  private String target(Map<String, String> ids, String original) {
    String value = ids == null ? null : ids.get(original);
    return value == null ? new org.bson.types.ObjectId().toHexString() : value;
  }

  String hash(Object value) {
    try {
      var node = mapper.valueToTree(value);
      return new com.openlap.analytics_module.drafts.IndicatorDraftConfiguration(mapper).hash(node);
    } catch (RuntimeException error) { throw unavailable(); }
  }

  static ValidationException failure(String status, String message) { return new ValidationException(status, message); }
  static ValidationException unavailable() { return failure("INCOMPATIBLE", "This indicator's saved configuration cannot currently be reused."); }
}
