const getLastWordAndCapitalize = (url) => {
  // Split the URL by '/' and get the last segment
  const segments = url.split("/");
  const lastSegment = segments.pop();

  // Capitalize the first letter of the last segment
  const capitalized =
    lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);

  return capitalized;
};

export { getLastWordAndCapitalize };
