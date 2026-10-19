import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 plugins:[react()],
 resolve:{alias:{'@':fileURLToPath(new URL('../../src',import.meta.url)),'@babel/runtime-corejs3/core-js-stable/map':fileURLToPath(new URL('../../src/shims/babel-runtime-map.ts',import.meta.url))},dedupe:['react','react-dom','react-router-dom']},
 cacheDir:'node_modules/.vite-avatar-preview',server:{port:9002,strictPort:true,host:'localhost'},
});
