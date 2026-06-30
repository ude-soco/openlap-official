package com.openlap.admin.audit;

/** Stable audit action names for security-sensitive admin operations. */
public final class AdminAuditActions {

  public static final String USER_UPDATE = "USER_UPDATE";
  public static final String USER_ROLES_UPDATE = "USER_ROLES_UPDATE";
  public static final String USER_STATUS_UPDATE = "USER_STATUS_UPDATE";
  public static final String VISUALIZATION_LIBRARY_STATUS_UPDATE =
      "VISUALIZATION_LIBRARY_STATUS_UPDATE";
  public static final String VISUALIZATION_TYPE_STATUS_UPDATE =
      "VISUALIZATION_TYPE_STATUS_UPDATE";
  public static final String ANALYTICS_METHOD_STATUS_UPDATE =
      "ANALYTICS_METHOD_STATUS_UPDATE";

  private AdminAuditActions() {}
}
