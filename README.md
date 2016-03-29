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
    `npm install` <br>
    In addition, the TypeScript Compiler, Definitely Typed, and Gulp are
    required as global dependencies. <br>
    `npm install -g typescript tsd gulp`
3. Install the type definitions. <br>
    `gulp tsd`
4. Bundle the JavaScript. This will also compile the TypeScript. <br>
    `gulp bundle-js`
5. Bundle the CSS. <br>
    `gulp bundle-css`
6. Set the app configuration.

``` json
// src/config.json
{
  "port": #port_number
}
```

Now you can run the project by just running `gulp`. Gulp will automatically
recompile and rebundle the TypeScript when any .ts file is changed.

## Deployment Instructions

Use the `deploy` script to easily deploy the application. <br>
`deploy [hostname] [password] ['dev', 'production'] [branch] [config file]` 

There are two deployment strategies defined by default: `production`, which deploys to `/var/www/chem`, and `dev`, which deploys to `/var/www/chem-dev`.

The only requirements to deploy are node, npm, and forever.js on the target 
machine and python 2.7 on the host machine.
