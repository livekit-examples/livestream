import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";

export const generateName = (): string => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    style: "capital",
    separator: " ",
    length: 2,
  });
};
