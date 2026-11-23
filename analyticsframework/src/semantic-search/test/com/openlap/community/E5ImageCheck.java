package com.openlap.community;

import java.nio.file.Path;

/** Runs with the packaged backend on its runtime JVM, with network access disabled. */
public final class E5ImageCheck {
    public static void main(String[] args) throws Exception {
        Path directory = Path.of(System.getenv("OPENLAP_SEMANTICSEARCH_MODELDIRECTORY"));
        E5CommunitySearchEncoder encoder = new E5CommunitySearchEncoder(directory);
        try {
            float[] query = encoder.query("How long do students watch instructional videos?");
            float[] related = encoder.document("Minutes spent viewing lecture recordings");
            float[] unrelated = encoder.document("Assessment grades for completed quizzes");
            if (!(dot(query, related) > dot(query, unrelated))) {
                throw new IllegalStateException("Packaged E5 model failed the offline ranking check");
            }
        } finally {
            encoder.close();
        }
        System.out.println("Packaged E5 model passed offline inference.");
    }

    private static double dot(float[] left, float[] right) {
        double sum = 0;
        for (int i = 0; i < left.length; i++) sum += left[i] * right[i];
        return sum;
    }
}
