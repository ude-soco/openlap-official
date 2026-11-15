package com.openlap.community;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

/** Expired preview proofs must not leave invisible half-copies or hold a user's copy slot forever. */
@Configuration
@EnableScheduling
public class CommunityCopyRecovery {
  private final CommunityPreviewStore receipts;
  private final CommunityIndicatorService service;
  private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(CommunityCopyRecovery.class);
  public CommunityCopyRecovery(CommunityPreviewStore receipts, CommunityIndicatorService service) {
    this.receipts = receipts; this.service = service;
  }
  @Scheduled(initialDelay = 60_000, fixedDelay = 60_000)
  public void recoverExpired() {
    try {
      for (var claim : receipts.expiredClaims()) {
        try { service.cleanup(claim); }
        catch (RuntimeException error) { LOG.warn("A protected community copy still needs recovery; its incomplete parent remains hidden."); }
      }
    } catch (RuntimeException error) { LOG.warn("Community copy recovery is temporarily unavailable; it will retry."); }
  }
}
