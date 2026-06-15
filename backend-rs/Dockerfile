# --- Build stage ------------------------------------------------------------
# Pin the toolchain image; the crate is edition 2021 with no nightly features.
FROM rust:1-slim-bookworm AS build

WORKDIR /build

# reqwest uses rustls (no OpenSSL), but pkg-config/ca-certs are still handy for
# the build; sqlite is bundled via libsqlite3-sys, no system lib needed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies separately from source: copy manifests, build a stub, then
# copy real sources. A source-only change then reuses the dependency layer.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs \
    && cargo build --release \
    && rm -rf src

# Fetch the common-passwords list at build time instead of vendoring it in git.
# It's Django 5.2's `common-passwords.txt.gz`, embedded via include_bytes! in
# src/password_policy.rs. The checksum is verified, so an upstream change (or a
# moved branch ref) fails the build loudly rather than silently shipping a
# different list. Bump the tag + DJANGO_PASSWORDS_SHA256 together to update it.
ARG DJANGO_PASSWORDS_TAG=5.2
ARG DJANGO_PASSWORDS_SHA256=3c1baed62596de36860824eb3f436d5932d37ca8b06e59df78f5a44ec175afe4
RUN mkdir -p assets \
    && curl -fsSL -o assets/common-passwords.txt.gz \
       "https://raw.githubusercontent.com/django/django/${DJANGO_PASSWORDS_TAG}/django/contrib/auth/common-passwords.txt.gz" \
    && echo "${DJANGO_PASSWORDS_SHA256}  assets/common-passwords.txt.gz" | sha256sum -c -

# Real sources.
COPY src ./src
# Touch so cargo sees main.rs as newer than the stub build above.
RUN touch src/main.rs && cargo build --release \
    && strip target/release/holy_backend_rs

# --- Runtime stage ----------------------------------------------------------
FROM debian:bookworm-slim

# curl for the container healthcheck; ca-certificates for outbound HTTPS
# (Shopify sync, SMTP over TLS).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Match the Django image's app user (UID/GID 1000) so the shared bind-mounted
# db.sqlite3 + media/ stay writable by both backends.
ARG APP_UID=1000
ARG APP_GID=1000
RUN groupadd -g ${APP_GID} app \
    && useradd -u ${APP_UID} -g app -m -s /bin/bash app

WORKDIR /app
COPY --from=build /build/target/release/holy_backend_rs /usr/local/bin/holy_backend_rs

USER app
EXPOSE 8001

# Paths point at the shared bind mounts wired in docker-compose. SECRET_KEY,
# DATABASE_URL, ENABLE_SCHEDULER, EMAIL_* etc. come from the environment.
ENTRYPOINT ["/usr/local/bin/holy_backend_rs"]
