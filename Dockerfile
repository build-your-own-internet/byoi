FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping
COPY ./init/sleep.sh /sleep.sh

CMD ["/sleep.sh"]
