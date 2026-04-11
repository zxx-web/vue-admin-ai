import axios from 'axios';
import { getActivePinia } from 'pinia';

const request = axios.create({
	baseURL: import.meta.env.VITE_API_BASE ?? '/api',
	timeout: 15000,
});

request.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('auth_token');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(err) => Promise.reject(err)
);

request.interceptors.response.use(
	(res) => res,
	async (err) => {
		const status = err.response?.status;
		if (status === 401) {
			const pinia = getActivePinia();
			if (pinia) {
				const { useAuthStore } = await import('@/stores/auth');
				useAuthStore().clearSession();
			} else {
				localStorage.removeItem('auth_token');
				localStorage.removeItem('auth_username');
				localStorage.removeItem('auth_role');
			}
			const { default: router } = await import('@/router');
			const path = router.currentRoute.value.path;
			if (path !== '/login') {
				router.replace({ name: 'login', query: { redirect: path } });
			}
		}
		return Promise.reject(err);
	}
);

export default request;
