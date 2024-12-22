import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

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
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'assets', // Путь к папке в корне
                    dest: '.', // Папка в `dist`, куда копируются файлы
                },
            ],
        }),
    ],
}); 