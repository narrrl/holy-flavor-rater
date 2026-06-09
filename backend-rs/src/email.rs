//! SMTP email, mirroring Django's `send_mail` + `InsecureEmailBackend`.
//!
//! Config maps the `EMAIL_*` env vars (see `config::EmailConfig`):
//! - `EMAIL_USE_SSL` → implicit TLS (SMTPS, usually port 465)
//! - `EMAIL_USE_TLS` → STARTTLS
//! - neither → plaintext
//! - `EMAIL_SKIP_CERT_VERIFICATION` → accept self-signed certs (the whole point
//!   of Django's `InsecureEmailBackend`).
//!
//! When `EMAIL_HOST` is unset the message is logged instead of sent — the
//! equivalent of Django's console email backend in dev.

use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::config::EmailConfig;

/// Send a plain-text email to one or more recipients. Returns an error if the
/// message can't be built or the transport fails (parity with `fail_silently=False`).
pub async fn send_mail(
    cfg: &EmailConfig,
    subject: &str,
    body: &str,
    recipients: &[String],
) -> Result<(), String> {
    let Some(host) = cfg.host.as_deref() else {
        // Console backend equivalent.
        tracing::info!(
            to = ?recipients,
            subject = %subject,
            "email (console backend, not sent):\n{body}"
        );
        return Ok(());
    };

    let from: Mailbox = cfg
        .default_from
        .parse()
        .map_err(|e| format!("invalid DEFAULT_FROM_EMAIL: {e}"))?;

    let mut builder = Message::builder().from(from).subject(subject);
    for r in recipients {
        let mbox: Mailbox = r.parse().map_err(|e| format!("invalid recipient {r}: {e}"))?;
        builder = builder.to(mbox);
    }
    let message = builder
        .body(body.to_string())
        .map_err(|e| format!("build email: {e}"))?;

    let mut transport = AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(host).port(cfg.port);

    if cfg.use_ssl || cfg.use_tls {
        let tls = TlsParameters::builder(host.to_string())
            .dangerous_accept_invalid_certs(cfg.skip_cert_verification)
            .dangerous_accept_invalid_hostnames(cfg.skip_cert_verification)
            .build()
            .map_err(|e| format!("tls config: {e}"))?;
        transport = transport.tls(if cfg.use_ssl {
            Tls::Wrapper(tls)
        } else {
            Tls::Required(tls)
        });
    }

    if let (Some(u), Some(p)) = (cfg.host_user.as_ref(), cfg.host_password.as_ref()) {
        transport = transport.credentials(Credentials::new(u.clone(), p.clone()));
    }

    transport
        .build()
        .send(message)
        .await
        .map_err(|e| format!("smtp send: {e}"))?;
    Ok(())
}

/// Fire-and-forget send, mirroring Django's `send_email_task.delay(...)` where
/// the view does not await delivery. Logs on failure.
pub fn spawn_mail(cfg: EmailConfig, subject: String, body: String, recipients: Vec<String>) {
    tokio::spawn(async move {
        if let Err(e) = send_mail(&cfg, &subject, &body, &recipients).await {
            tracing::error!(error = %e, subject = %subject, "background email send failed");
        }
    });
}
