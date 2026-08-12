"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea, Label, Chip, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { updateNote, deleteNote } from "@/actions/notes";
import { HOUSE_AREAS, type Note } from "@/types/db";

export function NotesList({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [editing, setEditing] = React.useState<Note | null>(null);

  const [prev, setPrev] = React.useState(initialNotes);
  if (prev !== initialNotes) {
    setPrev(initialNotes);
    setNotes(initialNotes);
  }

  if (notes.length === 0) {
    return (
      <p className="text-muted text-sm px-1">
        No notes yet. Save alarm codes, paint colours, model numbers…
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <button
          key={note.id}
          onClick={() => setEditing(note)}
          className="w-full text-left"
        >
          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium">{note.title}</h4>
              {note.area && <Badge>{note.area}</Badge>}
            </div>
            {note.content && (
              <p className="text-sm text-muted mt-1 line-clamp-3 whitespace-pre-wrap">
                {note.content}
              </p>
            )}
          </Card>
        </button>
      ))}

      {editing && (
        <NoteEditSheet
          key={editing.id}
          note={editing}
          onClose={() => setEditing(null)}
          onChanged={(patch) =>
            setNotes((p) =>
              p.map((n) => (n.id === editing.id ? { ...n, ...patch } : n)),
            )
          }
          onDeleted={() =>
            setNotes((p) => p.filter((n) => n.id !== editing.id))
          }
        />
      )}
    </div>
  );
}

function NoteEditSheet({
  note,
  onClose,
  onChanged,
  onDeleted,
}: {
  note: Note;
  onClose: () => void;
  onChanged: (patch: Partial<Note>) => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = React.useState(note.title);
  const [area, setArea] = React.useState<string | null>(note.area);
  const [content, setContent] = React.useState(note.content ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await updateNote(note.id, { title: title.trim(), area, content: content || null });
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message ?? "Couldn't save." });
      return;
    }
    onChanged({ title: title.trim(), area, content: content || null });
    onClose();
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    const res = await deleteNote(note.id);
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message ?? "Couldn't delete." });
      return;
    }
    onDeleted();
    onClose();
    toast({ message: "Note deleted" });
    router.refresh();
  }

  return (
    <Sheet open onClose={onClose} title="Edit note">
      <div className="space-y-4">
        <div>
          <Label htmlFor="ntitle">Title</Label>
          <Input
            id="ntitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <Label>Area</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {HOUSE_AREAS.map((a) => (
              <Chip
                key={a}
                active={area === a}
                onClick={() => setArea(area === a ? null : a)}
              >
                {a}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="ncontent">Details</Label>
          <Textarea
            id="ncontent"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="text-urgent"
            onClick={remove}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={save}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
