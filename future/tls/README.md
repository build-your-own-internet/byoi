# TLS (Transport-Layer-Security) or: how do you make web pages private?

Okay, so far our internet behaves the way it did in 1993* when the web was first invented. Back then, the internet was being used by academics sharing papers. Eventually, people started to buy things over the internet, and security has evolved to meet those needs.

Clearly, in a modern internet, we need to have some assurance when we're communicating over the internet that the server we're trying to reach is *in fact* the server we think it is. We would also like our communications with that server to be private.

These types of assurances are provided by a technology we refer to as "TLS", which stands for Transport Layer Security. You will also know this technology by the protocol, "https", which is the same HTTP protocol we've been using in other chapters, but with the TLS technology glued onto it so that you can interact with web pages with the kind of security you're used to.

With HTTP, data goes back and forth in clear text. Anyone that can run `tcpdump` on a router between a client and a server can reconstruct the entire conversation and see what was said between both parties. With HTTPS, this is impossible*. Also, with HTTP, it would possible to divert the traffic from the client to a fake server and the client would never know the difference. HTTPS provides additional assurance to the client that the server they are intending to communicate with is guaranteed not to have been compromised in this way.

<!-- TODO: provide some references for people to go study up on some of this stuff if they want. -->

## Goals

<!-- TODO: fix -->

In this chapter, we'll explore a bit about how encrypted connections are established between machines on the internet. We'll take a high level look at how websites are vetted, and we'll create a manual process for generating the artifacts that servers use to prove that clients have landed on the correct machine.

## How is Trust established on the internet?

Trust is something that we intuitively know in our daily lives. We trust a lot of things implicitly: our friends, our family (potentially), and some institutions. Computers also have to be able to trust each other, but computers are not intuitive, and we probably don't want them to be. We need to figure out some methodology to have computers trust each other on the internet.

This is possible, but let's start with an analogy. Let's say you have a plumbing problem, and you know that *Acme Plumbing* is the best plumber in town. You don't have their phone number saved, but you want to call them and schedule an appointment. How do you do this?

Well, before everyone used the Internet, we would have gone to the Yellow Pages and looked them up, because we all trusted the phone company to have accurate information. Today, we typically use some kind of mapping service on the Internet, such as Google Maps. Because Acme Plumbing knows that you trust Google Maps, they are motivated to make sure their contact information is accurate on that service. Then, when you look them up and find the phone number, you have some confidence that the number you're calling is correct. Google, as a company, wants to be able to sell you ads so they can make money. They need your trust in their information to be high so that you keep coming back. Therefore, they are motivated to make sure the information in their system is vetted.

Let's break this down a little. You understand that Google has a motivation to keep the information in their system accurate, so you have some level of trust in that data. You also understand that companies in your local area also trust Google Maps for the same reason. Google is therefore a trusted third-party that can hold information like telephone numbers for businesses.

Similar to the role Google plays in this example, there are third-party companies called "Certification Authorities" (or CAs) that have established trust with the Internet as a whole. These CAs that vet that domains on the internet are who they say they are. A company, let's say Dixit Enterprises, will approach the CA and say that they want to provide an encrypted connection for clients attempting to reach `www.dixit.com`. The CA will ask Dixit Enterprises to perform a task (usually adding some DNS record to the domain) that proves they have control over the domain they want to secure. Once the CA verifies that the task was done correctly, they sign an artifact called a "certificate". That certificate essentially says "any server bearing this certificate has been proven to be the correct server for this domain and you can trust that you've reached the correct place".

But how do we know to trust this CA? Each of our devices has installed on them a set of "root certificates", or certificates that belong to the CAs. Let's take a look at the certs installed on one of the machines on our toy internet. `hopon client-c1` and run:

```bash
ls /etc/ssl/certs
```

You'll see ~300 certs come automatically installed with the Ubuntu (Linux) operating system we use for that machine. If you scroll through that list of certs, you'll see that some of the names look pretty familiar, e.g. `Amazon_Root_CA_1.pem`. We can see some of the details of that cert using a command line tool called `openssl`:

```bash
root@client-c1:/# openssl x509 -in /etc/ssl/certs/Amazon_Root_CA_1.pem -text -noout
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            06:6c:9f:cf:99:bf:8c:0a:39:e2:f0:78:8a:43:e6:96:36:5b:ca
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C = US, O = Amazon, CN = Amazon Root CA 1
        Validity
            Not Before: May 26 00:00:00 2015 GMT
            Not After : Jan 17 00:00:00 2038 GMT
        Subject: C = US, O = Amazon, CN = Amazon Root CA 1
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (2048 bit)
                Modulus:
                    00:b2:78:80:71:ca:78:d5:e3:71:af:47:80:50:74:
                    7d:6e:d8:d7:88:76:f4:99:68:f7:58:21:60:f9:74:
                    84:01:2f:ac:02:2d:86:d3:a0:43:7a:4e:b2:a4:d0:
                    36:ba:01:be:8d:db:48:c8:07:17:36:4c:f4:ee:88:
                    23:c7:3e:eb:37:f5:b5:19:f8:49:68:b0:de:d7:b9:
                    76:38:1d:61:9e:a4:fe:82:36:a5:e5:4a:56:e4:45:
                    e1:f9:fd:b4:16:fa:74:da:9c:9b:35:39:2f:fa:b0:
                    20:50:06:6c:7a:d0:80:b2:a6:f9:af:ec:47:19:8f:
                    50:38:07:dc:a2:87:39:58:f8:ba:d5:a9:f9:48:67:
                    30:96:ee:94:78:5e:6f:89:a3:51:c0:30:86:66:a1:
                    45:66:ba:54:eb:a3:c3:91:f9:48:dc:ff:d1:e8:30:
                    2d:7d:2d:74:70:35:d7:88:24:f7:9e:c4:59:6e:bb:
                    73:87:17:f2:32:46:28:b8:43:fa:b7:1d:aa:ca:b4:
                    f2:9f:24:0e:2d:4b:f7:71:5c:5e:69:ff:ea:95:02:
                    cb:38:8a:ae:50:38:6f:db:fb:2d:62:1b:c5:c7:1e:
                    54:e1:77:e0:67:c8:0f:9c:87:23:d6:3f:40:20:7f:
                    20:80:c4:80:4c:3e:3b:24:26:8e:04:ae:6c:9a:c8:
                    aa:0d
                Exponent: 65537 (0x10001)
        X509v3 extensions:
            X509v3 Basic Constraints: critical
                CA:TRUE
            X509v3 Key Usage: critical
                Digital Signature, Certificate Sign, CRL Sign
            X509v3 Subject Key Identifier:
                84:18:CC:85:34:EC:BC:0C:94:94:2E:08:59:9C:C7:B2:10:4E:0A:08
    Signature Algorithm: sha256WithRSAEncryption
    Signature Value:
        98:f2:37:5a:41:90:a1:1a:c5:76:51:28:20:36:23:0e:ae:e6:
        28:bb:aa:f8:94:ae:48:a4:30:7f:1b:fc:24:8d:4b:b4:c8:a1:
        97:f6:b6:f1:7a:70:c8:53:93:cc:08:28:e3:98:25:cf:23:a4:
        f9:de:21:d3:7c:85:09:ad:4e:9a:75:3a:c2:0b:6a:89:78:76:
        44:47:18:65:6c:8d:41:8e:3b:7f:9a:cb:f4:b5:a7:50:d7:05:
        2c:37:e8:03:4b:ad:e9:61:a0:02:6e:f5:f2:f0:c5:b2:ed:5b:
        b7:dc:fa:94:5c:77:9e:13:a5:7f:52:ad:95:f2:f8:93:3b:de:
        8b:5c:5b:ca:5a:52:5b:60:af:14:f7:4b:ef:a3:fb:9f:40:95:
        6d:31:54:fc:42:d3:c7:46:1f:23:ad:d9:0f:48:70:9a:d9:75:
        78:71:d1:72:43:34:75:6e:57:59:c2:02:5c:26:60:29:cf:23:
        19:16:8e:88:43:a5:d4:e4:cb:08:fb:23:11:43:e8:43:29:72:
        62:a1:a9:5d:5e:08:d4:90:ae:b8:d8:ce:14:c2:d0:55:f2:86:
        f6:c4:93:43:77:66:61:c0:b9:e8:41:d7:97:78:60:03:6e:4a:
        72:ae:a5:d1:7d:ba:10:9e:86:6c:1b:8a:b9:59:33:f8:eb:c4:
        90:be:f1:b9
```

A lot of this cert probably doesn't make any sense, but that's OK. Most of it doesn't need to make sense to humans. But a few things we might call out here:

* `Issuer`: Who actually provided this cert.
* `Validity`: This section tells us when clients should respect the use of this cert. If a cert is expired, don't trust the connection made using it.

Because this cert is a root cert, it doesn't have any domains associated with it. As we look at certs issued in this chapter, we'll start seeing other sections that are important to us.

Ok, so we can look at this root certificate, but what's the significance of it? Why does it matter? After a company has proven ownership over a domain, the CA will use their root cert to "sign" a certificate for that domain. This imbues the new cert with the trust that was granted to the root cert. After the company installs the cert signed by the root certificate on their server, any client attempting to establish an encrypted connection will recieve that cert as part of the TLS handshake. The client then checks the cert to see who signed it, and validates that it has the root certificate installed locally. If it does, all is good in the world! If it doesn't, it will not trust the connection.

If you want to check out what a cert looks like on the "real" Internet, you can use `openssl`'s `s_client` command to do so; e.g.:

```bash
openssl s_client -connect www.denverlibrary.org:443 | openssl x509 -text -noout
```

<!-- TODO: I haven't mentioned anything about the public key or what the request process looks like to establish a TLS connection -->

### Trust of the Client Versus Trust of the User

One important distinction we'd like to make here is the difference between the trust of the client and the trust of the person actually browsing The Internet. The trust we've been talking about is specific to machines. If you request an encryted connection to a domain, you want some guarantee that you're talking to the server that is responsible for that domain. Not a server pretending to be that domain. 

However, this has it's limitations in the real world of humans. It doesn't protect against typos when trying to reach a site. And it doesn't vet the content of any site. Just because a machine can prove that you're talking to the site you made a request to, doesn't mean that site itself isn't disreputable. If you visit breitbart, you're going to be able to establish an encrypted connection to the correct website, but you're still going to be innundated with misinformation. 

## Building a basic trust infrastructure between a client and a server using a Certification Authority

In this chapter, we are going to use the command line tool `openssl` to manually create this trust between the client and the server. We'll do this by designating a machine which holds secret credentials that the client trusts. We will then use these secret credentials to sign a certificate for a server on our toy internet. Then, when a client makes a request a web page or an image or any other thing from that server, the client can verify who that server is and the client and server will have tools to establish an encrypted connection.

Here's what our internet will look like for this chapter:

<!-- TODO: link to network map for this chapter -->
<!-- TODO: consider moving network maps to after the exposition for each chapter? -->

This toy internet is pretty basic. We have a few networks and the basic infrastructure for DNS. To add some basic infrastructure for TLS, we'll need to:

1. Designate a Certification Authority (CA)
2. Extend the trust of the CA (install the CA's root certificate on the clients we'll be using for this chapter)
3. Generate a Certificate Signing Request (CSR) for `www.dixit.com` for our server
4. Install the signed certificate on the server

Let's see what this looks like in action!

### Step 1. Designate the Certification Authority (CA)

If you look at the network map in the Supercorp network, we've designated `tls-ca-s` to be our Certification Authority for this chapter. We need to start there. But, before we can generate the root certificate, we need to create a private key. That key is what the CA will use to sign all certificates for domains the CA is vouching for. 

<!-- TODO: explain the private key more here. Maybe geneology as a metaphor? Everything can be traced back genetically to a common ancestor - the root cert of this CA? -->

As we mentioned before, we're going to use a command line tool called `openssl`. `openssl` allows users to create and examine both private keys and certificates.

Let's start `hopon tls-ca-s` and generate the private key:

```bash
openssl genrsa -out rootCA.key 4096
```

We can use another `openssl` command to verify that the certificate was created correctly:

```bash
openssl rsa -noout -text -in rootCA.key -check
```

> This dumps all kinds of linux to the screen and tells us that stuff is working well.

2. Create a Self-Signed Root CA Certificate

```
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.crt
```

This goes through an interview process

This does not go through the interview process:

```
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.crt -subj "/C=/ST=/L=/O=/OU=/CN=buildyourowninternet.dev"
```

```
openssl x509 -in rootCA.crt -text -noout
```

```
root@tls-ca-s:/# openssl x509 -in rootCA.crt -text -noout
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number:
            68:2c:48:da:dd:a8:50:59:54:e9:4d:a9:05:75:df:84:f7:1d:cc:8d
        Signature Algorithm: sha256WithRSAEncryption
        Issuer: C = US, ST = Oregon, L = Portland, O = "Squasheeba, Inc.", OU = Network Management, CN = buildyourowninternet.dev, emailAddress = peba@buildyourowninternet.dev
        Validity
            Not Before: Dec 16 19:36:51 2024 GMT
            Not After : Dec 14 19:36:51 2034 GMT
        Subject: C = US, ST = Oregon, L = Portland, O = "Squasheeba, Inc.", OU = Network Management, CN = buildyourowninternet.dev, emailAddress = peba@buildyourowninternet.dev
```

##t Step 2. Teach the client to trust the Certification Authority
3. Distribute that certificate:

on client-c1

place rootCA.crt in /usr/local/share/ca-certificates/

```
root@client-c1:/# update-ca-certificates
Updating certificates in /etc/ssl/certs...
rehash: warning: skipping ca-certificates.crt,it does not contain exactly one certificate or CRL
1 added, 0 removed; done.
Running hooks in /etc/ca-certificates/update.d...
done.
```

WHAT? WHY DID THAT WORK?

4. Create a CSR on server-s1

### Step 3. Extend trust to a server using a Certificate Signing Request (CSR)

A. generate a new private-key
openssl genrsa -out /etc/ssl/private/server-s1.key 2048

B. generate the CSR
```
root@server-s1:/# openssl req -new -key /etc/ssl/private/server-s1.key -out /tmp/server-s1.csr
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [AU]:US
State or Province Name (full name) [Some-State]:CA
Locality Name (eg, city) []:San Francisco
Organization Name (eg, company) [Internet Widgits Pty Ltd]:Dixit, LTD
Organizational Unit Name (eg, section) []:Selling Stuff
Common Name (e.g. server FQDN or YOUR name) []:dixit.com
Email Address []:admin@dixit.com

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
```

or without the interview:
```
openssl req -new -key server-s1.key -out server-s1.csr -subj "/C=/ST=/L=/O=/OU=/CN=dixit.com"
```

HOW do we check the CSR? 

openssl req -text -noout -verify -in server-s1.csr

5. Use the root certificate to sign the CSR:

A. copy the csr over to the CA

run `vim /tmp/server-s1.csr`

B. run this openssl command

GENERAL TODO: maybe put all these root CA cert files in a canonical place rather than the root of the filesystem?

```
root@tls-ca-s:/# openssl x509 -req -in /tmp/server-s1.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out server-s1.crt -days 365 -sha256
Certificate request self-signature ok
subject=C = US, ST = CA, L = San Francisco, O = "Dixit, LTD", OU = Selling Stuff, CN = dixit.com, emailAddress = admin@dixit.com
```

C. Check it:

```
root@tls-ca-s:/# openssl x509 -text -noout -in /tmp/server-s1.crt
(ETC)
```

### Step 4. Profit from all this trust

ALL THIS IS HAPPENING ON `server-s1`

Install the certificate into nginx

vim /etc/ssl/certs/server-s1.crt

vim /etc/nginx/snippets/byoi-certificate.conf

and that has the following content:

```
ssl_certificate /etc/ssl/certs/server-s1.crt;
ssl_certificate_key /etc/ssl/private/server-s1.key;
```

vim /etc/nginx/snippets/ssl-params.conf

TODO: Decide if we want ssl_stapling in the config or not
```
ssl_protocols TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_dhparam /etc/nginx/dhparam.pem;
ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
ssl_ecdh_curve secp384r1;
ssl_session_timeout  10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
#ssl_stapling on;
#ssl_stapling_verify on;
resolver 9.2.0.100 valid=300s;
resolver_timeout 5s;
# Disable strict transport security for now. You can uncomment the following
# line if you understand the implications.
#add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
```

Set up diffie-helman parameters

openssl dhparam -out /etc/nginx/dhparam.pem 4096

ALSO SET UP THE WEB SERVER

vim /etc/nginx/sites-available/dixit.com

```
server {
        listen 443 ssl;
        listen [::]:443 ssl;
        include snippets/byoi-certificate.conf;
        include snippets/ssl-params.conf;

        root /var/www/dixit.com/html;
        index index.html

        server_name dixit.com www.dixit.com;

        location / {
                try_files $uri $uri/ =404;
        }
}

server {
    listen 80;
    listen [::]:80;

    server_name dixit.com www.dixit.com;

    return 302 https://$server_name$request_uri;
}
```

Set up our website:
mkdir -p /var/www/dixit.com/html

vim /var/www/dixit.com/html/index.html

```
<html>
  <body>
    <h1>hello dixit.com</h1>
  </body>
</html>
```

cd /etc/nginx/sites-enabled
rm default
ln -s /etc/nginx/sites-available/dixit.com

verify your config:

nginx -t

you should get:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

try from server-s1:
```
* Host localhost:80 was resolved.
* IPv6: ::1
* IPv4: 127.0.0.1
*   Trying [::1]:80...
* Immediate connect fail for ::1: Cannot assign requested address
*   Trying 127.0.0.1:80...
* Connected to localhost (127.0.0.1) port 80
> GET / HTTP/1.1
> Host: localhost
> User-Agent: curl/8.5.0
> Accept: */*
>
< HTTP/1.1 302 Moved Temporarily
< Server: nginx/1.24.0 (Ubuntu)
< Date: Wed, 18 Dec 2024 22:14:56 GMT
< Content-Type: text/html
< Content-Length: 154
< Connection: keep-alive
< Location: https://dixit.com/
<
<html>
<head><title>302 Found</title></head>
<body>
<center><h1>302 Found</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html>
```

Great! we got the 302 to work. Next, let's try it from client-c1.

curl -vvv --resolve dixit.com:80:9.2.0.10 http://dixit.com/index.html

here we use the `--resolve` flag in curl because we haven't set up dns yet.

Next, let's try the full https:

curl -vvv --resolve dixit.com:443:9.2.0.10 https://dixit.com/index.html

```
* Added dixit.com:443:9.2.0.10 to DNS cache
* Hostname dixit.com was found in DNS cache
*   Trying 9.2.0.10:443...
* Connected to dixit.com (9.2.0.10) port 443
* ALPN: curl offers h2,http/1.1
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
*  CAfile: /etc/ssl/certs/ca-certificates.crt
*  CApath: /etc/ssl/certs
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (OUT), TLS change cipher, Change cipher spec (1):
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* TLSv1.3 (IN), TLS handshake, Encrypted Extensions (8):
* TLSv1.3 (IN), TLS handshake, Certificate (11):
* TLSv1.3 (IN), TLS handshake, CERT verify (15):
* TLSv1.3 (IN), TLS handshake, Finished (20):
* TLSv1.3 (OUT), TLS handshake, Finished (20):
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384 / secp384r1 / RSASSA-PSS
* ALPN: server accepted http/1.1
* Server certificate:
*  subject: CN=dixit.com
*  start date: Dec 18 21:39:09 2024 GMT
*  expire date: Dec 18 21:39:09 2025 GMT
*  common name: dixit.com (matched)
*  issuer: CN=buildyourowninternet.dev
*  SSL certificate verify ok.
*   Certificate level 0: Public key type RSA (2048/112 Bits/secBits), signed using sha256WithRSAEncryption
*   Certificate level 1: Public key type RSA (4096/152 Bits/secBits), signed using sha256WithRSAEncryption
* using HTTP/1.x
> GET /index.html HTTP/1.1
> Host: dixit.com
> User-Agent: curl/8.5.0
> Accept: */*
>
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* TLSv1.3 (IN), TLS handshake, Newsession Ticket (4):
* old SSL session ID is stale, removing
< HTTP/1.1 200 OK
< Server: nginx/1.24.0 (Ubuntu)
< Date: Thu, 19 Dec 2024 19:15:26 GMT
< Content-Type: text/html
< Content-Length: 63
< Last-Modified: Wed, 18 Dec 2024 22:03:25 GMT
< Connection: keep-alive
< ETag: "676346ad-3f"
< X-Frame-Options: DENY
< X-Content-Type-Options: nosniff
< X-XSS-Protection: 1; mode=block
< Accept-Ranges: bytes
<
<html>
  <body>
    <h1>hello dixit.com</h1>
  </body>
</html>
```

Finally, we need to set up DNS to do the simple curl

NEXT TIME: get www.dixit.com resolving or re-issue certificate for server-s1.supercorp.com

### FUTURE WORK:
