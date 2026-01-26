# How to set up your environment

This repository relies on scripts written in python. You'll need (some release) of python 3 installed on your system.

There is more than one way to do it in Python. We're going to show the simple approach for getting your environment working to run chapters on your own machine.


1. set up a virtual environment

```bash
python3 -m venv .venv
```

2. activate your venv

```bash
source .venv/bin/activate
```

3. install dependencies in your venv

```bash
pip3 install -r bin/requirements.txt
```

(then all byoi-x commands will work IN THIS SHELL. in new shells, you'll need to `source .venv/bin/activate` for each)

