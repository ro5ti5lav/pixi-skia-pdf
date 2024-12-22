import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    build: {
        target: 'esnext',
        outDir: 'dist'
    },
    server: {
        port: 3000
    },
    optimizeDeps: {
        exclude: ['canvaskit-wasm'],
        include: ['jspdf']
    }
}); 