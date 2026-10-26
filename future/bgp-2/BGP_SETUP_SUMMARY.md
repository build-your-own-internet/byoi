# BGP Setup Summary: AS100 (1.0.0.0/8) ↔ AS200 (Rest of Network)

## Network Configuration

### Router C3 (Border router for AS100)
- **AS Number**: 100
- **Networks**:
  - Internal: 1.1.0.3, 1.2.0.3 (OSPF)
  - BGP Peering: 2.1.0.3 (with Z6)
- **Configuration**: `bird-c3.conf`

### Router Z6 (Border router for AS200)
- **AS Number**: 200
- **Networks**:
  - Internal: 2.5.6.6, 2.6.7.6, 2.6.8.6 (OSPF)
  - BGP Peering: 2.1.0.6 (with C3)
- **Configuration**: `bird-z6.conf`

## Key Changes from Original OSPF-Only Configuration

### 1. Protocol Separation
- **OSPF**: Now limited to internal AS networks only
- **BGP**: Handles inter-AS routing between C3 and Z6
- **Route Redistribution**: BGP routes redistributed into OSPF and vice versa

### 2. Interface Configuration
- **C3**: OSPF on eth0/eth1 (AS100 networks), BGP on eth2 (peering link)
- **Z6**: OSPF on eth1/eth2/eth3 (AS200 networks), BGP on eth0 (peering link)

### 3. Route Filtering
- **AS100 (C3)**: Only exports 1.0.0.0/8 networks via BGP
- **AS200 (Z6)**: Exports all networks except 1.0.0.0/8 via BGP

## Deployment Instructions

1. **Copy configurations to routers**:
   ```bash
   docker exec build-your-own-internet-router-c3 cp /path/to/bird-c3.conf /etc/bird/bird.conf
   docker exec build-your-own-internet-router-z6 cp /path/to/bird-z6.conf /etc/bird/bird.conf
   ```

2. **Restart BIRD on both routers**:
   ```bash
   docker exec build-your-own-internet-router-c3 systemctl restart bird
   docker exec build-your-own-internet-router-z6 systemctl restart bird
   ```

3. **Verify BGP peering**:
   ```bash
   # On C3
   docker exec build-your-own-internet-router-c3 birdc show protocols
   docker exec build-your-own-internet-router-c3 birdc show route protocol bgp_z6

   # On Z6
   docker exec build-your-own-internet-router-z6 birdc show protocols
   docker exec build-your-own-internet-router-z6 birdc show route protocol bgp_c3
   ```

## Expected Behavior

### Route Advertisement
- **C3** advertises 1.0.0.0/8 networks to Z6
- **Z6** advertises 2.0.0.0/8+, 3.0.0.0/8+, etc. to C3

### Route Redistribution
- BGP-learned routes are redistributed into OSPF within each AS
- Internal OSPF routes are advertised via BGP to the other AS

### Connectivity
- Hosts in AS100 (1.x.x.x) can reach hosts in AS200 (2.x.x.x, 3.x.x.x, etc.)
- Traffic flows: Internal OSPF → BGP border router → BGP peer → Internal OSPF

## Troubleshooting

### Check BGP Session Status
```bash
docker exec build-your-own-internet-router-c3 birdc show protocols all bgp_z6
```

### View BGP Routes
```bash
docker exec build-your-own-internet-router-c3 birdc show route protocol bgp_z6
```

### Check OSPF Neighbors
```bash
docker exec build-your-own-internet-router-c3 birdc show ospf neighbors
```

### Debug BGP Issues
```bash
# Enable more detailed BGP logging
docker exec build-your-own-internet-router-c3 birdc configure
```
