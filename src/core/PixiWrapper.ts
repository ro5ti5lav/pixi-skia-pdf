import * as PIXI from 'pixi.js-legacy';
import { PDFExporter } from '../utils/pdfExporter';
import { InteractionManager } from './InteractionManager';
import { SkiaRenderer } from './SkiaRenderer';

export class PixiWrapper {
    private pixiApp: PIXI.Application;
    private skiaCanvas: HTMLCanvasElement;
    private pdfExporter: PDFExporter;
    private interactionManager: InteractionManager;
    private skiaRenderer: SkiaRenderer;

    constructor(width: number, height: number, pdfExporter: PDFExporter) {
        this.pdfExporter = pdfExporter;

        // Создаем SkiaRenderer в первую очередь
        this.skiaRenderer = new SkiaRenderer(this.pdfExporter.getCanvasKit(), width, height);

        // Инициализация Pixi.js канваса
        this.pixiApp = new PIXI.Application({
            width,
            height,
            backgroundColor: 0xE0E0E0,
            eventMode: 'static',
            forceCanvas: true,
            backgroundAlpha: 1
        });

        // Инициализация Skia канваса
        this.skiaCanvas = document.createElement('canvas');
        this.skiaCanvas.width = width;
        this.skiaCanvas.height = height;
        this.skiaCanvas.style.backgroundColor = '#E0E0E0';
        this.skiaCanvas.style.cursor = 'default';

        // Создаем InteractionManager после инициализации всех компонентов
        this.interactionManager = new InteractionManager(this);

        // Настраиваем синхронизацию между канвасами в последнюю очередь
        this.setupSync();
    }

    private setupSync() {
        this.pixiApp.ticker.add(() => {
            this.syncToSkia();
        });
    }

    private syncToSkia(): void {
        const skiaCanvas = this.skiaRenderer.getSkiaCanvas();
        const canvasKit = this.skiaRenderer.getCanvasKit();

        // Используем тот же цвет фона, что и в PIXI
        skiaCanvas.clear(canvasKit.Color4f(0.878, 0.878, 0.878, 1.0));

        this.pixiApp.stage.children.forEach(child => {
            if (child instanceof PIXI.Graphics) {
                this.renderGraphicsToSkia(child);
            } else if (child instanceof PIXI.Sprite) {
                this.renderSpriteToSkia(child);
            }
        });

        this.skiaRenderer.flush();

        const resultCanvas = this.skiaRenderer.getCanvas();
        const ctx = this.skiaCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, this.skiaCanvas.width, this.skiaCanvas.height);
            ctx.drawImage(resultCanvas, 0, 0);
        }
    }

    private renderGraphicsToSkia(graphics: PIXI.Graphics): void {
        const transform = graphics.transform.worldTransform;
        const x = transform.tx;
        const y = transform.ty;

        graphics.geometry.graphicsData.forEach(data => {
            const shape = data.shape;
            const fillColor = data.fillStyle?.color;
            const lineColor = data.lineStyle?.color;
            const lineWidth = data.lineStyle?.width || 0;

            switch (shape.type) {
                case 0: // Line/polygon
                    if (shape.points && shape.points.length >= 4) {
                        const transformedPoints = [...shape.points];
                        for (let i = 0; i < transformedPoints.length; i += 2) {
                            transformedPoints[i] += x;
                            transformedPoints[i + 1] += y;
                        }
                        if (fillColor !== undefined) {
                            this.skiaRenderer.drawPath(transformedPoints, fillColor);
                        }
                        if (lineColor !== undefined && lineWidth > 0) {
                            this.skiaRenderer.setLineStyle(lineWidth, lineColor);
                            this.skiaRenderer.drawLine(transformedPoints, lineColor);
                        }
                    }
                    break;
                case 1: // Rectangle
                    this.skiaRenderer.drawRect(
                        shape.x + x, shape.y + y,
                        shape.width, shape.height,
                        fillColor || lineColor || 0
                    );
                    break;
                case 2: // Circle
                    this.skiaRenderer.drawCircle(
                        shape.x + x, shape.y + y,
                        shape.radius,
                        fillColor || lineColor || 0
                    );
                    break;
                case 3: // Oval
                    this.skiaRenderer.drawOval(
                        shape.x + x, shape.y + y,
                        shape.width, shape.height,
                        fillColor || lineColor || 0
                    );
                    break;
            }
        });
    }

    private renderSpriteToSkia(sprite: PIXI.Sprite): void {
        if (sprite.texture.baseTexture.resource) {
            const resource = sprite.texture.baseTexture.resource;
            const img = (resource as any).source || resource;

            const x = sprite.position.x - (sprite.width * sprite.anchor.x);
            const y = sprite.position.y - (sprite.height * sprite.anchor.y);

            this.skiaRenderer.drawImage(
                img,
                x,
                y,
                sprite.width,
                sprite.height
            );
        }
    }

    public getContainer(): PIXI.Container {
        return this.pixiApp.stage;
    }

    public async exportToPDF(): Promise<Uint8Array> {
        return await this.pdfExporter.exportToPDF(this.pixiApp.stage);
    }

    public destroy(): void {
        this.pixiApp.destroy(true);
    }

    public getPixiView(): HTMLCanvasElement {
        return this.pixiApp.view as HTMLCanvasElement;
    }

    public getSkiaView(): HTMLCanvasElement {
        return this.skiaCanvas;
    }

    public addPointerEvents(object: PIXI.DisplayObject,
        onPointerDown?: (e: PIXI.FederatedPointerEvent) => void,
        onPointerUp?: (e: PIXI.FederatedPointerEvent) => void): void {

        // Включаем интерактивность объекта
        object.eventMode = 'static';
        object.cursor = 'pointer';

        // Состояние перетаскивания
        let isDragging = false;
        let dragStartPosition = { x: 0, y: 0 };
        let startPosition = { x: 0, y: 0 };

        // Добавляем обработчики для PIXI канваса
        if (onPointerDown) {
            object.on('pointerdown', onPointerDown);
        }
        if (onPointerUp) {
            object.on('pointerup', onPointerUp);
        }

        // Добавляем обработчики для Skia канваса
        this.interactionManager.addPointerEvents(object, onPointerDown, onPointerUp);

        // Обработчики для перетаскивания в Skia канвасе
        this.skiaCanvas.addEventListener('mousedown', (e) => {
            const rect = this.skiaCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.isPointInObject(x, y, object)) {
                isDragging = true;
                dragStartPosition = { x: e.clientX, y: e.clientY };
                startPosition = { x: object.x, y: object.y };
                this.skiaCanvas.style.cursor = 'grabbing';
            }
        });

        this.skiaCanvas.addEventListener('mousemove', (e) => {
            const rect = this.skiaCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (isDragging) {
                // Обновляем позицию объекта
                const deltaX = e.clientX - dragStartPosition.x;
                const deltaY = e.clientY - dragStartPosition.y;
                object.x = startPosition.x + deltaX;
                object.y = startPosition.y + deltaY;

                // Обновляем курсор во время перетаскивания
                this.skiaCanvas.style.cursor = 'grabbing';
            } else if (this.isPointInObject(x, y, object)) {
                // Меняем курсор при наведении
                this.skiaCanvas.style.cursor = 'grab';
            } else {
                // Возвращаем обычный курсор
                this.skiaCanvas.style.cursor = 'default';
            }
        });

        this.skiaCanvas.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.skiaCanvas.style.cursor = 'grab';
            }
        });

        // Сброс перетаскивания при выходе за пределы канваса
        this.skiaCanvas.addEventListener('mouseleave', () => {
            isDragging = false;
            this.skiaCanvas.style.cursor = 'default';
        });
    }

    // Добавляем вспомогательный метод для проверки попадания точки в объект
    private isPointInObject(x: number, y: number, object: PIXI.DisplayObject): boolean {
        const bounds = object.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }
}