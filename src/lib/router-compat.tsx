import {
  Link as RouterLink,
  Navigate as RouterNavigate,
  Outlet,
  useLocation,
  useNavigate as useReactRouterNavigate,
  useParams,
  type LinkProps as RouterLinkProps,
  type NavigateOptions,
} from "react-router-dom";
import type { ComponentType } from "react";

type Params = Record<string, string | number | boolean | null | undefined>;

function resolveTo(to: unknown, params?: Params): string {
  let path = typeof to === "string" ? to : String(to ?? "/");

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      path = path.replaceAll(`$${key}`, encodeURIComponent(String(value)));
      path = path.replaceAll(`:${key}`, encodeURIComponent(String(value)));
    });
  }

  return path;
}

type LinkProps = Omit<RouterLinkProps, "to"> & {
  to: string;
  params?: Params;
  activeOptions?: { exact?: boolean };
  activeProps?: Partial<Omit<RouterLinkProps, "to">>;
  inactiveProps?: Partial<Omit<RouterLinkProps, "to">>;
};

export function Link({
  to,
  params,
  activeOptions,
  activeProps,
  inactiveProps,
  className,
  style,
  ...props
}: LinkProps) {
  const location = useLocation();
  const href = resolveTo(to, params);
  const isActive = activeOptions?.exact
    ? location.pathname === href
    : location.pathname === href || location.pathname.startsWith(`${href}/`);
  const stateProps = isActive ? activeProps : inactiveProps;

  return (
    <RouterLink
      to={href}
      {...props}
      {...stateProps}
      className={[className, stateProps?.className].filter(Boolean).join(" ") || undefined}
      style={{ ...style, ...stateProps?.style }}
    />
  );
}

type NavigateProps = {
  to: string;
  params?: Params;
  replace?: boolean;
  state?: unknown;
};

export function Navigate({ to, params, replace, state }: NavigateProps) {
  return <RouterNavigate to={resolveTo(to, params)} replace={replace} state={state} />;
}

type NavigateTarget =
  | string
  | number
  | ({
      to: string;
      params?: Params;
    } & NavigateOptions);

export function useNavigate() {
  const navigate = useReactRouterNavigate();

  return (target: NavigateTarget, options?: NavigateOptions) => {
    if (typeof target === "number") {
      navigate(target);
      return;
    }

    if (typeof target === "string") {
      navigate(target, options);
      return;
    }

    const { to, params, ...rest } = target;
    navigate(resolveTo(to, params), rest);
  };
}

export function useRouterState<T = { location: ReturnType<typeof useLocation> }>(opts?: {
  select?: (state: { location: ReturnType<typeof useLocation> }) => T;
}) {
  const location = useLocation();
  const state = { location };
  return opts?.select ? opts.select(state) : (state as T);
}

type RouteConfig = {
  component?: ComponentType;
  head?: () => unknown;
};

export function defineRoute(_path: string) {
  return <T extends RouteConfig>(config: T) => ({
    ...config,
    useParams: () => useParams() as Record<string, string>,
  });
}

export { Outlet, useLocation };
