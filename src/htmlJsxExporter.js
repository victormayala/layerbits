// HTML and JSX export utilities

export function getHtmlSnippet(target) {
  if (!target) return "";
  try {
    return target.outerHTML;
  } catch (e) {
    return "<!-- Error getting HTML -->";
  }
}

export function htmlToJsx(html) {
  if (!html || !html.trim()) return "";

  let jsx = html;

  // class → className
  jsx = jsx.replace(/\sclass=/gi, " className=");

  // for → htmlFor
  jsx = jsx.replace(/\sfor=/gi, " htmlFor=");

  // Close void elements
  const voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"];
  voidElements.forEach((tag) => {
    const regex = new RegExp(`<${tag}([^>]*)(?<!/)>`, "gi");
    jsx = jsx.replace(regex, `<${tag}$1 />`);
  });

  return `function Component() {\n  return (\n    <>${jsx}</>\n  );\n}`;
}
