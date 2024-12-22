import { PixiWrapper } from './core/PixiWrapper';
import { PDFExporter } from './utils/pdfExporter';
import { initCanvasKit } from './utils/canvaskit';
import { AssetLoader } from './utils/assetLoader';

let renderer: PixiWrapper;

async function main() {
    try {
        // Загружаем ассеты
        await AssetLoader.loadAssets();

        // Инициализируем CanvasKit
        const canvasKit = await initCanvasKit();

        // Получаем контейнеры для канвасов
        const pixiContainer = document.getElementById('canvas-container');
        const skiaContainer = document.getElementById('skia-container');

        if (!pixiContainer || !skiaContainer) {
            throw new Error('Canvas containers not found');
        }

        // Создаем рендерер
        renderer = await createRenderer(pixiContainer.clientWidth, 500, canvasKit);

        // Добавляем канвасы в контейнеры
        pixiContainer.appendChild(renderer.getPixiView());
        skiaContainer.appendChild(renderer.getSkiaView());

        // Настраиваем кнопки
        setupButtons();

    } catch (error) {
        console.error('Initialization failed:', error);
    }
}

function setupButtons() {
    const exportButton = document.getElementById('export-btn') as HTMLButtonElement;
    const addShapeButton = document.getElementById('add-shape-btn') as HTMLButtonElement;

    if (!exportButton || !addShapeButton) {
        throw new Error('Buttons not found');
    }

    exportButton.addEventListener('click', handleExport);
    addShapeButton.addEventListener('click', () => {
        // Логика добавления фигуры реализована в InteractionManager
    });
}

async function handleExport() {
    const exportButton = document.getElementById('export-btn') as HTMLButtonElement;
    try {
        exportButton.disabled = true;
        exportButton.textContent = 'Экспорт...';

        const pdfData = await renderer.exportToPDF();
        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.pdf';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Ошибка при экспорте PDF');
    } finally {
        exportButton.disabled = false;
        exportButton.textContent = 'Экспорт в PDF';
    }
}

async function createRenderer(width: number, height: number, canvasKit: any): Promise<PixiWrapper> {
    const pdfExporter = new PDFExporter(canvasKit);
    return new PixiWrapper(width, height, pdfExporter);
}

// Запускаем приложение после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => main());
} else {
    main();
} 