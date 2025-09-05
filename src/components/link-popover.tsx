
"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "./ui/button";
import { Loader2, PlayCircle } from "lucide-react";
import type { TorrentLink } from "@/types";
import { ReactNode, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface LinkPopoverProps {
  links: TorrentLink[];
  isLoading: boolean;
  disabled?: boolean;
  onLinkSelect: (magnet: string) => void;
  onTriggerClick?: () => void;
  children: ReactNode;
}

export function LinkPopover({
  links,
  isLoading,
  disabled,
  onLinkSelect,
  onTriggerClick,
  children,
}: LinkPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleTriggerClick = () => {
    if (onTriggerClick) {
      onTriggerClick();
    }
    // If we have links already, open the popover. If not, the trigger action will fetch them.
    if (links.length > 0) {
      setIsOpen(true);
    }
  };

  const handleLinkClick = (magnet: string) => {
    onLinkSelect(magnet);
    setIsOpen(false);
  };
  
  if (disabled && !isLoading) {
      const trigger = children as React.ReactElement;
      return React.cloneElement(trigger, { disabled: true });
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild onClick={handleTriggerClick}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Select Quality</h4>
            <p className="text-sm text-muted-foreground">
              Choose a link to start streaming.
            </p>
          </div>
          <div className="grid gap-2">
            {links.length > 0 ? (
              links.map((link) => (
                <Button
                  key={link.magnet}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkClick(link.magnet)}
                  className="justify-start"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  <div className="flex flex-col items-start">
                     <span className="font-semibold">{`${link.quality} ${link.type.toUpperCase()}`}</span>
                     <span className="text-xs text-muted-foreground">{`Size: ${link.size}`}</span>
                  </div>
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No streaming links were found.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
