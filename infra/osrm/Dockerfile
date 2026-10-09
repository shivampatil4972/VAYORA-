FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl osmium-tool \
    && rm -rf /var/lib/apt/lists/*

COPY prepare.sh /usr/local/bin/prepare.sh
# Tolerate a CRLF checkout on Windows hosts.
RUN sed -i 's/\r$//' /usr/local/bin/prepare.sh && chmod +x /usr/local/bin/prepare.sh

CMD ["prepare.sh"]
