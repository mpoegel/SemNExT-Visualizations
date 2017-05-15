# SemNExt-Visualizations

This is a visualization tool to create Suceptibility Windows Ontological 
Transcriptome (SWOT) Clocks that illustrate the connections between transcriptomes for several thousand available resource sets or user-defined
lists of transcriptomes.

![Autism Example](http://i.imgur.com/jCgAYV6.png?1 "SWOT Clock generated for
Autism")

## Development Instructions

If you are interested in contributing to this project, do the following.

1. Clone this repository in the usual fashion. <br>
    `git clone https://github.com/mpoegel/SemNExT-Visualizations.git`
2. Install the dependencies. <br>
    `npm install`
3. In order to run the Fisher's exact test, you need to install R. You also need add Rscript to your
path if it's not added automatically. Lastly, you may need to set the `R_LIBS_USER` environment
variable to a writable directory to store R libraries.
3. Build and start the server. <br>
    `npm start`

The server is now available at `localhost:8000`. Gulp will automatically recompile and re-bundle the
TypeScript when any .ts file is changed.

## Deployment Instructions

Build the docker image.
```sh
docker build -t semnext/swot .
```

Then start the container.
```sh
docker run -d -p 80:8000 semnext/swot
```
