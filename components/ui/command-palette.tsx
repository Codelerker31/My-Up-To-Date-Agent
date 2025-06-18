"use client"
import { Zap, Plus, Settings, Archive } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { UpdateStream } from "@/types"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streams: UpdateStream[]
  onStreamSelect: (streamId: string) => void
}

export function CommandPalette({ open, onOpenChange, streams, onStreamSelect }: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search streams, create new research topics..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Research Stream</span>
          </CommandItem>
          <CommandItem>
            <Zap className="mr-2 h-4 w-4" />
            <span>Quick Research</span>
          </CommandItem>
          <CommandItem>
            <Archive className="mr-2 h-4 w-4" />
            <span>View Archive</span>
          </CommandItem>
          <CommandItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Research Streams">
          {streams.map((stream) => (
            <CommandItem
              key={stream.id}
              onSelect={() => {
                onStreamSelect(stream.id)
                onOpenChange(false)
              }}
            >
              <div className={`mr-2 h-2 w-2 rounded-full bg-${stream.color}-500`} />
              <span>{stream.title}</span>
              {stream.hasNewUpdate && <div className="ml-auto h-2 w-2 rounded-full bg-[hsl(var(--ua-accent))]" />}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
