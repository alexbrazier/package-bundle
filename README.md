# package-bundle

[![Build Status](https://travis-ci.org/alexbrazier/package-bundle.svg?branch=master)](https://travis-ci.org/alexbrazier/package-bundle)
[![NPM version](https://img.shields.io/npm/v/package-bundle.svg)](https://www.npmjs.com/package/package-bundle)
[![Downloads](https://img.shields.io/npm/dt/package-bundle.svg)](https://www.npmjs.com/package/package-bundle)
[![Dependency Status](https://img.shields.io/david/alexbrazier/package-bundle.svg)](https://david-dm.org/alexbrazier/package-bundle)
[![devDependency Status](https://img.shields.io/david/dev/alexbrazier/package-bundle.svg)](https://david-dm.org/alexbrazier/package-bundle?type=dev)
[![License](https://img.shields.io/npm/l/package-bundle.svg)](https://github.com/alexbrazier/package-bundle/blob/master/LICENSE)

package-bundle allows you to download npm packages in their original tar.gz format including their dependencies, and saves them as an archive in the npm folder structure.

Packages can then be imported into a package manager such as [Artifactory](https://www.jfrog.com/artifactory/), and then used in an offline environment.

## Getting Started

Download the package using:

```
npm install -g package-bundle
```

Or if using yarn

```
yarn global add package-bundle
```

You can then use it by running `package-bundle` or the alias `pb`:

```
package-bundle request
```

This command will download "request" and all its dependencies and create an archive package-bundle-<TIMESTAMP>.tgz containing all the tgz's required.

You can also download multiple packages by passing in a list:

```
package-bundle request bluebird
```

If no packages are entered then it will check for a package.json file, and read in the dependencies.

## Usage

```
Usage: package-bundle|pb [packages...] [options]
where <packages> are in the format: [@scope/]<pkg>[@<version>]
If no packages are provided it will check for a package.json

Create a bundle of packages including their dependencies in archive format

Options:

  -V, --version                 output the version number
  -d, --no-dev                  ignore dev dependencies in package.json
  -o, --no-optional             ignore optional dependencies in package.json
  -D, --dev-recursive           include all dev dependencies recursively
  -O, --optional-recursive      include all optional dependencies recursively
  -f, --flat                    save in a flat file structure, instead of individual folders
  -z, --no-archive              leave dependencies in folder, and don't archive
  -x, --no-cache                don't use cache file to avoid repeat downloads
  -F, --out-file <file>         output file name
  -a, --all-versions            download all versions of specified packages
  -A, --all-versions-recursive  download all versions of specified packages and dependencies
  -c, --concurrency <n>         number of requests to make at the same time - default=50
  -r, --registry <registry>     specify a registry
  -p, --proxy <url>             proxy url
  --basic-auth <hash>           Basic auth hash
  --auth-token <token>          Auth token
  --insecure                    ignore TLS (SSL) certificate errors
  -h, --help                    output usage information
```

## Features

* Download node modules as tgz which can then be imported into package manager or stored in repo
* Hash check to make sure download is correct
* Cache previous downloads, so you only download dependencies once
* Download all package dependencies
* Maintains npm registry folder structure to upload to package manager
* Specify version of package
* Read packages from package.json


## Importing into Artifactory

Once you have downloaded the packages you want, you can import the archive into an Artifactory npm repository. To do this, select the deploy option on the repo, and upload the whole archive containing all packages. Select the option to "Deploy as Bundle Artifact", which will keep the folder structure in the archive.

Once this is done, you should now be able to npm install from Artifactory, and it should contain all the dependencies that you just downloaded.

## Development

```
yarn install
yarn start -- --help
```

To build, run `yarn build`;
