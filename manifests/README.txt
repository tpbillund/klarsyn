INDLÆS IKKE UDVIDELSEN HERFRA / DO NOT LOAD THE EXTENSION FROM HERE

Disse to filer er kildefiler. Kør "npm run build" og indlæs i stedet:
These two files are source files. Run "npm run build" and load instead:

  Chrome / Edge:  build\chromium   (mappen / the folder)
  Firefox:        build\firefox\manifest.json
                  eller / or  release\klarsyn-<version>-firefox.zip

Firefox indlæser altid filen "manifest.json" i den valgte mappe.
Vælger man en fil her, får Firefox Chrome-manifestet og viser fejlen
"background.service_worker is currently disabled".
