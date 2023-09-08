
A bit about that HTML: If you check the `init/start-up.sh` file for this chapter,
you'll see that we added a `httpserver` function:

```bash
  while true; do
    echo -e "HTTP/1.1 200 OK\r\n$(date)\r\n\r\n<h1>hello world from $(hostname) on $(date)</h1>" | nc -vl 8080; 
  done
```

This function is basically using a `netcat` hack to respond to any requests that
come in on port 8080 with the very basic HTTP response that includes a tiny
little HTML document. It's a clever solution so we don't actually have to build
an HTTP server. If it doesn't make sense, don't worry about it... ✨_IT JUST
WORKS_✨ In the setup for the server in `start-up.sh`, you'll see the last item in
the list is a call to that `httpserver` function.