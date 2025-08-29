# Command Reference Guide

- [Command Reference Guide](#command-reference-guide)
  - [dig](#dig)
  - [ip](#ip)
    - [ip addr](#ip-addr)
    - [ip route](#ip-route)
  - [iptables](#iptables)
  - [netstat](#netstat)
  - [ping](#ping)
  - [ps](#ps)
  - [tcpdump](#tcpdump)
  - [traceroute](#traceroute)
  - [watch](#watch)

We provide a lot of commands in creating, exploring, and troubleshooting our internet. It's easy to forget which command does what. Here's a reference guide to help you remember the commands we've used and what they do.

This is an incomplete list of flags and abilities. For each of these commands, please use the `-h` flag to get help on how to use them. If you want a detailed handbook on the full capabilities of a command, try `man <command>` to view the manpage. Also, please keep in mind that these commands are for a Linux operating system. If you want to run similar commands from a Mac or Windows OS, you'll need to look up their equivalent.

Julia Evans, @bork, has written [a number of comics](https://wizardzines.com/comics/) explaining technical concepts, including some comics focusing on the very commands we're exploring in this guide. Some relevant comics have been linked for your joy and perusal.

## dig

[@bork's comic](https://wizardzines.com/comics/dig/) giving some guidance on using `dig`.

This is a command-line tool that allows you to check name-resolution.

> Example commands:

- `dig www.google.com` - find out what IP address (or addresses) resolve from the name "www.google.com"
- `dig @8.8.8.8 www.google.com` - same as above, but use the resolver at `8.8.8.8` instead of whatever is configured in your machine's `/etc/resolv.conf` file
- `dig AAAA www.google.com` - also finds out what IP address resolves for the name "www.google.com", but *THIS TIME* we're asking for the "IP version 6" IP address instead of the default "IP version 4" address.

## ip

[@bork's comic](https://wizardzines.com/comics/ip/) showing a bit of how `ip` can be useful.

The `ip` command is a tool for viewing and managing network configurations. It has several subcommands that were particularly useful in building out our internet:

### ip addr

`ip addr` gives us view into the network interfaces available on a machine. It displays all available interfaces on a machine, even ones that are not currently active. Beyond the interface, `ip addr` has information about both layer 2 (Ethernet) and layer 3 (IP), which allows us to understand more about which machine is sending packets from where.

> Example commands:

- `ip addr` - view all interfaces on a machine
- `ip addr del <ip_prefix_and_subnet> dev <interface>` - delete an interface on a machine
- `ip addr add <ip_prefix_and_subnet> dev <interface>` - add an interface for a network subnet on a machine

### ip route

`ip route` displays and manages the routing table on the machine. The routing table is built out of routes defined on active interfaces. `ip route` deals entirely with layer 3 (IP) information.

> Example commands:

- `ip route` - show the routing table on a machine
- `ip route add <ip_prefix_and_subnet> via <ip_address>` - add a route to the routing table and point to a machine who will forward the packets further on their route to the destination
- `ip route delete <ip_prefix_and_subnet>` - delete a route from the routing table

## iptables

[@bork's comic](https://wizardzines.com/comics/iptables/) explaining how to use `iptables`.

`iptables` allows you to write rules for handling incoming, forwarding, or outgoing packets. It can be used as a network layer firewall or just to make simple rules about how to handle traffic on a network.

> Commands used in this guide

- `iptables -L` - show the list of all rules applied to packets processed by the machine
- `iptables -A OUTPUT -p icmp --icmp-type port-unreachable -j DROP` - generate a new rule to drop any ICMP port unreachable packets
  - `-A OUTPUT`: append a rule to `OUTPUT`, which will only impact any outgoing packets
  - `-p icmp`: only apply this rule to `icmp` requests
  - `icmp-type port-unreachable`: specifically, only apply this rule to `ICMP port unreachable` responses
  - `-j DROP`: `DROP`, or don't send, any packet that matches this rule

## netstat

`netstat` provides a list of all software that is listening for network connections on a machine.

> Example command:

```bash
netstat -lnp
```

## ping

[@bork's comic](https://wizardzines.com/comics/ping/) explaining `ping` and `traceroute`.

`ping` is a tool that sends ICMP echo request packets to a specified IP address. A machine on that IP address will respond with ICMP echo response packets as long as:

- there is a machine configured on that IP address
- there are routes from the client issuing the `ping` to and from the machine configured on that IP address
- the machine configured on that IP address doesn't have configuration settings telling it to ignore ICMP packets

> Example command:

```bash
ping -c 2 <some_ip_address>
```

> Helpful flags:

- `-c <some_number>`: Count. Send a specific number of ICMP echo requests. `ping` will wait until its received the ICMP echo response for each request, then exit the program.
- `-w <some_number>`: Wait. Keep sending ICMP echo requests until the time limit in seconds indicated by the number has passed. `ping` does not wait for the ICMP echo responses.

## ps

To see all the processes running on your machine, you can use the `ps` (process status) command. A common way to run it is:

```bash
ps aux
```

This will show you a list of all processes. The output can be long, but two of the most important columns are:

-   `PID`: The **P**rocess **ID**. This is a unique number the operating system assigns to each process. It's like a serial number for a running program.
-   `COMMAND`: The command that was used to start the process.

Here's a snippet of what you might see:

```bash
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   4032  2816 ?        Ss   18:32   0:00 /bin/bash /router-start-up.sh
root          12  0.0  0.0   2796  1408 ?        Ss   18:32   0:00 /usr/sbin/bird -c /etc/bird/bird.conf
...
```

If you need to stop a process (for example, to restart a service with a new configuration), you can use the `kill` command with its PID. For example, to stop the `bird` process from the output above, you would run:

```bash
kill 12
```

## tcpdump

[@bork's comic](https://wizardzines.com/comics/tcpdump/) exploring `tcpdump`.

`tcpdump` is a packet sniffing software that allows users to see details about network traffic. It can only listen on a single interface at a time. If you do not indicate an interface specifically, it will listen on whichever interface is defined as its default. To discover what interfaces your machine has, try `ip addr`.

> Example command:

```bash
tcpdump -ni eth1
```

> Helpful flags:

- `-e`: Show MAC addresses for each line.
- `-i <interface_name>`: Select a specific interface.
- `-n`: Don't convert addresses (e.g., host addresses, port numbers, etc.) to names.

## traceroute

[@bork's comic](https://wizardzines.com/comics/ping/) explaining `ping` and `traceroute`.

`traceroute` is a network analysis tool that shows path a packet takes from the initiator of a request (i.e. a client) to the destination IP. This is done through sending single packets that have a preset `ttl` in the IP header. The `ttl` in IP context does not refer to a specific *time* to live, instead, it is the maximum number of hops a packet is allowed to traverse before a router should drop it.

> Example command:

```bash
traceroute <some_ip_address>
```

## watch

`watch`, runs a command you give it and displays the output of that command every two seconds (by default). This is useful for monitoring when the output of a command would change. For example, if your routing table on a machine is changing because you're implementing a new routing protocol, it could be helpful to run the `ip route` command over and over again, watching the output of that command change as the routing protocol learns new routes from other routers. 

For example:

```bash
root@router-a2:/# watch ip route
```

```bash
Every 2.0s: ip route       router-a2: Wed Apr 16 20:23:21 2025

4.1.0.0/16 dev eth0 proto kernel scope link src 4.1.0.2
4.2.0.0/16 dev eth1 proto kernel scope link src 4.2.0.2
```

The `watch` command will run forever until you tell it to exit. Type `Control` + `c` on your keyboard to give it the exit command.