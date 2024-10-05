# You might want to set up a lab node to run BYOI. Here's how to do that.

## Starting with digital ocean

Note: if you don't want to use digital ocean, you can use any other cloud
provider that supports docker. You'll just need to get an Ubuntu 24.04 machine
set up with ssh access.

1. Install `doctl` (this is the digital ocean cli). You can do this with `brew install doctl` or `snap install doctl`

2. Authenticate with doctl:

  ```bash
  doctl auth init
  ```

3. If you don't have an ssh key, create one with the following command:

  ```bash
  ssh-keygen -t ed25519
  ```

4. Add the ssh key to your digital ocean account with the following command:

  ```bash
  doctl compute ssh-key add --ssh-key-file ~/.ssh/id_ed25519.pub
  ```

5. List your ssh keys with the following command:

  ```bash
  doctl compute ssh-key list
  ```

6. Set your ssh key ID as an environment variable:

  ```bash
  export SSH_KEY_ID=<your-ssh-key-id>
  ```

7. Create a droplet with the following command:

  ```bash
  export SSH_KEY_ID=<your-ssh-key-id>
  export HOST_NAME=build-your-own-internet-lab-3
  doctl compute droplet create \
      --ssh-keys $SSH_KEY_ID \
      --image ubuntu-24-04-x64 \
      --size s-2vcpu-4gb \
      --region sfo3 \
      --vpc-uuid cf4f0a3a-a4b6-4ced-8378-19c060c48bd6 \
      $HOST_NAME
  ```

8. Find the IP address of the droplet with the following command:

  ```bash
  doctl compute droplet list --format ID,Name,PublicIPv4,PrivateIPv4
  ```

9. SSH into the droplet with the following command:

  ```bash
  $ ssh root@$IP_ADDRESS
  The authenticity of host '137.184.179.253 (137.184.179.253)' can't be established.
  ED25519 key fingerprint is SHA256:ecjoIp/DNuZIvKIWdoVOhKedryaBhgjRZooH1iYMKGU.
  This key is not known by any other names.
  Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
  ```

10. Clone down the BYOI repo and run the playbook to set up the test user:

  ```bash
  git clone https://github.com/build-your-own-internet/byoi.git
  ```

11. Switch to the appropriate branch

  ```bash
  cd byoi
  git checkout tech-summit-2024-base
  ```

12. Install Ansible:

  ```bash
  cd ansible-setup/
  apt update;apt install -y software-properties-common;add-apt-repository --yes --update ppa:ansible/ansible;apt install -y ansible;
  ```

13. Set the test user password:

Ansible requires that passwords be provided in an encrypted (hashed) format when setting user passwords. To set the password securely without storing it in the playbook, we can use an environment variable to pass the hashed password to the playbook.

  ```bash
  export TEST_USER_PASSWORD=$(openssl passwd -6 "your-super-secret-password")
  ```

14. Run the playbook:

  ```bash
  ansible-playbook setup_test_user.yml
  ```

15. Test that the test user can run BYOI commands:

Log out of the droplet. Then log back in as the test user with the following command:

  ```bash
  ssh test@$IP_ADDRESS
  ```

16. Start the BYOI lab server:

Now, as the test user, run the following command to start the BYOI lab server:

  ```bash
  byoi-rebuild
  ```

You're done!
