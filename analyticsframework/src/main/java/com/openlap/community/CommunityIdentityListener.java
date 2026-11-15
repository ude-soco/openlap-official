package com.openlap.community;

import com.openlap.analytics_module.entities.Indicator;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import java.util.UUID;
import org.springframework.data.mongodb.core.mapping.event.*;
import org.springframework.stereotype.Component;

@Component
public class CommunityIdentityListener extends AbstractMongoEventListener<Object> {
  @Override public void onBeforeConvert(BeforeConvertEvent<Object> event) {
    if (event.getSource() instanceof Indicator source && source.getCommunityId() == null)
      source.setCommunityId(UUID.randomUUID().toString());
    if (event.getSource() instanceof IndicatorSpecificationCard source && source.getCommunityId() == null)
      source.setCommunityId(UUID.randomUUID().toString());
  }
  @Override public void onBeforeSave(BeforeSaveEvent<Object> event) {
    if (event.getSource() instanceof Indicator source) CommunityMetadata.populate(source, event.getDocument());
    if (event.getSource() instanceof IndicatorSpecificationCard source) CommunityMetadata.populate(source, event.getDocument());
  }
}
