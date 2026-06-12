package openlap.visualizer;

import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.exceptions.UnTransformableData;
import com.openlap.template.DataTransformer;
import com.openlap.template.model.TransformedData;

public class UploadFixtureDataTransformer implements DataTransformer {
  @Override
  public TransformedData<?> transformData(OpenLAPDataSet openLAPDataSet)
      throws UnTransformableData {
    TransformedData<String> transformedData = new TransformedData<>();
    transformedData.setData("ok");
    return transformedData;
  }
}
