# Getting Started

## Running your docker container
We got this magic Dockerfile that gets everything set up! Neat! To run it, 

1. `docker build .`
1. Grab the image ID from the output
1. `docker run -d <image_id>`
1. Grab the container ID from the output
1. `docker exec -it <container_id> /bin/sh`

## Simple Network
What is a network?
2 or more machines that can communicate directly with each other over a physical medium (think actual wires or actual radio signals).

What is an internetwork?
2 or more hosts on different networks that can communicate with each other. There are special devices (routers) that are used to fascilitate communication between each host.

Building our initial network using [docker's bridge network](https://docs.docker.com/network/bridge/):
`docker network create some-network`


Sooooo, it turns out, when you create a new docker container, it is automatically assigned to a default bridge network. Neat! Except, that's not what we want for this project. First thing! Let's disconnect that shit from the default bridge network. We're gonna use some docker commands:

#### Find the docker container IDs:
```
$ docker ps
CONTAINER ID   IMAGE          COMMAND       CREATED          STATUS          PORTS     NAMES
72e335c56014   fc0281291e4a   "/sleep.sh"   28 minutes ago   Up 28 minutes             youthful_meninsky
5f1f255bf7c1   fc0281291e4a   "/sleep.sh"   28 minutes ago   Up 28 minutes             elastic_pascal
```

#### Find the network ID of your default bridge network:
```
$ docker network ls
NETWORK ID     NAME           DRIVER    SCOPE
25e6144d0a17   bridge         bridge    local                    <===== this one looks like the default, let's make sure it's the correct one!
ec4b573914fe   host           host      local
cac4377cf367   none           null      local
2e7d94c63310   some-network   bridge    local
```

#### inspect that bridge network:
```
$ docker inspect 5f1f255bf7c1 -f "{{json .NetworkSettings.Networks }}" | jq .
{
  "bridge": {
    "IPAMConfig": {},
    "Links": null,
    "Aliases": [],
    "NetworkID": "25e6144d0a17c40a8b1d2a64289e778bdfeef18ee540974b9038eb34287cee37",                <======= Look at this network ID!
    "EndpointID": "3d9ef1f1b79165f8eebf6a60be93e437fdc750d725ac9fa63e9fc6588f5c2b70",
    "Gateway": "172.17.0.1",
    "IPAddress": "172.17.0.2",
    "IPPrefixLen": 16,
    "IPv6Gateway": "",
    "GlobalIPv6Address": "",
    "GlobalIPv6PrefixLen": 0,
    "MacAddress": "02:42:ac:11:00:02",
    "DriverOpts": {}
  }
}
```

#### disconnect that shit from the default bridge network:
```
$ docker network disconnect 25e6144d0a17c40a8b1d2a64289e778bdfeef18ee540974b9038eb34287cee37 5f1f255bf7c1
```

Now, we wanna connect our containers to our happy little `some-network` bridge network that we are building

#### connect that shit to OUR bridge network:
```
$ docker network connect some-network 5f1f255bf7c1
```

you can see the state of our network with:

```
$ docker network inspect some-network
[
    {
        "Name": "some-network",
        "Id": "2e7d94c63310e11a831b13c6eece56b7caa8c0031a8b77f670389e367022ae5d",
        "Created": "2022-12-02T19:45:00.877455616Z",
        "Scope": "local",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Options": {},
            "Config": [
                {
                    "Subnet": "172.27.0.0/16",
                    "Gateway": "172.27.0.1"
                }
            ]
        },
        "Internal": false,
        "Attachable": false,
        "Ingress": false,
        "ConfigFrom": {
            "Network": ""
        },
        "ConfigOnly": false,
        "Containers": {
            "5f1f255bf7c1e37289ac11c1da959644ecb157760e9dcc54b7dcd894814656c2": {
                "Name": "elastic_pascal",
                "EndpointID": "12381efd1f7ff548881209f5dc61983ebcdbec34ce8e2ff013574551068f28be",
                "MacAddress": "02:42:ac:1b:00:02",
                "IPv4Address": "172.27.0.2/16",
                "IPv6Address": ""
            },
            "72e335c560145b6f836b31da4c3cc7cf68e7256d9449453ee325132153681c1e": {
                "Name": "youthful_meninsky",
                "EndpointID": "6f68be645ff22924a57238db22fbd77c492cc8759fe46368f384ee30ca997f4a",
                "MacAddress": "02:42:ac:1b:00:03",
                "IPv4Address": "172.27.0.3/16",
                "IPv6Address": ""
            }
        },
        "Options": {},
        "Labels": {}
    }
]
```

## Next session:
1. Create another docker container with a similar (same?) setup
1. Create a network between the containers
1. Ping. 