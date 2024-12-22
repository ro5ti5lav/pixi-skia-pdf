declare global {
    interface Window {
        CanvasKitInit: any;
    }
}

export async function initCanvasKit() {
    // Загружаем скрипт
    await loadScript('https://unpkg.com/canvaskit-wasm@0.39.1/bin/canvaskit.js');

    // Инициализируем с поддержкой PDF
    return await window.CanvasKitInit({
        locateFile: (file: string) => `https://unpkg.com/canvaskit-wasm@0.39.1/bin/${file}`,
        pdf: true
    });
}

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
} 