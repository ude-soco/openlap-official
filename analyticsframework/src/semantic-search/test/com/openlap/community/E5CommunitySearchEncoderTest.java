package com.openlap.community;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class E5CommunitySearchEncoderTest {
    @Test
    void rejectsAndPreservesCorruptOperatorProvidedFile(@TempDir Path directory) throws Exception {
        Path model = directory.resolve("model.onnx");
        Files.writeString(model, "an incomplete download");
        var encoder = new E5CommunitySearchEncoder(directory);
        var error = assertThrows(IllegalStateException.class, () -> encoder.query("active learners"));
        assertTrue(error.getCause().getMessage().contains("Checksum mismatch"));
        assertEquals("an incomplete download", Files.readString(model));
    }

    @Test
    void coldCacheDownloadsOnceAndRepairsCorruptEntriesOnRetry(@TempDir Path directory) throws Exception {
        byte[] bytes = "model fixture".getBytes(StandardCharsets.UTF_8);
        String checksum = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        Resource remote = mock(Resource.class);
        when(remote.getFilename()).thenReturn("model.onnx");
        when(remote.getURI()).thenReturn(URI.create("https://example.invalid/pinned-revision/model.onnx"));
        when(remote.getInputStream()).thenAnswer(invocation -> new ByteArrayInputStream(bytes));

        Resource cached = E5CommunitySearchEncoder.verifiedResource(directory, remote, checksum);
        Path file = cached.getFile().toPath();
        assertTrue(file.startsWith(directory));
        assertArrayEquals(bytes, Files.readAllBytes(file));

        Resource reused = E5CommunitySearchEncoder.verifiedResource(directory, remote, checksum);
        assertEquals(file, reused.getFile().toPath());
        verify(remote, times(1)).getInputStream();

        Files.writeString(file, "partial contents");
        assertThrows(IOException.class, () -> E5CommunitySearchEncoder.verifiedResource(directory, remote, checksum));
        assertFalse(Files.exists(file));
        Resource repaired = E5CommunitySearchEncoder.verifiedResource(directory, remote, checksum);
        assertArrayEquals(bytes, Files.readAllBytes(repaired.getFile().toPath()));
        verify(remote, times(2)).getInputStream();
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
