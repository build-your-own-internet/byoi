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
    nano \
    busybox \
    curl \
    links

RUN apt-get install -y avahi-utils pimd

COPY www /home/www
COPY /init/ /init
COPY ./init/start-up.sh /start-up.sh

CMD ["/start-up.sh"]
