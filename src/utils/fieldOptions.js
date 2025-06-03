// src/utils/fieldOptions.js
export const makeFieldOptions = (sampleRow) =>
  Object.keys(sampleRow)
    .filter((k) => k !== 'timestamp')          // skip the timestamp field
    .map((k) => ({
      label: k.replace(/_/g, ' '),            // pretty label for the dropdown
      value: k,                               // actual column name
    }));
