/** 从 LogicFlow 节点/连线的 text 字段解析展示文案 */
export function logicFlowTextLabel(text: unknown): string {
	if (typeof text === 'string') return text.trim();
	if (text && typeof text === 'object' && 'value' in text) {
		return String((text as { value: unknown }).value).trim();
	}
	return '';
}
