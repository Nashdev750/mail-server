FROM alpine:latest

RUN apk add --no-cache postfix cyrus-sasl cyrus-sasl-plain bash

COPY postfix/main.cf /etc/postfix/main.cf

RUN mkdir -p /var/spool/postfix /var/mail && \
    chown -R postfix:postfix /var/spool/postfix /var/mail

CMD ["sh", "-c", "postfix start-fg"]
