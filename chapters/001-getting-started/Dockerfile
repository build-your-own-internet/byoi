FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping net-tools bind9-utils dnsutils
COPY sleep.sh /sleep.sh

CMD ["/sleep.sh"]
