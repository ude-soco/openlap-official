package com.openlap.community;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.openlap.community.CommunitySearchDocument.Field.*;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Small fixed relevance exercise, with one intended indicator per query and identical candidates in both runs. */
@EnabledIfSystemProperty(named = "openlap.test.semantic-model", matches = ".+")
class CommunitySearchRankingEvaluationTest {
    private static final List<CommunitySearchDocument> CORPUS = List.of(
            item("viewing", "Lecture playback duration", "video", "watched", "Summarize duration",
                    "Summarize elapsed time by category", "Bar chart"),
            item("finish", "Lecture recording completion", "video", "completed", "Calculate completion rate",
                    "Report the percentage of events marked complete", "Donut chart"),
            item("grades", "Quiz scores over time", "assessment", "answered", "Summarize numeric values",
                    "Average scores for each period", "Line chart"),
            item("attempts", "Quiz retries", "assessment", "attempted", "Count events by category",
                    "Count repeated attempts for each item", "Bar chart"),
            item("forums", "Discussion contributions", "forum", "posted", "Count events by category",
                    "Count contributions to each discussion thread", "Bar chart"),
            item("reading", "Course documents opened", "material", "accessed", "Count events by category",
                    "Count accesses to each resource", "Bar chart"),
            item("handin", "Homework hand-ins by week", "assignment", "submitted", "Count events over time",
                    "Count submissions in weekly intervals", "Line chart"),
            item("clusters", "Patterns of practice across modules", "exercise", "practised", "K-means clustering",
                    "Group observations with similar numerical feature values", "Scatter plot"));

    private record Judgement(String text, String target) {}
    private static final List<Judgement> QUERIES = List.of(
            new Judgement("How much time did learners spend watching lessons?", "viewing"),
            new Judgement("What share of viewers reached the end of a recording?", "finish"),
            new Judgement("Are learners' test marks improving?", "grades"),
            new Judgement("Which assessments did students try multiple times?", "attempts"),
            new Judgement("How many messages did each discussion receive?", "forums"),
            new Judgement("Which reading resources are people opening?", "reading"),
            new Judgement("When did students turn in their homework?", "handin"),
            new Judgement("Find groups of similar exercise behaviour", "clusters"),
            new Judgement(advanced("Monitor", "learner persistence", "Which quizzes need a second try?",
                    "A breakdown of repeat attempts"), "attempts"),
            new Judgement(advanced("Compare", "participation in online discussions", "Which topics got more replies?",
                    "A graph of activity in the class forum"), "forums"));

    @Test
    void compareWeightedPassagesWithConcatenation() throws Exception {
        var encoder = new E5CommunitySearchEncoder(Path.of(System.getProperty("openlap.test.semantic-model")));
        try {
            List<float[]> weighted = new ArrayList<>(), concatenated = new ArrayList<>();
            for (var doc : CORPUS) {
                weighted.add(doc.embed(encoder));
                concatenated.add(encoder.document(String.join(". ", doc.passages().values())));
            }
            double weightedMrr = 0, concatenatedMrr = 0;
            for (var query : QUERIES) {
                var vector = encoder.query(query.text());
                int weightedRank = rank(vector, weighted, query.target());
                int concatenatedRank = rank(vector, concatenated, query.target());
                System.out.printf("Target %s: weighted rank %d, concatenated rank %d%n", query.target(), weightedRank, concatenatedRank);
                weightedMrr += 1.0 / weightedRank;
                concatenatedMrr += 1.0 / concatenatedRank;
            }
            weightedMrr /= QUERIES.size();
            concatenatedMrr /= QUERIES.size();
            System.out.printf(Locale.ROOT, "MRR across %d synthetic queries: weighted %.3f, concatenated %.3f%n",
                    QUERIES.size(), weightedMrr, concatenatedMrr);
            // A smoke check for broken normalization, missing prefixes or a wrong model, rather than a claim of superiority.
            assertTrue(weightedMrr >= 0.65 && concatenatedMrr >= 0.65);
        } finally {
            encoder.close();
        }
    }

    private static int rank(float[] query, List<float[]> vectors, String target) {
        record Hit(String id, double score) {}
        var hits = new ArrayList<Hit>();
        for (int i = 0; i < vectors.size(); i++) {
            double score = 0;
            for (int j = 0; j < query.length; j++) score += (double) query[j] * vectors.get(i)[j];
            hits.add(new Hit(CORPUS.get(i).id(), score));
        }
        hits.sort(Comparator.comparingDouble(Hit::score).reversed().thenComparing(Hit::id));
        for (int i = 0; i < hits.size(); i++) if (hits.get(i).id().equals(target)) return i + 1;
        throw new IllegalArgumentException("Missing relevance judgement: " + target);
    }

    private static CommunitySearchDocument item(String id, String name, String type, String action, String method,
                                                 String description, String chart) {
        return new CommunitySearchDocument(id, "BASIC", method, chart, Map.of(NAME, name, ACTIVITY_TYPES, type,
                ACTIONS, action, METHOD_NAME, method, METHOD_DESCRIPTION, description, CHART, chart));
    }

    private static String advanced(String verb, String goal, String question, String description) {
        return new CommunitySearchRequest("advanced", null, verb, goal, question, description, null, null, null,
                null, null, null, null).embeddingText();
    }
}
