import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'element-plus/dist/index.css';

import App from './App.vue';
import router from './router';
import { useThemeStore } from '@/stores/theme';

import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

useThemeStore(pinia).initTheme();

app.mount('#app');
