FROM ubuntu
WORKDIR /checker
COPY ./nord-checker /checker/nord-checker
COPY ./start.sh /checker/start.sh

RUN apt update -y > /dev/null
RUN apt install -y wget curl libxml2 iptables iproute2 procps > /dev/null
RUN wget https://repo.nordvpn.com/deb/nordvpn/debian/pool/main/nordvpn_3.14.1_amd64.deb -q -O /tmp/nord.deb
RUN apt -y install /tmp/nord.deb >/dev/null && rm -rf /tmp/nord.deb

RUN chmod a+x nord-checker start.sh

CMD ['/usr/bin/sh', 'start.sh']