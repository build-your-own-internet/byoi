# Prequel: How does this work?

So... you've decided to join us in building a tiny internet! Welcome to the journey! We hope you find it as fun and exciting as we did!

Before you get started, let's make sure you understand what you're gonna be looking at.

## Software

### Homebrew

Homebrew is a package manager for MacOS. You won't need it past installing the necessary software for this guide. If you aren't on MacOS or use a different package manager, you may need to do some internetting to figure out how to install the necessary software. Install [Homebrew here](https://brew.sh/).

### Colima

Colima is a tool that allows you run and use Docker (described below). You won't need to interact with it much, but you will need to install it and get it running. Install Colima with:

```bash
brew install colima
```

Once you've got it installed, you'll need to have it running to work with Docker:

```bash
colima start
```

Colima can be a bit resource intensive, so, when you're not actively building your internet, you may want to preserve your battery and take it down with:

```bash
colima stop
```

Just remember to `colima start` again the next time you want to work on building your own internet!

### Docker

Each machine on the tiny internet you're building in these chapters is a separate Docker container. Docker allowed us to be able to make a reproducible experience that, with the correct setup, should run on anyone's laptop without people needing to buy expensive and wasteful hardware. Install Docker with:

```bash
brew install docker docker-compose
```

#### Learning Docker

If you're not already comfortable with Docker, it would behoove you to spend a little time learning a bit about it as you're running through the chapters here. We've done our level best to remove the need to know the details of how Docker works. But... There is a certain amount of interacting with Docker that is just necessary to be able to follow along in these chapters.

Don't stop exploring just because you don't have experience! If you hit a problem in working through the chapters here, please [submit an issue to the repo](https://github.com/psbanka/build-your-own-internet/issues/new)! Tell us where you were and give us details on how we can reproduce what's causing you problems. We'll take a look at how we can smooth out the language or the experience to make it accessible to everyone.

#### Docker absolute fundamentals

There's a few things you ABSOLUTELY MUST UNDERSTAND about docker to be able to follow along in these chapters.

Each chapter's `Dockerfile` is the configuration of an image. That image is like a recipe. It doesn't actually create anything, but it does tell Docker what you would like to create. It includes the things that are necessary to have a functioning machine on our internet, like an operating system, any software we want to use on those machines, and any files we want to have available on the machines. Docker can use the `Dockerfile` to build an infinite number of identical machines for us.

Each chapter will also have a `docker-compose.yml` file. After chapter 001, this is what we will use to generate the machines and networks on our internet. Each machine defined in the `docker-compose.yml` file will build an image out of the `Dockerfile` in that same chapter. We will make edits to the `docker-compose.yml` file to add new machines and networks as our internet grows.

We will provide you with the Docker commands that you need to run to be able to follow along with this journey.

#### Troubleshooting Docker

Yeah. This is a HUGE topic. We're not going to teach you how to figure out the ins and outs of Docker. If you want to learn that, I suggest finding a Docker specific course. What we will do is teach you how to nuke all the Docker setup on your system so you can start over from scratch if you get any error messages you don't understand.

First step, if you're getting weird errors, `cd` into each chapter and run `docker compose down`.

If that doesn't work, try clearing the system with `docker system prune`.

## Network Maps

The beginning of each chapter will display a network map showing what we expect our internet to look like by the end of the chapter. Please review the [appendix on How to Read a Network Map](../../appendix/how-to-read-a-network-map.md) to understand this visual helper tool!
