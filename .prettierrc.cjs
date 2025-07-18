module.exports = {
  arrowParens: "always",
  htmlWhitespaceSensitivity: "css",
  bracketSameLine: false,
  bracketSpacing: true,
  printWidth: 80,
  proseWrap: "preserve",
  quoteProps: "as-needed",
  semi: true,
  tabWidth: 2,
  trailingComma: "es5",
  useTabs: false,
  overrides: [
    {
      files: ["*.html"],
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
    {
      files: ["*.css"],
      options: {
        tabWidth: 2,
        useTabs: false,
      },
    },
  ],
};
