# package-bundle

[![NPM version](https://img.shields.io/npm/v/package-bundle.svg)](https://www.npmjs.com/package/package-bundle)
[![Dependency Status](https://david-dm.org/alexbrazier/package-bundle.svg)](https://david-dm.org/alexbrazier/package-bundle)
[![devDependency Status](https://david-dm.org/alexbrazier/package-bundle/dev-status.svg)](https://david-dm.org/alexbrazier/package-bundle#info=devDependencies)

package-bundle allows you to download npm packages as tar.gz's including their dependencies, and saves them as an archive in the npm folder structure.

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

Options:

`--dev`: include dev dependencies
`--optional`: include optional dependencies


## Features

* Download node modules as tgz which can then be imported into package manager or stored in repo
* Cache previous downloads, so you only download dependencies once
* Download all package dependencies
* Maintains npm registry folder structure to upload to package manager


## Importing into Artifactory

Once you have downloaded the packages you want, you can import the archive into an Artifactory npm repository. To do this, select the deploy option on the repo, and upload the whole archive containing all packages. Select the option to "Deploy as Bundle Artifact", which will keep the folder structure in the archive.

Once this is done, you should now be able to npm install from Artifactory, and it should contain all the dependencies that you just downloaded.


## TODO
- [ ] Command line options
- [ ] Option to disable cache files
- [ ] Progress bar
- [ ] Read package.json instead of command line args
- [ ] Option to disable zipping into one archive
- [ ] Option to customise output folder structure
- [ ] Option to specify dependency types
