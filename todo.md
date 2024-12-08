Here's your complete checklist of remaining implementations:

□ /packages (POST)
- [ ] Implement pagination with offset
- [ ] Handle array of PackageQuery
- [ ] Support "*" query for listing all packages
- [ ] Return package metadata list

□ /package/byRegEx (POST)
- [ ] Accept regex pattern in request body
- [ ] Search package names and READMEs
- [ ] Return matching packages' metadata
- [ ] Handle 404 if no matches found

/package upload
- fix upload for zips.
