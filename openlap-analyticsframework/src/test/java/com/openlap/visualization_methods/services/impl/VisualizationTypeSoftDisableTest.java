package com.openlap.visualization_methods.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.openlap.visualization_methods.entities.VisLibrary;
import com.openlap.visualization_methods.entities.VisType;
import org.junit.Test;

/** A type is selectable in the editor only when both it and its parent library are enabled. */
public class VisualizationTypeSoftDisableTest {

  private static VisType type(Boolean typeEnabled, Boolean libEnabled, boolean withLib) {
    VisType type = new VisType();
    type.setName("chart");
    type.setImplementingClass("a.b.Chart");
    type.setEnabled(typeEnabled);
    if (withLib) {
      VisLibrary library = new VisLibrary();
      library.setName("lib");
      library.setEnabled(libEnabled);
      type.setVisualizationLib(library);
    }
    return type;
  }

  @Test
  public void selectableWhenTypeAndLibraryEnabled() {
    assertThat(VisualizationTypeServiceImpl.isTypeSelectable(type(true, true, true))).isTrue();
  }

  @Test
  public void legacyNullTypeAndLibraryTreatedAsSelectable() {
    assertThat(VisualizationTypeServiceImpl.isTypeSelectable(type(null, null, true))).isTrue();
  }

  @Test
  public void notSelectableWhenTypeDisabled() {
    assertThat(VisualizationTypeServiceImpl.isTypeSelectable(type(false, true, true))).isFalse();
  }

  @Test
  public void notSelectableWhenParentLibraryDisabled() {
    assertThat(VisualizationTypeServiceImpl.isTypeSelectable(type(true, false, true))).isFalse();
  }

  @Test
  public void notSelectableWhenNoParentLibrary() {
    assertThat(VisualizationTypeServiceImpl.isTypeSelectable(type(true, null, false))).isFalse();
  }
}
