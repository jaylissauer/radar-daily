"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type ArticleSaveButtonProps = {
  articleId: string;
  initialSaved: boolean;
  initialSavedRowId?: string | null;
};

export function ArticleSaveButton({
  articleId,
  initialSaved,
}: ArticleSaveButtonProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    if (isLoading) return;

    setIsLoading(true);

    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_articles")
          .delete()
          .eq("article_id", articleId);

        if (error) {
          alert(`Unsave failed: ${error.message}`);
          return;
        }

        setIsSaved(false);
      } else {
        const { error } = await supabase
          .from("saved_articles")
          .upsert(
            { article_id: articleId },
            { onConflict: "article_id" }
          );

        if (error) {
          alert(`Save failed: ${error.message}`);
          return;
        }

        setIsSaved(true);
      }

      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      className="ghost-button"
      type="button"
      onClick={handleToggle}
      aria-label={isSaved ? "Remove saved article" : "Save article"}
      title={isSaved ? "Remove from Saved" : "Save article"}
      disabled={isLoading}
      style={{
        color: isSaved ? "#5eead4" : undefined,
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      <Bookmark
        size={16}
        fill={isSaved ? "currentColor" : "none"}
        strokeWidth={2.2}
      />
    </button>
  );
}