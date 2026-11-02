---
"@luz-ds/catalog": patch
"@luz-ds/check": patch
---

Adds the post list to catalog (`components/post-list.css`, `.luz-post-list`), a pattern for a blog: the layout of a list of posts, each one core's card in an `<li>`. The base is as many columns as fit (none under `--luz-post-list-min`, 16rem); `--lead` makes the first post span two columns with its picture beside the text when the list is 40rem wide or more (a container query on the list itself, no new breakpoint); `--compact` is a row for each post, for an archive or search results. No JavaScript. It is listed in the `catalog kind patterns CSS (each)` budget row without raising any number, and `luz-check` knows the new class.
