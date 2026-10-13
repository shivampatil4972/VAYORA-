import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { homeFor } from '../components/Layout';
import { Button, Card, Notice, Page, SelectField, TextField } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { loginSchema, registerSchema, type LoginForm, type RegisterForm } from '../lib/schemas';

export function LoginPage() {
  const t = useT();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = handleSubmit(async (form) => {
    setFailure(null);
    try {
      const signedIn = await login(form);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? homeFor(signedIn.role), { replace: true });
    } catch (error) {
      setFailure((error as Error).message);
    }
  });

  return (
    <Page title={t('Sign in')}>
      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          {failure && <Notice tone="error">{failure}</Notice>}
          <TextField label={t('Email')} type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
          <TextField
            label={t('Password')}
            type="password"
            autoComplete="current-password"
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('Signing in…') : t('Sign in')}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-slate-600">
        {t('New here?')}{' '}
        <Link to="/register" className="font-medium text-teal-800 underline">
          {t('Create an account')}
        </Link>
      </p>
    </Page>
  );
}

export function RegisterPage() {
  const t = useT();
  const { user, register: signUp } = useAuth();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = handleSubmit(async (form) => {
    setFailure(null);
    try {
      const created = await signUp(form);
      navigate(homeFor(created.role), { replace: true });
    } catch (error) {
      setFailure((error as Error).message);
    }
  });

  return (
    <Page title={t('Create an account')}>
      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          {failure && <Notice tone="error">{failure}</Notice>}
          <TextField label={t('Full name')} autoComplete="name" error={formState.errors.fullName?.message} {...register('fullName')} />
          <TextField label={t('Email')} type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
          <TextField
            label={t('Password')}
            type="password"
            autoComplete="new-password"
            hint={t('At least 8 characters.')}
            error={formState.errors.password?.message}
            {...register('password')}
          />
          <SelectField
            label={t('I want to')}
            defaultValue=""
            hint={t('An account is either a passenger or a driver. This cannot be changed later.')}
            error={formState.errors.role?.message}
            {...register('role')}
          >
            <option value="" disabled>
              {t('Choose one')}
            </option>
            <option value="PASSENGER">{t('Find rides as a passenger')}</option>
            <option value="DRIVER">{t('Offer rides as a driver')}</option>
          </SelectField>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t('Creating…') : t('Create account')}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-slate-600">
        {t('Already have an account?')}{' '}
        <Link to="/login" className="font-medium text-teal-800 underline">
          {t('Sign in')}
        </Link>
      </p>
    </Page>
  );
}
