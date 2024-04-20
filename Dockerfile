FROM node:20.12.2-bookworm

RUN apt-get update 
RUN apt-get install -y python3 pkg-config libx11-dev libxi-dev libgl-dev libxext-dev make gcc g++ python-is-python3

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package.json yarn.lock renovate.json tsconfig.json tsconfig.tsbuildinfo .babelrc ./
RUN yarn install

ADD src/ ./src/
ADD docs/ ./docs/
ADD scripts/ ./scripts/
ADD sicp_publish/ ./sicp_publish/ 
RUN yarn build
RUN yarn link

WORKDIR /home/node
RUN git clone https://github.com/xuanlc113/CS4215-frontend.git /home/node/frontend
WORKDIR /home/node/frontend

RUN apt-get install libpangocairo-1.0-0 libpango1.0-dev -y
RUN yarn install
RUN yarn link 'js-slang'

ENTRYPOINT ["yarn", "run", "start"]
