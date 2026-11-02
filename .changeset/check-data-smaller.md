---
"@luz-ds/check": patch
---

The snapshot of the facts that `luz-check` carries for a project with no `node_modules/@luz-ds` is smaller (31 KB instead of 57 KB, whose ceiling was 56 KiB): a class no longer repeats what its name says (the kind of its prefix, its BEM block, part and modifier), and the custom properties are lists of names, root and component. The messages of the tool are the same for the same input; the reader still reads an entry written in full.
