You might want to set up a lab node to run BYOI. Here's how to do that.

## Prerequisites

* A machine with Docker installed
* A machine with a static IP address

## Steps

1. Step 1: Install Ansible

1.1 Update the Package Index
`sudo apt update`

1.2 Install Required Dependencies

`sudo apt install -y software-properties-common`

1.3 Add the Ansible PPA Repository

`sudo add-apt-repository --yes --update ppa:ansible/ansible`

1.4 Install Ansible

`sudo apt install -y ansible`

2. Set up the test user password

Ansible requires that passwords be provided in an encrypted (hashed) format when setting user passwords. To set the password securely without storing it in the playbook, we can use an environment variable to pass the hashed password to the playbook.

Steps:

2.1.Generate a Hashed Password

You can generate a hashed password using the openssl command:
`openssl passwd -6`

This command will prompt you to enter the password and then output the hashed version using SHA-512 encryption.
Alternatively, generate the hashed password non-interactively:

```bash
PASSWORD='your_plain_text_password'
HASHED_PASSWORD=$(openssl passwd -6 "${PASSWORD}")
```

2.2.	Set an Environment Variable
Export the hashed password as an environment variable before running the playbook:

export TEST_USER_PASSWORD="${HASHED_PASSWORD}"

3. Run ansible-playbook

`sudo ansible-playbook setup_test_user.yml`
