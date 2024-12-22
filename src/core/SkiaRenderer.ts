import * as PIXI from 'pixi.js-legacy';
import { CanvasKit, Surface, Canvas, Paint } from 'canvaskit-wasm';
import { Matrix } from 'pixi.js-legacy';

export class SkiaRenderer {
    private surface: Surface;
    private canvas: Canvas;
    private paint: Paint;

    constructor(private canvasKit: CanvasKit, width: number, height: number) {
        // Create Skia surface
        this.surface = this.canvasKit.MakeSurface(width, height)!;
        this.canvas = this.surface.getCanvas();

        // Initialize paint object
        this.paint = new this.canvasKit.Paint();
        this.paint.setAntiAlias(true);
    }

    private setFillStyle(color: number): void {
        this.paint.setStyle(this.canvasKit.PaintStyle.Fill);
        this.paint.setColor(this.canvasKit.Color4f(
            ((color >> 16) & 0xFF) / 255,
            ((color >> 8) & 0xFF) / 255,
            (color & 0xFF) / 255,
            1.0
        ));
    }

    public drawRect(x: number, y: number, width: number, height: number, color: number | Paint): void {
        if (color instanceof this.canvasKit.Paint) {
            this.paint = color;
        } else {
            this.setFillStyle(color as number);
        }
        const rect = this.canvasKit.XYWHRect(x, y, width, height);
        this.canvas.drawRect(rect, this.paint);
    }

    public drawCircle(x: number, y: number, radius: number, color: number): void {
        this.setFillStyle(color);
        this.canvas.drawCircle(x, y, radius, this.paint);
    }

    public drawOval(x: number, y: number, width: number, height: number, color: number): void {
        this.setFillStyle(color);
        const rect = this.canvasKit.XYWHRect(x, y, width, height);
        const rrect = this.canvasKit.RRectXY(rect, width / 2, height / 2);
        this.canvas.drawRRect(rrect, this.paint);
    }

    public drawPath(points: number[], color: number): void {
        this.setFillStyle(color);
        const path = new this.canvasKit.Path();
        path.moveTo(points[0], points[1]);

        for (let i = 2; i < points.length; i += 2) {
            path.lineTo(points[i], points[i + 1]);
        }

        path.close();
        this.canvas.drawPath(path, this.paint);
        path.delete();
    }

    public drawImage(image: ImageBitmap | HTMLImageElement, x: number, y: number, width: number, height: number): void {
        // Создаем временный canvas для обработки изображения
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');

        if (ctx) {
            // Очищаем canvas
            ctx.clearRect(0, 0, width, height);

            try {
                // Рисуем изображение
                ctx.drawImage(image, 0, 0, width, height);

                // Получаем данные изображения
                const imageData = ctx.getImageData(0, 0, width, height);

                // Создаем Skia изображение
                const skImage = this.canvasKit.MakeImage({
                    width: width,
                    height: height,
                    alphaType: this.canvasKit.AlphaType.Unpremul, // Изменили на Unpremul
                    colorType: this.canvasKit.ColorType.RGBA_8888,
                    colorSpace: this.canvasKit.ColorSpace.SRGB
                }, imageData.data, width * 4);

                if (skImage) {
                    // Рисуем изображение с сохранением состояния
                    this.canvas.save();
                    this.canvas.drawImage(skImage, x, y);
                    this.canvas.restore();

                    // Освобождаем ресурсы
                    skImage.delete();
                }
            } catch (error) {
                console.error('Error drawing image:', error);
            }
        }
    }

    public flush(): void {
        this.surface.flush();
    }

    public destroy(): void {
        this.paint.delete();
        this.surface.delete();
    }

    public getCanvas(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = this.surface.width();
        canvas.height = this.surface.height();

        const ctx = canvas.getContext('2d');
        if (ctx) {
            const imageData = this.surface.makeImageSnapshot();
            const pixels = imageData.readPixels(0, 0, {
                width: canvas.width,
                height: canvas.height,
                colorType: this.canvasKit.ColorType.RGBA_8888,
                alphaType: this.canvasKit.AlphaType.Premul,
                colorSpace: this.canvasKit.ColorSpace.SRGB
            });
            if (pixels) {
                const imgData = new ImageData(
                    new Uint8ClampedArray(pixels.buffer),
                    canvas.width,
                    canvas.height
                );
                ctx.putImageData(imgData, 0, 0);
            }
        }
        return canvas;
    }

    public getCanvasKit(): CanvasKit {
        return this.canvasKit;
    }

    public getSkiaCanvas(): Canvas {
        return this.canvas;
    }

    public setLineStyle(width: number, color: number): void {
        this.paint.setStyle(this.canvasKit.PaintStyle.Stroke);
        this.paint.setStrokeWidth(width);
        this.paint.setColor(this.canvasKit.Color4f(
            ((color >> 16) & 0xFF) / 255,
            ((color >> 8) & 0xFF) / 255,
            (color & 0xFF) / 255,
            1.0
        ));
    }

    public drawLine(points: number[], color: number): void {
        this.paint.setStyle(this.canvasKit.PaintStyle.Stroke);

        const path = new this.canvasKit.Path();
        path.moveTo(points[0], points[1]);

        for (let i = 2; i < points.length; i += 2) {
            path.lineTo(points[i], points[i + 1]);
        }

        this.canvas.drawPath(path, this.paint);
        path.delete();
    }

    // Методы для трансформаций
    public setTransform(matrix: Matrix): void {
        this.canvas.save();
        this.canvas.concat([
            matrix.a, matrix.b,
            matrix.c, matrix.d,
            matrix.tx, matrix.ty
        ]);
    }

    public resetTransform(): void {
        this.canvas.restore();
    }

    // Методы для градиентов
    public createLinearGradient(x0: number, y0: number, x1: number, y1: number, colors: number[], stops: number[]): Paint {
        const colorObjects = colors.map(color => this.canvasKit.Color4f(
            ((color >> 16) & 0xFF) / 255,
            ((color >> 8) & 0xFF) / 255,
            (color & 0xFF) / 255,
            1.0
        ));

        const shader = this.canvasKit.Shader.MakeLinearGradient(
            [x0, y0],
            [x1, y1],
            colorObjects,
            stops,
            this.canvasKit.TileMode.Clamp
        );

        const paint = new this.canvasKit.Paint();
        paint.setShader(shader);
        return paint;
    }

    public createRadialGradient(x: number, y: number, r0: number, r1: number, colors: number[], stops: number[]): Paint {
        const colorObjects = colors.map(color => this.canvasKit.Color4f(
            ((color >> 16) & 0xFF) / 255,
            ((color >> 8) & 0xFF) / 255,
            (color & 0xFF) / 255,
            1.0
        ));

        const shader = this.canvasKit.Shader.MakeRadialGradient(
            [x, y],
            r1,
            colorObjects,
            stops,
            this.canvasKit.TileMode.Clamp
        );

        const paint = new this.canvasKit.Paint();
        paint.setShader(shader);
        return paint;
    }
} 