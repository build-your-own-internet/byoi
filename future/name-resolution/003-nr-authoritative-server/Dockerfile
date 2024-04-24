FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 \
    tcpdump \
    iputils-ping \
    net-tools \
    bind9-utils \
    dnsutils \
    vim \
    inetutils-traceroute \
    mtr \
    iptables \
    netcat \
    nano \
    busybox \
    curl \
    links \
    psutils

# TODO: remove `psutils` from above

RUN apt-get install -y procps

COPY www /home/www
COPY /init/ /init
COPY ./init/start-up.sh /start-up.sh

CMD ["/start-up.sh"]
