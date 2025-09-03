"use client";

import Image from "next/image";
import type { Movie } from "@/types";
import { Card } from "@/components/ui/card";

interface MovieTileProps {
  movie: Movie;
  onClick: () => void;
}

export function MovieTile({ movie, onClick }: MovieTileProps) {
  return (
    <Card
      className="group relative block w-full aspect-[2/3] overflow-hidden rounded-lg bg-card shadow-lg transition-all duration-300 hover:shadow-primary/40 hover:scale-105"
      onClick={onClick}
      role="button"
      aria-label={`View details for ${movie.title}`}
    >
      <Image
        src={movie.posterUrl}
        alt={`Poster for ${movie.title}`}
        width={500}
        height={750}
        className="object-cover w-full h-full"
        data-ai-hint="movie poster"
      />
      <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <h3 className="text-center text-base font-bold text-white">
          {movie.title}
        </h3>
      </div>
    </Card>
  );
}
