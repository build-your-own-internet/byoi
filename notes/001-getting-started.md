# Getting Started

## Running your docker container
We got this magic Dockerfile that gets everything set up! Neat! To run it, 

1. `docker build .`
1. Grab the image ID from the output
1. `docker run -d <image_id>`
1. Grab the container ID from the output
1. `docker exec -it <container_id> /bin/sh`

## Next session:
1. Create another docker container with a similar (same?) setup
1. Create a network between the containers
1. Ping. 