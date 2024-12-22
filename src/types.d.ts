declare module '*.wasm?url' {
    const url: string;
    export default url;
}

declare module 'jspdf/dist/jspdf.es.min.js' {
    export { jsPDF } from 'jspdf';
} 