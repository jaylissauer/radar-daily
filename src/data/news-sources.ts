export type NewsSource = {
  name: string;
  feedUrl: string;
  sourceUrl: string;
  companySlug?: string;
  sourceType?: "rss";
};

export const newsSources: NewsSource[] = [
  {
    name: "OpenAI",
    feedUrl: "https://openai.com/news/rss.xml",
    sourceUrl: "https://openai.com/news/",
    companySlug: "openai",
    sourceType: "rss",
  },
  {
    name: "Anthropic",
    feedUrl: "https://www.anthropic.com/news/rss.xml",
    sourceUrl: "https://www.anthropic.com/news",
    companySlug: "anthropic",
    sourceType: "rss",
  },
  {
    name: "Google",
    feedUrl: "https://blog.google/rss/",
    sourceUrl: "https://blog.google/innovation-and-ai/",
    companySlug: "google",
    sourceType: "rss",
  },
  {
    name: "Hugging Face",
    feedUrl: "https://huggingface.co/blog/feed.xml",
    sourceUrl: "https://huggingface.co/blog",
    companySlug: "hugging-face",
    sourceType: "rss",
  },
];