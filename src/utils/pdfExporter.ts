import { jsPDF } from 'jspdf/dist/jspdf.es.min.js';
import * as PIXI from 'pixi.js-legacy';
import { CanvasKit } from 'canvaskit-wasm';

export class PDFExporter {
    private canvasKit: CanvasKit;

    constructor(canvasKit: CanvasKit) {
        this.canvasKit = canvasKit;
    }

    public async exportToPDF(container: any): Promise<Uint8Array> {
        console.log('Starting PDF export');

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: [800, 600],
            putOnlyUsedFonts: true,
            compress: true
        });

        // Рисуем белый фон
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 800, 600, 'F');

        // Обходим все фигуры в контейнере
        container.children.forEach((child: any, index: number) => {
            if (child instanceof PIXI.Graphics) {
                console.log(`Processing graphics ${index}:`, child);
                const graphicsData = child.geometry.graphicsData;
                console.log('Graphics data:', graphicsData);

                graphicsData.forEach((data: any) => {
                    // Получаем цвет
                    const color = data.fillStyle.color;
                    console.log('Color:', color);

                    const r = (color >> 16) & 0xFF;
                    const g = (color >> 8) & 0xFF;
                    const b = color & 0xFF;
                    pdf.setFillColor(r, g, b);

                    // Получаем позицию
                    const x = child.position.x || 0;
                    const y = child.position.y || 0;
                    console.log('Position:', { x, y });

                    // Получаем форму и её тип
                    const shape = data.shape;
                    console.log('Shape:', shape);

                    // Рисуем в зависимости от типа фигуры
                    if (shape.type === 1) { // Прямоугольник
                        pdf.rect(
                            shape.x + x,
                            shape.y + y,
                            shape.width,
                            shape.height,
                            'F'
                        );
                    } else if (shape.type === 2) { // Круг
                        const radius = shape.radius;
                        const centerX = shape.x + x;
                        const centerY = shape.y + y;

                        // Рисуем круг как серию треугольников
                        const segments = 32;
                        for (let i = 0; i < segments; i++) {
                            const startAngle = (i / segments) * Math.PI * 2;
                            const endAngle = ((i + 1) / segments) * Math.PI * 2;

                            const x1 = centerX + Math.cos(startAngle) * radius;
                            const y1 = centerY + Math.sin(startAngle) * radius;
                            const x2 = centerX + Math.cos(endAngle) * radius;
                            const y2 = centerY + Math.sin(endAngle) * radius;

                            pdf.triangle(
                                centerX, centerY,
                                x1, y1,
                                x2, y2,
                                'F'
                            );
                        }
                    } else if (shape.type === 3) { // Овал
                        const centerX = shape.x + x;
                        const centerY = shape.y + y;
                        const radiusX = shape.width / 2;
                        const radiusY = shape.height / 2;

                        // Рисуем овал как серию треугольников
                        const segments = 32;
                        for (let i = 0; i < segments; i++) {
                            const startAngle = (i / segments) * Math.PI * 2;
                            const endAngle = ((i + 1) / segments) * Math.PI * 2;

                            const x1 = centerX + Math.cos(startAngle) * radiusX;
                            const y1 = centerY + Math.sin(startAngle) * radiusY;
                            const x2 = centerX + Math.cos(endAngle) * radiusX;
                            const y2 = centerY + Math.sin(endAngle) * radiusY;

                            pdf.triangle(
                                centerX, centerY,
                                x1, y1,
                                x2, y2,
                                'F'
                            );
                        }
                    } else if (shape.type === 0) { // Линия/полигон
                        const points = shape.points;
                        if (points && points.length >= 4) {
                            // Для линий используем setDrawColor и линию вместо треугольников
                            if (data.lineStyle) {
                                const lineColor = data.lineStyle.color;
                                const r = (lineColor >> 16) & 0xFF;
                                const g = (lineColor >> 8) & 0xFF;
                                const b = lineColor & 0xFF;

                                pdf.setDrawColor(r, g, b);
                                pdf.setLineWidth(data.lineStyle.width || 1);

                                // Рисуем линию
                                pdf.line(
                                    points[0] + x, points[1] + y,
                                    points[2] + x, points[3] + y
                                );
                            }
                        }
                    }
                });
            } else if (child instanceof PIXI.Sprite) {
                console.log('Processing sprite:', child);

                // Создаем временный canvas для рендеринга спрайта
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (ctx && child.texture.baseTexture.resource) {
                    const resource = child.texture.baseTexture.resource;
                    const img = (resource as any).source || resource;

                    // Устанавливаем размеры canvas с учетом масштаба спрайта
                    canvas.width = child.width;
                    canvas.height = child.height;

                    // Очищаем canvas
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Рисуем изображение с учетом масштаба
                    ctx.drawImage(
                        img,
                        0, 0,
                        img.width, img.height,
                        0, 0,
                        canvas.width, canvas.height
                    );

                    console.log('Sprite dimensions:', {
                        width: canvas.width,
                        height: canvas.height,
                        x: child.position.x,
                        y: child.position.y
                    });

                    try {
                        // Конвертируем canvas в base64 и добавляем в PDF
                        const imageData = canvas.toDataURL('image/png');
                        pdf.addImage(
                            imageData,
                            'PNG',
                            child.position.x - (canvas.width * child.anchor.x),
                            child.position.y - (canvas.height * child.anchor.y),
                            canvas.width,
                            canvas.height
                        );
                    } catch (error) {
                        console.error('Failed to add image to PDF:', error);
                    }
                } else {
                    console.error('Failed to get sprite context or source');
                }
            }
        });

        console.log('PDF generation complete');
        return new Uint8Array(pdf.output('arraybuffer'));
    }

    public getCanvasKit(): CanvasKit {
        return this.canvasKit;
    }
} 