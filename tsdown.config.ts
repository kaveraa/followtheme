import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { core: 'src/core.ts', react: 'src/react.tsx', vue: 'src/vue.ts' },
  format: 'esm',
  dts: true,
  clean: true,
  external: ['react', 'react/jsx-runtime', 'vue'],
});
