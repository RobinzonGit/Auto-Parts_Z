import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/store/authStore';
import { FormTextField } from '@/components/FormTextField';

/** Страница регистрации нового пользователя (роль user). */
export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, error, clearError } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    setSubmitting(true);
    try {
      await registerUser({ name: values.name, email: values.email, password: values.password });
      navigate('/catalog');
    } catch {
      /* ошибка показана ниже */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" fontWeight={700} align="center">
            Регистрация
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            После регистрации доступна роль «Пользователь»
          </Typography>

          {error && (
            <Alert severity="error" onClose={clearError}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <FormTextField name="name" control={control} label="Имя" />
              <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" />
              <FormTextField
                name="password"
                control={control}
                label="Пароль"
                type="password"
                helperText="Минимум 8 символов, латинские буквы и цифры"
                autoComplete="new-password"
              />
              <FormTextField
                name="confirmPassword"
                control={control}
                label="Повторите пароль"
                type="password"
                autoComplete="new-password"
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                Зарегистрироваться
              </Button>
            </Stack>
          </form>

          <Button onClick={() => navigate('/login')} sx={{ alignSelf: 'center' }}>
            Уже есть аккаунт — войти
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
