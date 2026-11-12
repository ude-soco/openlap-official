package com.openlap.analytics_statements.dtos;

import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.OpenLAPDataColumnException;
import java.util.ArrayList;

public class OpenLapDataConverter {

  OpenLAPDataColumn column;
  OpenLAPDataSet dataSet = new OpenLAPDataSet();

  /*
   * public OpenLapDataConverter(String ColumnId, OpenLAPColumnDataType type,
   * Boolean required, ArrayList data) throws OpenLAPDataColumnException {
   * this.column = new OpenLAPDataColumn(ColumnId, type, required);
   * this.column.setData(data); this.dataSet.addOpenLAPDataColumn(this.column); }
   */

  public void SetOpenLapDataColumn(
      String ColumnId,
      OpenLAPColumnDataType type,
      Boolean required,
      ArrayList data,
      String title,
      String desc)
      throws OpenLAPDataColumnException {
    this.column = new OpenLAPDataColumn(ColumnId, type, required, title, desc);
    this.column.setData(data);
    this.dataSet.addOpenLAPDataColumn(this.column);
  }

  public OpenLAPDataSet getDataSet() {
    return dataSet;
  }
}
