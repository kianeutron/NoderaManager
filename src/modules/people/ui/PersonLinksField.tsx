"use client";

import AddRounded from "@mui/icons-material/AddRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { Box, Button, FormHelperText, IconButton, Stack } from "@mui/material";
import { useFieldArray, useFormState, type Control } from "react-hook-form";
import { maxLinksPerPerson } from "@/modules/people/domain/person.schema";
import type { PersonFormValues } from "@/modules/people/ui/person-form";
import { personLinkTypeLabel } from "@/modules/people/ui/person-presentation";
import { personLinkTypeValues } from "@/shared/db/schema/crm-values";
import { SelectField, TextInputField } from "@/shared/ui/form/fields";

const typeOptions = personLinkTypeValues.map((value) => ({ value, label: personLinkTypeLabel[value] }));

/** Extra links as rows of type, address and optional label. The first blank row is free; rows left empty are ignored on save. */
export function PersonLinksField({ control }: Readonly<{ control: Control<PersonFormValues> }>) {
  const { fields, append, remove } = useFieldArray({ control, name: "links" });
  const { errors } = useFormState({ control, name: "links" });

  return (
    <Stack sx={{ gap: 1.5 }}>
      {fields.map((field, index) => (
        <Box key={field.id} sx={{ alignItems: "start", display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr auto", sm: "130px 1fr 150px auto" } }}>
          <SelectField control={control} label="Type" name={`links.${index}.type`} options={typeOptions} />
          <TextInputField control={control} label="Address" name={`links.${index}.url`} placeholder="https://" />
          <TextInputField control={control} label="Label" maxLength={80} name={`links.${index}.label`} />
          <IconButton aria-label={`Remove link ${index + 1}`} onClick={() => remove(index)} sx={{ mt: 0.5 }}><DeleteOutlineRounded /></IconButton>
        </Box>
      ))}
      {errors.links?.message ? <FormHelperText error>{errors.links.message}</FormHelperText> : null}
      <Button disabled={fields.length >= maxLinksPerPerson} onClick={() => append({ type: "website", url: "", label: "" })} startIcon={<AddRounded />} sx={{ alignSelf: "flex-start" }}>Add link</Button>
    </Stack>
  );
}
