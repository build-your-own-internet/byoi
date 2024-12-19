# TLS (Transport-Layer-Security) or: how do you make web pages private?

Okay, so far our internet behaves the way it did in 1993* when the web was first invented. Back then, the internet was being used by academics sharing papers. Eventually, people started to buy things over the internet, and security has evolved to meet those needs.

Clearly, in a modern internet, we need to have some assurance when we're communicating over the internet that the server we're trying to reach is *in fact* the server we think it is. We would also like our communications with that server to be private.

These types of assurances are provided by a technology we refer to as "TLS", which stands for Transport Layer Security. You will also know this technology by the protocol, "https", which is the same HTTP protocol we've been using in other chapters, but with the TLS technology glued onto it so that you can interact with web pages with the kind of security you're used to.

With HTTP, data goes back and forth in clear text. Anyone that can run `tcpdump` on a router between a client and a server can reconstruct the entire conversation and see what was said between both parties. With HTTPS, this is impossible*. Also, with HTTP, it would possible to divert the traffic from the client to a fake server and the client would never know the difference. HTTPS provides additional assurance to the client that the server they are intending to communicate with is guaranteed not to have been compromised in this way.

TODO: provide some references for people to go study up on some of this stuff if they want.

## Building a basic trust infrastructure between a client and a server using a Certification Authority

In this chapter, we are going to use a tool called `openssl` to manually create this trust between the client and the server. We'll do this by designating a machine which holds secret credentials that the client trusts. We will then use these secret credentials to extend trust to a server* (reword).

Then, when a client makes a request a web page or an image or any other thing from that server, the client can verify who that server is and the client and server will have tools to establish an encrypted connection.

TODO: What does trust mean?

Trust is something that we intuitively know in our daily lives. We trust a lot of things implicitly: our friends, our family (potentially), and some institutions. Computers also have to be able to trust each other, but computers are not intuitive, and we probably don't want them to be. We need to figure out some methodology to have computers trust each other on the internet.

This is possible, but let's start with an analogy. Let's say you have a plumbing problem, and you know that *Acme Plumbing* is the best plumber in town. You don't have their phone number saved, but you want to call them and schedule an appointment. How do you do this?

Well, before everyone used the Internet, we would have gone to the Yellow Pages and looked them up, because we all trusted the phone company to have accurate information. Today, we typically use some kind of mapping service on the Internet, such as Google Maps. Because Acme Plumbing knows that you trust Google Maps, they are motivated to make sure their contact information is accurate on that service. Then, when you look them up and find the phone number, you have some confidence that the number you're calling is correct. Google, as a company, wants to be able to sell you ads so they can make money. They need your trust in their information to be high so that you keep coming back. Therefore, they are motivated to make sure the information in their system is vetted.

Let's break this down a little. You understand that Google has a motivation to keep the information in their system accurate, so you have some level of trust in that data. You also understand that companies in your local area also trust Google Maps for the same reason. Google is therefore a trusted third-party that can hold information like telephone numbers for businesses.

Similar to the role Google plays in this example, there are third-party companies called "Certification Authorities" that have established trust with the Internet as a whole and that vet that websites are who they say they are. When one of these companies has vetted a website, the result of that vetting is an artifact called a "certificate" which is given to the website you want to talk to. *REWORD

Outline:

- talk about what a certificate is (DONE?)
- why does the client trust the certificate in communications
- what is the actual request/response process look like
- PKI?
- Trust of the client versus trust by the user?

### Step 1. Designate the Certification Authority

In the "real" Internet, there are all kinds of businesses that will take your money and provide you with an TLS certificate after they verify who you are. 

1. Generate the private key:
```
openssl genrsa -out rootCA.key 4096

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
