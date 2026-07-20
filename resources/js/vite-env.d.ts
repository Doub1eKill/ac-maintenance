/// <reference types="vite/client" />

// Alpine.js global type declaration for hybrid Blade+React mode
declare global {
    interface Window {
        Alpine: import('alpinejs').Alpine;
    }
}
