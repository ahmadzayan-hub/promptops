import { describe, it, expect } from "vitest";
import { buildImagePrompt, type ImagePromptInput } from "./image-prompts";

const small: ImagePromptInput = {
  fileName: "screenshot.png",
  mimeType: "image/png",
  size: 512 * 1024,
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  locale: "en"
};

const huge: ImagePromptInput = {
  fileName: "design-mock.psd",
  mimeType: "image/vnd.adobe.photoshop",
  size: 800 * 1024 * 1024, // 800 MB
  dataUrl: "",
  locale: "en"
};

describe("buildImagePrompt — extract", () => {
  it("inlines a small image as markdown", () => {
    const out = buildImagePrompt("extract", small);
    expect(out).toContain(`![${small.fileName}](${small.dataUrl})`);
    expect(out.toLowerCase()).toContain("verbatim");
    expect(out).toMatch(/\[unreadable\]/i);
  });

  it("falls back to attachment note when image is too large", () => {
    const out = buildImagePrompt("extract", huge);
    expect(out).not.toContain("data:image");
    expect(out.toLowerCase()).toContain("attachment");
    expect(out).toContain(huge.fileName);
  });
});

describe("buildImagePrompt — recreate", () => {
  it("asks for component tree + design tokens", () => {
    const out = buildImagePrompt("recreate", small);
    expect(out).toContain("Component tree");
    expect(out).toContain("Design tokens");
    expect(out.toLowerCase()).toContain("hex");
  });

  it("includes the image data URL inline", () => {
    const out = buildImagePrompt("recreate", small);
    expect(out).toContain(small.dataUrl);
  });
});

describe("buildImagePrompt — rewrite", () => {
  it("identifies content type and asks for a new version in same shape", () => {
    const out = buildImagePrompt("rewrite", small);
    expect(out.toLowerCase()).toContain("identify");
    expect(out.toLowerCase()).toContain("structure");
    expect(out.toLowerCase()).toContain("tone");
  });

  it("threads the user hint through as scenario", () => {
    const withHint: ImagePromptInput = { ...small, hint: "for a German fintech CTO" };
    const out = buildImagePrompt("rewrite", withHint);
    expect(out).toContain("for a German fintech CTO");
  });
});

describe("Arabic locale", () => {
  it("emits Arabic headings for extract", () => {
    const out = buildImagePrompt("extract", { ...small, locale: "ar" });
    expect(out).toMatch(/[؀-ۿ]/);
    expect(out).toContain("الدور");
    expect(out).toContain("المهمّة");
  });
});
