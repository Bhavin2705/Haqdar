/**
 * @file render.js
 * Safe DOM rendering helpers for Haqdar.
 * Strict XSS prevention: NEVER uses innerHTML with user input or scheme data.
 * All dynamic text is set via textContent or DOM nodes.
 */

/**
 * Creates an HTML element with attributes and child nodes.
 *
 * @param {string} tag - Tag name.
 * @param {Record<string, *>} [attrs] - Element attributes and event listeners.
 * @param {...(Node|string)} children - Child nodes or text strings.
 * @returns {HTMLElement} The created DOM element.
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null) {
      continue;
    }

    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, val);
    } else if (key === 'className') {
      element.className = val;
    } else if (key === 'dataset' && typeof val === 'object') {
      for (const [dKey, dVal] of Object.entries(val)) {
        element.dataset[dKey] = dVal;
      }
    } else if (key === 'htmlFor' || key === 'for') {
      element.setAttribute('for', String(val));
      element.htmlFor = String(val);
    } else if (key === 'disabled' || key === 'checked' || key === 'hidden' || key === 'selected') {
      if (val) {
        element.setAttribute(key, '');
        element[key] = true;
      } else {
        element.removeAttribute(key);
        element[key] = false;
      }
    } else {
      element.setAttribute(key, String(val));
    }
  }

  for (const child of children) {
    if (child === undefined || child === null) {
      continue;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Clears all children of an element safely.
 *
 * @param {HTMLElement} element - Parent element.
 */
export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
