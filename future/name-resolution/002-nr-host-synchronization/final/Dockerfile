FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping net-tools bind9-utils dnsutils vim inetutils-traceroute mtr iptables netcat nano
RUN apt-get install -y busybox curl links
COPY ./init/start-up.sh /start-up.sh
COPY www /home/www

CMD ["/start-up.sh"]
