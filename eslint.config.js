import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
	{ ignores: ['dist', 'node_modules', '*.d.ts', 'src/auto-imports.d.ts', 'src/components.d.ts'] },
	{
		languageOptions: {
			globals: globals.browser,
		},
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...pluginVue.configs['flat/recommended'],
	{
		files: ['**/*.vue'],
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				parser: tseslint.parser,
			},
		},
	},
	eslintConfigPrettier
);
