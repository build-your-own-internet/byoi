FROM busybox

COPY ./init/sleep.sh /sleep.sh

CMD ["/sleep.sh"]