import codeSyntaxHighlight from "@toast-ui/editor-plugin-code-syntax-highlight/dist/toastui-editor-plugin-code-syntax-highlight-all.js";
import { getNotePath } from "../../helpers.js";
import router from "../../router.js";

const EXTERNAL_LINK_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function normalizePath(path) {
  const parts = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (!parts.length) {
        return null;
      }
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

function decodePath(path) {
  return path
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

function noteHrefFromMarkdownHref(href) {
  if (!href || EXTERNAL_LINK_SCHEME_RE.test(href)) {
    return null;
  }
  if (href.startsWith("attachments/") || href.startsWith("/attachments/")) {
    return null;
  }

  const [hrefWithoutHash, hashFragment] = href.split("#", 2);
  let titlePath = null;

  if (hrefWithoutHash.startsWith("/note/")) {
    titlePath = hrefWithoutHash.slice(6);
  } else if (hrefWithoutHash.startsWith("note/")) {
    titlePath = hrefWithoutHash.slice(5);
  } else if (hrefWithoutHash.startsWith("/")) {
    return null;
  } else {
    const currentTitle = router.currentRoute.value.params.title || "";
    const currentPath = Array.isArray(currentTitle)
      ? currentTitle.join("/")
      : currentTitle;
    const currentDir = currentPath.includes("/")
      ? currentPath.split("/").slice(0, -1).join("/")
      : "";
    titlePath = [currentDir, hrefWithoutHash].filter(Boolean).join("/");
  }

  if (titlePath.endsWith(".md")) {
    titlePath = titlePath.slice(0, -3);
  }

  const normalizedTitlePath = normalizePath(decodePath(titlePath));
  if (!normalizedTitlePath) {
    return null;
  }

  return router.resolve({
    path: getNotePath(normalizedTitlePath),
    hash: hashFragment ? `#${hashFragment}` : "",
  }).href;
}

const customHTMLRenderer = {
  // Add id attribute to headings
  heading(node, { entering, getChildrenText, origin }) {
    const original = origin();
    if (entering) {
      original.attributes = {
        id: getChildrenText(node)
          .toLowerCase()
          .replace(/[^a-z0-9-\s]*/g, "")
          .trim()
          .replace(/\s/g, "-"),
      };
    }
    return original;
  },
  // Convert relative hash links to absolute links
  link(_, { entering, origin }) {
    const original = origin();
    if (entering) {
      const href = original.attributes.href;
      if (href.startsWith("#")) {
        const targetRoute = {
          ...router.currentRoute.value,
          hash: href,
        };
        original.attributes.href = router.resolve(targetRoute).href;
      } else {
        const noteHref = noteHrefFromMarkdownHref(href);
        if (noteHref) {
          original.attributes.href = noteHref;
        }
      }
    }
    return original;
  },
};

const baseOptions = {
  height: "100%",
  plugins: [codeSyntaxHighlight],
  customHTMLRenderer: customHTMLRenderer,
  usageStatistics: false,
};

export default baseOptions;
