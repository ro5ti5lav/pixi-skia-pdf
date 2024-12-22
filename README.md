# Pixi Skia PDF Editor

A web application for generating and exporting graphics to PDF using Pixi.js and Skia.

## Features

- Dual canvas rendering (PIXI.js and Skia)
- PDF export support
- Interactive shapes and sprites:
  - Drag and drop functionality in both canvases
  - Color change on click for shapes
  - Opacity change on drag for sprites
  - Cursor feedback (pointer/grab/grabbing)
  - Synchronized interactions between canvases
- Support for various shapes:
  - Rectangles
  - Circles
  - Lines
  - Ovals
  - Triangles
  - Diamonds
- Sprite support with image loading


## Technologies

- Pixi.js - 2D rendering engine
- Skia/CanvasKit - Graphics library
- jsPDF - PDF generation
- TypeScript - Programming language
- Vite - Build tool

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository: 
it clone https://github.com/yourusername/pixi-skia-pdf.git
cd pixi-skia-pdf

2. Install dependencies:
npm install

3. Add your PNG images to the `public/assets` directory

4. Start the development server:
npm run dev

## Usage

1. Click "Generate random shape/line" to add shapes to the canvas
2. Use the "Export to PDF" button to save the current canvas state as a PDF file