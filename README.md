# package-bundle

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

You can then use it by running `package-bundle` or the alias `pb`:

```
package-bundle request
```

This command will download request and all its dependencies and create an archive package-bundle-<TIMESTAMP>.tgz containing all the tgz's required.

You can also download multiple packages by passing in a list:

```
package-bundle request bluebird
```

## Usage

```
Usage: package-bundle|pb <packages...> [options]
where <packages> are in the format: [@scope/]<pkg>[@<version>]

Create a bundle of packages including their dependencies in archive format

Options:

  -h, --help                    output usage information
  -V, --version                 output the version number
  -d, --dev                     include dev dependencies
  -o, --optional                include optional dependencies
  -f, --flat                    save in a flat file structure, instead of individual folders
  -z, --no-archive              leave dependencies in folder, and don't archive
  -x, --no-cache                don't use cache file to avoid repeat downloads
  -O, --out-file <file>         output file name
  -a, --all-versions            download all versions of specified packages
  -A, --all-versions-recursive  download all versions of specified packages and dependencies
  -c, --concurrency <n>         number of requests to make at the same time - default=50

```

## Features

* Download node modules as tgz which can then be imported into package manager or stored in repo
* Cache previous downloads, so you only download dependencies once
* Download all package dependencies
* Maintains npm registry folder structure to upload to package manager


## Importing into Artifactory

Once you have downloaded the packages you want, you can import the archive into an Artifactory npm repository. To do this, select the deploy option on the repo, and upload the whole archive containing all packages. Select the option to "Deploy as Bundle Artifact", which will keep the folder structure in the archive.

Once this is done, you should now be able to npm install from Artifactory, and it should contain all the dependencies that you just downloaded.
