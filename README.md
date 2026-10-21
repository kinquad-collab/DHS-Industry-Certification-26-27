# DHS Industry Certification 2026–27

Static website for Denmark High School's Industry Certification program, hosted on GitHub Pages.

## Structure

```
index.html          Home page
assets/css/         Stylesheets
assets/js/          Scripts
assets/img/         Images
.nojekyll           Tells GitHub Pages to serve files as-is (no Jekyll build)
```

## Local preview

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying to GitHub Pages

Repo **Settings → Pages → Build and deployment**: Source = "Deploy from a branch",
choose the branch and `/ (root)`, then Save.
