FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping net-tools bind9-utils vim dnsutils
COPY start-up.sh /start-up.sh
RUN mkdir -p /etc/vim
COPY .vimrc /etc/vim/vimrc.local

CMD ["/start-up.sh"]
