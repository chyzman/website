
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const XDG_ACTIVATION_TOKEN: string;
	export const ANTHROPIC_MODEL: string;
	export const CLAUDE_PERMISSION_SAFETY_NET_MS: string;
	export const KDE_FULL_SESSION: string;
	export const CLAUDE_PERMISSION_DIR: string;
	export const SNAP_INSTANCE_KEY: string;
	export const CLAUDE_SESSION_ID: string;
	export const CODEX_HOME: string;
	export const __AI_BRIDGE_ENV_PROBED: string;
	export const USER: string;
	export const PAM_KWALLET5_LOGIN: string;
	export const SNAP_COMMON: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const LC_TIME: string;
	export const npm_config_user_agent: string;
	export const XDG_SEAT: string;
	export const GIT_EDITOR: string;
	export const XDG_SESSION_TYPE: string;
	export const SNAP_UID: string;
	export const QT_WAYLAND_RECONNECT: string;
	export const SHLVL: string;
	export const HOME: string;
	export const SNAP_LIBRARY_PATH: string;
	export const KDE_APPLICATIONS_AS_SCOPE: string;
	export const DESKTOP_SESSION: string;
	export const SNAP_USER_DATA: string;
	export const ANTHROPIC_DEFAULT_SONNET_MODEL: string;
	export const IM_CONFIG_ENTRY: string;
	export const COREPACK_ROOT: string;
	export const GTK_RC_FILES: string;
	export const XDG_SEAT_PATH: string;
	export const KDE_SESSION_VERSION: string;
	export const LC_MONETARY: string;
	export const MANAGERPID: string;
	export const SYSTEMD_EXEC_PID: string;
	export const SSH_ASKPASS: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const SNAP_REVISION: string;
	export const IDEA_PROJECT_PATH: string;
	export const DEBUGINFOD_URLS: string;
	export const WAYLAND_DISPLAY: string;
	export const XKB_DEFAULT_LAYOUT: string;
	export const CLAUDE_CODE_EFFORT_LEVEL: string;
	export const CLAUDE_USE_STDIN: string;
	export const COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
	export const LOGNAME: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const SNAP_CONTEXT: string;
	export const MANAGERPIDFDID: string;
	export const JOURNAL_STREAM: string;
	export const _: string;
	export const MEMORY_PRESSURE_WATCH: string;
	export const XDG_SESSION_CLASS: string;
	export const SNAP_VERSION: string;
	export const XDG_SESSION_ID: string;
	export const OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
	export const SNAP_INSTANCE_NAME: string;
	export const GTK2_RC_FILES: string;
	export const PATH: string;
	export const SESSION_MANAGER: string;
	export const ANTHROPIC_API_KEY: string;
	export const INVOCATION_ID: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const XDG_SESSION_PATH: string;
	export const XDG_MENU_PREFIX: string;
	export const LC_ADDRESS: string;
	export const XKB_DEFAULT_MODEL: string;
	export const SNAP_DATA: string;
	export const XDG_RUNTIME_DIR: string;
	export const ICEAUTHORITY: string;
	export const SSH_ASKPASS_REQUIRE: string;
	export const DISPLAY: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const LANG: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const LC_TELEPHONE: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XAUTHORITY: string;
	export const CLAUDE_CODE_DISABLE_1M_CONTEXT: string;
	export const SNAP_USER_COMMON: string;
	export const SSH_AUTH_SOCK: string;
	export const SNAP_ARCH: string;
	export const SNAP_COOKIE: string;
	export const SHELL: string;
	export const LC_NAME: string;
	export const PROJECT_PATH: string;
	export const ANTHROPIC_AUTH_TOKEN: string;
	export const NODE_PATH: string;
	export const QT_ACCESSIBILITY: string;
	export const SNAP_REEXEC: string;
	export const CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: string;
	export const _JAVA_AWT_WM_NONREPARENTING: string;
	export const USER_TYPE: string;
	export const SNAP_NAME: string;
	export const CLAUDECODE: string;
	export const LC_MEASUREMENT: string;
	export const GPG_AGENT_INFO: string;
	export const LC_IDENTIFICATION: string;
	export const PNPM_PACKAGE_NAME: string;
	export const XDG_VTNR: string;
	export const MAX_THINKING_TOKENS: string;
	export const PWD: string;
	export const XDG_CONFIG_DIRS: string;
	export const SNAP_REAL_HOME: string;
	export const XDG_DATA_DIRS: string;
	export const CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
	export const SNAP_EUID: string;
	export const SNAP: string;
	export const LC_NUMERIC: string;
	export const npm_command: string;
	export const LC_PAPER: string;
	export const KDE_SESSION_UID: string;
	export const MEMORY_PRESSURE_WRITE: string;
	export const CCGUI_CLI_LOGIN_AUTHORIZED: string;
	export const NODE_ENV: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		XDG_ACTIVATION_TOKEN: string;
		ANTHROPIC_MODEL: string;
		CLAUDE_PERMISSION_SAFETY_NET_MS: string;
		KDE_FULL_SESSION: string;
		CLAUDE_PERMISSION_DIR: string;
		SNAP_INSTANCE_KEY: string;
		CLAUDE_SESSION_ID: string;
		CODEX_HOME: string;
		__AI_BRIDGE_ENV_PROBED: string;
		USER: string;
		PAM_KWALLET5_LOGIN: string;
		SNAP_COMMON: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		LC_TIME: string;
		npm_config_user_agent: string;
		XDG_SEAT: string;
		GIT_EDITOR: string;
		XDG_SESSION_TYPE: string;
		SNAP_UID: string;
		QT_WAYLAND_RECONNECT: string;
		SHLVL: string;
		HOME: string;
		SNAP_LIBRARY_PATH: string;
		KDE_APPLICATIONS_AS_SCOPE: string;
		DESKTOP_SESSION: string;
		SNAP_USER_DATA: string;
		ANTHROPIC_DEFAULT_SONNET_MODEL: string;
		IM_CONFIG_ENTRY: string;
		COREPACK_ROOT: string;
		GTK_RC_FILES: string;
		XDG_SEAT_PATH: string;
		KDE_SESSION_VERSION: string;
		LC_MONETARY: string;
		MANAGERPID: string;
		SYSTEMD_EXEC_PID: string;
		SSH_ASKPASS: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		SNAP_REVISION: string;
		IDEA_PROJECT_PATH: string;
		DEBUGINFOD_URLS: string;
		WAYLAND_DISPLAY: string;
		XKB_DEFAULT_LAYOUT: string;
		CLAUDE_CODE_EFFORT_LEVEL: string;
		CLAUDE_USE_STDIN: string;
		COREPACK_ENABLE_DOWNLOAD_PROMPT: string;
		LOGNAME: string;
		pnpm_config_verify_deps_before_run: string;
		SNAP_CONTEXT: string;
		MANAGERPIDFDID: string;
		JOURNAL_STREAM: string;
		_: string;
		MEMORY_PRESSURE_WATCH: string;
		XDG_SESSION_CLASS: string;
		SNAP_VERSION: string;
		XDG_SESSION_ID: string;
		OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: string;
		SNAP_INSTANCE_NAME: string;
		GTK2_RC_FILES: string;
		PATH: string;
		SESSION_MANAGER: string;
		ANTHROPIC_API_KEY: string;
		INVOCATION_ID: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		XDG_SESSION_PATH: string;
		XDG_MENU_PREFIX: string;
		LC_ADDRESS: string;
		XKB_DEFAULT_MODEL: string;
		SNAP_DATA: string;
		XDG_RUNTIME_DIR: string;
		ICEAUTHORITY: string;
		SSH_ASKPASS_REQUIRE: string;
		DISPLAY: string;
		NoDefaultCurrentDirectoryInExePath: string;
		LANG: string;
		XDG_CURRENT_DESKTOP: string;
		LC_TELEPHONE: string;
		XDG_SESSION_DESKTOP: string;
		XAUTHORITY: string;
		CLAUDE_CODE_DISABLE_1M_CONTEXT: string;
		SNAP_USER_COMMON: string;
		SSH_AUTH_SOCK: string;
		SNAP_ARCH: string;
		SNAP_COOKIE: string;
		SHELL: string;
		LC_NAME: string;
		PROJECT_PATH: string;
		ANTHROPIC_AUTH_TOKEN: string;
		NODE_PATH: string;
		QT_ACCESSIBILITY: string;
		SNAP_REEXEC: string;
		CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: string;
		_JAVA_AWT_WM_NONREPARENTING: string;
		USER_TYPE: string;
		SNAP_NAME: string;
		CLAUDECODE: string;
		LC_MEASUREMENT: string;
		GPG_AGENT_INFO: string;
		LC_IDENTIFICATION: string;
		PNPM_PACKAGE_NAME: string;
		XDG_VTNR: string;
		MAX_THINKING_TOKENS: string;
		PWD: string;
		XDG_CONFIG_DIRS: string;
		SNAP_REAL_HOME: string;
		XDG_DATA_DIRS: string;
		CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
		SNAP_EUID: string;
		SNAP: string;
		LC_NUMERIC: string;
		npm_command: string;
		LC_PAPER: string;
		KDE_SESSION_UID: string;
		MEMORY_PRESSURE_WRITE: string;
		CCGUI_CLI_LOGIN_AUTHORIZED: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
