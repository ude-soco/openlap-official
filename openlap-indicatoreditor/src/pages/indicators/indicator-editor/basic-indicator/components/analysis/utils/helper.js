const fetchWithRetry = async (fetchFn, args = [], retries = 3, delay = 500) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetchFn(...args);

      // If the function returns a Response object, check status
      if (response?.status && response.status >= 500) {
        if (attempt < retries) {
          console.warn(
            `Server error (status ${response.status}), retrying... (${attempt}/${retries})`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        } else {
          throw new Error(
            `Failed after ${retries} retries (status ${response.status})`
          );
        }
      }

      return response; // success case
    } catch (err) {
      if (attempt < retries) {
        console.warn(`Request failed, retrying... (${attempt}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
};

export default fetchWithRetry;
