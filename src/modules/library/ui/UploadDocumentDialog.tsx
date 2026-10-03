"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import CloudUploadRounded from "@mui/icons-material/CloudUploadRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, MenuItem, OutlinedInput, Select, Stack, TextField, Typography } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import { useRef, useState, type ReactNode } from "react";
import { documentCategoryValues } from "@/shared/db/schema/library-values";
import type { DocumentCategory } from "@/modules/library/domain/document.schema";
import type { LibraryFacets } from "@/modules/library/domain/document.types";
import { categoryMeta } from "@/modules/library/ui/document-presentation";
import { describeError } from "@/shared/api/error-copy";
import { uploadDocument } from "@/modules/library/ui/library-api";

const acceptedFiles = ".pdf,.docx,.md,.markdown,.txt,.csv,.png,.jpg,.jpeg,.webp";
const controlSx = (theme: Theme) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    backgroundColor: alpha(theme.palette.background.default, 0.42),
    transition: "border-color 160ms ease, box-shadow 160ms ease",
    "& fieldset": { borderColor: alpha(theme.palette.primary.light, 0.28) },
    "&:hover fieldset": { borderColor: alpha(theme.palette.primary.light, 0.55) },
    "&.Mui-focused": { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}` },
    "&.Mui-focused fieldset": { borderColor: theme.palette.primary.light }
  },
  "& .MuiInputBase-input::placeholder": { color: alpha(theme.palette.text.primary, 0.7), opacity: 1 }
});

function FieldLabel({ children }: Readonly<{ children: ReactNode }>) {
  return <Typography color="text.secondary" sx={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em", mb: -1 }} variant="caption">{children}</Typography>;
}

type UploadDocumentDialogProps = Readonly<{ facets: LibraryFacets | undefined; onUploaded: () => void }>;

export function UploadDocumentDialog({ facets, onUploaded }: UploadDocumentDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [folderId, setFolderId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFile(null); setTitle(""); setDescription(""); setCategory("other"); setFolderId(""); setTags([]); setTagDraft(""); setError(null);
  }

  function chooseFile(next: File | null) {
    setFile(next);
    if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ""));
    setError(null);
  }

  function addTag() {
    const next = tagDraft.trim();
    if (!next || tags.includes(next) || tags.length >= 10) return;
    setTags((current) => [...current, next]); setTagDraft("");
  }

  async function submit() {
    if (!file) { setError("Choose a file first."); return; }
    if (!title.trim()) { setError("Add a title for this document."); return; }
    setSubmitting(true); setError(null);
    try {
      await uploadDocument({ file, title: title.trim(), description: description.trim() || undefined, category, folderId: folderId || undefined, tags });
      setOpen(false); reset(); onUploaded();
    } catch (cause) {
      setError(describeError(cause, "document"));
    } finally { setSubmitting(false); }
  }

  return <>
    <Button onClick={() => setOpen(true)} startIcon={<AddRounded />} variant="contained">Upload document</Button>
    <Dialog fullWidth maxWidth="sm" onClose={() => !submitting && setOpen(false)} open={open}>
      <DialogTitle sx={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>Upload document<IconButton aria-label="Close" disabled={submitting} onClick={() => setOpen(false)}><CloseRounded /></IconButton></DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Box onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} role="button" sx={{ alignItems: "center", border: "1px dashed", borderColor: "primary.main", borderRadius: 3, cursor: "pointer", display: "flex", gap: 1.5, justifyContent: "center", minHeight: 112, p: 2, textAlign: "center" }} tabIndex={0}>
            <CloudUploadRounded color="primary" />
            <Stack><Typography sx={{ fontWeight: 700 }}>{file ? file.name : "Choose a file"}</Typography><Typography color="text.secondary" variant="body2">PDF, DOCX, Markdown, TXT, CSV, PNG, JPEG or WebP · max 25 MB</Typography></Stack>
            <input accept={acceptedFiles} hidden onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} ref={inputRef} type="file" />
          </Box>
          <Stack spacing={1}><FieldLabel>Title</FieldLabel><TextField fullWidth onChange={(event) => setTitle(event.target.value)} placeholder="Give this document a clear name" sx={controlSx} value={title} /></Stack>
          <Stack direction={{ sm: "row", xs: "column" }} spacing={2}>
            <Stack spacing={1} sx={{ flex: 1 }}><FieldLabel>Category</FieldLabel><FormControl fullWidth sx={controlSx}><Select displayEmpty onChange={(event) => setCategory(event.target.value as DocumentCategory)} renderValue={(value) => categoryMeta[(value || "other") as DocumentCategory].label} value={category}>{documentCategoryValues.map((value) => <MenuItem key={value} value={value}>{categoryMeta[value].label}</MenuItem>)}</Select></FormControl></Stack>
            <Stack spacing={1} sx={{ flex: 1 }}><FieldLabel>Folder</FieldLabel><FormControl fullWidth sx={controlSx}><Select displayEmpty onChange={(event) => setFolderId(event.target.value)} renderValue={(value) => value ? facets?.folders.find((folder) => folder.id === value)?.name ?? "Folder" : "Unfiled"} value={folderId}><MenuItem value="">Unfiled</MenuItem>{facets?.folders.map((folder) => <MenuItem key={folder.id} sx={{ pl: 2 + folder.depth * 2 }} value={folder.id}>{folder.name}</MenuItem>)}</Select></FormControl></Stack>
          </Stack>
          <Stack spacing={1}><FieldLabel>Description <span style={{ fontWeight: 400 }}>(optional)</span></FieldLabel><TextField fullWidth multiline minRows={3} onChange={(event) => setDescription(event.target.value)} placeholder="Add context for your future self" sx={controlSx} value={description} /></Stack>
          <Stack spacing={1}><FieldLabel>Tags <span style={{ fontWeight: 400 }}>(optional)</span></FieldLabel><FormControl fullWidth sx={controlSx}><OutlinedInput endAdornment={<Button onClick={addTag} size="small" sx={{ minWidth: 48 }}>Add</Button>} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} placeholder="Type a tag and press Enter" value={tagDraft} /><Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mt: 1 }}>{tags.map((tag) => <Chip key={tag} label={tag} onDelete={() => setTags((current) => current.filter((item) => item !== tag))} size="small" />)}</Stack></FormControl></Stack>
        </Stack>
      </DialogContent>
      <DialogActions><Button disabled={submitting} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={submitting || !file} onClick={submit} variant="contained">{submitting ? "Uploading…" : "Upload"}</Button></DialogActions>
    </Dialog>
  </>;
}
