#!/bin/sh
mkdir -p src/main/resources/template/compiled
for filename in src/main/resources/template/freemarker/*
    do
    basename=`printf $(basename "$filename") | sed -e 's/.ftl//g' -e 's/-/_/g'`
    jsscripts="<!-- Auto Inserted Bundles -->\n"
    for jsname in $(for k in $(for i in `ls "$1"/common-vendor-files-chunk.bundle.js "$1"/*"$basename"*.bundle.js`; do LEN=`expr length $i`; echo $LEN $i; done | sort -nr); do echo $k; done | grep bundle.js)
        do
            jsname=`printf $jsname | sed -e "s|$1|js|"`
            jsscripts="$jsscripts<script type=\"text/javascript\" src=\"\${root}/$jsname\"></script>\n"
    done
    jsscripts="$jsscripts<!-- End Auto Inserted Bundles -->"
    cat $filename | tr '\n' '\a' | sed "s&<!-- Auto Inserted Bundles -->\(.*\)<!-- End Auto Inserted Bundles -->&$jsscripts&g" | tr '\a' '\n' > "$filename.tmp"
    mv "$filename.tmp" "$filename"
done

