# Indicator Pool search

Open **Indicators → Indicator Pool**. Enter a phrase or a question and press **Search**. For example, try “How often do students play recorded lectures?” to find an indicator about watched videos. Results are ordered by relevance. An exact indicator name comes first in Basic search. The type, method and chart filters still apply.

Open **Advanced search** to choose a goal verb and describe your goal, question or desired indicator. One text field is enough. **Clear search** returns to browsing.

## Run semantic search locally

Start with the [local installation guide](../README.md#local-installation) for the application databases, backend and frontend.

1. Use a MongoDB instance that supports `$vectorSearch` and search-index management. To try this alongside the ordinary local databases, start a dedicated development instance with fresh volumes.

   ```sh
   docker run -d --name openlap-search-mongo \
     -p 127.0.0.1:27123:27017 \
     -v openlap-search-db:/data/db \
     -v openlap-search-index:/data/mongot \
     mongodb/mongodb-atlas-local@sha256:a58ea2c65424952e63beb56ebebb32a31f3ac3b13eb23c0b6e834c94388cec97
   ```

   If the primary MongoDB already supports vector search, you can use it directly by omitting `openlap.semantic-search.mongodb-uri` in the next step.

2. Start the backend with the semantic-search Maven profile and the runtime flag. This example uses the application databases from the local installation guide. Adjust those settings for your own installation.

   ```sh
   cd analyticsframework
   DJL_OFFLINE=true ALLOW_INSECURE_DEFAULTS=true \
   PORT=8090 WEBAPP_URL=http://localhost:5173 \
   MONGODB_PRIMARY_URI=mongodb://127.0.0.1:27017 OPENLAP_MONGODB_DB=openlap_v2 \
   MONGODB_SECONDARY_URI=mongodb://127.0.0.1:27017 LRS_MONGODB_DB=learninglocker_v2 \
   ./mvnw -Psemantic-search spring-boot:run \
     '-Dspring-boot.run.jvmArguments=-Dopenlap.semantic-search.enabled=true -Dopenlap.semantic-search.mongodb-uri=mongodb://127.0.0.1:27123/openlap_community_search?directConnection=true'
   ```

   Start the frontend as usual. Once the backend logs `Community indicator semantic search is ready.`, try a search against completed indicators in your pool. The API reports `searchMode: semantic` for a ranked response. If the model or index is unavailable, the pool labels the results as name matches. While browsing with no query, the pool uses the ordinary catalog.

The first time indexing or a search needs an embedding, Spring AI downloads the pinned English `intfloat/e5-small-v2` model and tokenizer from Hugging Face. Allow outbound HTTPS for that first download. OpenLAP verifies both checksums, then computes embeddings locally. Later runs can reuse the files offline.

When started from `analyticsframework/`, the backend uses `../artifacts/semantic-search/e5-small-v2` as its cache. To use another location, set `openlap.semantic-search.model-directory`. Previously downloaded `model.onnx` and `tokenizer.json` files in that directory are also recognized.

The backend image published from `main` with the `edge` tag includes the semantic-search runtime, model and tokenizer. Pull requests build and check the same variant. For a local container build, pass `--build-arg SEMANTIC_SEARCH=true` to the backend Dockerfile. The build verifies the pinned files and runs an offline ranking check on the packaged backend. The model card and MIT license are included under `/opt/models/e5-small-v2`.

To enable semantic search in a deployment, set `openlap.semantic-search.enabled=true`. The bundled model works offline on each backend replica. The database identity needs permission to create the derived collection, maintain its documents and indexes, and run aggregation queries.

Choose the MongoDB search engine for your installation.

- **Native vector index** (default, `openlap.semantic-search.engine=vector-index`). Use a MongoDB deployment with Vector Search. OpenLAP needs permission to list and create search indexes in the search database.
- **Exact scoring for a small pool** (`openlap.semantic-search.engine=mongo-aggregation`). Ordinary MongoDB can calculate cosine similarity directly from the stored embeddings. It scores each matching indicator, so choose a candidate limit appropriate to your installation. For example, edge can set `openlap.semantic-search.max-candidates=500`. The model, field weights and relevance ordering are the same in both modes.

After enabling either engine, search for a paraphrase of a completed indicator in a populated pool. Verify that the API response contains the expected indicator and `data.searchMode` is `semantic`.

## How results are ranked

OpenLAP encodes each available public field separately using Spring AI and `intfloat/e5-small-v2`. It combines the normalized field vectors using the weights below, then normalizes the result into one 384-dimensional vector per indicator.

| Public field | Weight |
| --- | ---: |
| Indicator name, activity types, actions | 4 each |
| Analytics method name, method description | 3 each |
| Chart type | 2 |
| Platform and specific activities | 1 each when public terms become available |

Platform and specific activity names currently have no approved public vocabulary. The indexer omits those fields. Indicator type is a filter. For a complex indicator, eligible Basic sources can supply public activity types and actions. Raw statements, LRS identities and creator details stay outside the vector collection.

Basic search encodes the entered text once. Advanced search combines the supplied goal, question and desired indicator into one query. MongoDB ranks eligible vectors by exact cosine similarity. This first version ranks the whole filtered pool, so the first results are the most relevant and later results can be weak matches.

Both engines store embeddings in `community_indicator_vectors_v1`. The native engine uses the `community_semantic_v1` vector index. The aggregation engine uses an ordinary index on the model version and filter fields. The backend periodically reconciles new, edited and removed indicators (every five minutes by default). The source catalog governs eligibility on every request. If the index cannot supply a complete filtered result or a displayed record has changed, that request falls back to name search. The default limit for exact ranking is 10,000 filtered candidates. Operators can tune `openlap.semantic-search.refresh-seconds` and `openlap.semantic-search.max-candidates` for their pool.

To test the encoder and ranking with the real model, run this from `analyticsframework/`. The tests use the same download and cache behavior as the backend.

```sh
DJL_OFFLINE=true ./mvnw -Psemantic-search \
  -Dopenlap.test.semantic-model=../artifacts/semantic-search/e5-small-v2 \
  -Dtest=E5CommunitySearchEncoderTest,CommunitySearchRankingEvaluationTest test
```
