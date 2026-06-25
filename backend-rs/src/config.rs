use std::env;

/// Runtime configuration sourced from the environment.
///
/// `secret_key` MUST match Django's `SECRET_KEY` — SimpleJWT signs access
/// tokens with HS256 keyed on it, and this service verifies the same tokens
/// during the strangler rollout.
#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub secret_key: String,
    pub bind_addr: String,
    pub media_url: String,
    /// Filesystem root where uploaded media (avatars) are written. Mirrors
    /// Django's MEDIA_ROOT; both backends must point at the same directory.
    pub media_root: String,
    /// `Secure` flag on auth cookies (JWT_AUTH_COOKIE_SECURE; true in prod).
    pub jwt_cookie_secure: bool,
    /// Public site URL used to build verification/reset links (Django FRONTEND_URL).
    pub frontend_url: String,
    /// Exact origins allowed to send credentialed CORS requests. Mirrors Django's
    /// `CORS_ALLOWED_ORIGINS` (which derives from `DOMAIN`); credentialed CORS
    /// can't use a wildcard, so this is an explicit allow-list.
    pub cors_allowed_origins: Vec<String>,
    pub email: EmailConfig,
    /// Directory of banner JSON configs (`data/banners/`).
    pub banners_dir: String,
    /// Directory of legacy flavor JSON dumps (repo-root `legacy/`).
    pub legacy_dir: String,
    /// Output directory for database/media backups (`data/backups/`).
    pub backup_dir: String,
    /// Whether the in-process job scheduler runs. Production (docker compose)
    /// sets this to true on exactly one instance to own job scheduling.
    pub enable_scheduler: bool,
}

impl Config {
    /// Filesystem path of the SQLite database file, parsed out of `database_url`
    /// (`sqlite://<path>?<params>`). Used by the backup job.
    pub fn sqlite_path(&self) -> String {
        self.database_url
            .strip_prefix("sqlite://")
            .unwrap_or(&self.database_url)
            .split('?')
            .next()
            .unwrap_or("")
            .to_string()
    }
}

/// SMTP settings mirroring Django's `EMAIL_*` env vars. When `host` is `None`,
/// email is logged to the console instead of sent (Django's console backend).
#[derive(Clone, Debug)]
pub struct EmailConfig {
    pub host: Option<String>,
    pub port: u16,
    pub use_tls: bool,
    pub use_ssl: bool,
    pub host_user: Option<String>,
    pub host_password: Option<String>,
    pub skip_cert_verification: bool,
    pub default_from: String,
}

fn env_bool(key: &str, default: bool) -> bool {
    env::var(key)
        .map(|v| matches!(v.to_lowercase().as_str(), "1" | "true" | "yes"))
        .unwrap_or(default)
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: env::var("DATABASE_URL")
                // `mode=rw` (not `rwc`): the shared DB is created/owned by Django
                // and must already exist. `rwc` would silently create an empty DB
                // if the path were wrong, masking a misconfiguration.
                .unwrap_or_else(|_| "sqlite://../data/db.sqlite3?mode=rw".to_string()),
            secret_key: env::var("SECRET_KEY")
                .map_err(|_| anyhow::anyhow!("SECRET_KEY must be set (match Django's)"))?,
            bind_addr: env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8001".to_string()),
            media_url: env::var("MEDIA_URL").unwrap_or_else(|_| "media/".to_string()),
            media_root: env::var("MEDIA_ROOT").unwrap_or_else(|_| "../data/media".to_string()),
            jwt_cookie_secure: env_bool("JWT_AUTH_COOKIE_SECURE", false),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "http://localhost:5173".to_string())
                .trim_end_matches('/')
                .to_string(),
            cors_allowed_origins: {
                let domain = env::var("DOMAIN").unwrap_or_else(|_| "localhost".to_string());
                match env::var("CORS_ALLOWED_ORIGINS") {
                    Ok(v) if !v.trim().is_empty() => v
                        .split(',')
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect(),
                    _ => vec![
                        format!("https://{domain}"),
                        "http://localhost:5173".to_string(),
                        "http://127.0.0.1:5173".to_string(),
                    ],
                }
            },
            email: EmailConfig {
                host: env::var("EMAIL_HOST").ok().filter(|s| !s.is_empty()),
                port: env::var("EMAIL_PORT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(587),
                use_tls: env_bool("EMAIL_USE_TLS", false),
                use_ssl: env_bool("EMAIL_USE_SSL", false),
                host_user: env::var("EMAIL_HOST_USER").ok().filter(|s| !s.is_empty()),
                host_password: env::var("EMAIL_HOST_PASSWORD")
                    .ok()
                    .filter(|s| !s.is_empty()),
                skip_cert_verification: env_bool("EMAIL_SKIP_CERT_VERIFICATION", false),
                default_from: env::var("DEFAULT_FROM_EMAIL")
                    .ok()
                    .filter(|s| !s.is_empty())
                    .or_else(|| env::var("EMAIL_HOST_USER").ok().filter(|s| !s.is_empty()))
                    .unwrap_or_else(|| "noreply@localhost".to_string()),
            },
            banners_dir: env::var("BANNERS_DIR").unwrap_or_else(|_| "../data/banners".to_string()),
            legacy_dir: env::var("LEGACY_DIR").unwrap_or_else(|_| "../legacy".to_string()),
            backup_dir: env::var("BACKUP_DIR").unwrap_or_else(|_| "../data/backups".to_string()),
            // Default OFF so ad-hoc `cargo run` instances don't run jobs.
            // Production (docker compose) sets ENABLE_SCHEDULER=true on the one
            // instance that should own `api_job` scheduling.
            enable_scheduler: env_bool("ENABLE_SCHEDULER", false),
        })
    }
}
