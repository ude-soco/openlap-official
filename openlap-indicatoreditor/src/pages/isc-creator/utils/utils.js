/**
 * The function scrolls the window to the top with a smooth animation.
 */
export const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

/**
 * The function calculates the time difference between a given date and the current time and returns a
 * formatted string indicating how long ago the date was.
 * @param lastUpdate - The parameter `lastUpdate` is a string representing a date and time in ISO
 * format (e.g. "2021-10-15T14:30:00Z").
 * @returns a formatted string representing the time difference between the current time and a given
 * last update time. The string is in the format of "X days/hours/minutes ago".
 */
export const getLastUpdateDate = (lastUpdate) => {
  const lastUpdateTime = new Date(lastUpdate);
  const currentTime = new Date();

  const timeDifference = currentTime.getTime() - lastUpdateTime.getTime();

  // Calculate the time difference in minutes, hours, and days
  const minutes = Math.floor(timeDifference / (1000 * 60));
  const hours = Math.floor(timeDifference / (1000 * 60 * 60));
  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  let formattedTime;

  if (days > 0) {
    formattedTime = days === 1 ? "1 day ago" : `${days} days ago`;
  } else if (hours > 0) {
    formattedTime = hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else {
    formattedTime =
      minutes <= 0
        ? "0 minute ago"
        : minutes === 1
        ? "1 minute ago"
        : `${minutes} minutes ago`;
  }

  return formattedTime;
};

/**
 * The function takes a string and returns the same string with the first character capitalized.
 * @param name - The parameter "name" is a string representing a name or word that needs to have its
 * first character capitalized.
 */
export const toFirstCharUppercase = (name) =>
  name.charAt(0).toUpperCase() + name.slice(1);

/**
 * The function cleans and formats input data by removing slashes, replacing underscores and periods
 * with hyphens, removing spaces and empty strings, and returning the last non-empty string.
 * @param inputData - The inputData parameter is a string that may contain slashes, backslashes,
 * underscores, and periods.
 * @returns the last element of an array of strings that has undergone several transformations.
 * Specifically, the input string is first modified to replace forward slashes and backslashes with
 * spaces, underscores and periods with hyphens, and then split into an array of strings using spaces
 * as the delimiter. Finally, any empty strings in the array are removed and the last element of the
 * resulting array is returned.
 */
export const cleaningResponseData = (inputData) => {
  const removeSlashes = inputData.replace(/\\|\//g, " ");
  const replaceUnderscores = removeSlashes.replace(/_|\./g, "-");
  const removeSpaces = replaceUnderscores.split(" ");
  const removeEmptyStrings = removeSpaces.filter(Boolean);
  return removeEmptyStrings[removeEmptyStrings.length - 1];
};

/**
 * The function truncates a given input string to a maximum length of 76 characters and adds ellipsis
 * at the end if necessary.
 * @param input - The input parameter is a string that represents the text that needs to be truncated
 * if its length is greater than 76 characters.
 * @returns If the length of the input is greater than 76 characters, the function will return the
 * first 76 characters of the input followed by an ellipsis (...). If the length of the input is 76
 * characters or less, the function will return the input as is.
 */
export function truncate(input) {
  if (input.length > 76) {
    return input.substring(0, 76) + "...";
  }
  return input;
}

/* The `export const activities` statement is creating an array of objects that represent different
activities offered by a group or organization. Each object has three properties: `img`,
`description`, and `buttonLabel`. These properties provide information about the activity, such as
an image representing the activity, a description of what the activity entails, and a label for a
button that can be clicked to access more information about the activity. This array can be imported
and used in other parts of the codebase. */
export const activities = [
  {
    img: "/img/soco-thesis.jpg",
    description:
      "We offer interesting Bachelor‘s and Master‘s thesis projects in the fields of social computing, data science, and learning technologies.",
    buttonLabel: "Open Thesis",
  },
  {
    img: "/img/soco-courses.jpg",
    description:
      "We offer lectures, seminars, and practical courses in learning technologies, web technologies, data science and visual analytics.",
    buttonLabel: "Details",
  },
  {
    img: "/img/soco-research.jpg",
    description:
      "We conduct applied research into intelligent data-intensive systems and their application in social media and technology-enhanced learning.",
    buttonLabel: "Details",
  },
];
