#!/bin/bash

# Make sure the SSH_KEY_ID ENV variable exists.
# non-0 exit with error message if it doesn't exist
if [[ -z "$SSH_KEY_ID" ]]; then
  echo "Error: SSH_KEY_ID environment variable is not set." >&2
  echo "Please set it with 'export SSH_KEY_ID=<your-key-id>'." >&2
  exit 1
fi

# Make sure we have 2 command line arguments: a username and a password
if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <username> <password>" >&2
    exit 1
fi
USERNAME=$1
PASSWORD=$2

# Read the 'setup-ansible-template.sh' file and generate 'setup-ansible.sh'
# 1. replace "your-super-secret-password" with a password from the command line
# 2. replace "test-user" with a username from the command line
echo "Generating setup-ansible.sh for user '$USERNAME'..."
sed -e "s|your-super-secret-password|$PASSWORD|g" \
    -e "s|test-user|$USERNAME|g" \
    "setup-ansible-template.sh" > "setup-ansible.sh"

# Generate a hostname from 'build-your-own-internet-lab' + the username we just created
HOST_NAME="build-your-own-internet-lab-$USERNAME"
echo "Creating droplet with hostname '$HOST_NAME'..."

# Create the droplet with the 'doctl' command. 
DROPLET_OUTPUT=$(doctl compute droplet create \
    --ssh-keys $SSH_KEY_ID \
    --image ubuntu-24-04-x64 \
    --size s-2vcpu-4gb \
    --user-data-file "./setup-ansible.sh" \
    --region sfo3 \
    --format "ID" --no-header \
    $HOST_NAME)

DROPLET_ID=$DROPLET_OUTPUT
echo "Droplet with ID '$DROPLET_ID' created."

echo -n "Waiting for the droplet to become active and get an IP address..."

while true; do
    IP_ADDRESS=$(doctl compute droplet get $DROPLET_ID --format PublicIPv4 --no-header)
    if [[ -n "$IP_ADDRESS" ]]; then
        echo ""
        echo "Droplet is active. Public IP: $IP_ADDRESS"
        break
    fi
    echo -n "."
    sleep 5
done

echo -n "Waiting for cloud-init to finish on the droplet (this may take a few minutes)..."

while true; do
    # Use ssh to check for the existence of the boot-finished file.
    # The command exits with 0 on success (file exists). We suppress output for a clean UI.
    if ssh root@$IP_ADDRESS -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "test -f /var/lib/cloud/instance/boot-finished" >/dev/null 2>&1; then
        echo ""
        echo "Cloud-init has finished and the droplet is ready."
        echo "You can now SSH into the machine with:"
        echo "ssh $USERNAME@$IP_ADDRESS"
        break
    fi
    echo -n "."
    sleep 10
done
