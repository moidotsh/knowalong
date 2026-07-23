// babel.config.js
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Support for importing SVG files as strings.
      'babel-plugin-inline-import',
      [
        'transform-inline-environment-variables',
        {
          include: 'TAMAGUI_TARGET',
        },
      ],
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: true,
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@components': './components',
            '@hooks': './hooks',
            '@stores': './stores',
            '@utils': './utils',
            '@shared': './shared',
          },
        },
      ],
    ],
  };
};
