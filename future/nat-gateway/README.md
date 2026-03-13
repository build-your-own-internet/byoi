# Private Networks

Something about security and private networks here.

[![NAT Gateway network map][NAT Gateway network map]][NAT Gateway network map]

## Introduction

Comcast has a private network. Every machine on that network needs to be able to communicate with the outside world, but we dont' want to reveal the addresses of those machines to the outside world. 

<!-- TODO: fix routing tables, still showing 192.168 network -->
- Nerfed routing setup to prevent 192.168.0.0/24 from propogating across internet routing tables 
- A router needs to be configured for every network to mask the machines from that network. All machines on that network appear to have the same IP. 

Create the IP masquerade:

```bash
root@router-c4:/# iptables -t nat -A POSTROUTING -s 192.168.0.0/24 -j MASQUERADE
```

check the IP tables rules:

```bash
root@router-c4:/# iptables -t nat -nvL
```

Run a ping from our client to another machine on the internet:

```bash
root@client-c1:/# ping 2.1.0.6 -c2
PING 2.1.0.6 (2.1.0.6) 56(84) bytes of data.
64 bytes from 2.1.0.6: icmp_seq=1 ttl=62 time=0.834 ms
64 bytes from 2.1.0.6: icmp_seq=2 ttl=62 time=2.41 ms

--- 2.1.0.6 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 0.834/1.622/2.411/0.788 ms
```

```bash
root@router-c4:/# tcpdump -ni eth1
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth1, link-type EN10MB (Ethernet), snapshot length 262144 bytes
20:55:11.568668 IP 192.168.0.200 > 2.1.0.6: ICMP echo request, id 109, seq 1, length 64
20:55:11.569227 IP 2.1.0.6 > 192.168.0.200: ICMP echo reply, id 109, seq 1, length 64
20:55:12.571133 IP 192.168.0.200 > 2.1.0.6: ICMP echo request, id 109, seq 2, length 64
20:55:12.572957 IP 2.1.0.6 > 192.168.0.200: ICMP echo reply, id 109, seq 2, length 64
20:55:16.080904 IP 192.168.0.4 > 224.0.0.5: OSPFv2, Hello, length 44
^C
5 packets captured
5 packets received by filter
0 packets dropped by kernel
```

```bash
root@router-c4:/# tcpdump -ni eth0
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
20:55:11.568922 IP 1.4.0.4 > 2.1.0.6: ICMP echo request, id 109, seq 1, length 64
20:55:11.569200 IP 2.1.0.6 > 1.4.0.4: ICMP echo reply, id 109, seq 1, length 64
20:55:12.571950 IP 1.4.0.4 > 2.1.0.6: ICMP echo request, id 109, seq 2, length 64
20:55:12.572861 IP 2.1.0.6 > 1.4.0.4: ICMP echo reply, id 109, seq 2, length 64
20:55:16.078309 IP 1.4.0.4 > 224.0.0.5: OSPFv2, Hello, length 48
20:55:16.085168 IP 1.4.0.3 > 224.0.0.5: OSPFv2, Hello, length 48
20:55:16.866918 ARP, Request who-has 1.4.0.3 tell 1.4.0.4, length 28
20:55:16.867503 ARP, Reply 1.4.0.3 is-at 02:42:01:04:00:03, length 28
^C
8 packets captured
8 packets received by filter
0 packets dropped by kernel
```

Notice the outgoing IP on the echo request. It's router-c4's IP! 

<!-- TODO: Add another machine on the network. Discover how router-c4 knows which machine to pass response packets back to -->

<!-- TODO: Investigate flushing all the docker iptables rules in the early chapters... -->


<!-- Links, reference style, inside docset -->

[NAT Gateway network map]:         ../../img/network-maps/nat-gateway.svg
                             "A network map for our nat gateway setup"