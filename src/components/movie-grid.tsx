
"use client";

import { useState } from "react";
import type { Movie as MediaItem } from "@/types";
import { MovieTile } from "./movie-tile";
import { MovieDetailsModal } from "./movie-details-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface MovieGridProps {
  items: MediaItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
}

export function MovieGrid({ items, isLoading, isLoadingMore }: MovieGridProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedItem(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {Array.from({ length: 18 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[2/3] rounded-lg" />
        ))}
      </div>
    );
  }
  
  if (items.length === 0 && !isLoading) {
    return (
        <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No results found</h2>
            <p className="text-muted-foreground">Please try a different search or select a category.</p>
        </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {items.map((item) => (
          <MovieTile
            key={`${item.id}-${item.media_type}`}
            movie={item}
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {isLoadingMore && (
        <div className="flex justify-center mt-8">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        </div>
      )}

      {selectedItem && (
        <MovieDetailsModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onOpenChange={handleOpenChange}
        />
      )}
    </>
  );
}
