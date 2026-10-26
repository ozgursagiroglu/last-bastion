import { App } from './app/app';

const root = document.getElementById('app');
if (!root) throw new Error('#app missing');
new App(root, window).start();
