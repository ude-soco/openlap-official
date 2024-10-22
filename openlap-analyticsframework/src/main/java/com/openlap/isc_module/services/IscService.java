package com.openlap.isc_module.services;

import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.ISCResponse;
import com.openlap.isc_module.dto.response.IndicatorSpecificationCardResponse;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import org.springframework.data.domain.Page;

public interface IscService {
  void createIsc(HttpServletRequest request, @Valid IscRequest isc);

  Page<IndicatorSpecificationCardResponse> getAllMyISCs(
      HttpServletRequest request, int page, int size, String sortBy, String sortDirection);

  ISCResponse getISCById(String iscId);

  void deleteISCbyId(HttpServletRequest request, String iscId);

  void updateIsc(String iscId, @Valid IscRequest isc);
}
