# Setting up a Lab Node

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
    doctl compute ssh-key create mytest --public-key "$(cat  ~/.ssh/id_ed25519.pub)"
    ```

5. List your ssh keys with the following command:

    ```bash
    doctl compute ssh-key list
    ```

6. Set your ssh key ID as an environment variable:

    ```bash
    export SSH_KEY_ID=<your-ssh-key-id>
    ```

## Building the lab node

1. Run the `future/ansible-setup/create-droplet-for-user.sh` script with a username and password. E.G.

    ```bash
    bash create-droplet-for-user.sh username password
    ```

2. Test that the test user can run BYOI commands:

    Log into the droplet as the test user. The last line of output from the `create-droplet-for-user.sh` script will include a command to login. You will also need to accept the fingerprint. It will look something like so:

    ```bash
    ssh username@164.92.73.53
    The authenticity of host '137.184.179.253 (137.184.179.253)' can't be established.
    ED25519 key fingerprint is SHA256:ecjoIp/DNuZIvKIWdoVOhKedryaBhgjRZooH1iYMKGU.
    This key is not known by any other names.
    Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
    ```

3. Validate that shit got setup correctly:

    Now, as the user you just created, run the following command to start the BYOI lab server. First, `cd` into a chapter:

    ```bash
    cd chapters/1.3-routing-internet-chonk
    ```

    Then, run the following command to start an internet:

    ```bash
    byoi-rebuild
    ```

4. Update the spreadsheet that tracks current users.

5. Tell the new user their username and password. Let them know that we will be destroying their internet on whatever date, so they should hop to learning!

You're done!
