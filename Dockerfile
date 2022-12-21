FROM ubuntu

RUN apt-get update && apt-get install -y iproute2 tcpdump iputils-ping

CMD ["bin/sleep 999999"]
