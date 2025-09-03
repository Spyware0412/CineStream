
"use client";

import { useState } from "react";
import { Clapperboard, Search, Link as LinkIcon, Play } from "lucide-react";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "./ui/button";

interface HeaderProps {
  onSearch: (query: string, mediaType: 'movie' | 'tv') => void;
  onPlayMagnet: (magnetLink: string) => void;
}

export function Header({ onSearch, onPlayMagnet }: HeaderProps) {
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [magnetLink, setMagnetLink] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(query) {
      onSearch(query, mediaType);
    }
  };

  const handleMagnetPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (magnetLink) {
        onPlayMagnet(magnetLink);
        setMagnetLink("");
    }
  };

  return (
    <header className="p-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
      <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Clapperboard className="text-primary w-8 h-8" />
          <h1 className="text-2xl font-bold text-foreground hidden sm:block">
            CineStream Desktop
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            <form onSubmit={handleSearch} className="flex-grow max-w-lg flex gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search for movies or TV shows..."
                className="pl-10 w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                />
            </div>
            <Select value={mediaType} onValueChange={(value: 'movie' | 'tv') => setMediaType(value)}>
                <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
                </SelectContent>
            </Select>
            </form>
             <form onSubmit={handleMagnetPlay} className="flex-grow max-w-sm flex gap-2">
                <div className="relative flex-grow">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    type="text"
                    placeholder="Paste magnet link..."
                    className="pl-10 w-full"
                    value={magnetLink}
                    onChange={(e) => setMagnetLink(e.target.value)}
                    />
                </div>
                <Button type="submit" variant="secondary">
                    <Play className="mr-2 h-4 w-4" />
                    Play
                </Button>
            </form>
        </div>
      </div>
    </header>
  );
}
