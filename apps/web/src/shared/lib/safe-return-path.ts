import { routes } from '../routes';

/** Path interno seguro para redirect pós-login (anti open-redirect). */
export function safeReturnPath(candidate: string | undefined): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return routes.home;
  }
  if (candidate === routes.login || candidate.startsWith(`${routes.login}?`)) {
    return routes.home;
  }
  return candidate;
}
