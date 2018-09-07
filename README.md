# OX App Suite Mailvelope

This project is supposed to provide a seamless integration of Mailvelope into OX App Suite.

## Build

This project relies on [open-xchange-shared-grunt-config](https://github.com/Open-Xchange-Frontend/shared-grunt-config)
to provide all grunt tasks needed to develop and build this software.

Most safe way to build the software would be using docker:

```shell
# install dependencies
docker run -t --rm -v $(pwd):/app -w /app -u 1000 node:10-alpine yarn
# do a dist build
docker run -t --rm -v $(pwd):/app -w /app -u 1000 node:10-alpine yarn grunt dist
```

Of course, docker is not needed to build the software, but it helps to keep the environment clean.

## Packaging

This project contains information on how to build distribution specific packages.

### Debian

```shell
docker run -t --rm -v $(pwd)/packages:/app -v $(pwd):/app/mailvelope -w /app/mailvelope -u 1000 yus4ku/debian-jessie-packaging:latest dpkg-buildpackage -b
```

In order for this command to work, a [dist build](#Build) is needed.

Two packages will be created under the directory packages.  The appsuite-mailvelope_xxx_all.deb and appsuite-mailvelope-static_xxx_all.deb.  The static package should be installed on the server containing apache, and the main package on the server containing the appsutie UI components (may be the same server)

## Integration with Appsuite

### Configuration

For users that should have mailvelope enabled, the capability for mailvelope must be set.  This can either be set globally, or specified in the user or context configuration

```
com.openexchange.capability.mailvelope=true
```

**Note that a user cannot have both guard and mailvelope capability **

The user's mailvelope installation must have the server name in the configured email providers, and must have the api enabled.
