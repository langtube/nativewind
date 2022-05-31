// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "tailwindcss-react-native",
  tagline: "",
  url: "https://tailwindcss-react-native.vercel.app/",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "marklawlor", // Usually your GitHub org/user name.
  projectName: "tailwindcss-react-native", // Usually your repo name.

  clientModules: [
    require.resolve("./vendor/remark-snackplayer/snackPlayerInitializer.js"),
  ],
  scripts: [
    { src: "https://cdn.splitbee.io/sb.js", defer: true },
    { src: "https://snack.expo.dev/embed.js", defer: true },
  ],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/", // disable landing page
          sidebarPath: require.resolve("./sidebars.js"),
          remarkPlugins: [require("./vendor/remark-snackplayer")],
        },
        blog: false,
        theme: {
          defaultMode: "dark",
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "tailwindcss-react-native",
        logo: {
          alt: "My Site Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            href: "https://github.com/marklawlor/tailwindcss-react-native",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "More",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/marklawlor/tailwindcss-react-native",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Mark Lawlor. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
