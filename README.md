Object.observe Portfolio
========================

This is a _non-sugared_ example of creating a collection of observable objects that represent a finance portfolio using [`Object.observe`][O.o].

The example can be run in either **Chrome Canary** or **Node.js v0.11+**. When running in Canary, pop open the Inspector and paste the code in the console. When running in Node.js, use the `--harmony` flag, like this:

```shell
$ node --harmony index.js
```

I use [`nvm`][nvm] which allows you to easily switch between versions of Node.js — this is how I'm using Node.js v0.11 — it can be installed via [Homebrew][]:

```shell
$ brew install nvm
$ nvm install 0.11
$ nvm use 0.11
$
$ node --harmony index.js
```


[O.o]: http://wiki.ecmascript.org/doku.php?id=harmony:observe
[nvm]: https://github.com/creationix/nvm
[Homebrew]: http://brew.sh
