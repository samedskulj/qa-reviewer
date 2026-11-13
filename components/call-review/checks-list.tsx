"use client";

import { ChevronDown, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Check } from "@/lib/schema";

type Props = {
  checks: Check[];
  activeTurnIds: string[];
  focusedTurnId: string | null;
  onTurnClick: (checkTurnIds: string[], turnId: string) => void;
};

export function ChecksList({ checks, activeTurnIds, focusedTurnId, onTurnClick }: Props) {
  if (checks.length === 0) return null;
  return (
    <Collapsible className="flex flex-col gap-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group w-fit px-1 text-sm font-semibold">
          <CircleCheck className="text-success" aria-hidden />
          Checked and OK ({checks.length})
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col divide-y rounded-lg border">
          {checks.map((check) => {
            const isActive = check.turnIds.length > 0 && check.turnIds.every((id) => activeTurnIds.includes(id));
            return (
              <li key={check.category} className="flex flex-col gap-1 p-2 text-sm">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="font-medium">{check.category}</span>
                  <span className="ml-auto flex gap-1">
                    {check.turnIds.map((turnId) => {
                      const focused = isActive && turnId === focusedTurnId;
                      return (
                        <Button
                          key={turnId}
                          variant={focused ? "default" : "outline"}
                          size="xs"
                          className="font-mono"
                          aria-pressed={focused}
                          aria-label={`Show turn ${turnId} in the transcript`}
                          onClick={() => onTurnClick(check.turnIds, turnId)}
                        >
                          {turnId}
                        </Button>
                      );
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{check.note}</p>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
