import path from 'node:path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

function removeStyleEntryJs() {
  return {
    name: 'remove-style-entry-js',
    generateBundle(_, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName === 'assets/style.js' || fileName.startsWith('assets/style.js.')) {
          delete bundle[fileName];
        }
      }
    },
  };
}

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      path: 'path-browserify',
      url: 'url',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.DEBUG === '1',
    minify: process.env.DEBUG === '1' ? false : 'esbuild',
    rollupOptions: {
      input: {
        engine: path.resolve(__dirname, 'src/js/engine-entry.js'),
        extra: path.resolve(__dirname, 'src/js/extra.js'),
        style: path.resolve(__dirname, 'src/css/style-entry.css'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css' || assetInfo.name === 'style-entry.css') {
            return 'assets/style.css';
          }

          return 'assets/[name][extname]';
        },
      },
    },
  },
  plugins: [
    removeStyleEntryJs(),
    viteStaticCopy({
      targets: [
        { src: 'src/assets/*', dest: 'assets' },
        { src: 'src/robots.txt', dest: '.' },
        { src: 'src/html/index.html', dest: '.' },
        { src: 'src/html/privacy.html', dest: '.' },
        { src: 'src/html/contact.html', dest: '.' },
      ],
    }),
  ],
});
