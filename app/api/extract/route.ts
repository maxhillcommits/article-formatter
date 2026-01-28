import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required." }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (HTTP ${res.status}).` },
        { status: 400 }
      );
    }

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: "Could not extract article content from this URL." },
        { status: 400 }
      );
    }

    // Parse the extracted HTML and rebuild with only clean, safe tags
    const cleanDom = new JSDOM(article.content);
    const body = cleanDom.window.document.body;

    const allowedTags = new Set([
      "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "pre", "code",
      "b", "strong", "i", "em", "u", "br", "hr",
      "table", "thead", "tbody", "tr", "th", "td",
    ]);

    function cleanNode(node: Node): void {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === 1) {
          // Element node
          const el = child as Element;
          const tag = el.tagName.toLowerCase();

          // Remove images, figures, scripts, styles, iframes entirely
          if (["img", "figure", "figcaption", "script", "style", "iframe", "svg", "video", "audio", "picture", "source", "noscript"].includes(tag)) {
            node.removeChild(child);
            continue;
          }

          // Remove all attributes (href, class, style, etc.)
          while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
          }

          if (allowedTags.has(tag)) {
            cleanNode(child);
          } else {
            // Unwrap: replace the element with its children
            while (child.firstChild) {
              node.insertBefore(child.firstChild, child);
            }
            node.removeChild(child);
          }
        } else if (child.nodeType !== 3) {
          // Remove comments and other non-text nodes
          node.removeChild(child);
        }
      }
    }

    cleanNode(body);
    const cleanContent = body.innerHTML;

    return NextResponse.json({
      title: article.title,
      content: cleanContent,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process URL: ${message}` },
      { status: 500 }
    );
  }
}
