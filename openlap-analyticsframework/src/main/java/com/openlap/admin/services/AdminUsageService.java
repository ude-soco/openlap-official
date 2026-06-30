package com.openlap.admin.services;

import com.openlap.admin.dto.AdminUsageResponse;

public interface AdminUsageService {

  /** Computes how often each visualization library/type and analytics method is used by indicators. */
  AdminUsageResponse getUsage();
}
