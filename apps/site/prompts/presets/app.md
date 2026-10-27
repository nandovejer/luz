## The kind of site: an app

An app is a web application: a dashboard, a back office, a tool the person signs in to. Second round:

1. The navigation: a sidebar (recommended for more than five views), a header only, or both.
2. The first views, by name: a dashboard, a list with a table, a detail page, a form, the settings.
3. What the data comes from (an API, a framework's store) and who renders it (the server, the client). LUZ is the markup either way.
4. The empty, loading and error states of each view: what each says.

Start from `luz-app-bar` and `luz-dashboard`, on core's `o-shell` and catalog's `luz-sidebar`. Tables, forms, dialogs, tabs and alerts are core's.
