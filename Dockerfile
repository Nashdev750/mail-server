FROM debian:bullseye-slim

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y postfix libsasl2-modules sasl2-bin mailutils && \
    rm -rf /var/lib/apt/lists/*

COPY postfix/main.cf /etc/postfix/main.cf

CMD ["postfix", "start-fg"]
