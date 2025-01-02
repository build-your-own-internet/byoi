FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping net-tools bind9-utils dnsutils
COPY start-up.sh /start-up.sh

CMD ["/start-up.sh"]
