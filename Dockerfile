FROM node

EXPOSE 8000

RUN mkdir -p /srv/swot
COPY . /srv/swot

# install dependencies
RUN cd /srv/swot && \
    npm install && \
    npm install -g typescript

# install R
RUN echo "deb http://cran.rstudio.com/bin/linux/debian jessie-cran3/" >> /etc/apt/sources.list && \
    apt-key adv --keyserver keys.gnupg.net --recv-key 6212B7B7931C4BB16280BA1306F90DE5381BA480 && \
    apt-get update && \
    apt-get install -y r-base

# build
RUN cd /srv/swot && \
    node node_modules/gulp/bin/gulp.js bundle-js && \
    node node_modules/gulp/bin/gulp.js bundle-css

CMD node /srv/swot/src/server.js
