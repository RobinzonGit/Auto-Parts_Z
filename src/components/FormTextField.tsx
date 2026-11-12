import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import type { ReactNode } from 'react';

interface FormTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, 'name' | 'error'> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  children?: ReactNode;
}

/**
 * Поле формы React Hook Form + MUI TextField.
 * Поддерживает select (передайте select и MenuItem-детей).
 */
export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  children,
  ...rest
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...rest}
          label={label}
          fullWidth
          value={field.value ?? ''}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? rest.helperText}
        >
          {children}
        </TextField>
      )}
    />
  );
}
