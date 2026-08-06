/**
 * A stable id for a link element, unique even when multiple links on the
 * page share the same href (identified by occurrence order, which is the
 * same for every client viewing the same page).
 */
export function linkId(el: Element): string | null {
	const href = el.getAttribute('href');
	if (!href) return null;
	const siblings = document.querySelectorAll(`a[href="${CSS.escape(href)}"]`);
	const index = Array.from(siblings).indexOf(el);
	return `${href}#${index}`;
}
