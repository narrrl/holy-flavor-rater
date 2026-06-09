# --- Build stage ------------------------------------------------------------
# Pin the toolchain image; the crate is edition 2021 with no nightly features.
FROM rust:1-slim-bookworm AS build

WORKDIR /build

# reqwest uses rustls (no OpenSSL), but pkg-config/ca-certs are still handy for
# the build; sqlite is bundled via libsqlite3-sys, no system lib needed.
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies separately from source: copy manifests, build a stub, then
# copy real sources. A source-only change then reuses the dependency layer.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs \
    && cargo build --release \
    && rm -rf src

# Real sources (assets/ carries the embedded common-passwords list).
COPY src ./src
COPY assets ./assets
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
