# Indicator Pool search

Open **Indicators → Indicator Pool**. Enter a phrase or a question and press **Search**. For example, try “How often do students play recorded lectures?” to find an indicator about watched videos. Results are ordered by relevance. An exact indicator name comes first in Basic search. The type, method and chart filters still apply.

Open **Advanced search** to choose a goal verb and describe your goal, question or desired indicator. One text field is enough. **Clear search** returns to browsing.

## Run semantic search locally

1. Follow the [local installation guide](../README.md#local-installation) for the application databases, backend and frontend. From the repository root, download the pinned English E5 model and tokenizer. The helper verifies both checksums and stores the files under the Git-ignored `artifacts/semantic-search/e5-small-v2` directory.

   ```sh
   python3 scripts/prepare-semantic-model.py
   ```

2. Use a MongoDB instance that supports `$vectorSearch` and search-index management. To try this alongside the ordinary local databases, start a dedicated development instance with fresh volumes.

   ```sh
   docker run -d --name openlap-search-mongo \
     -p 127.0.0.1:27123:27017 \
     -v openlap-search-db:/data/db \
     -v openlap-search-index:/data/mongot \
     mongodb/mongodb-atlas-local@sha256:a58ea2c65424952e63beb56ebebb32a31f3ac3b13eb23c0b6e834c94388cec97
   ```

   If the primary MongoDB already supports vector search, you can use it directly by omitting `openlap.semantic-search.mongodb-uri` in the next step.

3. Start the backend with the semantic-search Maven profile and the runtime flag. This example uses the application databases from the local installation guide. Adjust those settings for your own installation.

   ```sh
   cd analyticsframework
   DJL_OFFLINE=true ALLOW_INSECURE_DEFAULTS=true \
   PORT=8090 WEBAPP_URL=http://localhost:5173 \
   MONGODB_PRIMARY_URI=mongodb://127.0.0.1:27017 OPENLAP_MONGODB_DB=openlap_v2 \
   MONGODB_SECONDARY_URI=mongodb://127.0.0.1:27017 LRS_MONGODB_DB=learninglocker_v2 \
   ./mvnw -Psemantic-search spring-boot:run \
     '-Dspring-boot.run.jvmArguments=-Dopenlap.semantic-search.enabled=true -Dopenlap.semantic-search.mongodb-uri=mongodb://127.0.0.1:27123/openlap_community_search?directConnection=true'
   ```

   Start the frontend as usual. Once the backend logs `Community indicator vector index is available.`, try a search against completed indicators in your pool. The API reports `searchMode: semantic` for a ranked response. If the model or index is unavailable, the pool labels the results as name matches. While browsing with no query, the pool uses the ordinary catalog.

For a container build, pass `--build-arg SEMANTIC_SEARCH=true` to the backend Dockerfile. Mount the verified model directory read-only, and point `openlap.semantic-search.model-directory` at it. Set the same runtime properties through Spring configuration. The model runs locally and requires no hosted embedding account. The database identity needs permission to create the derived collection, maintain its documents, list and create its search index, and query it.

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

The derived collection is `community_indicator_vectors_v1` and its vector index is `community_semantic_v1`. The backend periodically reconciles new, edited and removed indicators (every five minutes by default). The source catalog governs eligibility on every request. If the index cannot supply a complete filtered result or a displayed record has changed, that request falls back to name search. The default limit for exact ranking is 10,000 filtered candidates. Operators can tune `openlap.semantic-search.refresh-seconds` and `openlap.semantic-search.max-candidates` for their pool.

To run the offline encoder and ranking tests with the downloaded assets, run this from `analyticsframework/`.

```sh
DJL_OFFLINE=true ./mvnw -Psemantic-search \
  -Dopenlap.test.semantic-model=../artifacts/semantic-search/e5-small-v2 \
  -Dtest=E5CommunitySearchEncoderTest,CommunitySearchRankingEvaluationTest test
```
