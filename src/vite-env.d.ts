/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE?: string;
	/** 为 true 时使用本地 Mock 登录（admin / admin123），不请求真实接口 */
	readonly VITE_MOCK_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
