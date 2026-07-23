import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    globals: true,
    passWithNoTests: true,
    server: {
      deps: {
        inline: [/supabase/],
      },
    },
  },
  resolve: {
    alias: {
      '@': '.',
      'react-native': path.resolve(__dirname, './__mocks__/react-native.ts'),
      'react-native-svg': path.resolve(__dirname, './__mocks__/react-native-svg.ts'),
      '@react-native-community/datetimepicker': path.resolve(
        __dirname,
        './__mocks__/@react-native-community/datetimepicker.ts',
      ),
    },
  },
});
