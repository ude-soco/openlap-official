package com.openlap.community;

/** Search embeddings are L2-normalized so weighted fields can be compared with cosine similarity. */
public interface CommunitySearchEncoder {
    String VERSION = "e5-small-v2-ffb93f3b-v1";
    int DIMENSIONS = 384;

    float[] document(String text);
    float[] query(String text);
}
