package com.openlap.isc_module.entities;

/**
 * Lifecycle status of an Indicator Specification Card.
 *
 * <p>{@code DRAFT} — a work-in-progress ISC (a new draft, or an edit draft of a saved ISC; the
 * latter carries a non-null {@code sourceId}). {@code SAVED} — a finalized, published ISC.
 *
 * <p>Backward compatibility: documents persisted before this field existed have no status. Such
 * rows are treated as {@link #SAVED} at read time (see {@code IscServiceImpl}).
 */
public enum IscStatus {
  DRAFT,
  SAVED
}
