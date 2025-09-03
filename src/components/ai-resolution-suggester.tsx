"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAiSuggestions } from "@/app/actions";
import type { SuggestAlternativeResolutionsOutput } from "@/ai/flows/suggest-alternative-resolutions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

interface AiResolutionSuggesterProps {
  movieTitle: string;
}

export function AiResolutionSuggester({
  movieTitle,
}: AiResolutionSuggesterProps) {
  const [suggestions, setSuggestions] =
    useState<SuggestAlternativeResolutionsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    setIsLoading(true);
    setSuggestions(null);
    try {
      const result = await getAiSuggestions(movieTitle);
      setSuggestions(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">AI Resolution Suggester</h3>
      <Button onClick={handleSuggest} disabled={isLoading}>
        <Wand2 className="mr-2 h-4 w-4" />
        {isLoading
          ? "Analyzing..."
          : "Suggest Other Resolutions"}
      </Button>
      {isLoading && (
        <Card className="mt-4 bg-muted/30">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}
      {suggestions && (
        <Card className="mt-4 border-primary/50 bg-secondary/20">
          <CardHeader>
            <CardTitle className="text-lg">AI Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {suggestions.suggestedResolutions.map((res) => (
                <Badge key={res} variant="secondary" className="text-sm bg-primary/20 text-primary-foreground/80 border-primary/50">
                  {res}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground italic">
              {suggestions.reasoning}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
