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
  public static final String CONTENT_CREATE = "CONTENT_CREATE";
  public static final String CONTENT_UPDATE = "CONTENT_UPDATE";
  public static final String CONTENT_PUBLISH = "CONTENT_PUBLISH";
  public static final String CONTENT_UNPUBLISH = "CONTENT_UNPUBLISH";
  public static final String CONTENT_TRASH = "CONTENT_TRASH";
  public static final String CONTENT_RESTORE = "CONTENT_RESTORE";
  public static final String PLUGIN_UPLOAD = "PLUGIN_UPLOAD";
  public static final String PLUGIN_INSPECT = "PLUGIN_INSPECT";
  public static final String PLUGIN_ACTIVATE = "PLUGIN_ACTIVATE";

  private AdminAuditActions() {}
}
