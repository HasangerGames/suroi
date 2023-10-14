with (import <nixpkgs> { });
mkShell {
  buildInputs = [
    nodejs
    nodePackages.pnpm
    libuuid
    cairo
    pango
  ];
  APPEND_LIBRARY_PATH = "${lib.makeLibraryPath [ libuuid ]}";
  shellHook = ''
    export LD_LIBRARY_PATH="$APPEND_LIBRARY_PATH:$LD_LIBRARY_PATH"
  '';
}
