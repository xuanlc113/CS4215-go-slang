#!/bin/bash

# Please ensure that your docker has sufficient swap memory (2GB) and RAM (6GB)
# The webserver will be hosted on localhost port 8000

docker build . -t zhihong_xuanliang_cs4215
docker run -p 8000:8000 zhihong_xuanliang_cs4215