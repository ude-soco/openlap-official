package com.openlap.plugins.visualization;

import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.bson.Document;
import org.junit.jupiter.api.Test;

class VisualizationCustomizationTest {
  Document control(String id,String type,Object value) { return new Document("id",id).append("label",id).append("type",type).append("group","elements").append("defaultValue",value); }
  Document descriptor(Document... controls) { return new Document("customizations",Arrays.asList(controls)); }
  @Test void legacyParametersArePassedThroughUnchanged() { Map<String,Object> values=Map.of("legacyCustomKey","value");assertThat(VisualizationCustomization.validate(null,values)).isSameAs(values); }
  @Test void suppliesDefaultsAndPreservesExplicitValuesAndDimensions() {
    Document descriptor=descriptor(control("title","text","Default"),control("enabled","boolean",true));
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("title","Custom","height",500))).containsEntry("title","Custom").containsEntry("enabled",true).containsEntry("height",500);
  }
  @Test void rejectsUnknownAndIllTypedValues() {
    Document descriptor=descriptor(control("enabled","boolean",true));
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("arbitraryCode","evil"))).hasMessageContaining("Unknown");
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("enabled","true"))).hasMessageContaining("Invalid value");
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("height",Double.NaN))).hasMessageContaining("dimensions");
  }
  @Test void checksNumericBoundsColorsAndDeclaredSelectValues() {
    Document number=control("size","number",10).append("min",1).append("max",100);
    Document color=control("fill","color","#123456");
    Document choice=control("mode","select","bars").append("options",List.of(new Document("value","bars").append("label","Bars")));
    Document descriptor=descriptor(number,color,choice);
    assertThat(VisualizationCustomization.validate(descriptor,Map.of())).containsEntry("size",10).containsEntry("mode","bars");
    for (Map<String,Object> invalid : List.of(Map.<String,Object>of("size",101),Map.<String,Object>of("fill","url(javascript:1)"),Map.<String,Object>of("mode","unknown")))
      assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,invalid)).hasMessageContaining("Invalid value");
  }
  @Test void hiddenControlsUseControllerDefaultsAndDoNotValidateInvisibleValues() {
    Document enabled=control("enabled","boolean",false);
    Document size=control("size","number",5).append("min",1)
        .append("visibleWhen",new Document("id","enabled").append("equals",true));
    Document descriptor=descriptor(enabled,size);
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("size","incomplete")))
        .containsEntry("enabled",false).doesNotContainKey("size");
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("enabled",true,"size","incomplete"))).hasMessageContaining("Invalid value");
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("unrecognized",true))).hasMessageContaining("Unknown");
  }
  @Test void numericStepsAndNativeColorInputsUseTheSameConstraintsAsTheEditor() {
    Document descriptor=descriptor(control("size","number",1.5).append("min",0.5).append("step",0.5),control("fill","color","#123456"));
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("size",2.0))).containsEntry("size",2.0);
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("size",1.2))).hasMessageContaining("Invalid value");
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("fill","#12345678"))).hasMessageContaining("Invalid value");
  }
  @Test void numericZeroAndNegativeZeroAreEqualForChoicesAndVisibility() {
    Document mode=control("mode","select",0).append("options",List.of(new Document("value",0).append("label","Zero")));
    Document title=control("title","text","Visible").append("visibleWhen",new Document("id","mode").append("equals",0));
    assertThat(VisualizationCustomization.validate(descriptor(mode,title),Map.of("mode",-0.0))).containsEntry("title","Visible");
  }
  @Test void dataDrivenControlsPreserveStableLabelsAndRejectInvalidOrRepeatedSelections() {
    Document descriptor=descriptor(control("hiddenCategories","categoryFilter",List.of()),
        control("seriesColors","seriesColors",List.of()).append("source","category"));
    var hidden=List.of("A.1", "$Example");
    var colors=List.of(Map.of("key","A.1","color","#123456"));
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("hiddenCategories",hidden,"seriesColors",colors)))
        .containsEntry("hiddenCategories",hidden).containsEntry("seriesColors",colors);
    for (Map<String,Object> invalid : List.of(
        Map.<String,Object>of("hiddenCategories", List.of("A", "A")),
        Map.<String,Object>of("hiddenCategories", List.of(12)),
        Map.<String,Object>of("seriesColors", List.of(Map.of("key","A","color","red"))),
        Map.<String,Object>of("seriesColors", List.of(colors.get(0), colors.get(0))))) {
      assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,invalid)).hasMessageContaining("Invalid value");
    }
  }
  @Test void declaredTextDimensionsFollowTheirOwnSchemaAndPreservePercentages() {
    Document descriptor=descriptor(control("width","text","100%"),control("height","text","auto"));
    assertThat(VisualizationCustomization.validate(descriptor,Map.of()))
        .containsEntry("width","100%").containsEntry("height","auto");
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("width","75%","height","50vh")))
        .containsEntry("width","75%").containsEntry("height","50vh");
    assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("width",100)))
        .hasMessageContaining("Invalid value");
  }
  @Test void declaredNumericDimensionDefaultsAndExplicitValuesUseTheSameRules() {
    Document descriptor=descriptor(control("width","number",0),control("height","number",0));
    assertThat(VisualizationCustomization.validate(descriptor,Map.of()))
        .containsEntry("width",0).containsEntry("height",0);
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("width",0,"height",0)))
        .containsEntry("width",0).containsEntry("height",0);
    Document bounded=descriptor(control("width","number",1).append("min",1));
    assertThatThrownBy(() -> VisualizationCustomization.validate(bounded,Map.of("width",0)))
        .hasMessageContaining("Invalid value");
  }
  @Test void undeclaredInternalDimensionsKeepTheirPositiveFiniteSizeBounds() {
    Document descriptor=descriptor(control("title","text","Chart"));
    assertThat(VisualizationCustomization.validate(descriptor,Map.of("width",500,"height",320)))
        .containsEntry("width",500).containsEntry("height",320);
    for(Object invalid:List.of("100%",0,-1,10001,Double.NaN,Double.POSITIVE_INFINITY)) {
      assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("width",invalid)))
          .hasMessageContaining("dimensions");
      assertThatThrownBy(() -> VisualizationCustomization.validate(descriptor,Map.of("height",invalid)))
          .hasMessageContaining("dimensions");
    }
  }
}
