package com.openlap.community;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class E5CommunitySearchEncoderTest {
    @Test
    void incompleteOrCorruptAssetsReportAnUnavailableEncoder(@TempDir Path directory) throws Exception {
        Files.writeString(directory.resolve("model.onnx"), "an incomplete download");
        var encoder = new E5CommunitySearchEncoder(directory);
        var error = assertThrows(IllegalStateException.class, () -> encoder.query("active learners"));
        assertTrue(error.getCause().getMessage().contains("Checksum mismatch"));
    }

    @Test
    @EnabledIfSystemProperty(named = "openlap.test.semantic-model", matches = ".+")
    void localModelProducesNormalizedDistinctEmbeddingsAndRanksParaphrases() throws Exception {
        var encoder = new E5CommunitySearchEncoder(Path.of(System.getProperty("openlap.test.semantic-model")));
        try {
            float[] query = encoder.query("How long do students watch instructional videos?");
            float[] watchTime = encoder.document("Minutes spent viewing lecture recordings");
            float[] grades = encoder.document("Assessment grades for completed quizzes");
            assertEquals(384, query.length);
            assertEquals(1, dot(query, query), 0.0001);
            assertEquals(1, dot(watchTime, watchTime), 0.0001);
            assertTrue(dot(query, watchTime) > dot(query, grades));
            assertFalse(java.util.Arrays.equals(query, encoder.document("How long do students watch instructional videos?")));
        } finally {
            encoder.close();
        }
    }

    private static double dot(float[] a, float[] b) {
        double sum = 0;
        for (int i = 0; i < a.length; i++) sum += a[i] * b[i];
        return sum;
    }
}
