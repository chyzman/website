<script module lang="ts">
	export type SerializedRange = {
		startPath: number[];
		startOffset: number;
		endPath: number[];
		endOffset: number;
	};

	function nodePath(root: Node, node: Node): number[] {
		const path: number[] = [];
		let current: Node = node;
		while (current !== root) {
			const parent: Node | null = current.parentNode;
			if (!parent) return [];
			path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
			current = parent;
		}
		return path;
	}

	function resolvePath(root: Node, path: number[]): Node | null {
		let current: Node = root;
		for (const index of path) {
			const child: Node | undefined = current.childNodes[index];
			if (!child) return null;
			current = child;
		}
		return current;
	}

	function firstTextNode(node: Node): Text | null {
		if (node.nodeType === Node.TEXT_NODE) return node as Text;
		for (const child of node.childNodes) {
			const found = firstTextNode(child);
			if (found) return found;
		}
		return null;
	}

	function lastTextNode(node: Node): Text | null {
		if (node.nodeType === Node.TEXT_NODE) return node as Text;
		for (let i = node.childNodes.length - 1; i >= 0; i--) {
			const found = lastTextNode(node.childNodes[i]);
			if (found) return found;
		}
		return null;
	}

	export function serializeSelection(root: Element): SerializedRange | null {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
		const range = sel.getRangeAt(0).cloneRange();

		const rootRange = document.createRange();
		rootRange.selectNodeContents(root);
		if (range.compareBoundaryPoints(Range.START_TO_START, rootRange) < 0) {
			const text = firstTextNode(root);
			if (text) range.setStart(text, 0);
			else range.setStart(rootRange.startContainer, rootRange.startOffset);
		}
		if (range.compareBoundaryPoints(Range.END_TO_END, rootRange) > 0) {
			const text = lastTextNode(root);
			if (text) range.setEnd(text, text.length);
			else range.setEnd(rootRange.endContainer, rootRange.endOffset);
		}
		if (range.collapsed) return null;
		if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

		return {
			startPath: nodePath(root, range.startContainer),
			startOffset: range.startOffset,
			endPath: nodePath(root, range.endContainer),
			endOffset: range.endOffset
		};
	}

	type RectWithBlock = { rect: DOMRect; block: Element };

	function nearestBlock(node: Node): Element {
		let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
		while (el && getComputedStyle(el).display === 'inline') {
			el = el.parentElement;
		}
		return el ?? document.body;
	}

	const charWidthCache = new Map<string, number>();
	function measureCharWidth(referenceEl: Element): number {
		const font = getComputedStyle(referenceEl).font;
		const cached = charWidthCache.get(font);
		if (cached !== undefined) return cached;

		const probe = document.createElement('span');
		probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
		probe.style.font = font;
		probe.textContent = 'M';
		document.body.appendChild(probe);
		const width = probe.getBoundingClientRect().width;
		probe.remove();

		charWidthCache.set(font, width);
		return width;
	}

	function getTightClientRects(range: Range): RectWithBlock[] {
		const ancestor = range.commonAncestorContainer;
		const walkerRoot = ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode! : ancestor;
		const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT);

		const rects: RectWithBlock[] = [];
		let node = walker.nextNode();
		while (node) {
			if (range.intersectsNode(node)) {
				const subRange = document.createRange();
				subRange.selectNodeContents(node);
				if (node === range.startContainer) subRange.setStart(node, range.startOffset);
				if (node === range.endContainer) subRange.setEnd(node, range.endOffset);
				const block = nearestBlock(node);
				for (const rect of subRange.getClientRects()) {
					if (rect.width > 1 && rect.height > 1) rects.push({ rect, block });
				}
			}
			node = walker.nextNode();
		}
		return rects;
	}

	function mergeLineRects(entries: RectWithBlock[]): RectWithBlock[] {
		const GAP_THRESHOLD = 4;

		const lines: RectWithBlock[][] = [];
		for (const entry of entries) {
			const line = lines.find(
				(l) =>
					Math.abs(l[0].rect.top - entry.rect.top) < 2 &&
					Math.abs(l[0].rect.bottom - entry.rect.bottom) < 2
			);
			if (line) line.push(entry);
			else lines.push([entry]);
		}

		const merged: RectWithBlock[] = [];
		for (const line of lines) {
			const sorted = [...line].sort((a, b) => a.rect.left - b.rect.left);
			let current = sorted[0];
			for (let i = 1; i < sorted.length; i++) {
				const next = sorted[i];
				if (next.rect.left - current.rect.right <= GAP_THRESHOLD) {
					const top = Math.min(current.rect.top, next.rect.top);
					const bottom = Math.max(current.rect.bottom, next.rect.bottom);
					const right = Math.max(current.rect.right, next.rect.right);
					current = {
						rect: new DOMRect(current.rect.left, top, right - current.rect.left, bottom - top),
						block: current.block
					};
				} else {
					merged.push(current);
					current = next;
				}
			}
			merged.push(current);
		}
		return merged;
	}

	export function resolveSelectionRects(root: Element, serialized: SerializedRange): DOMRect[] {
		const startNode = resolvePath(root, serialized.startPath);
		const endNode = resolvePath(root, serialized.endPath);
		if (!startNode || !endNode) return [];

		const range = document.createRange();
		try {
			range.setStart(startNode, serialized.startOffset);
			range.setEnd(endNode, serialized.endOffset);
		} catch {
			return [];
		}

		const entries = mergeLineRects(getTightClientRects(range)).sort(
			(a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left
		);

		return entries.map(({ rect, block }, i) => {
			if (i === entries.length - 1) return rect;
			const charWidth = measureCharWidth(block);
			return new DOMRect(rect.left, rect.top, rect.width + charWidth, rect.height);
		});
	}
</script>

<script lang="ts">
	let {
		rect,
		color
	}: {
		rect: { left: number; top: number; width: number; height: number };
		color: string;
	} = $props();
</script>

<div
	class="absolute opacity-25"
	style="left: {rect.left}px; top: {rect.top - 2}px; width: {rect.width}px; height: {rect.height +
		4}px; background-color: {color};"
></div>
