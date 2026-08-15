import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Input,
  InputGroup,
  Label,
  TextField,
} from '@heroui/react';
import {
  LuArrowRight,
  LuEye,
  LuEyeOff,
  LuLoaderCircle,
} from 'react-icons/lu';
import { useAuthStore } from '../shared/stores/auth.store';
import { useThemeStore } from '../shared/stores/theme.store';
import { ThemeToggle } from '../shared/ui/ThemeToggle';
import { ApiClientError } from '../shared/api/auth.api';
import { safeReturnPath } from '../shared/lib/safe-return-path';
import { LoginBrandPanel } from './login/LoginBrandPanel';
import {
  clearRememberedEmail,
  readRememberedEmail,
  writeRememberedEmail,
} from './login/remember-email';

const fieldClassName =
  'h-10 rounded-xl border border-border bg-background text-foreground shadow-none placeholder:text-muted focus-within:border-foreground/40';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === 'dark';
  const returnTo = safeReturnPath(
    (location.state as { from?: string } | null)?.from,
  );

  const [email, setEmail] = useState(() => readRememberedEmail() ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(
    () => readRememberedEmail() !== null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      await login(trimmedEmail, password);
      if (rememberMe) {
        writeRememberedEmail(trimmedEmail);
      } else {
        clearRememberedEmail();
      }
      navigate(returnTo, { replace: true });
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
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      <section className="relative mx-auto flex w-full max-w-md flex-col px-6 py-8 sm:px-8 lg:mx-0 lg:max-w-none lg:w-[48%] lg:px-12 lg:py-10 xl:px-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={isDark ? '/brand/giga-logo-white.png' : '/brand/giga-logo.png'}
              alt="GigaHub Logo"
              className="size-8 object-contain"
            />
            <span className="font-display text-base font-semibold tracking-tight text-foreground">
              GigaHub
            </span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10 lg:items-stretch">
          <div className="w-full max-w-md">
            <h1 className="font-display text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-left">
              Bem-vindo de volta
            </h1>

            <form
              className="mt-10 flex flex-col gap-5"
              onSubmit={(e) => void onSubmit(e)}
            >
              <TextField
                fullWidth
                name="email"
                type="email"
                isRequired
                value={email}
                onChange={setEmail}
                className="gap-1.5"
              >
                <Label className="text-sm font-medium text-foreground/75">E-mail</Label>
                <Input
                  fullWidth
                  autoComplete="username"
                  placeholder="você@giga.com.br"
                  className={fieldClassName}
                />
              </TextField>

              <TextField
                fullWidth
                name="password"
                type={showPassword ? 'text' : 'password'}
                isRequired
                value={password}
                onChange={setPassword}
                className="gap-1.5"
              >
                <Label className="text-sm font-medium text-foreground/75">Senha</Label>
                <InputGroup
                  fullWidth
                  className={fieldClassName}
                >
                  <InputGroup.Input
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="bg-transparent text-foreground placeholder:text-muted"
                  />
                  <InputGroup.Suffix>
                    <button
                      type="button"
                      className="flex items-center justify-center text-muted hover:text-foreground transition-colors"
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
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

              <Checkbox
                name="remember"
                isSelected={rememberMe}
                onChange={setRememberMe}
                className="text-sm text-foreground/80"
              >
                <Checkbox.Content>
                  <Checkbox.Control className="border-border">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Lembrar-me
                </Checkbox.Content>
              </Checkbox>

              {error ? (
                <p className="text-sm text-red-500 dark:text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                className="mt-1 h-12 w-full rounded-xl border-0 bg-accent font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
                isDisabled={submitting}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LuLoaderCircle className="size-4 animate-spin" />
                    Entrando…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Entrar
                    <LuArrowRight className="size-4" aria-hidden />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </main>

        <footer className="text-center text-xs text-muted lg:text-left">
          Use o e-mail e a senha da sua conta GigaNet.
        </footer>
      </section>

      <LoginBrandPanel />
    </div>
  );
};
