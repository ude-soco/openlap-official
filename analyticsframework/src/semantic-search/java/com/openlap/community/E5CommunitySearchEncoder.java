package com.openlap.community;

import jakarta.annotation.PreDestroy;
import org.springframework.ai.transformers.ResourceCacheService;
import org.springframework.ai.transformers.TransformersEmbeddingModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;

/** The same pinned E5 model encodes public indicator fields and users' search queries. */
@Component
@ConditionalOnClass(name = "org.springframework.ai.transformers.TransformersEmbeddingModel")
@ConditionalOnProperty(name = "openlap.semantic-search.enabled", havingValue = "true")
class E5CommunitySearchEncoder implements CommunitySearchEncoder {
    private static final String E5_SOURCE = "https://huggingface.co/intfloat/e5-small-v2/resolve/"
            + "ffb93f3bd4047442299a41ebb6fa998a38507c52/";
    private static final String MODEL_SHA = "4b8205be2a3c5fc53c6534d76a2012064f7309c162b806f2889c6ec8ec4fdcba";
    private static final String TOKENIZER_SHA = "d241a60d5e8f04cc1b2b3e9ef7a4921b27bf526d9f6050ab90f9267a1f9e5c66";

    private final Path directory;
    private TransformersEmbeddingModel model;

    E5CommunitySearchEncoder(
            @Value("${openlap.semantic-search.model-directory:../artifacts/semantic-search/e5-small-v2}") Path directory) {
        this.directory = directory;
    }

    @Override
    public float[] document(String text) {
        return encode("passage: ", text);
    }

    @Override
    public float[] query(String text) {
        return encode("query: ", text);
    }

    private float[] encode(String prefix, String text) {
        if (text == null || text.isBlank()) throw new IllegalArgumentException("Search text is required");
        try {
            float[] vector = model().embed(prefix + text.strip());
            if (vector.length != DIMENSIONS) throw new IllegalStateException("Unexpected E5 vector dimensions");
            double squares = 0;
            for (float value : vector) squares += (double) value * value;
            double norm = Math.sqrt(squares);
            if (!Double.isFinite(norm) || norm == 0) throw new IllegalStateException("Invalid E5 vector");
            for (int i = 0; i < vector.length; i++) vector[i] /= norm;
            return vector;
        } catch (LinkageError error) {
            throw new IllegalStateException("Local semantic search runtime is unavailable", error);
        }
    }

    // Load on first use so an unavailable model cannot prevent ordinary browsing or sign-in.
    private synchronized TransformersEmbeddingModel model() {
        if (model != null) return model;
        TransformersEmbeddingModel candidate = new TransformersEmbeddingModel();
        try {
            candidate.setModelResource(verifiedResource(directory, new UrlResource(E5_SOURCE + "model.onnx"), MODEL_SHA));
            candidate.setTokenizerResource(verifiedResource(directory, new UrlResource(E5_SOURCE + "tokenizer.json"), TOKENIZER_SHA));
            candidate.setResourceCacheDirectory(directory.toString());
            candidate.setTokenizerOptions(Map.of("truncation", "true", "maxLength", "512", "padding", "false"));
            candidate.afterPropertiesSet();
            model = candidate;
            return model;
        } catch (Exception | LinkageError failure) {
            try {
                candidate.close();
            } catch (Exception closeFailure) {
                failure.addSuppressed(closeFailure);
            }
            throw new IllegalStateException("Local E5 model is unavailable. Check the model cache and connectivity to Hugging Face.", failure);
        }
    }

    static Resource verifiedResource(Path directory, Resource remote, String expected) throws IOException, NoSuchAlgorithmException {
        String name = Objects.requireNonNull(remote.getFilename());
        Path local = directory.resolve(name);
        // Earlier installations and pre-provisioned offline deployments supply these two files directly.
        boolean provided = Files.isRegularFile(local);
        Resource file = provided ? new FileSystemResource(local)
                : new ResourceCacheService(directory.toFile()).getCachedResource(remote);
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new DigestInputStream(file.getInputStream(), digest)) {
            input.transferTo(OutputStream.nullOutputStream());
        }
        if (!expected.equals(HexFormat.of().formatHex(digest.digest()))) {
            // An incomplete cache write can be retried by the indexer. Never remove a supplied file.
            if (!provided) Files.deleteIfExists(file.getFile().toPath());
            throw new IOException("Checksum mismatch for " + name);
        }
        return file;
    }

    @PreDestroy
    synchronized void close() throws Exception {
        if (model != null) model.close();
        model = null;
    }
}
