import * as PIXI from 'pixi.js-legacy';

// Список путей к изображениям
const IMAGE_PATHS = [
    '/assets/image1.png',
    '/assets/image2.png',
    '/assets/image3.png',
    '/assets/image4.png',
    '/assets/image5.png',
    '/assets/image6.png',
    '/assets/image7.png',
    '/assets/image8.png',

];

export class AssetLoader {
    private static textures: PIXI.Texture[] = [];

    public static async loadAssets(): Promise<void> {
        try {
            const promises = IMAGE_PATHS.map(async path => {
                try {
                    const texture = await PIXI.Assets.load(path);
                    this.textures.push(texture);
                } catch (err) {
                    console.error(`Failed to load ${path}:`, err);
                }
            });

            await Promise.all(promises);
        } catch (err) {
            console.error('Asset loading failed:', err);
        }
    }

    public static getRandomTexture(): PIXI.Texture | null {
        if (this.textures.length === 0) return null;
        const index = Math.floor(Math.random() * this.textures.length);
        return this.textures[index];
    }
} 