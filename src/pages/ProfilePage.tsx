import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material';
import { profileSchema, changePasswordSchema, type ProfileFormValues, type ChangePasswordFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/format';
import { ROLE_LABELS } from '@/utils/labels';
import { StatusChip } from '@/components/StatusChip';
import { FormTextField } from '@/components/FormTextField';

/** Профиль: данные аккаунта и смена пароля. */
export function ProfilePage() {
  const { user } = useAuth();
  const { updateProfile, changePassword } = useAuthStore();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!user) return null;

  const onSaveProfile = async (values: ProfileFormValues): Promise<void> => {
    setProfileError(null);
    try {
      await updateProfile(values);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Не удалось сохранить профиль.');
    }
  };

  const onChangePassword = async (values: ChangePasswordFormValues): Promise<void> => {
    setPasswordError(null);
    try {
      await changePassword(values.oldPassword, values.newPassword);
      passwordForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Не удалось изменить пароль.');
    }
  };

  return (
    <>
      <Typography variant="h5" component="h1" fontWeight={700} sx={{ mb: 3 }}>
        Профиль
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Данные аккаунта</Typography>
                <StatusChip label={ROLE_LABELS[user.role]} color={user.role === 'admin' ? 'primary' : 'secondary'} />
              </Stack>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                Email: <b>{user.email}</b> (изменение недоступно в MVP)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Зарегистрирован: {formatDate(user.createdAt)}
              </Typography>

              {profileError && <Alert severity="error">{profileError}</Alert>}

              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} noValidate>
                <Stack spacing={2}>
                  <FormTextField name="name" control={profileForm.control} label="Имя" />
                  <Button type="submit" variant="contained" disabled={profileForm.formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
                    Сохранить
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6">Смена пароля</Typography>
              <Divider />
              {passwordError && <Alert severity="error">{passwordError}</Alert>}
              <form onSubmit={passwordForm.handleSubmit(onChangePassword)} noValidate>
                <Stack spacing={2}>
                  <FormTextField
                    name="oldPassword"
                    control={passwordForm.control}
                    label="Текущий пароль"
                    type="password"
                    autoComplete="current-password"
                  />
                  <FormTextField
                    name="newPassword"
                    control={passwordForm.control}
                    label="Новый пароль"
                    type="password"
                    helperText="Минимум 8 символов, латинские буквы и цифры"
                    autoComplete="new-password"
                  />
                  <FormTextField
                    name="confirmPassword"
                    control={passwordForm.control}
                    label="Повторите новый пароль"
                    type="password"
                    autoComplete="new-password"
                  />
                  <Button type="submit" variant="contained" disabled={passwordForm.formState.isSubmitting} sx={{ alignSelf: 'flex-start' }}>
                    Изменить пароль
                  </Button>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
