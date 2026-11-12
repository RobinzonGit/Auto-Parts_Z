import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/store/authStore';
import { DemoAccountsHint } from '@/components/DemoAccountsHint';
import { FormTextField } from '@/components/FormTextField';
/** Страница входа. */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, error, clearError } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setSubmitting(true);
    try {
      await login(values);
      navigate('/catalog');
    } catch {
      /* ошибка показана ниже */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight={700} align="center">
            Вход в Auto Parts
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Склад автозапчастей · MVP
          </Typography>

          {error && (
            <Alert severity="error" onClose={clearError}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" />
              <FormTextField
                name="password"
                control={control}
                label="Пароль"
                type="password"
                autoComplete="current-password"
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                Войти
              </Button>
            </Stack>
          </form>

          <DemoAccountsHint
            onPick={(email, password) => {
              setValue('email', email, { shouldValidate: true });
              setValue('password', password, { shouldValidate: true });
            }}
          />

          <Button onClick={() => navigate('/register')} sx={{ alignSelf: 'center' }}>
            Создать аккаунт
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
