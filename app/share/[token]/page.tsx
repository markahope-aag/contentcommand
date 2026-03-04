import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getContentByShareToken } from "@/lib/supabase/queries";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

function fixBulletLists(markdown: string): string {
  return markdown
    .replace(/^(>?\s*"?)([•●◦‣]\s*)/gm, "$1- ")
    .replace(/([^\n])(\s*[•●◦‣]\s*)/g, "$1\n- ");
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const content = await getContentByShareToken(token);

  if (!content) notFound();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-3">
              {content.title || "Untitled"}
            </h1>
            {content.excerpt && (
              <p className="text-lg text-zinc-500 dark:text-zinc-400">
                {content.excerpt}
              </p>
            )}
            {content.word_count && (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
                {content.word_count} words
              </p>
            )}
          </header>

          <div className="prose prose-zinc max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {fixBulletLists(content.content || "")}
            </ReactMarkdown>
          </div>
        </article>

        <footer className="mt-16 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Powered by Content Command
        </footer>
      </main>
    </div>
  );
}
