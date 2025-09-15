#! bin/bash

# Get the repo
git clone https://github.com/build-your-own-internet/byoi.git
cd byoi
# Get the branch with all the work
git fetch
git checkout byoi-74

# Go where the work lives
cd future/ansible-setup/

# Some basic maintenance and needed software
apt update
apt install -y software-properties-common
add-apt-repository --yes --update ppa:ansible/ansible
apt install -y ansible

# Create a password for the user
export TEST_USER="test-user"
export TEST_USER_PASSWORD=$(openssl passwd -6 "your-super-secret-password")

# Use the ansible CLI to create a new user and sets the machine up the way we want it
# This user will be able to login to the server using the username identified in the setup_test_user.yml file
ansible-playbook setup_test_user.yml