import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { ApiClientError } from '../shared/api/auth.api';
import { LoginBrandPanel } from './login/LoginBrandPanel';
import {
  clearRememberedEmail,
  readRememberedEmail,
  writeRememberedEmail,
} from './login/remember-email';

const fieldClassName =
  'rounded-xl border border-white/15 bg-white/5 text-white shadow-none placeholder:text-white/35';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState(() => readRememberedEmail() ?? '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(
    () => readRememberedEmail() !== null,
  );
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
      const trimmedEmail = email.trim();
      await login(trimmedEmail, password);
      if (rememberMe) {
        writeRememberedEmail(trimmedEmail);
      } else {
        clearRememberedEmail();
      }
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
    <div className="flex min-h-screen bg-[#0b0b0b] text-white">
      <section className="relative mx-auto flex w-full max-w-md flex-col px-6 py-8 sm:px-8 lg:mx-0 lg:max-w-none lg:w-[48%] lg:px-12 lg:py-10 xl:px-16">
        <header className="flex items-center justify-center gap-2.5 lg:justify-start">
          <img
            src="/brand/giga-logo-white.png"
            alt=""
            className="size-8 object-contain"
          />
          <span className="font-display text-base font-semibold tracking-tight">
            GigaHub
          </span>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10 lg:items-stretch">
          <div className="w-full max-w-md">
            <h1 className="font-display text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-left">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-center text-sm text-white/55 sm:text-base lg:text-left">
              Acesse suas OS, rotas e o que precisa no dia a dia.
            </p>

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
                <Label className="text-sm text-white/60">E-mail</Label>
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
                <Label className="text-sm text-white/60">Senha</Label>
                <InputGroup
                  fullWidth
                  className={`h-10 ${fieldClassName}`}
                >
                  <InputGroup.Input
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    className="bg-transparent text-white placeholder:text-white/35"
                  />
                  <InputGroup.Suffix>
                    <button
                      type="button"
                      className="flex items-center justify-center text-white/45 hover:text-white"
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
                className="text-sm text-white/70"
              >
                <Checkbox.Content>
                  <Checkbox.Control className="border-white/30">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  Lembrar-me
                </Checkbox.Content>
              </Checkbox>

              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="secondary"
                className="mt-1 h-12 w-full rounded-xl border-0 bg-white font-semibold text-black hover:bg-white/90"
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

        <footer className="text-center text-xs text-white/40 lg:text-left">
          Use o e-mail e a senha da sua conta GigaNet.
        </footer>
      </section>

      <LoginBrandPanel />
    </div>
  );
};
