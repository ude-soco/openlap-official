export function getUniqueValuesAndCounts(data) {
  const counts = {};
  for (const item of data) {
    if (counts[item]) {
      counts[item] += 1;
    } else {
      counts[item] = 1;
    }
  }
  return [Object.keys(counts), Object.values(counts)];
}

// properties in array of strings (keys to extract from object) e.g., ["id", "name"]
export function extractProperties(data, properties) {
  return data.map((item) => {
    let obj = {};
    properties.forEach((prop) => {
      if (item.hasOwnProperty(prop)) {
        obj[prop] = item[prop];
      }
    });
    return obj;
  });
}

export function compareSecondAttribute(obj1, obj2) {
  const attributeNames = Object.keys(obj1);
  if (attributeNames.length >= 2) {
    const secondAttributeName = attributeNames[1];
    return obj1[secondAttributeName] === obj2[secondAttributeName];
  }
  return false;
}
