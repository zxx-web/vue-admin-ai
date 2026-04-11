import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
	const title = ref('Vue Admin AI');
	function setTitle(next: string) {
		title.value = next;
	}

	return { title, setTitle };
});
