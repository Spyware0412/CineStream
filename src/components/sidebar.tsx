
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "./ui/button";
import { Clapperboard, Tv, Film, Globe, Users } from "lucide-react";
import Link from "next/link";


const movieGenres = [
  { "id": 28, "name": "Action" },
  { "id": 12, "name": "Adventure" },
  { "id": 16, "name": "Animation" },
  { "id": 35, "name": "Comedy" },
  { "id": 80, "name": "Crime" },
  { "id": 99, "name": "Documentary" },
  { "id": 18, "name": "Drama" },
  { "id": 10751, "name": "Family" },
  { "id": 14, "name": "Fantasy" },
  { "id": 36, "name": "History" },
  { "id": 27, "name": "Horror" },
  { "id": 10402, "name": "Music" },
  { "id": 9648, "name": "Mystery" },
  { "id": 10749, "name": "Romance" },
  { "id": 878, "name": "Science Fiction" },
  { "id": 10770, "name": "TV Movie" },
  { "id": 53, "name": "Thriller" },
  { "id": 10752, "name": "War" },
  { "id": 37, "name": "Western" }
];

const tvGenres = [
  { "id": 10759, "name": "Action & Adventure" },
  { "id": 16, "name": "Animation" },
  { "id": 35, "name": "Comedy" },
  { "id": 80, "name": "Crime" },
  { "id": 99, "name": "Documentary" },
  { "id": 18, "name": "Drama" },
  { "id": 10751, "name": "Family" },
  { "id": 10762, "name": "Kids" },
  { "id": 9648, "name": "Mystery" },
  { "id": 10763, "name": "News" },
  { "id": 10764, "name": "Reality" },
  { "id": 10765, "name": "Sci-Fi & Fantasy" },
  { "id": 10766, "name": "Soap" },
  { "id": 10767, "name": "Talk" },
  { "id": 10768, "name": "War & Politics" },
  { "id": 37, "name": "Western" }
];

interface AppSidebarProps {
    onFetchLatest: (industry: "Hollywood" | "Bollywood") => void;
    onFetchByGenre: (genre: {id: number, name: string}, mediaType: 'movie' | 'tv') => void;
}

export function AppSidebar({ onFetchLatest, onFetchByGenre }: AppSidebarProps) {
  return (
    <aside className="w-64 h-screen p-4 border-r border-border/50 sticky top-0 bg-card/20 flex-shrink-0 hidden md:block">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Discover</h2>
        
        <div className="space-y-4">
            <Accordion type="multiple" defaultValue={['discover', 'movies', 'tv']} className="w-full">
                 <AccordionItem value="party">
                    <AccordionTrigger className="text-base">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5"/> Watch Party
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                         <div className="flex flex-col items-start gap-2 pl-2">
                           <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" asChild>
                                <Link href="/party">Join or Create Party</Link>
                           </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="discover">
                    <AccordionTrigger className="text-base">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5"/> Latest
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="flex flex-col items-start gap-2 pl-2">
                            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={() => onFetchLatest("Hollywood")}>Latest from Hollywood</Button>
                            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={() => onFetchLatest("Bollywood")}>Latest from Bollywood</Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="movies">
                    <AccordionTrigger className="text-base">
                         <div className="flex items-center gap-2">
                            <Film className="w-5 h-5"/> Movie Genres
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="flex flex-col items-start gap-2 pl-2">
                            {movieGenres.map(genre => (
                                <Button key={genre.id} variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={() => onFetchByGenre(genre, 'movie')}>
                                    {genre.name}
                                </Button>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tv">
                    <AccordionTrigger className="text-base">
                        <div className="flex items-center gap-2">
                            <Tv className="w-5 h-5"/> TV Genres
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="flex flex-col items-start gap-2 pl-2">
                            {tvGenres.map(genre => (
                                <Button key={genre.id} variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={() => onFetchByGenre(genre, 'tv')}>
                                    {genre.name}
                                </Button>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    </aside>
  );
}
