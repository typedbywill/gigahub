import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  InputGroup,
  Label,
  TextField,
} from '@heroui/react';
import { LuEye, LuEyeOff, LuLoaderCircle } from 'react-icons/lu';
import { ThemeToggle } from '../shared/ui/ThemeToggle';
import { useAuthStore } from '../shared/stores/auth.store';
import { ApiClientError } from '../shared/api/auth.api';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('admin@gigahub.local');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(
          err.code === 'INVALID_CREDENTIALS'
            ? 'E-mail ou senha inválidos.'
            : err.message,
        );
      } else {
        setError('Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-4 sm:px-8">
        <span className="font-display text-lg font-bold tracking-tight">
          Giga<span className="text-accent">Hub</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Entrar
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Acesse o GigaHub com sua conta.
          </p>

          <form className="mt-8 flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
            <TextField
              fullWidth
              name="email"
              type="email"
              isRequired
              value={email}
              onChange={setEmail}
            >
              <Label>E-mail</Label>
              <Input
                fullWidth
                autoComplete="username"
                placeholder="voce@giganet.com.br"
              />
            </TextField>

            <TextField
              fullWidth
              name="password"
              type={showPassword ? 'text' : 'password'}
              isRequired
              value={password}
              onChange={setPassword}
            >
              <Label>Senha</Label>
              <InputGroup fullWidth>
                <InputGroup.Input
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <InputGroup.Suffix>
                  <button
                    type="button"
                    className="flex items-center justify-center text-muted hover:text-foreground"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <LuEyeOff className="size-4" />
                    ) : (
                      <LuEye className="size-4" />
                    )}
                  </button>
                </InputGroup.Suffix>
              </InputGroup>
            </TextField>

            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="mt-2 w-full"
              isDisabled={submitting}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <LuLoaderCircle className="size-4 animate-spin" />
                  Entrando…
                </span>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};
