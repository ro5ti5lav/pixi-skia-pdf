import * as PIXI from 'pixi.js-legacy';
import { PixiWrapper } from './PixiWrapper';
import { AssetLoader } from '../utils/assetLoader';

export class InteractionManager {
    private container: PIXI.Container;
    private interactiveObjects: Map<PIXI.DisplayObject, {
        onPointerDown?: (e: PIXI.FederatedPointerEvent) => void,
        onPointerUp?: (e: PIXI.FederatedPointerEvent) => void
    }> = new Map();

    constructor(private pixiWrapper: PixiWrapper) {
        this.container = pixiWrapper.getContainer();
        this.setupInteraction();
    }

    private setupInteraction(): void {
        // Кнопка добавления фигуры
        const addShapeBtn = document.getElementById('add-shape-btn') as HTMLButtonElement;
        if (addShapeBtn) {
            addShapeBtn.addEventListener('click', () => this.generateRandomShape());
        }

        // Добавляем обработчики событий на Skia канвас
        const skiaCanvas = this.pixiWrapper.getSkiaView();
        skiaCanvas.addEventListener('pointerdown', (e) => this.handlePointerEvent(e, 'pointerdown'));
        skiaCanvas.addEventListener('pointerup', (e) => this.handlePointerEvent(e, 'pointerup'));
    }

    private handlePointerEvent(e: PointerEvent, type: 'pointerdown' | 'pointerup'): void {
        // Получаем координаты относительно канваса
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Проверяем все интерактивные объекты
        for (const [object, handlers] of this.interactiveObjects) {
            if (this.isPointInObject(x, y, object)) {
                // Создаем событие в формате PIXI
                const pixiEvent = {
                    type,
                    global: { x, y },
                    target: object,
                    currentTarget: object,
                    stopPropagation: () => { },
                    preventDefault: () => { },
                    pointerId: e.pointerId,
                    width: e.width,
                    height: e.height,
                    isPrimary: e.isPrimary,
                    pointerType: e.pointerType,
                    pressure: e.pressure,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    screenX: e.screenX,
                    screenY: e.screenY,
                } as unknown as PIXI.FederatedPointerEvent;

                // Вызываем соответствующий обработчик
                if (type === 'pointerdown' && handlers.onPointerDown) {
                    handlers.onPointerDown(pixiEvent);
                } else if (type === 'pointerup' && handlers.onPointerUp) {
                    handlers.onPointerUp(pixiEvent);
                }
            }
        }
    }

    private isPointInObject(x: number, y: number, object: PIXI.DisplayObject): boolean {
        const bounds = object.getBounds();
        return x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }

    public addPointerEvents(
        object: PIXI.DisplayObject,
        onPointerDown?: (e: PIXI.FederatedPointerEvent) => void,
        onPointerUp?: (e: PIXI.FederatedPointerEvent) => void
    ): void {
        this.interactiveObjects.set(object, { onPointerDown, onPointerUp });
    }

    public removePointerEvents(object: PIXI.DisplayObject): void {
        this.interactiveObjects.delete(object);
    }

    private generateRandomShape(): void {
        console.log('Generating random shape');
        const shapeType = Math.floor(Math.random() * 7); // 0: rect, 1: circle, 2: line, 3: oval, 4: triangle, 5: diamond, 6: sprite

        if (shapeType === 6) {
            // Создаем спрайт
            const texture = AssetLoader.getRandomTexture();
            if (!texture) {
                console.warn('No texture available');
                return;
            }

            const sprite = new PIXI.Sprite(texture);
            const canvasWidth = this.pixiWrapper.getPixiView().width;
            const canvasHeight = this.pixiWrapper.getPixiView().height;

            // Устанавливаем размер спрайта
            const maxSize = Math.min(canvasWidth, canvasHeight) * 0.2;
            const scale = maxSize / Math.max(texture.width || 100, texture.height || 100);
            sprite.scale.set(scale);

            // Позиционируем спрайт в центре
            sprite.anchor.set(0.5);
            sprite.x = canvasWidth * Math.random();
            sprite.y = canvasHeight * Math.random();

            console.log('Adding sprite:', {
                texture: texture.valid,
                dimensions: { width: texture.width, height: texture.height },
                position: { x: sprite.x, y: sprite.y },
                scale
            });

            this.container.addChild(sprite);

            // Добавляем обработчики событий дл спрайта
            let isDragging = false;
            let dragStartPosition = { x: 0, y: 0 };
            let startPosition = { x: 0, y: 0 };

            this.pixiWrapper.addPointerEvents(
                sprite,
                (e) => {
                    isDragging = true;
                    sprite.alpha = 0.5;
                    dragStartPosition = { x: e.global.x, y: e.global.y };
                    startPosition = { x: sprite.x, y: sprite.y };
                },
                (e) => {
                    isDragging = false;
                    sprite.alpha = 1;
                }
            );

            // Добавляем обработчик движения
            sprite.eventMode = 'static';
            sprite.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
                if (isDragging) {
                    const newX = startPosition.x + (e.global.x - dragStartPosition.x);
                    const newY = startPosition.y + (e.global.y - dragStartPosition.y);
                    sprite.x = newX;
                    sprite.y = newY;
                }
            });

            // Добавляем стиль курсора
            sprite.cursor = 'pointer';
            sprite.eventMode = 'static';
        } else {
            const graphics = new PIXI.Graphics();
            const canvasWidth = this.pixiWrapper.getPixiView().width;
            const canvasHeight = this.pixiWrapper.getPixiView().height;

            // Размер фигуры
            const maxSize = Math.min(canvasWidth, canvasHeight) * 0.1;
            const size = Math.random() * maxSize + 20;

            // Случайный цвет
            const color = Math.floor(Math.random() * 0xFFFFFF);

            // Координаты
            const x = Math.random() * (canvasWidth - size);
            const y = Math.random() * (canvasHeight - size);

            graphics.beginFill(color);

            switch (shapeType) {
                case 0: // Прямоугольник
                    graphics.drawRect(x, y, size, size);
                    console.log('Adding rectangle:', { x, y, size, color });
                    break;
                case 1: // Круг
                    graphics.drawCircle(x + size / 2, y + size / 2, size / 2);
                    console.log('Adding circle:', { x, y, radius: size / 2, color });
                    break;
                case 2: // Линия
                    graphics.clear();
                    graphics.lineStyle(2, color);
                    graphics.moveTo(x, y);
                    graphics.lineTo(x + size, y + size);

                    // Сохраняем hitArea
                    graphics.hitArea = new PIXI.Rectangle(
                        Math.min(x, x + size),
                        Math.min(y, y + size),
                        Math.abs(size),
                        Math.abs(size)
                    );

                    console.log('Adding line:', { x1: x, y1: y, x2: x + size, y2: y + size, color });
                    break;
                case 3: // Овал
                    graphics.drawEllipse(x + size / 2, y + size / 2, size / 2, size / 3);
                    console.log('Adding oval:', { x, y, width: size, height: size * 0.66, color });
                    break;
                case 4: // Треугольник
                    graphics.moveTo(x + size / 2, y);
                    graphics.lineTo(x + size, y + size);
                    graphics.lineTo(x, y + size);
                    graphics.lineTo(x + size / 2, y);
                    console.log('Adding triangle:', { x, y, size, color });
                    break;
                case 5: // Ромб
                    graphics.moveTo(x + size / 2, y);
                    graphics.lineTo(x + size, y + size / 2);
                    graphics.lineTo(x + size / 2, y + size);
                    graphics.lineTo(x, y + size / 2);
                    graphics.lineTo(x + size / 2, y);
                    console.log('Adding diamond:', { x, y, size, color });
                    break;
            }

            graphics.endFill();
            this.container.addChild(graphics);

            // Добавляем обработчики событий для фигуры
            let isDragging = false;
            let dragStartPosition = { x: 0, y: 0 };
            let startPosition = { x: 0, y: 0 };

            this.pixiWrapper.addPointerEvents(
                graphics,
                (e) => {
                    isDragging = true;
                    dragStartPosition = { x: e.global.x, y: e.global.y };
                    startPosition = { x: graphics.x, y: graphics.y };

                    // Меняем цвет при нажатии
                    const newColor = Math.floor(Math.random() * 0xFFFFFF);
                    graphics.clear();
                    graphics.beginFill(newColor);

                    // Перерисовываем ту же фигуру с новым цветом
                    switch (shapeType) {
                        case 0: // Прямоугольник
                            graphics.drawRect(x, y, size, size);
                            break;
                        case 1: // Круг
                            graphics.drawCircle(x + size / 2, y + size / 2, size / 2);
                            break;
                        case 2: // Линия
                            graphics.clear();
                            graphics.lineStyle(2, newColor);
                            graphics.moveTo(x, y);
                            graphics.lineTo(x + size, y + size);
                            break;
                        case 3: // Овал
                            graphics.drawEllipse(x + size / 2, y + size / 2, size / 2, size / 3);
                            break;
                        case 4: // Треугольник
                            graphics.moveTo(x + size / 2, y);
                            graphics.lineTo(x + size, y + size);
                            graphics.lineTo(x, y + size);
                            graphics.lineTo(x + size / 2, y);
                            break;
                        case 5: // Ромб
                            graphics.moveTo(x + size / 2, y);
                            graphics.lineTo(x + size, y + size / 2);
                            graphics.lineTo(x + size / 2, y + size);
                            graphics.lineTo(x, y + size / 2);
                            graphics.lineTo(x + size / 2, y);
                            break;
                    }
                    graphics.endFill();
                },
                (e) => {
                    isDragging = false;
                }
            );

            // Добавляем обработчик движения
            graphics.eventMode = 'static';
            graphics.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
                if (isDragging) {
                    const newX = startPosition.x + (e.global.x - dragStartPosition.x);
                    const newY = startPosition.y + (e.global.y - dragStartPosition.y);
                    graphics.x = newX;
                    graphics.y = newY;
                }
            });

            // Добавляем стиль курсора
            graphics.cursor = 'pointer';
            graphics.eventMode = 'static';
        }

        console.log('Total children:', this.container.children.length);
    }
} 